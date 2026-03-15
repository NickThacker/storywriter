export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { DIRECTION_OPTIONS_SCHEMA, buildDirectionPrompt } from '@/lib/checkpoint/direction-prompt'
import { saveDirectionOptions } from '@/actions/chapters'
import type { DirectionOption } from '@/types/project-memory'
import type { OutlineChapter } from '@/types/database'
import { checkGenerationAccess, recordTokenUsage } from '@/lib/billing/budget-check'
import { logPrompt } from '@/lib/logging/prompt-logger'
import { getModelForRole } from '@/lib/models/registry'
import { getApiKey } from '@/lib/api-key'

interface DirectionOptionsBody {
  projectId: string
  chapterNumber: number
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
  let body: DirectionOptionsBody
  try {
    body = (await request.json()) as DirectionOptionsBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { projectId, chapterNumber } = body

  if (!projectId || !chapterNumber) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: projectId, chapterNumber' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 3. Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id, genre')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return new Response(
      JSON.stringify({ error: 'Project not found or access denied' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 4. Fetch the chapter checkpoint (for state_diff, summary)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: checkpoint, error: checkpointError } = await (supabase as any)
    .from('chapter_checkpoints')
    .select('summary, state_diff, direction_options')
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber)
    .single()

  if (checkpointError || !checkpoint) {
    return new Response(
      JSON.stringify({ error: 'Chapter checkpoint not found. Complete chapter compression first.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // If direction_options already exist (cached), return them immediately
  if (checkpoint.direction_options && Array.isArray(checkpoint.direction_options) && checkpoint.direction_options.length > 0) {
    return new Response(
      JSON.stringify({ success: true, options: checkpoint.direction_options }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 5. Fetch the outline (for next chapter's beats)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: outline, error: outlineError } = await (supabase as any)
    .from('outlines')
    .select('chapters')
    .eq('project_id', projectId)
    .single()

  if (outlineError || !outline) {
    return new Response(
      JSON.stringify({ error: 'Outline not found. Complete outline approval first.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const chapters = outline.chapters as OutlineChapter[]
  const nextChapter = chapters.find((c: OutlineChapter) => c.number === chapterNumber + 1) ?? null

  if (!nextChapter) {
    return new Response(
      JSON.stringify({ error: 'No next chapter found. Direction options are not generated for the last chapter.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 6. Get API key
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

  // 8. Get project identity (genre, tone) from project_memory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memory } = await (supabase as any)
    .from('project_memory')
    .select('identity')
    .eq('project_id', projectId)
    .single()

  const genre =
    memory?.identity?.genre ??
    (project as { genre: string | null }).genre ??
    null
  const tone = memory?.identity?.tone ?? null

  // 9. Build prompt via buildDirectionPrompt()
  let systemMessage: string
  let userMessage: string
  try {
    const prompt = buildDirectionPrompt(
      chapterNumber,
      '', // chapterTitle not available from checkpoint — derive from outline
      (checkpoint as { summary: string }).summary,
      (checkpoint as { state_diff: unknown }).state_diff as import('@/types/project-memory').StateDiff | null,
      nextChapter,
      genre,
      tone
    )
    systemMessage = prompt.systemMessage
    userMessage = prompt.userMessage
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: `Failed to build direction prompt: ${msg}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 10. Call OpenRouter with response_format: json_schema
  logPrompt({ userId: user.id, route: 'direction-options', model: modelId, messages: [
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
    console.error('OpenRouter direction-options fetch error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to connect to OpenRouter for direction options' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!orResponse.ok) {
    const errorText = await orResponse.text().catch(() => 'Unknown upstream error')
    console.error('OpenRouter direction-options error:', orResponse.status, errorText)
    return new Response(
      JSON.stringify({ error: `Direction options generation failed: ${errorText}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 11. Parse the structured response
  let options: DirectionOption[]
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
    const parsed = JSON.parse(content) as { options: DirectionOption[] }
    options = parsed.options
  } catch (err) {
    console.error('Failed to parse direction options response:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to parse direction options result from AI' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 11a. Record token usage for analytics (fire-and-forget)
  if (orJson.usage?.total_tokens) {
    const usage = orJson.usage
    recordTokenUsage({
      userId: user.id,
      projectId,
      chapterNumber: 0, // not chapter-specific
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    }).catch((err) => console.error('[direction-options] Token recording error:', err))
  }

  // 12. Save options to chapter_checkpoints via saveDirectionOptions server action
  const saveResult = await saveDirectionOptions(projectId, chapterNumber, options)

  if ('error' in saveResult) {
    return new Response(JSON.stringify({ error: saveResult.error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 13. Return the options to the client
  return new Response(
    JSON.stringify({ success: true, options }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
