export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { queryOracle } from '@/lib/oracle/oracle-query'
import { getOpenRouterApiKey } from '@/lib/api-key'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  const { projectId } = await params

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

  let body: { chapterNumber: number }
  try {
    body = (await request.json()) as { chapterNumber: number }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { chapterNumber } = body
  if (!chapterNumber || chapterNumber < 1) {
    return new Response(JSON.stringify({ error: 'Missing or invalid chapterNumber' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: projectError } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError) {
    return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase as any)
    .from('user_settings')
    .select('openrouter_api_key')
    .eq('user_id', user.id)
    .single()

  const apiKey = (settings as { openrouter_api_key: string | null } | null)?.openrouter_api_key ?? null
  const resolvedKey = getOpenRouterApiKey(apiKey)
  if (!resolvedKey) {
    return new Response(JSON.stringify({ error: 'No API key available. Contact support.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = await queryOracle(projectId, chapterNumber, resolvedKey, user.id)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[/api/oracle/query] error:', err)
    return new Response(JSON.stringify({ error: 'Oracle query failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
