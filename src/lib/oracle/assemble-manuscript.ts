import { createClient } from '@/lib/supabase/server'

export interface ManuscriptAssembly {
  text: string
  chaptersIncluded: number
}

/**
 * Concatenates all chapter texts up to (but not including) chapterNumber.
 * Returns plain text with chapter delimiters — no AI involved.
 */
export async function assembleManuscript(
  projectId: string,
  chapterNumber: number
): Promise<ManuscriptAssembly> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('chapter_checkpoints')
    .select('chapter_number, chapter_text')
    .eq('project_id', projectId)
    .lt('chapter_number', chapterNumber)
    .not('chapter_text', 'is', null)
    .order('chapter_number', { ascending: true })

  if (error || !data) {
    return { text: '', chaptersIncluded: 0 }
  }

  const rows = data as { chapter_number: number; chapter_text: string }[]
  const nonEmpty = rows.filter((r) => r.chapter_text?.trim())

  const text = nonEmpty
    .map((r) => `--- CHAPTER ${r.chapter_number} ---\n\n${r.chapter_text.trim()}`)
    .join('\n\n')

  return { text, chaptersIncluded: nonEmpty.length }
}
