'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ChapterCheckpointRow } from '@/types/project-memory'

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

  return { success: true, wordCount: totalWords, chaptersDone: chaptersWithText }
}
