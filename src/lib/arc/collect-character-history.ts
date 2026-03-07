import type { SupabaseClient } from '@supabase/supabase-js'
import type { StateDiff } from '@/types/project-memory'

export interface CharacterHistoryEntry {
  chapterNumber: number
  summary: string
  stateChange: string | null // from state_diff.characterChanges[characterName], null if not in this chapter
  textExcerpt: string        // first 300 chars of chapter_text
}

export interface CharacterHistory {
  entries: CharacterHistoryEntry[]
  appearsInChapters: number[]
}

/**
 * Collect per-chapter history for a single character from chapter_checkpoints.
 * Returns all checkpoint rows through the given chapter number, with character-specific
 * state changes extracted from state_diff.characterChanges.
 */
export async function collectCharacterHistory(
  projectId: string,
  characterName: string,
  throughChapter: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<CharacterHistory> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('chapter_checkpoints')
    .select('chapter_number, summary, state_diff, chapter_text')
    .eq('project_id', projectId)
    .lte('chapter_number', throughChapter)
    .order('chapter_number', { ascending: true })

  if (error) {
    console.error('[collect-character-history] query error:', error)
    return { entries: [], appearsInChapters: [] }
  }

  const rows = (data ?? []) as Array<{
    chapter_number: number
    summary: string | null
    state_diff: StateDiff | null
    chapter_text: string | null
  }>

  const entries: CharacterHistoryEntry[] = []
  const appearsInChapters: number[] = []

  for (const row of rows) {
    const stateChange = row.state_diff?.characterChanges?.[characterName] ?? null
    const textExcerpt = (row.chapter_text ?? '').slice(0, 300)

    entries.push({
      chapterNumber: row.chapter_number,
      summary: row.summary ?? '',
      stateChange,
      textExcerpt,
    })

    if (stateChange !== null) {
      appearsInChapters.push(row.chapter_number)
    }
  }

  return { entries, appearsInChapters }
}
