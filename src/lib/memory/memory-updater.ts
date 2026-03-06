import { createClient } from '@/lib/supabase/server'
import type {
  ProjectMemoryRow,
  CharacterState,
  PlotThread,
  TimelineEntry,
  ForeshadowingSeed,
  ContinuityFact,
  ThematicEntry,
  StateDiff,
} from '@/types/project-memory'
import type { ChapterAnalysis } from './analysis-prompt'

// ──────────────────────────────────────────────────────────────────────────────
// applyAnalysisToMemory
// Merges a ChapterAnalysis into project_memory and updates the chapter_checkpoint.
// ──────────────────────────────────────────────────────────────────────────────

export async function applyAnalysisToMemory(
  projectId: string,
  chapterNumber: number,
  analysis: ChapterAnalysis
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  // Fetch current project_memory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memoryRow, error: memoryError } = await (supabase as any)
    .from('project_memory')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (memoryError || !memoryRow) {
    return { error: 'Project memory not found' }
  }

  const memory = memoryRow as ProjectMemoryRow

  // ── Merge character states ──────────────────────────────────────────────

  const updatedCharacterStates: Record<string, CharacterState> = {
    ...(memory.character_states ?? {}),
  }

  for (const update of analysis.character_updates) {
    const existing = updatedCharacterStates[update.name] ?? {
      name: update.name,
      emotionalState: '',
      knowledge: [],
      relationships: {},
      physicalState: '',
      location: '',
    }

    // Merge knowledge: append newly gained items
    const mergedKnowledge = Array.from(
      new Set([...(existing.knowledge ?? []), ...(update.knowledge_gained ?? [])])
    )

    // Merge relationships: overlay changes onto existing
    const mergedRelationships = { ...(existing.relationships ?? {}), ...update.relationship_changes }

    updatedCharacterStates[update.name] = {
      name: update.name,
      emotionalState: update.emotional_state,
      physicalState: update.physical_state,
      location: update.location,
      knowledge: mergedKnowledge,
      relationships: mergedRelationships,
    }
  }

  // ── Merge timeline ──────────────────────────────────────────────────────

  const newTimelineEntries: TimelineEntry[] = (analysis.timeline_events ?? []).map((e) => ({
    chapterNumber,
    event: e.event,
    storyTime: e.story_time,
  }))

  const updatedTimeline: TimelineEntry[] = [
    ...(memory.timeline ?? []),
    ...newTimelineEntries,
  ]

  // ── Merge plot threads ──────────────────────────────────────────────────

  const updatedPlotThreads: PlotThread[] = [...(memory.plot_threads ?? [])]

  // Update existing threads by name match
  for (const update of analysis.plot_thread_updates ?? []) {
    const idx = updatedPlotThreads.findIndex(
      (t) => t.name.toLowerCase() === update.name.toLowerCase()
    )
    if (idx !== -1) {
      updatedPlotThreads[idx] = {
        ...updatedPlotThreads[idx],
        status: update.new_status,
        description: updatedPlotThreads[idx].description + ' | ' + update.development,
        chapterReferences: [...(updatedPlotThreads[idx].chapterReferences ?? []), chapterNumber],
      }
    }
  }

  // Add new plot threads
  for (const newThread of analysis.new_plot_threads ?? []) {
    updatedPlotThreads.push({
      id: crypto.randomUUID(),
      name: newThread.name,
      description: newThread.description,
      status: 'introduced',
      chapterReferences: [chapterNumber],
    })
  }

  // ── Merge foreshadowing ─────────────────────────────────────────────────

  const updatedForeshadowing: ForeshadowingSeed[] = [...(memory.foreshadowing ?? [])]

  // Mark paid-off seeds as resolved
  for (const paidOff of analysis.foreshadowing_paid_off ?? []) {
    const idx = updatedForeshadowing.findIndex(
      (f) => f.seed.toLowerCase().includes(paidOff.toLowerCase().slice(0, 30))
    )
    if (idx !== -1) {
      updatedForeshadowing[idx] = {
        ...updatedForeshadowing[idx],
        resolved: true,
        payoffChapter: chapterNumber,
      }
    }
  }

  // Add newly planted seeds
  for (const newSeed of analysis.new_foreshadowing ?? []) {
    updatedForeshadowing.push({
      seed: newSeed.seed,
      plantedChapter: chapterNumber,
      intendedPayoff: newSeed.intended_payoff,
      payoffChapter: null,
      resolved: false,
    })
  }

  // ── Merge continuity facts ──────────────────────────────────────────────

  const updatedContinuityFacts: ContinuityFact[] = [...(memory.continuity_facts ?? [])]

  for (const fact of analysis.new_continuity_facts ?? []) {
    updatedContinuityFacts.push({
      fact: fact.fact,
      category: fact.category,
      resolved: false,
      introducedChapter: chapterNumber,
    })
  }

  // ── Merge thematic development ──────────────────────────────────────────

  const updatedThematicDevelopment: ThematicEntry[] = [...(memory.thematic_development ?? [])]

  for (const entry of analysis.thematic_development ?? []) {
    updatedThematicDevelopment.push({
      theme: entry.theme,
      chapterNumber,
      development: entry.development,
    })
  }

  // ── Write updated project_memory ────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memUpdateError } = await (supabase as any)
    .from('project_memory')
    .update({
      character_states: updatedCharacterStates,
      timeline: updatedTimeline,
      plot_threads: updatedPlotThreads,
      foreshadowing: updatedForeshadowing,
      continuity_facts: updatedContinuityFacts,
      thematic_development: updatedThematicDevelopment,
      last_checkpoint_chapter: Math.max(memory.last_checkpoint_chapter ?? 0, chapterNumber),
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)

  if (memUpdateError) {
    return { error: `Failed to update project memory: ${(memUpdateError as { message?: string }).message ?? 'unknown'}` }
  }

  // ── Update chapter_checkpoint summary + state_diff ──────────────────────

  const stateDiff: StateDiff = {
    newThreads: (analysis.new_plot_threads ?? []).map((t) => t.name),
    advancedThreads: (analysis.plot_thread_updates ?? [])
      .filter((u) => u.new_status === 'advanced')
      .map((u) => u.name),
    resolvedThreads: (analysis.plot_thread_updates ?? [])
      .filter((u) => u.new_status === 'resolved')
      .map((u) => u.name),
    characterChanges: Object.fromEntries(
      (analysis.character_updates ?? []).map((u) => [
        u.name,
        `${u.emotional_state} @ ${u.location}`,
      ])
    ),
    newContinuityFacts: (analysis.new_continuity_facts ?? []).map((f) => f.fact),
    newForeshadowing: (analysis.new_foreshadowing ?? []).map((f) => f.seed),
  }

  const continuityNotes = (analysis.new_continuity_facts ?? []).map((f) => f.fact)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: cpError } = await (supabase as any)
    .from('chapter_checkpoints')
    .update({
      summary: analysis.summary,
      state_diff: stateDiff,
      continuity_notes: continuityNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber)

  if (cpError) {
    // Non-fatal — memory was already updated
    console.error('Failed to update chapter checkpoint state_diff:', cpError)
  }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// syncStoryBibleToMemory
// Lightweight sync: re-reads characters + locations from DB and updates identity.
// No AI call. Called after story bible edits.
// ──────────────────────────────────────────────────────────────────────────────

export async function syncStoryBibleToMemory(
  projectId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  // Fetch characters and locations in parallel
  const [charsResult, locsResult, memResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('characters')
      .select('name')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('locations')
      .select('name')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('project_memory')
      .select('identity')
      .eq('project_id', projectId)
      .single(),
  ])

  if (memResult.error || !memResult.data) {
    return { error: 'Project memory not found' }
  }

  const castList = ((charsResult.data ?? []) as { name: string }[]).map((c) => c.name)
  const locationList = ((locsResult.data ?? []) as { name: string }[]).map((l) => l.name)

  const currentIdentity = (memResult.data as { identity: Record<string, unknown> }).identity ?? {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('project_memory')
    .update({
      identity: { ...currentIdentity, castList, locationList },
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)

  if (updateError) {
    return { error: `Failed to sync story bible to memory: ${(updateError as { message?: string }).message ?? 'unknown'}` }
  }

  return { success: true }
}
