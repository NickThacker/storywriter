import { describe, it, expect } from 'vitest'
import { buildChapterPrompt } from '../chapter-prompt'
import type { ChapterContextPackage, PlotThread, CharacterState, CharacterArc } from '@/types/project-memory'

function makeBaseContext(overrides?: Partial<ChapterContextPackage>): ChapterContextPackage {
  return {
    identity: {
      genre: 'literary fiction',
      themes: ['identity', 'loss'],
      tone: 'meditative',
      setting: 'coastal Maine',
      premise: 'A lighthouse keeper discovers letters from a past life.',
      castList: ['Elara', 'Thomas'],
      locationList: ['Lighthouse', 'Village'],
      storyBibleSummary: null,
      narrativeVoiceNotes: null,
    },
    chapterNumber: 5,
    totalChapters: 20,
    targetWordCount: 1500,
    act: 1,
    beatSheetMapping: 'Catalyst',
    chapterTitle: 'The Discovery',
    chapterSummary: 'Elara finds the first letter hidden in the lighthouse wall.',
    chapterBeats: ['Elara explores the lighthouse', 'She discovers a hidden compartment', 'She reads the first letter'],
    featuredCharacters: ['Elara'],
    previousChapterText: 'The wind howled against the glass panes...',
    previousChapterSummary: 'Elara arrived at the lighthouse.',
    activePlotThreads: [],
    characterStates: [],
    unresolvedContinuityFacts: [],
    unresolvedForeshadowing: [],
    recentThematicDevelopment: [],
    compressedMidThematic: [],
    timeline: [],
    compressedMidTimeline: [],
    characterArcs: null,
    closingPressure: null,
    ...overrides,
  }
}

function makeThread(overrides?: Partial<PlotThread>): PlotThread {
  return {
    id: 'thread-1',
    name: 'The Letters Mystery',
    description: 'Who wrote the letters and why?',
    status: 'active',
    chapterReferences: [2],
    ...overrides,
  }
}

function makeCharState(overrides?: Partial<CharacterState>): CharacterState {
  return {
    name: 'Elara',
    emotionalState: 'curious',
    physicalState: 'healthy',
    location: 'lighthouse',
    knowledge: ['found a hidden compartment'],
    relationships: { Thomas: 'acquaintance' },
    ...overrides,
  }
}

// ─── Story position note ──────────────────────────────

describe('buildChapterPrompt — story position', () => {
  it('includes act, chapter, total, and beat mapping in system message', () => {
    const ctx = makeBaseContext()
    const { systemMessage } = buildChapterPrompt(ctx)

    expect(systemMessage).toContain('Act 1')
    expect(systemMessage).toContain('Chapter 5 of 20')
    expect(systemMessage).toContain('Catalyst')
  })

  it('omits position note when act is null', () => {
    const ctx = makeBaseContext({ act: null, totalChapters: 0 })
    const { systemMessage } = buildChapterPrompt(ctx)

    expect(systemMessage).not.toContain('Story position:')
  })
})

// ─── Target word count ────────────────────────────────

describe('buildChapterPrompt — target word count', () => {
  it('includes target word count instruction when provided', () => {
    const ctx = makeBaseContext({ targetWordCount: 1500 })
    const { systemMessage } = buildChapterPrompt(ctx)

    expect(systemMessage).toContain('1,500 words')
    expect(systemMessage).toContain('hard target')
  })

  it('omits word count instruction when targetWordCount is null', () => {
    const ctx = makeBaseContext({ targetWordCount: null })
    const { systemMessage } = buildChapterPrompt(ctx)

    expect(systemMessage).not.toContain('Target length:')
  })
})

// ─── Closing pressure vs standard threads ─────────────

describe('buildChapterPrompt — closing pressure', () => {
  const overdueThreads: PlotThread[] = [
    makeThread({ id: 't1', name: 'Old Secret', chapterReferences: [1], status: 'active' }),
    makeThread({ id: 't2', name: 'New Lead', chapterReferences: [8], status: 'active' }),
  ]

  it('renders URGENT section when closing pressure is active', () => {
    const ctx = makeBaseContext({
      closingPressure: { active: true, chaptersRemaining: 3, overdueThreads },
      activePlotThreads: overdueThreads,
    })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).toContain('URGENT: Unresolved Story Threads')
    expect(userMessage).toContain('3 chapters remain')
    expect(userMessage).toContain('Old Secret')
    expect(userMessage).toContain('open since Ch1')
  })

  it('does NOT render standard thread section when pressure is active', () => {
    const ctx = makeBaseContext({
      closingPressure: { active: true, chaptersRemaining: 3, overdueThreads },
      activePlotThreads: overdueThreads,
    })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).not.toContain('## Active Plot Threads')
  })

  it('renders standard thread section when no closing pressure', () => {
    const ctx = makeBaseContext({
      activePlotThreads: [makeThread()],
      closingPressure: null,
    })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).toContain('## Active Plot Threads')
    expect(userMessage).toContain('The Letters Mystery')
    expect(userMessage).not.toContain('URGENT')
  })

  it('singular "chapter remains" for 1 remaining', () => {
    const ctx = makeBaseContext({
      closingPressure: { active: true, chaptersRemaining: 1, overdueThreads },
      activePlotThreads: overdueThreads,
    })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).toContain('1 chapter remains')
  })
})

// ─── Tiered compression in prompt ─────────────────────

describe('buildChapterPrompt — tiered thematic', () => {
  it('renders recent thematic entries', () => {
    const ctx = makeBaseContext({
      recentThematicDevelopment: [
        { theme: 'identity', chapterNumber: 4, development: 'Elara questions her past' },
      ],
    })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).toContain('## Thematic Development')
    expect(userMessage).toContain('Ch4 — identity: Elara questions her past')
  })

  it('renders compressed mid-range with "Older" label', () => {
    const ctx = makeBaseContext({
      recentThematicDevelopment: [
        { theme: 'identity', chapterNumber: 4, development: 'recent entry' },
      ],
      compressedMidThematic: [
        'Ch1 — loss: Thomas leaves the village',
      ],
    })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).toContain('Older thematic history (compressed):')
    expect(userMessage).toContain('Ch1 — loss: Thomas leaves the village')
  })

  it('omits thematic section when both arrays are empty', () => {
    const ctx = makeBaseContext({
      recentThematicDevelopment: [],
      compressedMidThematic: [],
    })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).not.toContain('## Thematic Development')
  })
})

describe('buildChapterPrompt — tiered timeline', () => {
  it('renders recent timeline entries', () => {
    const ctx = makeBaseContext({
      timeline: [
        { chapterNumber: 4, storyTime: 'evening', event: 'Storm rolls in' },
      ],
    })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).toContain('## Timeline')
    expect(userMessage).toContain('Ch4 [evening]: Storm rolls in')
  })

  it('renders compressed mid-range with "Older" label', () => {
    const ctx = makeBaseContext({
      timeline: [
        { chapterNumber: 4, storyTime: 'evening', event: 'recent event' },
      ],
      compressedMidTimeline: [
        'Ch1 [morning]: Elara arrives',
      ],
    })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).toContain('Older timeline (compressed):')
    expect(userMessage).toContain('Ch1 [morning]: Elara arrives')
  })

  it('omits timeline section when both arrays are empty', () => {
    const ctx = makeBaseContext({ timeline: [], compressedMidTimeline: [] })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).not.toContain('## Timeline')
  })
})

// ─── Character states + arcs ──────────────────────────

describe('buildChapterPrompt — character states', () => {
  it('renders character state details', () => {
    const ctx = makeBaseContext({
      characterStates: [makeCharState()],
    })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).toContain('### Elara')
    expect(userMessage).toContain('Emotional state: curious')
    expect(userMessage).toContain('Physical state: healthy')
    expect(userMessage).toContain('Location: lighthouse')
  })

  it('includes character arc when provided', () => {
    const arc: CharacterArc = {
      id: 'arc-1',
      project_id: 'proj-1',
      character_name: 'Elara',
      arc_summary: 'From isolation to connection',
      arc_trajectory: [],
      key_moments: [],
      unresolved_threads: ['trust issues'],
      synthesized_through_chapter: 4,
      model_used: 'test',
      created_at: '',
      updated_at: '',
    }
    const ctx = makeBaseContext({
      characterStates: [makeCharState()],
    })
    const { userMessage } = buildChapterPrompt(ctx, undefined, undefined, undefined, { Elara: arc })

    expect(userMessage).toContain('Arc so far: From isolation to connection')
    expect(userMessage).toContain('Unresolved character threads: trust issues')
  })
})

// ─── Continuity facts & foreshadowing ─────────────────

describe('buildChapterPrompt — continuity and foreshadowing', () => {
  it('renders continuity facts', () => {
    const ctx = makeBaseContext({
      unresolvedContinuityFacts: [
        { fact: 'Elara has a sprained wrist', category: 'injury', resolved: false, introducedChapter: 3 },
      ],
    })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).toContain('## Continuity Facts (must maintain)')
    expect(userMessage).toContain('[Ch3, injury] Elara has a sprained wrist')
  })

  it('renders foreshadowing seeds', () => {
    const ctx = makeBaseContext({
      unresolvedForeshadowing: [
        { seed: 'rusty key', plantedChapter: 2, intendedPayoff: 'unlocks lighthouse cellar', payoffChapter: null, resolved: false },
      ],
    })
    const { userMessage } = buildChapterPrompt(ctx)

    expect(userMessage).toContain('## Unresolved Foreshadowing')
    expect(userMessage).toContain('[Planted Ch2] rusty key')
    expect(userMessage).toContain('unlocks lighthouse cellar')
  })
})

// ─── Oracle output ────────────────────────────────────

describe('buildChapterPrompt — oracle output', () => {
  it('renders all oracle subsections when provided', () => {
    const ctx = makeBaseContext()
    const oracle = {
      callbacks: ['Echo the seagull motif from Ch1'],
      contradictionRisks: ['Timeline conflict with sunrise'],
      unresolvedMotifs: ['broken glass'],
      setupPayoffs: ['Key under the mat (Ch3) → payoff here'],
      characterMoments: ['Elara grieved in Ch2'],
    }
    const { userMessage } = buildChapterPrompt(ctx, undefined, undefined, oracle)

    expect(userMessage).toContain('## Manuscript Oracle')
    expect(userMessage).toContain('Callbacks worth echoing')
    expect(userMessage).toContain('Contradiction risks')
    expect(userMessage).toContain('Unresolved motifs')
    expect(userMessage).toContain('Setup/payoff opportunities')
    expect(userMessage).toContain('Character history relevant to this chapter')
  })

  it('omits oracle section when null', () => {
    const ctx = makeBaseContext()
    const { userMessage } = buildChapterPrompt(ctx, undefined, undefined, null)

    expect(userMessage).not.toContain('## Manuscript Oracle')
  })
})

// ─── Voice persona ────────────────────────────────────

describe('buildChapterPrompt — voice persona', () => {
  it('omits voice section when no persona', () => {
    const ctx = makeBaseContext()
    const { systemMessage } = buildChapterPrompt(ctx, undefined, null)

    expect(systemMessage).not.toContain('VOICE_DNA')
    expect(systemMessage).not.toContain('Author Voice')
  })

  it('renders legacy voice fields when no rich analysis', () => {
    const ctx = makeBaseContext()
    const persona = {
      voice_description: 'Sparse, Hemingway-like',
      raw_guidance_text: 'Keep sentences short',
      style_descriptors: null,
    }
    const { systemMessage } = buildChapterPrompt(ctx, undefined, persona as any)

    expect(systemMessage).toContain('Author Voice:')
    expect(systemMessage).toContain('Sparse, Hemingway-like')
    expect(systemMessage).toContain('Author Guidance:')
    expect(systemMessage).toContain('Keep sentences short')
  })
})

// ─── Rewrite adjustments ──────────────────────────────

describe('buildChapterPrompt — adjustments', () => {
  it('appends rewrite adjustments section', () => {
    const ctx = makeBaseContext()
    const { userMessage } = buildChapterPrompt(ctx, 'Make the pacing faster')

    expect(userMessage).toContain('## Rewrite Adjustments')
    expect(userMessage).toContain('Make the pacing faster')
  })

  it('omits adjustments section when empty', () => {
    const ctx = makeBaseContext()
    const { userMessage } = buildChapterPrompt(ctx, '')

    expect(userMessage).not.toContain('## Rewrite Adjustments')
  })
})
