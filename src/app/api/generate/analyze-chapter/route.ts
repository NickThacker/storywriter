export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { buildChapterAnalysisPrompt } from '@/lib/memory/analysis-prompt'
import type { ChapterAnalysis } from '@/lib/memory/analysis-prompt'
import { applyAnalysisToMemory } from '@/lib/memory/memory-updater'
import { logPrompt } from '@/lib/logging/prompt-logger'
import type { ProjectMemoryRow } from '@/types/project-memory'
import type { OutlineChapter } from '@/types/database'

// Fixed model for chapter analysis — always Sonnet regardless of user's model preference.
const ANALYSIS_MODEL = 'anthropic/claude-sonnet-4-5'

interface AnalyzeChapterBody {
  projectId: string
  chapterNumber: number
  chapterText: string
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authenticate
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

  // 2. Parse body
  let body: AnalyzeChapterBody
  try {
    body = (await request.json()) as AnalyzeChapterBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { projectId, chapterNumber, chapterText } = body

  if (!projectId || !chapterNumber || !chapterText?.trim()) {
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

  // 4. Get OpenRouter API key
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

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'No OpenRouter API key configured.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 5. Fetch project_memory and outline chapter data in parallel
  const [memoryResult, outlineResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('project_memory')
      .select('*')
      .eq('project_id', projectId)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('outlines')
      .select('chapters')
      .eq('project_id', projectId)
      .single(),
  ])

  if (memoryResult.error || !memoryResult.data) {
    return new Response(
      JSON.stringify({ error: 'Project memory not found — approve outline first.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const memory = memoryResult.data as ProjectMemoryRow
  const outlineChapters = (outlineResult.data as { chapters: OutlineChapter[] } | null)?.chapters ?? []
  const chapterOutline = outlineChapters.find((c) => c.number === chapterNumber) ?? null

  // 6. Build analysis prompt
  const { system, user: userMessage } = buildChapterAnalysisPrompt(
    chapterNumber,
    chapterText,
    chapterOutline,
    memory
  )

  // 7. Call OpenRouter (non-streaming, raw JSON output)
  logPrompt({
    userId: user.id,
    route: 'analyze-chapter',
    model: ANALYSIS_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ],
  })

  let orResponse: Response
  try {
    orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'StoryWriter',
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        stream: false,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage },
        ],
      }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OpenRouter request failed'
    console.error('[analyze-chapter] OpenRouter fetch error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!orResponse.ok) {
    const errorText = await orResponse.text().catch(() => 'Unknown upstream error')
    console.error('[analyze-chapter] OpenRouter error:', orResponse.status, errorText)
    return new Response(
      JSON.stringify({ error: `Analysis model error: ${errorText}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 8. Parse AI response
  let analysis: ChapterAnalysis
  try {
    const orJson = (await orResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = orJson.choices?.[0]?.message?.content
    if (!content) throw new Error('No content in response')

    // Strip markdown code fences if the model included them
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    analysis = JSON.parse(cleaned) as ChapterAnalysis
  } catch (err) {
    console.error('[analyze-chapter] JSON parse error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to parse analysis result from AI' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 9. Apply analysis directly to project memory — no validation layer
  const applyResult = await applyAnalysisToMemory(projectId, chapterNumber, analysis)

  if ('error' in applyResult) {
    console.error('[analyze-chapter] applyAnalysisToMemory error:', applyResult.error)
    return new Response(
      JSON.stringify({ error: applyResult.error }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
