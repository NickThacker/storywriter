export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { IMPACT_ANALYSIS_SCHEMA, buildImpactPrompt } from '@/lib/checkpoint/impact-prompt'
import { flagAffectedChapters } from '@/actions/chapters'
import { checkGenerationAccess, recordTokenUsage } from '@/lib/billing/budget-check'
import { logPrompt } from '@/lib/logging/prompt-logger'
import { getModelForRole } from '@/lib/models/registry'
import { getApiKey } from '@/lib/api-key'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface AnalyzeImpactBody {
  projectId: string
  chapterNumber: number
  newDirection: string
}

interface AffectedChapter {
  chapterNumber: number
  description: string
  affectsPlotThreads: string[]
}

interface ImpactAnalysisResult {
  affectedChapters: AffectedChapter[]
}

// ──────────────────────────────────────────────────────────────────────────────
// Route handler
// ──────────────────────────────────────────────────────────────────────────────

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
  let body: AnalyzeImpactBody
  try {
    body = (await request.json()) as AnalyzeImpactBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { projectId, chapterNumber, newDirection } = body

  if (!projectId || !chapterNumber || !newDirection) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: projectId, chapterNumber, newDirection' }),
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

  // 4. Fetch the changed chapter's checkpoint (for its summary and old direction)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: changedCheckpoint, error: changedError } = await (supabase as any)
    .from('chapter_checkpoints')
    .select('summary, direction_for_next')
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber)
    .single()

  if (changedError || !changedCheckpoint) {
    return new Response(
      JSON.stringify({ error: 'Changed chapter checkpoint not found' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const changedChapterSummary =
    (changedCheckpoint as { summary: string; direction_for_next: string | null }).summary ?? ''
  const oldDirection =
    (changedCheckpoint as { summary: string; direction_for_next: string | null }).direction_for_next

  // 5. Fetch downstream chapters that have text (pending chapters are skipped —
  //    they haven't been generated yet and will naturally use the new direction)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: downstreamRows, error: downstreamError } = await (supabase as any)
    .from('chapter_checkpoints')
    .select('chapter_number, summary, chapter_text')
    .eq('project_id', projectId)
    .gt('chapter_number', chapterNumber)
    .not('chapter_text', 'is', null)
    .neq('chapter_text', '')
    .order('chapter_number', { ascending: true })

  if (downstreamError) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch downstream chapters: ${downstreamError.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Fetch chapter titles from the outline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: outlineRows, error: outlineError } = await (supabase as any)
    .from('outlines')
    .select('chapters')
    .eq('project_id', projectId)
    .single()

  if (outlineError || !outlineRows) {
    return new Response(
      JSON.stringify({ error: 'Outline not found for this project' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const outlineChapters = (outlineRows as { chapters: Array<{ number: number; title: string }> }).chapters ?? []

  // Build title lookup map
  const titleMap = new Map<number, string>(
    outlineChapters.map((c) => [c.number, c.title])
  )

  // If no downstream chapters with text, nothing to analyze
  const rows = (downstreamRows as Array<{ chapter_number: number; summary: string; chapter_text: string }>) ?? []

  if (rows.length === 0) {
    return new Response(
      JSON.stringify({ success: true, affectedChapters: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const downstreamChapters = rows.map((row) => ({
    number: row.chapter_number,
    title: titleMap.get(row.chapter_number) ?? `Chapter ${row.chapter_number}`,
    text: row.chapter_text,
    summary: row.summary ?? '',
  }))

  // 6. Retrieve API key
  const resolvedKey = await getApiKey()
  if (!resolvedKey) {
    return new Response(
      JSON.stringify({ error: 'No API key available. Contact support.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 6a. Generation access check — verify subscription/credit status
  const accessCheck = await checkGenerationAccess(user.id, projectId)
  if (!accessCheck.allowed) {
    const messages: Record<string, string> = {
      no_subscription: 'No active subscription. Subscribe to start generating.',
      project_expired: 'Project credit has expired. Purchase a new credit to continue.',
      project_limit_reached: 'Project limit reached. Upgrade your plan or purchase a credit.',
      project_not_found: 'Project not found.',
    }
    return new Response(
      JSON.stringify({
        error: messages[accessCheck.reason!] ?? 'Generation not allowed.',
        code: accessCheck.reason,
      }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 7. Get reviewer model preference
  const modelId = await getModelForRole(user.id, 'reviewer')

  // 8. Build impact analysis prompt
  const { systemMessage, userMessage } = buildImpactPrompt(
    chapterNumber,
    changedChapterSummary,
    oldDirection,
    newDirection,
    downstreamChapters
  )

  // 9. Call OpenRouter with structured JSON response_format
  logPrompt({ userId: user.id, route: 'analyze-impact', model: modelId, messages: [
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
        'X-Title': 'Meridian',
      },
      body: JSON.stringify({
        model: modelId,
        stream: false,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
      }),
    })
  } catch (err) {
    console.error('OpenRouter impact analysis fetch error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to connect to OpenRouter for impact analysis' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!orResponse.ok) {
    const errorText = await orResponse.text().catch(() => 'Unknown upstream error')
    console.error('OpenRouter impact analysis error:', orResponse.status, errorText)
    return new Response(
      JSON.stringify({ error: `Impact analysis failed: ${errorText}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 10. Parse the structured response
  let impactResult: ImpactAnalysisResult
  let orJson: { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }
  try {
    orJson = await orResponse.json()
    let content = orJson.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('No content in OpenRouter response')
    }
    content = content.trim()
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }
    impactResult = JSON.parse(content) as ImpactAnalysisResult
  } catch (err) {
    console.error('Failed to parse impact analysis response:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to parse impact analysis result from AI' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 10a. Record token usage for analytics (fire-and-forget)
  if (orJson.usage?.total_tokens) {
    const usage = orJson.usage
    recordTokenUsage({
      userId: user.id,
      projectId,
      chapterNumber: 0, // not chapter-specific
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    }).catch((err) => console.error('[analyze-impact] Token recording error:', err))
  }

  // 11. Flag affected chapters via server action
  if (impactResult.affectedChapters.length > 0) {
    const flagResult = await flagAffectedChapters(
      projectId,
      impactResult.affectedChapters.map((ch) => ({
        chapterNumber: ch.chapterNumber,
        impactDescription: ch.description,
      }))
    )

    if ('error' in flagResult) {
      return new Response(JSON.stringify({ error: flagResult.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // 12. Return results to client
  return new Response(
    JSON.stringify({
      success: true,
      affectedChapters: impactResult.affectedChapters,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
