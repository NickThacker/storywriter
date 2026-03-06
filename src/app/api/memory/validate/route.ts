export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { validateAndApplyAnalysis } from '@/lib/memory/analysis-validator'
import type { ChapterAnalysis } from '@/lib/memory/analysis-prompt'
import type { ProjectMemoryRow } from '@/types/project-memory'

interface ValidateBody {
  projectId: string
  chapterNumber: number
  proposedChanges: ChapterAnalysis
}

export async function POST(request: Request): Promise<Response> {
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

  let body: ValidateBody
  try {
    body = (await request.json()) as ValidateBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { projectId, chapterNumber, proposedChanges } = body
  if (!projectId || !chapterNumber || !proposedChanges) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch API key and project memory in parallel
  const [settingsResult, memoryResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('user_settings')
      .select('openrouter_api_key')
      .eq('user_id', user.id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('project_memory')
      .select('*')
      .eq('project_id', projectId)
      .single(),
  ])

  const apiKey = (settingsResult.data as { openrouter_api_key: string | null } | null)
    ?.openrouter_api_key ?? null

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'No OpenRouter API key configured.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (memoryResult.error || !memoryResult.data) {
    return new Response(JSON.stringify({ error: 'Project memory not found.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const memory = memoryResult.data as ProjectMemoryRow

  try {
    const result = await validateAndApplyAnalysis(
      projectId,
      chapterNumber,
      proposedChanges,
      memory,
      apiKey,
      user.id
    )
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[/api/memory/validate] Error:', err)
    return new Response(JSON.stringify({ error: 'Validation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
