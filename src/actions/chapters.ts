'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  ChapterCheckpointRow,
  DirectionOption,
  SelectedDirection,
} from '@/types/project-memory'

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
// saveChapterProse — auto-save debounce target
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Upsert chapter prose into chapter_checkpoints.
 * No revalidatePath — this is a debounced auto-save target and revalidation
 * would reset client state mid-edit.
 */
export async function saveChapterProse(
  projectId: string,
  chapterNumber: number,
  text: string
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upsertError } = await (supabase as any)
    .from('chapter_checkpoints')
    .upsert(
      {
        project_id: projectId,
        chapter_number: chapterNumber,
        chapter_text: text,
      },
      { onConflict: 'project_id,chapter_number' }
    )

  if (upsertError) {
    return { error: upsertError.message }
  }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// getChapterCheckpoints — fetch all checkpoints for a project
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all chapter checkpoints for a project, ordered by chapter number.
 */
export async function getChapterCheckpoints(
  projectId: string
): Promise<{ data: ChapterCheckpointRow[] } | { error: string }> {
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
    .order('chapter_number', { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data: (data as ChapterCheckpointRow[]) ?? [] }
}

// ──────────────────────────────────────────────────────────────────────────────
// updateProjectWordCount — recalculate word count from all checkpoints
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Recalculate total word count and chapters_done from all chapter checkpoints.
 * Called after prose is finalized (compression pass complete) — not on auto-save.
 */
export async function updateProjectWordCount(
  projectId: string
): Promise<{ success: true; wordCount: number; chaptersDone: number } | { error: string }> {
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

  // Fetch all checkpoints for this project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: checkpoints, error: fetchError } = await (supabase as any)
    .from('chapter_checkpoints')
    .select('chapter_text')
    .eq('project_id', projectId)

  if (fetchError) {
    return { error: fetchError.message }
  }

  const rows = (checkpoints as { chapter_text: string }[]) ?? []

  // Sum word counts across all checkpoints
  let totalWords = 0
  let chaptersWithText = 0

  for (const checkpoint of rows) {
    const text = checkpoint.chapter_text ?? ''
    if (text.trim().length > 0) {
      totalWords += text.trim().split(/\s+/).filter(Boolean).length
      chaptersWithText += 1
    }
  }

  // Update projects table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('projects')
    .update({ word_count: totalWords, chapters_done: chaptersWithText })
    .eq('id', projectId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')

  return { success: true, wordCount: totalWords, chaptersDone: chaptersWithText }
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 4: Creative Checkpoint Actions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Mark a chapter checkpoint as approved.
 * Also clears the affected flag and impact_description (approval resolves impact).
 * No revalidatePath — optimistic update handles UI.
 */
export async function approveChapter(
  projectId: string,
  chapterNumber: number
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('chapter_checkpoints')
    .update({
      approval_status: 'approved',
      affected: false,
      impact_description: null,
    })
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber)

  if (updateError) {
    return { error: updateError.message }
  }

  return { success: true }
}

/**
 * Save the user's direction choice for the next chapter.
 * selectedDirection: structured choice (option or custom).
 * directionForNext: assembled prompt string injected into next chapter's generation.
 * No revalidatePath — optimistic update handles UI.
 */
export async function saveDirection(
  projectId: string,
  chapterNumber: number,
  selectedDirection: SelectedDirection,
  directionForNext: string
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('chapter_checkpoints')
    .update({
      selected_direction: selectedDirection,
      direction_for_next: directionForNext,
    })
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber)

  if (updateError) {
    return { error: updateError.message }
  }

  return { success: true }
}

/**
 * Batch-flag chapters as affected by a direction change upstream.
 * Called after impact analysis completes.
 * No revalidatePath — optimistic update handles UI.
 */
export async function flagAffectedChapters(
  projectId: string,
  chapters: Array<{ chapterNumber: number; impactDescription: string }>
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

  for (const chapter of chapters) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('chapter_checkpoints')
      .update({
        affected: true,
        impact_description: chapter.impactDescription,
      })
      .eq('project_id', projectId)
      .eq('chapter_number', chapter.chapterNumber)

    if (updateError) {
      return { error: updateError.message }
    }
  }

  return { success: true }
}

/**
 * Reset a chapter's approval back to 'draft'.
 * Used when user changes a prior checkpoint's direction (cascading impact).
 * Also clears affected flag and impact_description.
 * No revalidatePath — optimistic update handles UI.
 */
export async function resetChapterApproval(
  projectId: string,
  chapterNumber: number
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('chapter_checkpoints')
    .update({
      approval_status: 'draft',
      affected: false,
      impact_description: null,
    })
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber)

  if (updateError) {
    return { error: updateError.message }
  }

  return { success: true }
}

/**
 * Persist AI-generated direction options to a chapter checkpoint.
 * Called by the direction-options route handler after AI generation completes.
 * No revalidatePath — optimistic update handles UI.
 */
export async function saveDirectionOptions(
  projectId: string,
  chapterNumber: number,
  options: DirectionOption[]
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('chapter_checkpoints')
    .update({ direction_options: options })
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber)

  if (updateError) {
    return { error: updateError.message }
  }

  return { success: true }
}
