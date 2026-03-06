export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { buildPartialAnalysis } from '@/lib/memory/analysis-validator'
import { applyAnalysisToMemory } from '@/lib/memory/memory-updater'
import type { ChapterAnalysis } from '@/lib/memory/analysis-prompt'
import type { ScoredChange } from '@/lib/memory/analysis-validator'

interface ResolveBody {
  decisions: Record<string, 'approve' | 'reject'>
}

interface ValidationRow {
  id: string
  project_id: string
  chapter_number: number
  proposed_changes: ChapterAnalysis
  scored_changes: ScoredChange[]
  status: string
}

export async function POST(
  request: Request,
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

  let body: ResolveBody
  try {
    body = (await request.json()) as ResolveBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { decisions } = body
  if (!decisions || typeof decisions !== 'object') {
    return new Response(JSON.stringify({ error: 'Missing decisions object' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch the validation record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: validation, error: fetchError } = await (supabase as any)
    .from('analysis_validations')
    .select('id, project_id, chapter_number, proposed_changes, scored_changes, status')
    .eq('id', validationId)
    .single()

  if (fetchError || !validation) {
    return new Response(JSON.stringify({ error: 'Validation record not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const row = validation as ValidationRow

  // Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: projectError } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', row.project_id)
    .eq('user_id', user.id)
    .single()

  if (projectError) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (row.status !== 'pending') {
    return new Response(JSON.stringify({ error: 'Validation already resolved' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Collect approved keys
  const approvedKeys = new Set<string>(
    Object.entries(decisions)
      .filter(([, decision]) => decision === 'approve')
      .map(([key]) => key)
  )

  // Apply approved changes to project_memory
  if (approvedKeys.size > 0) {
    const partialAnalysis = buildPartialAnalysis(row.proposed_changes, approvedKeys)
    const applyResult = await applyAnalysisToMemory(
      row.project_id,
      row.chapter_number,
      partialAnalysis
    )
    if ('error' in applyResult) {
      return new Response(JSON.stringify({ error: applyResult.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // Determine final status: approved if any were approved, rejected if all were rejected
  const allRejected = Object.values(decisions).every((d) => d === 'reject')
  const finalStatus = allRejected ? 'rejected' : 'approved'

  // Update validation record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('analysis_validations')
    .update({ status: finalStatus, resolved_at: new Date().toISOString() })
    .eq('id', validationId)

  return new Response(
    JSON.stringify({ success: true, status: finalStatus, appliedCount: approvedKeys.size }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
