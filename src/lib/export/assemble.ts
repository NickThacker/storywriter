import { createClient } from '@/lib/supabase/server'
import type { OutlineChapter } from '@/types/database'

// ──────────────────────────────────────────────────────────────────────────────
// Shared export types
// ──────────────────────────────────────────────────────────────────────────────

export interface ChapterContent {
  number: number
  title: string
  text: string
  isDraft: boolean // true if approval_status !== 'approved'
}

export interface ExportOptions {
  projectTitle: string
  penName: string
  includeMode: 'approved' | 'all' // which chapters to include
}

export interface AssembledBook {
  title: string
  author: string
  chapters: ChapterContent[]
}

// ──────────────────────────────────────────────────────────────────────────────
// assembleChapters — fetch and assemble chapter data for export
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetch project and chapter data from Supabase, assemble into an AssembledBook.
 * Verifies user authentication and project ownership before fetching data.
 * Filters chapters by approval_status when includeMode is 'approved'.
 */
export async function assembleChapters(
  projectId: string,
  includeMode: 'approved' | 'all',
  penName: string,
  projectTitle?: string
): Promise<AssembledBook> {
  const supabase = await createClient()

  // Authenticate user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Unauthorized: must be logged in to export')
  }

  // Fetch project row (verifies ownership via user_id filter)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id, title')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    throw new Error('Project not found or access denied')
  }

  const title = projectTitle ?? (project.title as string)

  // Fetch outline row for chapter titles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: outline } = await (supabase as any)
    .from('outlines')
    .select('chapters')
    .eq('project_id', projectId)
    .single()

  const outlineChapters: OutlineChapter[] = outline?.chapters ?? []

  // Build a map from chapter number to title for fast lookup
  const chapterTitleMap = new Map<number, string>()
  for (const ch of outlineChapters) {
    chapterTitleMap.set(ch.number, ch.title)
  }

  // Fetch chapter_checkpoints ordered by chapter_number ascending
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: checkpoints, error: checkpointsError } = await (supabase as any)
    .from('chapter_checkpoints')
    .select('chapter_number, chapter_text, approval_status')
    .eq('project_id', projectId)
    .order('chapter_number', { ascending: true })

  if (checkpointsError) {
    throw new Error(`Failed to fetch chapters: ${checkpointsError.message}`)
  }

  const allCheckpoints = (
    checkpoints as Array<{
      chapter_number: number
      chapter_text: string
      approval_status: string
    }>
  ) ?? []

  // Filter by approval status if includeMode is 'approved'
  const filtered =
    includeMode === 'approved'
      ? allCheckpoints.filter((cp) => cp.approval_status === 'approved')
      : allCheckpoints

  if (filtered.length === 0) {
    throw new Error(
      includeMode === 'approved'
        ? 'No approved chapters found. Approve at least one chapter before exporting.'
        : 'No chapters found. Generate at least one chapter before exporting.'
    )
  }

  // Map each checkpoint to ChapterContent
  const chapters: ChapterContent[] = filtered.map((cp) => ({
    number: cp.chapter_number,
    title: chapterTitleMap.get(cp.chapter_number) ?? `Chapter ${cp.chapter_number}`,
    text: cp.chapter_text ?? '',
    isDraft: cp.approval_status !== 'approved',
  }))

  return {
    title,
    author: penName || 'Unknown Author',
    chapters,
  }
}
