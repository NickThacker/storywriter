import { createClient } from '@/lib/supabase/server'
import { synthesizeAllArcs } from '@/lib/arc/arc-synthesizer'
import { getApiKey } from '@/lib/api-key'
import type { CharacterArc } from '@/types/project-memory'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  const { projectId } = await params

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

  // 2. Verify project ownership
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

  // 3. Get API key
  const resolvedKey = await getApiKey()
  if (!resolvedKey) {
    return new Response(
      JSON.stringify({ error: 'No API key available. Contact support.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 4. Parse chapterNumber from body (optional — defaults to a high sentinel if not provided)
  let chapterNumber = 9999
  try {
    const body = (await request.json()) as { chapterNumber?: number }
    if (body.chapterNumber && typeof body.chapterNumber === 'number') {
      chapterNumber = body.chapterNumber
    }
  } catch {
    // No body or invalid JSON — use sentinel to include all chapters
  }

  // 5. Run synthesis
  try {
    const result = await synthesizeAllArcs(projectId, chapterNumber, resolvedKey, user.id)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[arc/synthesize] POST error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Arc synthesis failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const { projectId } = await params

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

  // 2. Verify project ownership
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

  // 3. Query all arcs for this project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('character_arcs')
    .select('*')
    .eq('project_id', projectId)
    .order('character_name', { ascending: true })

  if (error) {
    console.error('[arc/synthesize] GET error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch character arcs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(data as CharacterArc[]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
