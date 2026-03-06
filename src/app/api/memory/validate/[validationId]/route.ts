export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ validationId: string }> }
): Promise<Response> {
  const { validationId } = await params

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('analysis_validations')
    .select('id, project_id, chapter_number, scored_changes, status, created_at, resolved_at')
    .eq('id', validationId)
    .single()

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Validation record not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify the user owns the project this validation belongs to
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: projectError } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', (data as { project_id: string }).project_id)
    .eq('user_id', user.id)
    .single()

  if (projectError) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
