import { createClient } from '@/lib/supabase/server'
import type { ChapterAnalysis } from './analysis-prompt'
import type { ProjectMemoryRow } from '@/types/project-memory'
import { applyAnalysisToMemory } from './memory-updater'

// Haiku for fast, cheap scoring. Check user_model_preferences for 'validation' task type first.
const DEFAULT_VALIDATION_MODEL = 'anthropic/claude-haiku-4.5'

// ── Types ───────────────────────────────────────────────────────────────────

export type ChangeDecision = 'auto_apply' | 'flag' | 'block' | 'reject'

export interface ScoredChange {
  key: string          // e.g. 'character_update.John Smith'
  type: string         // e.g. 'character_update'
  proposed: unknown    // the original proposed data
  confidence: number   // 0–100
  reasoning: string
  decision: ChangeDecision
}

export interface ValidationResult {
  validationId: string | null  // null if all auto-applied and not persisted as pending
  pendingCount: number         // block + reject items needing author action
  autoAppliedCount: number     // auto_apply + flag items applied immediately
  status: 'auto_applied' | 'pending'
}

// ── Flatten ChapterAnalysis into scoreable items ─────────────────────────────

interface ChangeInput {
  key: string
  type: string
  data: unknown
}

function flattenAnalysis(analysis: ChapterAnalysis): ChangeInput[] {
  const items: ChangeInput[] = []

  items.push({ key: 'summary', type: 'summary', data: analysis.summary })

  for (const u of analysis.character_updates ?? []) {
    items.push({ key: `character_update.${u.name}`, type: 'character_update', data: u })
  }
  for (let i = 0; i < (analysis.timeline_events ?? []).length; i++) {
    items.push({ key: `timeline_event.${i}`, type: 'timeline_event', data: analysis.timeline_events[i] })
  }
  for (const u of analysis.plot_thread_updates ?? []) {
    items.push({ key: `plot_thread_update.${u.name}`, type: 'plot_thread_update', data: u })
  }
  for (const t of analysis.new_plot_threads ?? []) {
    items.push({ key: `new_plot_thread.${t.name}`, type: 'new_plot_thread', data: t })
  }
  for (let i = 0; i < (analysis.foreshadowing_paid_off ?? []).length; i++) {
    items.push({ key: `foreshadowing_payoff.${i}`, type: 'foreshadowing_payoff', data: analysis.foreshadowing_paid_off[i] })
  }
  for (let i = 0; i < (analysis.new_foreshadowing ?? []).length; i++) {
    items.push({ key: `new_foreshadowing.${i}`, type: 'new_foreshadowing', data: analysis.new_foreshadowing[i] })
  }
  for (let i = 0; i < (analysis.new_continuity_facts ?? []).length; i++) {
    items.push({ key: `continuity_fact.${i}`, type: 'continuity_fact', data: analysis.new_continuity_facts[i] })
  }
  for (const t of analysis.thematic_development ?? []) {
    items.push({ key: `thematic.${t.theme}`, type: 'thematic', data: t })
  }

  return items
}

// ── Reconstruct partial ChapterAnalysis from an approved key set ─────────────

export function buildPartialAnalysis(
  analysis: ChapterAnalysis,
  approvedKeys: Set<string>
): ChapterAnalysis {
  return {
    summary: approvedKeys.has('summary') ? analysis.summary : '',
    character_updates: (analysis.character_updates ?? []).filter((u) =>
      approvedKeys.has(`character_update.${u.name}`)
    ),
    timeline_events: (analysis.timeline_events ?? []).filter((_, i) =>
      approvedKeys.has(`timeline_event.${i}`)
    ),
    plot_thread_updates: (analysis.plot_thread_updates ?? []).filter((u) =>
      approvedKeys.has(`plot_thread_update.${u.name}`)
    ),
    new_plot_threads: (analysis.new_plot_threads ?? []).filter((t) =>
      approvedKeys.has(`new_plot_thread.${t.name}`)
    ),
    foreshadowing_paid_off: (analysis.foreshadowing_paid_off ?? []).filter((_, i) =>
      approvedKeys.has(`foreshadowing_payoff.${i}`)
    ),
    new_foreshadowing: (analysis.new_foreshadowing ?? []).filter((_, i) =>
      approvedKeys.has(`new_foreshadowing.${i}`)
    ),
    new_continuity_facts: (analysis.new_continuity_facts ?? []).filter((_, i) =>
      approvedKeys.has(`continuity_fact.${i}`)
    ),
    thematic_development: (analysis.thematic_development ?? []).filter((t) =>
      approvedKeys.has(`thematic.${t.theme}`)
    ),
  }
}

// ── Confidence → decision mapping ────────────────────────────────────────────

function decisionFromScore(confidence: number): ChangeDecision {
  if (confidence >= 85) return 'auto_apply'
  if (confidence >= 60) return 'flag'
  if (confidence >= 35) return 'block'
  return 'reject'
}

// ── Haiku scoring call ───────────────────────────────────────────────────────

async function scoreChanges(
  items: ChangeInput[],
  memory: ProjectMemoryRow,
  chapterNumber: number,
  apiKey: string,
  modelId: string,
  chapterText: string
): Promise<ScoredChange[]> {
  if (items.length === 0) return []

  const memoryContext = {
    genre: memory.identity.genre,
    characters: Object.fromEntries(
      Object.values(memory.character_states ?? {}).map((c) => [
        c.name,
        { emotional: c.emotionalState, physical: c.physicalState, location: c.location },
      ])
    ),
    activeThreads: (memory.plot_threads ?? [])
      .filter((t) => t.status !== 'resolved')
      .map((t) => ({ name: t.name, status: t.status })),
    unresolvedForeshadowing: (memory.foreshadowing ?? [])
      .filter((f) => !f.resolved)
      .map((f) => f.seed),
  }

  const systemPrompt = `You are a continuity validator for a novel writing system. You receive the current story memory and a list of proposed changes extracted from Chapter ${chapterNumber}.

For each proposed change, score your confidence (0–100) that the change is accurate, consistent with established story facts, and not a hallucination or premature resolution.

Scoring guide:
- 85–100: Clearly and explicitly supported by the chapter text
- 60–84: Likely correct but implied rather than stated
- 35–59: Uncertain — may be an overreach, assumption, or premature conclusion
- 0–34: Likely wrong — contradicts established facts, resolves something not yet resolved, or appears hallucinated

Output ONLY raw JSON, no markdown code fences.`

  const userPrompt = `## Chapter ${chapterNumber} Text
${chapterText.slice(0, 8000)}

## Current Memory State
${JSON.stringify(memoryContext, null, 2)}

## Proposed Changes (${items.length} items)
${JSON.stringify(items.map((i) => ({ key: i.key, type: i.type, proposed: i.data })), null, 2)}

## Required Output
Return a JSON array with exactly ${items.length} objects in the same order as the input:
[
  {
    "key": "<exact key from input>",
    "confidence": <integer 0–100>,
    "reasoning": "<1–2 sentence explanation>",
    "decision": "<auto_apply | flag | block | reject>"
  }
]

Decision must match the score: ≥85 → auto_apply, 60–84 → flag, 35–59 → block, 0–34 → reject.`

  const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'StoryWriter',
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
    throw new Error(`Haiku scoring request failed: ${orResponse.status}`)
  }

  const orJson = (await orResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = orJson.choices?.[0]?.message?.content
  if (!content) throw new Error('No content from Haiku scorer')

  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const rawScores = JSON.parse(cleaned) as Array<{
    key: string
    confidence: number
    reasoning: string
    decision: ChangeDecision
  }>

  const keyToScore = new Map(rawScores.map((s) => [s.key, s]))

  return items.map((item) => {
    const score = keyToScore.get(item.key)
    const confidence = score?.confidence ?? 50
    const decision = score?.decision ?? decisionFromScore(confidence)
    return {
      key: item.key,
      type: item.type,
      proposed: item.data,
      confidence,
      reasoning: score?.reasoning ?? 'Not scored',
      decision,
    }
  })
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function validateAndApplyAnalysis(
  projectId: string,
  chapterNumber: number,
  analysis: ChapterAnalysis,
  memory: ProjectMemoryRow,
  apiKey: string,
  userId: string,
  chapterText: string
): Promise<ValidationResult> {
  const supabase = await createClient()

  // Check for user-configured validation model preference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: modelPref } = await (supabase as any)
    .from('user_model_preferences')
    .select('model_id')
    .eq('user_id', userId)
    .eq('task_type', 'validation')
    .maybeSingle()

  const modelId =
    modelPref && typeof (modelPref as { model_id?: string }).model_id === 'string'
      ? (modelPref as { model_id: string }).model_id
      : DEFAULT_VALIDATION_MODEL

  // Flatten into scoreable items
  const items = flattenAnalysis(analysis)

  let scored: ScoredChange[]
  try {
    scored = await scoreChanges(items, memory, chapterNumber, apiKey, modelId, chapterText)
  } catch (err) {
    // Fail-open: if Haiku scoring fails, apply everything directly (same as old behavior)
    console.error('[analysis-validator] Scoring failed, falling back to direct apply:', err)
    await applyAnalysisToMemory(projectId, chapterNumber, analysis)
    return {
      validationId: null,
      pendingCount: 0,
      autoAppliedCount: items.length,
      status: 'auto_applied',
    }
  }

  // Partition: auto_apply + flag → apply now; block + reject → hold for review
  const autoApplyKeys = new Set(
    scored
      .filter((s) => s.decision === 'auto_apply' || s.decision === 'flag')
      .map((s) => s.key)
  )
  const pendingItems = scored.filter((s) => s.decision === 'block' || s.decision === 'reject')

  // Apply auto_apply + flag changes immediately
  if (autoApplyKeys.size > 0) {
    const partialAnalysis = buildPartialAnalysis(analysis, autoApplyKeys)
    const applyResult = await applyAnalysisToMemory(projectId, chapterNumber, partialAnalysis)
    if ('error' in applyResult) {
      console.error('[analysis-validator] Failed to apply auto-approved changes:', applyResult.error)
    }
  }

  const hasPending = pendingItems.length > 0
  const status = hasPending ? 'pending' : 'auto_applied'

  // Always store a record (for auditability); only return validationId when pending
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: validationRow, error: validationInsertError } = await (supabase as any)
    .from('analysis_validations')
    .insert({
      project_id: projectId,
      chapter_number: chapterNumber,
      proposed_changes: analysis,
      scored_changes: scored,
      status,
    })
    .select('id')
    .single()

  if (validationInsertError) {
    console.error('[analysis-validator] Failed to insert validation record:', validationInsertError.message)
  }

  const validationId = (validationRow as { id: string } | null)?.id ?? null

  return {
    validationId: hasPending ? validationId : null,
    pendingCount: pendingItems.length,
    autoAppliedCount: autoApplyKeys.size,
    status,
  }
}
