'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OutlineChapter, OutlineRow, BeatSheetId, NovelLength } from '@/types/database'
import type { IntakeData } from '@/lib/validations/intake'
import type { GeneratedOutline } from '@/lib/outline/schema'

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
  const { error: updateError } = await (supabase as any)
    .from('outlines')
    .update({
      chapters: updatedChapters,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath(`/projects/${projectId}/outline`)

  return { success: true }
}
