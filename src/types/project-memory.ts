// TypeScript types for the project memory system.
// Three layers: identity (stable), cumulative trackers (per-chapter updates),
// and per-chapter checkpoints.

// ─────────────────────────────────────────────────────
// Layer 1: Project Identity (stable after outline approval)
// ─────────────────────────────────────────────────────

export interface ProjectIdentity {
  genre: string | null
  themes: string[]
  tone: string | null
  setting: string | null
  premise: string | null
  castList: string[]
  locationList: string[]
  storyBibleSummary: string | null
  narrativeVoiceNotes: string | null
}

// ─────────────────────────────────────────────────────
// Layer 2: Cumulative Trackers
// ─────────────────────────────────────────────────────

export interface TimelineEntry {
  chapterNumber: number
  event: string
  storyTime: string
}

export type PlotThreadStatus = 'introduced' | 'active' | 'advanced' | 'resolved'

export interface PlotThread {
  id: string
  name: string
  description: string
  status: PlotThreadStatus
  chapterReferences: number[]
}

export interface CharacterState {
  name: string
  emotionalState: string
  knowledge: string[]
  relationships: Record<string, string>
  physicalState: string
  location: string
}

export type ContinuityFactCategory =
  | 'time'
  | 'weather'
  | 'injury'
  | 'object'
  | 'promise'
  | 'other'

export interface ContinuityFact {
  fact: string
  category: ContinuityFactCategory
  resolved: boolean
  introducedChapter: number
}

export interface ForeshadowingSeed {
  seed: string
  plantedChapter: number
  intendedPayoff: string
  payoffChapter: number | null
  resolved: boolean
}

export interface ThematicEntry {
  theme: string
  chapterNumber: number
  development: string
}

// ─────────────────────────────────────────────────────
// Layer 3: Per-Chapter Checkpoints
// ─────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────
// Phase 4: Creative Checkpoint Types
// ─────────────────────────────────────────────────────

export type ApprovalStatus = 'draft' | 'approved'

export interface DirectionOption {
  id: string
  title: string       // 1-sentence hook
  body: string        // 3-4 sentence description
}

export interface SelectedDirection {
  type: 'option' | 'custom'
  optionId?: string          // if type === 'option'
  tone?: string              // if type === 'custom'
  pacing?: string            // if type === 'custom'
  characterFocus?: string    // if type === 'custom'
  freeText?: string          // advanced toggle
}

export interface StateDiff {
  newThreads: string[]
  advancedThreads: string[]
  resolvedThreads: string[]
  characterChanges: Record<string, string>
  newContinuityFacts: string[]
  newForeshadowing: string[]
}

// ─────────────────────────────────────────────────────
// Database Row Types
// ─────────────────────────────────────────────────────

export interface ProjectMemoryRow {
  id: string
  project_id: string
  identity: ProjectIdentity
  timeline: TimelineEntry[]
  plot_threads: PlotThread[]
  character_states: Record<string, CharacterState>
  continuity_facts: ContinuityFact[]
  foreshadowing: ForeshadowingSeed[]
  thematic_development: ThematicEntry[]
  last_checkpoint_chapter: number
  created_at: string
  updated_at: string
}

export interface ChapterCheckpointRow {
  id: string
  project_id: string
  chapter_number: number
  summary: string
  state_diff: StateDiff
  continuity_notes: string[]
  chapter_text: string
  created_at: string
  updated_at: string
  // Phase 4: Creative Checkpoint fields
  approval_status: ApprovalStatus
  direction_options: DirectionOption[] | null
  selected_direction: SelectedDirection | null
  direction_for_next: string | null
  affected: boolean
  impact_description: string | null
}

// ─────────────────────────────────────────────────────
// Insert / Update types
// ─────────────────────────────────────────────────────

export type ProjectMemoryInsert = Omit<
  ProjectMemoryRow,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type ProjectMemoryUpdate = Partial<
  Omit<ProjectMemoryRow, 'id' | 'project_id' | 'created_at'>
>

export type ChapterCheckpointInsert = Omit<
  ChapterCheckpointRow,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type ChapterCheckpointUpdate = Partial<
  Omit<ChapterCheckpointRow, 'id' | 'project_id' | 'created_at'>
>

// ─────────────────────────────────────────────────────
// AI Compression Result (returned by compression pass)
// ─────────────────────────────────────────────────────

export interface CompressionResult {
  summary: string
  timelineEvents: TimelineEntry[]
  plotThreadUpdates: {
    id: string
    name: string
    status: PlotThreadStatus
    description: string
  }[]
  characterUpdates: {
    name: string
    emotionalState: string
    knowledge: string[]
    relationships: string[]
    physicalState: string
    location: string
  }[]
  newContinuityFacts: ContinuityFact[]
  resolvedContinuityFacts: string[]
  foreshadowingUpdates: {
    seed: string
    intendedPayoff: string
    resolved: boolean
  }[]
  thematicDevelopment: {
    theme: string
    development: string
  }[]
}

// ─────────────────────────────────────────────────────
// Arc Synthesizer Types
// ─────────────────────────────────────────────────────

export interface ArcTrajectoryPoint {
  chapter: number
  state: string
  pivot_description: string
}

export interface ArcKeyMoment {
  chapter: number
  description: string
}

export interface CharacterArc {
  id: string
  project_id: string
  character_name: string
  arc_summary: string
  arc_trajectory: ArcTrajectoryPoint[]
  key_moments: ArcKeyMoment[]
  unresolved_threads: string[]
  synthesized_through_chapter: number
  model_used: string
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────────────
// Context Assembly (assembled for chapter generation)
// ─────────────────────────────────────────────────────

export interface ChapterContextPackage {
  // Identity
  identity: ProjectIdentity
  // This chapter's outline info
  chapterNumber: number
  totalChapters: number
  act: number | null
  beatSheetMapping: string | null
  chapterTitle: string
  chapterSummary: string
  chapterBeats: string[]
  featuredCharacters: string[]
  // Previous chapter text (for voice continuity)
  previousChapterText: string | null
  previousChapterSummary: string | null
  // Active plot threads
  activePlotThreads: PlotThread[]
  // Character states for featured characters
  characterStates: CharacterState[]
  // Unresolved continuity facts
  unresolvedContinuityFacts: ContinuityFact[]
  // Unresolved foreshadowing seeds
  unresolvedForeshadowing: ForeshadowingSeed[]
  // Recent thematic development (last 5 entries)
  recentThematicDevelopment: ThematicEntry[]
  // Timeline so far
  timeline: TimelineEntry[]
  // Character arcs for featured characters (optional — populated after arc synthesis)
  characterArcs?: Record<string, CharacterArc> | null
  // Thread closing pressure — active in Act 3 / climax beats
  closingPressure: {
    active: boolean
    chaptersRemaining: number
    overdueThreads: PlotThread[]  // sorted by openedChapter ascending (most overdue first)
  } | null
}
