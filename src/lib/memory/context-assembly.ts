import { createClient } from '@/lib/supabase/server'
import type {
  ProjectMemoryRow,
  ChapterCheckpointRow,
  ChapterContextPackage,
  CharacterState,
  CharacterArc,
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
  const [memoryResult, outlineResult, prevCheckpointResult, arcResult] = await Promise.all([
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('character_arcs')
      .select('*')
      .eq('project_id', projectId),
  ])

  const memory = memoryResult.data as ProjectMemoryRow | null
  const outline = outlineResult.data as { chapters: OutlineChapter[]; chapter_count: number } | null
  const prevCheckpoint = prevCheckpointResult.data as Pick<
    ChapterCheckpointRow,
    'summary' | 'chapter_text'
  > | null
  const arcRows = (arcResult.data ?? []) as CharacterArc[]

  // Get this chapter's outline info
  const chapterOutline = outline?.chapters.find((c) => c.number === chapterNumber)

  // Build featured character names (needed for arc filtering, resolved later)
  const featuredCharactersEarly = chapterOutline?.characters_featured ?? []

  // Build characterArcs map filtered to featured characters only
  const characterArcs: Record<string, CharacterArc> = {}
  for (const arc of arcRows) {
    if (featuredCharactersEarly.includes(arc.character_name)) {
      characterArcs[arc.character_name] = arc
    }
  }

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

  const featuredCharacters = featuredCharactersEarly

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

  // Closing pressure — auto-activate in Act 3 / climax beats
  const beatStr = (chapterOutline?.beat_sheet_mapping ?? '').toLowerCase()
  const isClosingBeat =
    (chapterOutline?.act ?? 0) >= 3 ||
    beatStr.includes('act 3') ||
    beatStr.includes('act iii') ||
    beatStr.includes('climax') ||
    beatStr.includes('falling action') ||
    beatStr.includes('resolution') ||
    beatStr.includes('denouement') ||
    beatStr.includes('third act')

  const totalChaptersForPressure = outline?.chapter_count ?? outline?.chapters.length ?? 0
  const chaptersRemaining = Math.max(0, totalChaptersForPressure - chapterNumber)

  // Sort by earliest chapter reference (most overdue = opened earliest)
  const overdueThreads = isClosingBeat
    ? [...activePlotThreads].sort(
        (a, b) => (a.chapterReferences[0] ?? 0) - (b.chapterReferences[0] ?? 0)
      )
    : []

  const closingPressure = isClosingBeat
    ? { active: true, chaptersRemaining, overdueThreads }
    : null

  // Last 5 thematic entries for recency
  const recentThematicDevelopment = (memory?.thematic_development ?? []).slice(-5)

  // Trim previous chapter text to last ~3000 chars for voice continuity
  let previousChapterText = prevCheckpoint?.chapter_text ?? null
  if (previousChapterText && previousChapterText.length > 3000) {
    previousChapterText = '...' + previousChapterText.slice(-3000)
  }

  const totalChapters = totalChaptersForPressure

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
    characterArcs: Object.keys(characterArcs).length > 0 ? characterArcs : null,
    closingPressure,
  }
}
