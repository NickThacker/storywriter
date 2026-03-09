// CRITICAL: force-dynamic prevents Vercel from caching the streaming response
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { assembleChapterContext } from '@/lib/memory/context-assembly'
import { buildChapterPrompt } from '@/lib/memory/chapter-prompt'
import { queryOracle } from '@/lib/oracle/oracle-query'
import { checkTokenBudget, deductTokens, recordTokenUsage } from '@/lib/billing/budget-check'
import { createTokenInterceptStream } from '@/lib/billing/token-interceptor'
import { logPrompt } from '@/lib/logging/prompt-logger'
import { getModelForRole } from '@/lib/models/registry'
import { getOpenRouterApiKey } from '@/lib/api-key'
import type { OracleOutput } from '@/lib/oracle/oracle-query'

interface GenerateChapterBody {
  projectId: string
  chapterNumber: number
  adjustments?: string  // Style/tone adjustments for rewrite
  force?: boolean       // Bypass continuity conflict block
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authenticate user
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Parse request body
  let body: GenerateChapterBody
  try {
    body = (await request.json()) as GenerateChapterBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { projectId, chapterNumber, adjustments, force } = body

  if (!projectId || !chapterNumber || chapterNumber < 1) {
    return new Response(
      JSON.stringify({ error: 'Missing projectId or valid chapterNumber' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 3. Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return new Response(
      JSON.stringify({ error: 'Project not found or access denied' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 4. Retrieve API key server-side
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings, error: settingsError } = await (supabase as any)
    .from('user_settings')
    .select('openrouter_api_key')
    .eq('user_id', user.id)
    .single()

  const apiKey =
    settingsError || !settings
      ? null
      : ((settings as { openrouter_api_key: string | null }).openrouter_api_key ?? null)

  const resolvedKey = getOpenRouterApiKey(apiKey)
  if (!resolvedKey) {
    return new Response(
      JSON.stringify({ error: 'No API key available. Contact support.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 5a. Budget check — block hosted-tier users who have exhausted their tokens
  const budgetCheck = await checkTokenBudget(user.id)
  if (!budgetCheck.allowed) {
    return new Response(
      JSON.stringify({
        error:
          budgetCheck.reason === 'budget_exhausted'
            ? 'Token budget exhausted. Upgrade your plan or purchase a credit pack.'
            : 'No active subscription. Subscribe to start generating.',
        code: budgetCheck.reason,
      }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 5. Retrieve user's preferred prose model
  const modelId = await getModelForRole(user.id, 'prose')

  // 6. Assemble context from project memory and fetch persona in parallel
  let context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let personaData: any = null
  try {
    const [assembledContext, personaResult] = await Promise.all([
      assembleChapterContext(projectId, chapterNumber),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('author_personas')
        .select('voice_description, raw_guidance_text, style_descriptors')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
    context = assembledContext
    personaData = personaResult.data ?? null
  } catch (err) {
    console.error('Context assembly error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to assemble chapter context' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 6b. Oracle query — 30s timeout, fail-open. This sends the full manuscript to Gemini
  // for long-range coherence. If it times out, generation proceeds without it.
  let oracleOutput: OracleOutput | null = null
  try {
    const oraclePromise = queryOracle(projectId, chapterNumber, resolvedKey, user.id)
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000))
    const result = await Promise.race([oraclePromise, timeoutPromise])
    if (result) {
      oracleOutput = result.oracleOutput
      console.log(`[chapter] Oracle enriched chapter ${chapterNumber} (${result.chaptersAnalyzed} chapters analyzed)`)
    } else {
      console.log('[chapter] Oracle timed out after 30s — proceeding without')
    }
  } catch (err) {
    console.error('[chapter] Oracle failed (proceeding without):', err)
  }

  // 7b. Build prompt — pass persona + oracle output + character arcs
  const { systemMessage, userMessage } = buildChapterPrompt(context, adjustments, personaData, oracleOutput, context.characterArcs ?? null)

  // 8. Call OpenRouter with streaming
  logPrompt({ userId: user.id, route: 'chapter', model: modelId, messages: [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userMessage },
  ] })

  let orResponse: Response
  try {
    orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolvedKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'StoryWriter',
      },
      body: JSON.stringify({
        model: modelId,
        stream: true,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        // No max_tokens cap — let the model write to the target naturally.
        // The system prompt already instructs the target word count.
      }),
    })
  } catch (err) {
    console.error('OpenRouter fetch error:', err)
    return new Response(JSON.stringify({ error: 'Failed to connect to OpenRouter' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!orResponse.ok) {
    const errorText = await orResponse.text().catch(() => 'Unknown upstream error')
    console.error('OpenRouter error response:', orResponse.status, errorText)
    return new Response(
      JSON.stringify({ error: `Chapter generation failed: ${errorText}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const responseBody = orResponse.body
  if (!responseBody) {
    return new Response(JSON.stringify({ error: 'Empty response from OpenRouter' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 9. Stream through as SSE — BYOK bypasses token tracking
  const sseHeaders: Record<string, string> = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Content-Encoding': 'none',
  }

  if (budgetCheck.isByok) {
    // BYOK: passthrough, no tracking
    return new Response(responseBody, { status: 200, headers: sseHeaders })
  }

  // Hosted tier: pipe through token interceptor
  const interceptedStream = responseBody.pipeThrough(
    createTokenInterceptStream((usage) => {
      // Fire-and-forget: do not await, do not block the stream
      recordTokenUsage({
        userId: user.id,
        projectId,
        chapterNumber,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      }).catch((err) => console.error('[chapter] Token recording error:', err))

      deductTokens(user.id, usage.total_tokens).catch((err) =>
        console.error('[chapter] Token deduction error:', err)
      )
    })
  )

  // Add budget warning header if near limit
  if (budgetCheck.warningThreshold === 'near_limit') {
    sseHeaders['X-Budget-Warning'] = 'near_limit'
  }

  return new Response(interceptedStream, { status: 200, headers: sseHeaders })
}
