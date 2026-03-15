import { createClient } from '@/lib/supabase/server'
import { assembleManuscript } from './assemble-manuscript'
import { MODEL_DEFAULTS } from '@/lib/models/registry'
import type { OutlineChapter } from '@/types/database'
import type {
  ProjectMemoryRow,
  PlotThread,
  ForeshadowingSeed,
  ContinuityFact,
} from '@/types/project-memory'

const DEFAULT_ORACLE_MODEL = MODEL_DEFAULTS.oracle

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface AuditFinding {
  type: 'thread_mismatch' | 'outline_drift' | 'orphaned_foreshadowing' | 'pacing'
  severity: 'high' | 'medium' | 'low'
  description: string
  suggestion: string
}

export interface ManuscriptAuditResult {
  findings: AuditFinding[]
  threadCorrections: {
    threadName: string
    action: 'close' | 'reopen'
    reason: string
  }[]
  foreshadowingCorrections: {
    seed: string
    action: 'resolve' | 'flag_urgent'
    reason: string
  }[]
  chaptersAnalyzed: number
}

// Raw JSON shape returned by Gemini
interface GeminiAuditResponse {
  findings: {
    type: string
    severity: string
    description: string
    suggestion: string
  }[]
  thread_corrections: {
    thread_name: string
    action: 'close' | 'reopen'
    reason: string
  }[]
  foreshadowing_corrections: {
    seed: string
    action: 'resolve' | 'flag_urgent'
    reason: string
  }[]
}

// ──────────────────────────────────────────────────────────────────────────────
// runManuscriptAudit — full-manuscript health check via Gemini
// ──────────────────────────────────────────────────────────────────────────────

export async function runManuscriptAudit(
  projectId: string,
  chapterNumber: number,
  apiKey: string,
  userId: string
): Promise<ManuscriptAuditResult> {
  const supabase = await createClient()

  // Fetch outline, memory, and model preference in parallel
  const [outlineResult, memoryResult, modelPrefResult, manuscript] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('outlines')
      .select('chapters')
      .eq('project_id', projectId)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('project_memory')
      .select('*')
      .eq('project_id', projectId)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('user_model_preferences')
      .select('model_id')
      .eq('user_id', userId)
      .eq('task_type', 'oracle')
      .maybeSingle(),
    // Include the just-written chapter in the manuscript
    assembleManuscript(projectId, chapterNumber + 1),
  ])

  const outlineChapters = (outlineResult.data as { chapters: OutlineChapter[] } | null)?.chapters ?? []
  const memory = memoryResult.data as ProjectMemoryRow | null

  const modelId =
    modelPrefResult.data && typeof (modelPrefResult.data as { model_id?: string }).model_id === 'string'
      ? (modelPrefResult.data as { model_id: string }).model_id
      : DEFAULT_ORACLE_MODEL

  if (!manuscript.text || !memory) {
    return { findings: [], threadCorrections: [], foreshadowingCorrections: [], chaptersAnalyzed: 0 }
  }

  // Build condensed memory state for the prompt
  const openThreads = (memory.plot_threads ?? []).filter((t: PlotThread) => t.status !== 'resolved')
  const unresolvedForeshadowing = (memory.foreshadowing ?? []).filter((f: ForeshadowingSeed) => !f.resolved)
  const unresolvedContinuity = (memory.continuity_facts ?? []).filter((f: ContinuityFact) => !f.resolved)

  const outlineSummary = outlineChapters
    .map((ch: OutlineChapter) => `Ch${ch.number} "${ch.title}" (Act ${ch.act}, ${ch.beat_sheet_mapping}): ${ch.summary}`)
    .join('\n')

  const threadsSummary = openThreads.length > 0
    ? openThreads.map((t: PlotThread) => `- "${t.name}" (${t.status}, introduced Ch${t.chapterReferences?.[0] ?? '?'}): ${t.description.slice(0, 120)}`).join('\n')
    : 'None tracked'

  const foreshadowingSummary = unresolvedForeshadowing.length > 0
    ? unresolvedForeshadowing.map((f: ForeshadowingSeed) => `- "${f.seed}" (planted Ch${f.plantedChapter}, intended: ${f.intendedPayoff})`).join('\n')
    : 'None'

  const continuitySummary = unresolvedContinuity.length > 0
    ? unresolvedContinuity.slice(-20).map((f: ContinuityFact) => `- [Ch${f.introducedChapter}, ${f.category}] ${f.fact}`).join('\n')
    : 'None'

  const systemPrompt = `You are a manuscript auditor for a novel writing system. You compare the ACTUAL prose written so far against the planned outline and the system's memory state to find drift, open loops, and tracking errors. Be precise and specific — reference actual chapter numbers and content. Return JSON only.`

  const userPrompt = `FULL MANUSCRIPT (${manuscript.chaptersIncluded} chapters written through Chapter ${chapterNumber}):

${manuscript.text}

---

FULL OUTLINE (${outlineChapters.length} total chapters planned):
${outlineSummary}

---

MEMORY STATE — OPEN PLOT THREADS (what our system thinks is still open):
${threadsSummary}

MEMORY STATE — UNRESOLVED FORESHADOWING:
${foreshadowingSummary}

MEMORY STATE — RECENT CONTINUITY FACTS:
${continuitySummary}

---

Audit the manuscript against the outline and memory state. Return JSON:
{
  "findings": [
    {
      "type": "thread_mismatch" | "outline_drift" | "orphaned_foreshadowing" | "pacing",
      "severity": "high" | "medium" | "low",
      "description": "specific, actionable finding referencing chapter numbers",
      "suggestion": "what to do about it in upcoming chapters"
    }
  ],
  "thread_corrections": [
    {
      "thread_name": "exact name from the open threads list above",
      "action": "close" | "reopen",
      "reason": "why the memory state is wrong"
    }
  ],
  "foreshadowing_corrections": [
    {
      "seed": "exact seed text from the unresolved list above",
      "action": "resolve" | "flag_urgent",
      "reason": "why — e.g. was actually paid off in Ch X, or only N chapters remain"
    }
  ]
}

Rules:
- Only include genuine issues. If the story is on track, return empty arrays.
- thread_corrections: flag threads the memory says are open but the prose actually resolved, or vice versa.
- foreshadowing_corrections: flag seeds already paid off in prose but not marked resolved, or seeds that are becoming urgent given remaining chapters.
- outline_drift: flag chapters where the prose meaningfully departed from the planned outline beats.
- pacing: flag if the story is significantly ahead/behind where it should be structurally.
- Output ONLY raw JSON, no markdown fences.`

  const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Meridian',
    },
    body: JSON.stringify({
      model: modelId,
      stream: false,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!orResponse.ok) {
    throw new Error(`Manuscript audit request failed: ${orResponse.status}`)
  }

  const orJson = (await orResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = orJson.choices?.[0]?.message?.content
  if (!content) throw new Error('No content from audit model')

  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const parsed = JSON.parse(cleaned) as GeminiAuditResponse

  return {
    findings: (parsed.findings ?? []).map((f) => ({
      type: f.type as AuditFinding['type'],
      severity: f.severity as AuditFinding['severity'],
      description: f.description,
      suggestion: f.suggestion,
    })),
    threadCorrections: (parsed.thread_corrections ?? []).map((tc) => ({
      threadName: tc.thread_name,
      action: tc.action,
      reason: tc.reason,
    })),
    foreshadowingCorrections: (parsed.foreshadowing_corrections ?? []).map((fc) => ({
      seed: fc.seed,
      action: fc.action,
      reason: fc.reason,
    })),
    chaptersAnalyzed: manuscript.chaptersIncluded,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// applyAuditToMemory — reconcile memory state based on audit findings
// ──────────────────────────────────────────────────────────────────────────────

export async function applyAuditToMemory(
  projectId: string,
  audit: ManuscriptAuditResult
): Promise<{ success: true } | { error: string }> {
  if (audit.threadCorrections.length === 0 && audit.foreshadowingCorrections.length === 0) {
    return { success: true }
  }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memoryRow, error: memoryError } = await (supabase as any)
    .from('project_memory')
    .select('plot_threads, foreshadowing')
    .eq('project_id', projectId)
    .single()

  if (memoryError || !memoryRow) {
    return { error: 'Project memory not found' }
  }

  const memory = memoryRow as { plot_threads: PlotThread[]; foreshadowing: ForeshadowingSeed[] }
  let changed = false

  // Apply thread corrections
  const updatedThreads = [...(memory.plot_threads ?? [])]
  for (const correction of audit.threadCorrections) {
    const idx = updatedThreads.findIndex(
      (t) => t.name.toLowerCase() === correction.threadName.toLowerCase()
    )
    if (idx === -1) continue

    if (correction.action === 'close' && updatedThreads[idx].status !== 'resolved') {
      updatedThreads[idx] = { ...updatedThreads[idx], status: 'resolved' }
      changed = true
      console.log(`[audit] Closing thread "${correction.threadName}": ${correction.reason}`)
    } else if (correction.action === 'reopen' && updatedThreads[idx].status === 'resolved') {
      updatedThreads[idx] = { ...updatedThreads[idx], status: 'active' }
      changed = true
      console.log(`[audit] Reopening thread "${correction.threadName}": ${correction.reason}`)
    }
  }

  // Apply foreshadowing corrections
  const updatedForeshadowing = [...(memory.foreshadowing ?? [])]
  for (const correction of audit.foreshadowingCorrections) {
    const idx = updatedForeshadowing.findIndex(
      (f) => f.seed.toLowerCase().includes(correction.seed.toLowerCase().slice(0, 30))
    )
    if (idx === -1) continue

    if (correction.action === 'resolve' && !updatedForeshadowing[idx].resolved) {
      updatedForeshadowing[idx] = { ...updatedForeshadowing[idx], resolved: true }
      changed = true
      console.log(`[audit] Resolving foreshadowing "${correction.seed.slice(0, 40)}": ${correction.reason}`)
    }
    // flag_urgent is informational — surfaces in findings, no memory mutation needed
  }

  if (!changed) return { success: true }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('project_memory')
    .update({
      plot_threads: updatedThreads,
      foreshadowing: updatedForeshadowing,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)

  if (updateError) {
    return { error: `Failed to apply audit corrections: ${(updateError as { message?: string }).message ?? 'unknown'}` }
  }

  return { success: true }
}
