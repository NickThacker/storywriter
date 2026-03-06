import { createClient } from '@/lib/supabase/server'
import type {
  ProjectMemoryRow,
  ChapterCheckpointRow,
  ChapterContextPackage,
  CharacterState,
} from '@/types/project-memory'
import type { OutlineChapter } from '@/types/database'

/**
 * Assemble the full context package for generating chapter N.
 * Reads project_memory, the outline, and the N-1 checkpoint,
 * then filters to only the relevant slice of state.
 *
 * Target: ~10k tokens at chapter 30 of a 40-chapter novel.
 */
export async function assembleChapterContext(
  projectId: string,
  chapterNumber: number
): Promise<ChapterContextPackage> {
  const supabase = await createClient()

  // Fetch all needed data in parallel
  const [memoryResult, outlineResult, prevCheckpointResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('project_memory')
      .select('*')
      .eq('project_id', projectId)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('outlines')
      .select('chapters, chapter_count')
      .eq('project_id', projectId)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chapterNumber > 1
      ? (supabase as any)
          .from('chapter_checkpoints')
          .select('summary, chapter_text')
          .eq('project_id', projectId)
          .eq('chapter_number', chapterNumber - 1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const memory = memoryResult.data as ProjectMemoryRow | null
  const outline = outlineResult.data as { chapters: OutlineChapter[]; chapter_count: number } | null
  const prevCheckpoint = prevCheckpointResult.data as Pick<
    ChapterCheckpointRow,
    'summary' | 'chapter_text'
  > | null

  // Get this chapter's outline info
  const chapterOutline = outline?.chapters.find((c) => c.number === chapterNumber)

  // Build the context package with smart filtering
  const identity = memory?.identity ?? {
    genre: null,
    themes: [],
    tone: null,
    setting: null,
    premise: null,
    castList: [],
    locationList: [],
    storyBibleSummary: null,
    narrativeVoiceNotes: null,
  }

  const featuredCharacters = chapterOutline?.characters_featured ?? []

  // Filter character states to only those featured in this chapter
  const characterStates: CharacterState[] = featuredCharacters
    .map((name) => memory?.character_states[name])
    .filter((s): s is CharacterState => s != null)

  // Only include unresolved continuity facts
  const unresolvedContinuityFacts = (memory?.continuity_facts ?? []).filter(
    (f) => !f.resolved
  )

  // Only include unresolved foreshadowing
  const unresolvedForeshadowing = (memory?.foreshadowing ?? []).filter(
    (f) => !f.resolved
  )

  // Only active/introduced plot threads (not resolved)
  const activePlotThreads = (memory?.plot_threads ?? []).filter(
    (t) => t.status !== 'resolved'
  )

  // Last 5 thematic entries for recency
  const recentThematicDevelopment = (memory?.thematic_development ?? []).slice(-5)

  // Trim previous chapter text to last ~3000 chars for voice continuity
  let previousChapterText = prevCheckpoint?.chapter_text ?? null
  if (previousChapterText && previousChapterText.length > 3000) {
    previousChapterText = '...' + previousChapterText.slice(-3000)
  }

  const totalChapters = outline?.chapter_count ?? outline?.chapters.length ?? 0

  return {
    identity,
    chapterNumber,
    totalChapters,
    act: chapterOutline?.act ?? null,
    beatSheetMapping: chapterOutline?.beat_sheet_mapping ?? null,
    chapterTitle: chapterOutline?.title ?? `Chapter ${chapterNumber}`,
    chapterSummary: chapterOutline?.summary ?? '',
    chapterBeats: chapterOutline?.beats ?? [],
    featuredCharacters,
    previousChapterText,
    previousChapterSummary: prevCheckpoint?.summary ?? null,
    activePlotThreads,
    characterStates,
    unresolvedContinuityFacts,
    unresolvedForeshadowing,
    recentThematicDevelopment,
    timeline: memory?.timeline ?? [],
  }
}
