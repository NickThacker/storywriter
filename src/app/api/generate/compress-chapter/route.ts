export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { COMPRESSION_SCHEMA } from '@/lib/memory/schema'
import { buildCompressionPrompt } from '@/lib/memory/compression-prompt'
import { saveChapterCheckpoint } from '@/actions/project-memory'
import type { ProjectMemoryRow } from '@/types/project-memory'
import type { CompressionResult } from '@/types/project-memory'
import { checkTokenBudget, deductTokens, recordTokenUsage } from '@/lib/billing/budget-check'
import { logPrompt } from '@/lib/logging/prompt-logger'
import { getModelForRole } from '@/lib/models/registry'
import { getOpenRouterApiKey } from '@/lib/api-key'

interface CompressChapterBody {
  projectId: string
  chapterNumber: number
  chapterTitle: string
  chapterText: string
}

export async function POST(request: Request): Promise<Response> {
  try {
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
  let body: CompressChapterBody
  try {
    body = (await request.json()) as CompressChapterBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { projectId, chapterNumber, chapterTitle, chapterText } = body

  if (!projectId || !chapterNumber || !chapterText) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: projectId, chapterNumber, chapterText' }),
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

  // 4. Get current project memory for context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memory, error: memoryError } = await (supabase as any)
    .from('project_memory')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (memoryError || !memory) {
    return new Response(
      JSON.stringify({ error: 'Project memory not found. Complete intake first.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 5. Retrieve API key
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

  // 6. Get summarizer model preference
  const modelId = await getModelForRole(user.id, 'summarizer')

  // 7. Build compression prompt
  const { systemMessage, userMessage } = buildCompressionPrompt(
    chapterNumber,
    chapterTitle,
    chapterText,
    memory as ProjectMemoryRow
  )

  // 8. Call OpenRouter (non-streaming, structured JSON)
  logPrompt({ userId: user.id, route: 'compress-chapter', model: modelId, messages: [
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
        stream: false,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'chapter_compression',
            strict: true,
            schema: COMPRESSION_SCHEMA,
          },
        },
      }),
    })
  } catch (err) {
    console.error('OpenRouter compression fetch error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to connect to OpenRouter for compression' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!orResponse.ok) {
    const errorText = await orResponse.text().catch(() => 'Unknown upstream error')
    console.error('OpenRouter compression error:', orResponse.status, errorText)
    return new Response(
      JSON.stringify({ error: `Compression failed: ${errorText}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 9. Parse the structured response
  let compressionResult: CompressionResult
  let orJson: { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }
  try {
    orJson = await orResponse.json()
    let content = orJson.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('No content in OpenRouter response')
    }
    // Strip markdown code fences if present (some models wrap JSON in ```json ... ```)
    content = content.trim()
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }
    compressionResult = JSON.parse(content) as CompressionResult
  } catch (err) {
    console.error('Failed to parse compression response:', err)
    console.error('Raw content:', orJson!?.choices?.[0]?.message?.content?.slice(0, 500))
    return new Response(
      JSON.stringify({ error: 'Failed to parse compression result from AI' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 9a. Record and deduct tokens for hosted-tier users (fire-and-forget)
  if (!budgetCheck.isByok && orJson.usage?.total_tokens) {
    const usage = orJson.usage
    recordTokenUsage({
      userId: user.id,
      projectId,
      chapterNumber,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    }).catch((err) => console.error('[compress-chapter] Token recording error:', err))

    deductTokens(user.id, usage.total_tokens).catch((err) =>
      console.error('[compress-chapter] Token deduction error:', err)
    )
  }

  // 10. Save checkpoint and update trackers via server action
  const saveResult = await saveChapterCheckpoint(
    projectId,
    chapterNumber,
    chapterText,
    compressionResult
  )

  if ('error' in saveResult) {
    return new Response(JSON.stringify({ error: saveResult.error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 11. Return the compression result to the client
  return new Response(
    JSON.stringify({
      success: true,
      compression: compressionResult,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )

  } catch (err) {
    console.error('[compress-chapter] Unhandled error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error in compress-chapter' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
