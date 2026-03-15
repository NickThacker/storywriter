export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { runManuscriptAudit, applyAuditToMemory } from '@/lib/oracle/manuscript-audit'
import { getApiKey } from '@/lib/api-key'

interface ManuscriptAuditBody {
  projectId: string
  chapterNumber: number
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

  let body: ManuscriptAuditBody
  try {
    body = (await request.json()) as ManuscriptAuditBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { projectId, chapterNumber } = body

  if (!projectId || !chapterNumber) {
    return new Response(
      JSON.stringify({ error: 'Missing projectId or chapterNumber' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
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
    return new Response(
      JSON.stringify({ error: 'Project not found or access denied' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const resolvedKey = await getApiKey()
  if (!resolvedKey) {
    return new Response(
      JSON.stringify({ error: 'No API key available' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const audit = await runManuscriptAudit(projectId, chapterNumber, resolvedKey, user.id)

    console.log(`[manuscript-audit] Ch${chapterNumber}: ${audit.findings.length} findings, ${audit.threadCorrections.length} thread corrections, ${audit.foreshadowingCorrections.length} foreshadowing corrections`)

    // Apply corrections to memory
    const applyResult = await applyAuditToMemory(projectId, audit)
    if ('error' in applyResult) {
      console.error('[manuscript-audit] Failed to apply corrections:', applyResult.error)
    }

    return new Response(JSON.stringify(audit), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Manuscript audit failed'
    console.error('[manuscript-audit] Error:', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
