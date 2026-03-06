'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  ProjectIdentity,
  ProjectMemoryRow,
  ChapterCheckpointRow,
  PlotThread,
  CompressionResult,
  ContinuityFact,
  ForeshadowingSeed,
  CharacterState,
  TimelineEntry,
  ThematicEntry,
  StateDiff,
} from '@/types/project-memory'
import type { OutlineChapter } from '@/types/database'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function verifyProjectOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  return !error && !!project
}

// ──────────────────────────────────────────────────────────────────────────────
// initializeMemory — called after intake save
// ──────────────────────────────────────────────────────────────────────────────

export async function initializeMemory(
  projectId: string,
  identity: Partial<ProjectIdentity>
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) {
    return { error: 'Project not found or access denied' }
  }

  const fullIdentity: ProjectIdentity = {
    genre: identity.genre ?? null,
    themes: identity.themes ?? [],
    tone: identity.tone ?? null,
    setting: identity.setting ?? null,
    premise: identity.premise ?? null,
    castList: identity.castList ?? [],
    locationList: identity.locationList ?? [],
    storyBibleSummary: identity.storyBibleSummary ?? null,
    narrativeVoiceNotes: identity.narrativeVoiceNotes ?? null,
  }

  // Upsert — create if not exists, update identity if it does
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upsertError } = await (supabase as any)
    .from('project_memory')
    .upsert(
      {
        project_id: projectId,
        identity: fullIdentity,
      },
      { onConflict: 'project_id' }
    )

  if (upsertError) {
    return { error: upsertError.message }
  }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// updateMemoryIdentity — called after outline save/approve
// ──────────────────────────────────────────────────────────────────────────────

export async function updateMemoryIdentity(
  projectId: string,
  updates: Partial<ProjectIdentity>
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) {
    return { error: 'Project not found or access denied' }
  }

  // Fetch current identity to merge
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchError } = await (supabase as any)
    .from('project_memory')
    .select('identity')
    .eq('project_id', projectId)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError.message }
  }

  if (!existing) {
    // No memory row yet — initialize with updates
    return initializeMemory(projectId, updates)
  }

  const currentIdentity = (existing as { identity: ProjectIdentity }).identity
  const merged: ProjectIdentity = {
    ...currentIdentity,
    ...Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    ),
  } as ProjectIdentity

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('project_memory')
    .update({ identity: merged, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)

  if (updateError) {
    return { error: updateError.message }
  }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// seedPlotThreadsFromOutline — called after outline approval
// ──────────────────────────────────────────────────────────────────────────────

export async function seedPlotThreadsFromOutline(
  projectId: string,
  chapters: OutlineChapter[]
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) {
    return { error: 'Project not found or access denied' }
  }

  // Extract initial plot threads from outline beats.
  // Each chapter's summary becomes a thread seed. Group beats into threads by
  // looking at character arcs and recurring beat patterns.
  const threads: PlotThread[] = []

  // Create a main plot thread from the overall story arc
  threads.push({
    id: 'main-plot',
    name: 'Main Plot',
    description: chapters.map((c) => `Ch${c.number}: ${c.summary}`).join(' | '),
    status: 'introduced',
    chapterReferences: chapters.map((c) => c.number),
  })

  // Create character-based threads from characters who appear in multiple chapters
  const characterAppearances: Record<string, number[]> = {}
  for (const chapter of chapters) {
    for (const char of chapter.characters_featured) {
      if (!characterAppearances[char]) {
        characterAppearances[char] = []
      }
      characterAppearances[char].push(chapter.number)
    }
  }

  for (const [name, appearances] of Object.entries(characterAppearances)) {
    if (appearances.length >= 3) {
      threads.push({
        id: `character-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name: `${name}'s Arc`,
        description: `Character thread for ${name} across ${appearances.length} chapters`,
        status: 'introduced',
        chapterReferences: appearances,
      })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('project_memory')
    .update({
      plot_threads: threads,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)

  if (updateError) {
    return { error: updateError.message }
  }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// getProjectMemory — called before chapter generation
// ──────────────────────────────────────────────────────────────────────────────

export async function getProjectMemory(
  projectId: string
): Promise<{ data: ProjectMemoryRow | null } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) {
    return { error: 'Project not found or access denied' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_memory')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  return { data: (data as ProjectMemoryRow | null) ?? null }
}

// ──────────────────────────────────────────────────────────────────────────────
// getChapterCheckpoint — get a single chapter's checkpoint
// ──────────────────────────────────────────────────────────────────────────────

export async function getChapterCheckpoint(
  projectId: string,
  chapterNumber: number
): Promise<{ data: ChapterCheckpointRow | null } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) {
    return { error: 'Project not found or access denied' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('chapter_checkpoints')
    .select('*')
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  return { data: (data as ChapterCheckpointRow | null) ?? null }
}

// ──────────────────────────────────────────────────────────────────────────────
// saveChapterCheckpoint — called after AI compression pass
// ──────────────────────────────────────────────────────────────────────────────

export async function saveChapterCheckpoint(
  projectId: string,
  chapterNumber: number,
  chapterText: string,
  compression: CompressionResult
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) {
    return { error: 'Project not found or access denied' }
  }

  // 1. Fetch current memory to apply updates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memory, error: memoryError } = await (supabase as any)
    .from('project_memory')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (memoryError || !memory) {
    return { error: 'Project memory not found. Initialize memory first.' }
  }

  const mem = memory as ProjectMemoryRow

  // 2. Build the state diff for the checkpoint
  const stateDiff: StateDiff = {
    newThreads: compression.plotThreadUpdates
      .filter((t) => !mem.plot_threads.some((pt) => pt.id === t.id))
      .map((t) => t.name),
    advancedThreads: compression.plotThreadUpdates
      .filter((t) => t.status === 'advanced')
      .map((t) => t.name),
    resolvedThreads: compression.plotThreadUpdates
      .filter((t) => t.status === 'resolved')
      .map((t) => t.name),
    characterChanges: Object.fromEntries(
      compression.characterUpdates.map((cu) => [
        cu.name,
        cu.emotionalState,
      ])
    ),
    newContinuityFacts: compression.newContinuityFacts.map((f) => f.fact),
    newForeshadowing: compression.foreshadowingUpdates
      .filter((f) => !f.resolved)
      .map((f) => f.seed),
  }

  // 3. Upsert checkpoint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: checkpointError } = await (supabase as any)
    .from('chapter_checkpoints')
    .upsert(
      {
        project_id: projectId,
        chapter_number: chapterNumber,
        summary: compression.summary,
        state_diff: stateDiff,
        continuity_notes: compression.newContinuityFacts.map((f) => f.fact),
        chapter_text: chapterText,
      },
      { onConflict: 'project_id,chapter_number' }
    )

  if (checkpointError) {
    return { error: `Failed to save checkpoint: ${checkpointError.message}` }
  }

  // 4. Update Layer 2 trackers on project_memory
  const updatedTimeline: TimelineEntry[] = [
    ...mem.timeline,
    ...compression.timelineEvents,
  ]

  // Merge plot threads: update existing, add new
  const updatedThreads: PlotThread[] = [...mem.plot_threads]
  for (const update of compression.plotThreadUpdates) {
    const existing = updatedThreads.find((t) => t.id === update.id)
    if (existing) {
      existing.status = update.status
      existing.description = update.description
      if (!existing.chapterReferences.includes(chapterNumber)) {
        existing.chapterReferences.push(chapterNumber)
      }
    } else {
      updatedThreads.push({
        id: update.id,
        name: update.name,
        status: update.status,
        description: update.description,
        chapterReferences: [chapterNumber],
      })
    }
  }

  // Merge character states
  const updatedCharacters: Record<string, CharacterState> = {
    ...mem.character_states,
  }
  for (const cu of compression.characterUpdates) {
    updatedCharacters[cu.name] = {
      name: cu.name,
      emotionalState: cu.emotionalState,
      knowledge: cu.knowledge,
      relationships: Object.fromEntries(
        cu.relationships.map((r) => {
          const idx = r.indexOf(':')
          return idx > 0 ? [r.slice(0, idx).trim(), r.slice(idx + 1).trim()] : [r, '']
        })
      ),
      physicalState: cu.physicalState,
      location: cu.location,
    }
  }

  // Append new continuity facts, resolve old ones
  const updatedFacts: ContinuityFact[] = [...mem.continuity_facts]
  for (const resolvedFact of compression.resolvedContinuityFacts) {
    const fact = updatedFacts.find((f) => f.fact === resolvedFact)
    if (fact) {
      fact.resolved = true
    }
  }
  updatedFacts.push(...compression.newContinuityFacts)

  // Merge foreshadowing
  const updatedForeshadowing: ForeshadowingSeed[] = [...mem.foreshadowing]
  for (const update of compression.foreshadowingUpdates) {
    const existing = updatedForeshadowing.find((f) => f.seed === update.seed)
    if (existing) {
      existing.resolved = update.resolved
      if (update.resolved) {
        existing.payoffChapter = chapterNumber
      }
    } else {
      updatedForeshadowing.push({
        seed: update.seed,
        plantedChapter: chapterNumber,
        intendedPayoff: update.intendedPayoff,
        payoffChapter: update.resolved ? chapterNumber : null,
        resolved: update.resolved,
      })
    }
  }

  // Append thematic development
  const updatedThematic: ThematicEntry[] = [
    ...mem.thematic_development,
    ...compression.thematicDevelopment.map((t) => ({
      theme: t.theme,
      chapterNumber,
      development: t.development,
    })),
  ]

  // 5. Write all tracker updates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('project_memory')
    .update({
      timeline: updatedTimeline,
      plot_threads: updatedThreads,
      character_states: updatedCharacters,
      continuity_facts: updatedFacts,
      foreshadowing: updatedForeshadowing,
      thematic_development: updatedThematic,
      last_checkpoint_chapter: chapterNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)

  if (updateError) {
    return { error: `Failed to update trackers: ${updateError.message}` }
  }

  revalidatePath(`/projects/${projectId}`)

  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// resetMemory — called on outline regeneration
// ──────────────────────────────────────────────────────────────────────────────

export async function resetMemory(
  projectId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) {
    return { error: 'Project not found or access denied' }
  }

  // Delete all checkpoints for this project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase as any)
    .from('chapter_checkpoints')
    .delete()
    .eq('project_id', projectId)

  if (deleteError) {
    return { error: `Failed to delete checkpoints: ${deleteError.message}` }
  }

  // Reset Layer 2 trackers but preserve Layer 1 identity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('project_memory')
    .update({
      timeline: [],
      plot_threads: [],
      character_states: {},
      continuity_facts: [],
      foreshadowing: [],
      thematic_development: [],
      last_checkpoint_chapter: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)

  if (updateError) {
    return { error: `Failed to reset trackers: ${updateError.message}` }
  }

  return { success: true }
}
