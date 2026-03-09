'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OutlineChapter, OutlineRow, BeatSheetId, NovelLength } from '@/types/database'
import type { IntakeData } from '@/lib/validations/intake'
import type { GeneratedOutline } from '@/lib/outline/schema'
import { seedStoryBibleFromOutline, preseedIntakeCharacters } from '@/actions/story-bible'
import {
  updateMemoryIdentity,
  seedPlotThreadsFromOutline as seedMemoryPlotThreads,
  resetMemory,
} from '@/actions/project-memory'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Verify the authenticated user owns the given project.
 * Returns user.id if authorized, null otherwise.
 */
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
// saveOutline
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Create or update the outline for a project.
 *
 * If an outline already exists (unique constraint on project_id):
 *   - Snapshot current chapters into previous_chapters
 *   - Update with new generated data
 *
 * If no outline exists: insert a new draft row.
 *
 * Also updates the project title and chapter_count from the generated outline.
 */
export async function saveOutline(
  projectId: string,
  outlineData: GeneratedOutline,
  intakeData: IntakeData
): Promise<{ success: true; outlineId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // Verify project ownership
  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) {
    return { error: 'Project not found or access denied' }
  }

  // Check if an outline already exists for this project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingOutline, error: existingError } = await (supabase as any)
    .from('outlines')
    .select('id, chapters')
    .eq('project_id', projectId)
    .maybeSingle()

  if (existingError) {
    return { error: `Failed to check existing outline: ${existingError.message}` }
  }

  const beatSheetId = (intakeData.beatSheet as BeatSheetId | null) ?? 'three-act'
  const targetLength = intakeData.targetLength as NovelLength
  const chapterCount = outlineData.chapters.length

  let outlineId: string

  if (existingOutline) {
    // Snapshot current chapters into previous_chapters before overwriting
    const currentChapters = (existingOutline as { id: string; chapters: OutlineChapter[] }).chapters

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateError } = await (supabase as any)
      .from('outlines')
      .update({
        chapters: outlineData.chapters,
        previous_chapters: currentChapters ?? null,
        beat_sheet_id: beatSheetId,
        target_length: targetLength,
        chapter_count: chapterCount,
        status: 'draft',
        approved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .select('id')
      .single()

    if (updateError || !updated) {
      return {
        error: (updateError as { message?: string })?.message ?? 'Failed to update outline',
      }
    }

    outlineId = (updated as { id: string }).id

    // Outline regenerated — reset Layer 2/3 memory (story has changed)
    const resetResult = await resetMemory(projectId)
    if ('error' in resetResult) {
      console.error('Failed to reset project memory on regeneration:', resetResult.error)
    }
  } else {
    // Insert new outline row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: insertError } = await (supabase as any)
      .from('outlines')
      .insert({
        project_id: projectId,
        beat_sheet_id: beatSheetId,
        target_length: targetLength,
        chapter_count: chapterCount,
        chapters: outlineData.chapters,
        previous_chapters: null,
        status: 'draft',
        approved_at: null,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      return {
        error: (insertError as { message?: string })?.message ?? 'Failed to save outline',
      }
    }

    outlineId = (inserted as { id: string }).id
  }

  // Update the project title and chapter_count from generated outline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: projectUpdateError } = await (supabase as any)
    .from('projects')
    .update({
      title: outlineData.title,
      chapter_count: chapterCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  if (projectUpdateError) {
    // Log but don't fail — the outline itself was saved successfully
    console.error('Failed to update project title/chapter_count:', projectUpdateError)
  }

  // Enrich memory identity with outline data (premise, cast, locations)
  const castList = outlineData.characters.map((c) => c.name)
  const locationList = outlineData.locations.map((l) => l.name)
  const identityResult = await updateMemoryIdentity(projectId, {
    premise: outlineData.premise,
    castList,
    locationList,
  })
  if ('error' in identityResult) {
    console.error('Failed to enrich memory identity from outline:', identityResult.error)
  }

  revalidatePath(`/projects/${projectId}/outline`)

  return { success: true, outlineId }
}

// ──────────────────────────────────────────────────────────────────────────────
// getOutline
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve the outline for a project.
 * Returns null if no outline exists yet.
 */
export async function getOutline(
  projectId: string
): Promise<{ data: OutlineRow | null } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // Verify project access (user must own the project)
  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) {
    return { error: 'Project not found or access denied' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: outline, error: outlineError } = await (supabase as any)
    .from('outlines')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (outlineError) {
    return { error: outlineError.message }
  }

  return { data: (outline as OutlineRow | null) ?? null }
}

// ──────────────────────────────────────────────────────────────────────────────
// updateOutlineChapter
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Update a single chapter in the outline's chapters JSONB array.
 * Fetches current outline, applies partial updates to the specified chapter index,
 * and saves the updated array back to the database.
 */
export async function updateOutlineChapter(
  projectId: string,
  chapterIndex: number,
  updates: Partial<OutlineChapter>
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // Verify project ownership
  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) {
    return { error: 'Project not found or access denied' }
  }

  // Fetch current outline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: outline, error: fetchError } = await (supabase as any)
    .from('outlines')
    .select('id, chapters')
    .eq('project_id', projectId)
    .single()

  if (fetchError || !outline) {
    return { error: 'Outline not found for this project' }
  }

  const currentChapters = (outline as { id: string; chapters: OutlineChapter[] }).chapters

  if (chapterIndex < 0 || chapterIndex >= currentChapters.length) {
    return { error: `Chapter index ${chapterIndex} is out of range` }
  }

  // Apply partial updates to the specific chapter
  const updatedChapters = currentChapters.map((chapter, index) => {
    if (index === chapterIndex) {
      return { ...chapter, ...updates }
    }
    return chapter
  })

  // Save updated chapters array back to database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateError } = await (supabase as any)
    .from('outlines')
    .update({
      chapters: updatedChapters,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .select('id')
    .single()

  if (updateError || !updated) {
    return { error: updateError?.message ?? 'Failed to update chapter' }
  }

  revalidatePath(`/projects/${projectId}/outline`)

  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// approveOutline
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Approve the outline for a project.
 *
 * 1. Marks the outline status as 'approved' with an approved_at timestamp.
 * 2. Seeds the story bible (characters and locations) from the outline data.
 * 3. Transitions the project status from 'draft' to 'writing'.
 * 4. Updates the project title from the outline title.
 * 5. Revalidates affected paths.
 *
 * This is the critical state transition: draft → approved (outline), draft → writing (project).
 */
export async function approveOutline(
  projectId: string,
  outlineId: string,
  outlineData: GeneratedOutline
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // Verify project ownership
  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) {
    return { error: 'Project not found or access denied' }
  }

  // 1. Mark outline as approved
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: approveError } = await (supabase as any)
    .from('outlines')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', outlineId)
    .eq('project_id', projectId)

  if (approveError) {
    return { error: (approveError as { message?: string }).message ?? 'Failed to approve outline' }
  }

  // 2a. Pre-seed intake characters as source:'manual' before outline merge
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projectData } = await (supabase as any)
    .from('projects')
    .select('intake_data')
    .eq('id', projectId)
    .single()

  const intakeData = (projectData as { intake_data: Record<string, unknown> | null } | null)?.intake_data
  const intakeCharacters = intakeData?.characters as { name: string; appearance?: string; personality?: string; backstory?: string; arc?: string }[] | undefined
  if (intakeCharacters?.length) {
    await preseedIntakeCharacters(projectId, intakeCharacters)
  }

  // 2b. Seed story bible from outline data (OUTL-05)
  const seedResult = await seedStoryBibleFromOutline(projectId, outlineData)
  if ('error' in seedResult) {
    return { error: `Failed to populate story bible: ${seedResult.error}` }
  }

  // 3. Transition project status to 'writing' and update title from outline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: projectUpdateError } = await (supabase as any)
    .from('projects')
    .update({
      status: 'writing',
      title: outlineData.title,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  if (projectUpdateError) {
    // Log but don't fail — outline approval and story bible seeding already succeeded
    console.error('Failed to update project status to writing:', projectUpdateError)
  }

  // 4. Finalize memory identity and seed plot threads from outline
  const finalizeResult = await updateMemoryIdentity(projectId, {
    storyBibleSummary: `Approved outline with ${outlineData.chapters.length} chapters`,
  })
  if ('error' in finalizeResult) {
    console.error('Failed to finalize memory identity on approval:', finalizeResult.error)
  }

  const plotSeedResult = await seedMemoryPlotThreads(projectId, outlineData.chapters)
  if ('error' in plotSeedResult) {
    console.error('Failed to seed plot threads from outline:', plotSeedResult.error)
  }

  // 5. Revalidate all affected paths
  revalidatePath(`/projects/${projectId}/outline`)
  revalidatePath(`/projects/${projectId}/story-bible`)
  revalidatePath('/dashboard')

  return { success: true }
}
