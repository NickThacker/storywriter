export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import type { ProjectMemoryRow } from '@/types/project-memory'

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return new Response(JSON.stringify({ error: 'Missing projectId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

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

  // Verify ownership and fetch memory in parallel
  const [projectResult, memoryResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('project_memory')
      .select('*')
      .eq('project_id', projectId)
      .single(),
  ])

  if (projectResult.error || !projectResult.data) {
    return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (memoryResult.error || !memoryResult.data) {
    return new Response(JSON.stringify({ error: 'No memory found for this project' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const memory = memoryResult.data as ProjectMemoryRow

  return new Response(JSON.stringify({ memory }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
