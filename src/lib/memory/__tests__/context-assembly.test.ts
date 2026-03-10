import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ProjectMemoryRow } from '@/types/project-memory'

// ─── Supabase mock ────────────────────────────────────

function makeMockSupabase(memory: Partial<ProjectMemoryRow> | null, outline: any, prevCheckpoint: any, arcs: any[] = []) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'project_memory') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: memory ? { ...baseMemory(), ...memory } : null, error: null }),
            }),
          }),
        }
      }
      if (table === 'outlines') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: outline, error: null }),
            }),
          }),
        }
      }
      if (table === 'chapter_checkpoints') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: prevCheckpoint, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'character_arcs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(
              Promise.resolve({ data: arcs, error: null })
            ),
          }),
        }
      }
      return {}
    }),
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

function baseMemory(): ProjectMemoryRow {
  return {
    id: 'mem-1',
    project_id: 'proj-1',
    identity: {
      genre: 'fantasy',
      themes: ['power'],
      tone: 'dark',
      setting: 'medieval',
      premise: 'A prince flees the throne.',
      castList: ['Prince Aric', 'Mira'],
      locationList: ['Castle', 'Forest'],
      storyBibleSummary: null,
      narrativeVoiceNotes: null,
    },
    timeline: [],
    plot_threads: [],
    character_states: {},
    continuity_facts: [],
    foreshadowing: [],
    thematic_development: [],
    last_checkpoint_chapter: 0,
    created_at: '',
    updated_at: '',
  }
}

function makeOutline(chapterOverrides?: Record<string, any>, count = 20) {
  return {
    chapter_count: count,
    chapters: [
      {
        number: 5,
        title: 'Into the Forest',
        summary: 'Aric enters the forest.',
        beats: ['Aric crosses the river', 'He hears wolves'],
        characters_featured: ['Prince Aric'],
        act: 1,
        beat_sheet_mapping: 'Catalyst',
        ...chapterOverrides,
      },
    ],
  }
}

// ─── Tests ────────────────────────────────────────────

describe('assembleChapterContext — tiered thematic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function assembleWith(thematicCount: number) {
    const thematic = Array.from({ length: thematicCount }, (_, i) => ({
      theme: `theme-${i + 1}`,
      chapterNumber: i + 1,
      development: `dev for chapter ${i + 1}`,
    }))

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase(
        { thematic_development: thematic },
        makeOutline(),
        null
      ) as any
    )

    const { assembleChapterContext } = await import('../context-assembly')
    return assembleChapterContext('proj-1', 5)
  }

  it('3 entries → all recent, none compressed', async () => {
    const ctx = await assembleWith(3)
    expect(ctx.recentThematicDevelopment).toHaveLength(3)
    expect(ctx.compressedMidThematic).toHaveLength(0)
  })

  it('12 entries → 5 recent, 7 compressed', async () => {
    const ctx = await assembleWith(12)
    expect(ctx.recentThematicDevelopment).toHaveLength(5)
    expect(ctx.compressedMidThematic).toHaveLength(7)
  })

  it('20 entries → 5 recent, 10 compressed (oldest 5 dropped)', async () => {
    const ctx = await assembleWith(20)
    expect(ctx.recentThematicDevelopment).toHaveLength(5)
    expect(ctx.compressedMidThematic).toHaveLength(10)
  })

  it('compressed thematic matches expected format', async () => {
    const ctx = await assembleWith(8)
    for (const line of ctx.compressedMidThematic) {
      expect(line).toMatch(/^Ch\d+ — .+: .+$/)
    }
  })
})

describe('assembleChapterContext — tiered timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function assembleWith(timelineCount: number) {
    const timeline = Array.from({ length: timelineCount }, (_, i) => ({
      chapterNumber: i + 1,
      event: `event ${i + 1}`,
      storyTime: `day ${i + 1}`,
    }))

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase(
        { timeline },
        makeOutline(),
        null
      ) as any
    )

    const { assembleChapterContext } = await import('../context-assembly')
    return assembleChapterContext('proj-1', 5)
  }

  it('3 entries → all recent, none compressed', async () => {
    const ctx = await assembleWith(3)
    expect(ctx.timeline).toHaveLength(3)
    expect(ctx.compressedMidTimeline).toHaveLength(0)
  })

  it('18 entries → 5 recent, 13 compressed', async () => {
    const ctx = await assembleWith(18)
    expect(ctx.timeline).toHaveLength(5)
    expect(ctx.compressedMidTimeline).toHaveLength(13)
  })

  it('25 entries → 5 recent, 15 compressed (oldest 5 dropped)', async () => {
    const ctx = await assembleWith(25)
    expect(ctx.timeline).toHaveLength(5)
    expect(ctx.compressedMidTimeline).toHaveLength(15)
  })

  it('compressed timeline matches expected format', async () => {
    const ctx = await assembleWith(10)
    for (const line of ctx.compressedMidTimeline) {
      expect(line).toMatch(/^Ch\d+ \[.+\]: .+$/)
    }
  })
})

describe('assembleChapterContext — closing pressure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function assembleWithBeat(act: number, beatMapping: string, threads: any[] = []) {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase(
        { plot_threads: threads },
        makeOutline({ act, beat_sheet_mapping: beatMapping }, 20),
        null
      ) as any
    )

    const { assembleChapterContext } = await import('../context-assembly')
    return assembleChapterContext('proj-1', 5)
  }

  it('act 3 → closing pressure active', async () => {
    const ctx = await assembleWithBeat(3, 'Break into Three')
    expect(ctx.closingPressure).not.toBeNull()
    expect(ctx.closingPressure!.active).toBe(true)
  })

  it('beat with "Climax" → closing pressure active', async () => {
    const ctx = await assembleWithBeat(2, 'Climax')
    expect(ctx.closingPressure).not.toBeNull()
    expect(ctx.closingPressure!.active).toBe(true)
  })

  it('beat with "Resolution" → closing pressure active', async () => {
    const ctx = await assembleWithBeat(2, 'Resolution')
    expect(ctx.closingPressure).not.toBeNull()
  })

  it('beat with "Falling Action" → closing pressure active', async () => {
    const ctx = await assembleWithBeat(2, 'Falling Action')
    expect(ctx.closingPressure).not.toBeNull()
  })

  it('act 2 with non-climax beat → no closing pressure', async () => {
    const ctx = await assembleWithBeat(2, 'Midpoint')
    expect(ctx.closingPressure).toBeNull()
  })

  it('act 1 → no closing pressure', async () => {
    const ctx = await assembleWithBeat(1, 'Catalyst')
    expect(ctx.closingPressure).toBeNull()
  })

  it('chaptersRemaining = totalChapters - chapterNumber', async () => {
    const ctx = await assembleWithBeat(3, 'Climax')
    expect(ctx.closingPressure!.chaptersRemaining).toBe(15) // 20 - 5
  })

  it('overdue threads sorted by earliest chapter reference', async () => {
    const threads = [
      { id: 't1', name: 'Late Thread', description: 'd', status: 'active', chapterReferences: [4] },
      { id: 't2', name: 'Old Thread', description: 'd', status: 'active', chapterReferences: [1] },
      { id: 't3', name: 'Mid Thread', description: 'd', status: 'active', chapterReferences: [3] },
    ]
    const ctx = await assembleWithBeat(3, 'Climax', threads)

    expect(ctx.closingPressure!.overdueThreads[0].name).toBe('Old Thread')
    expect(ctx.closingPressure!.overdueThreads[1].name).toBe('Mid Thread')
    expect(ctx.closingPressure!.overdueThreads[2].name).toBe('Late Thread')
  })

  it('no active threads + closing beat → empty overdueThreads', async () => {
    const ctx = await assembleWithBeat(3, 'Climax', [])
    expect(ctx.closingPressure!.overdueThreads).toHaveLength(0)
  })
})

describe('assembleChapterContext — filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters out resolved continuity facts', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase(
        {
          continuity_facts: [
            { fact: 'unresolved fact', category: 'object', resolved: false, introducedChapter: 1 },
            { fact: 'resolved fact', category: 'injury', resolved: true, introducedChapter: 2 },
          ],
        },
        makeOutline(),
        null
      ) as any
    )

    const { assembleChapterContext } = await import('../context-assembly')
    const ctx = await assembleChapterContext('proj-1', 5)

    expect(ctx.unresolvedContinuityFacts).toHaveLength(1)
    expect(ctx.unresolvedContinuityFacts[0].fact).toBe('unresolved fact')
  })

  it('filters out resolved foreshadowing', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase(
        {
          foreshadowing: [
            { seed: 'open seed', plantedChapter: 1, intendedPayoff: 'payoff', payoffChapter: null, resolved: false },
            { seed: 'closed seed', plantedChapter: 2, intendedPayoff: 'done', payoffChapter: 4, resolved: true },
          ],
        },
        makeOutline(),
        null
      ) as any
    )

    const { assembleChapterContext } = await import('../context-assembly')
    const ctx = await assembleChapterContext('proj-1', 5)

    expect(ctx.unresolvedForeshadowing).toHaveLength(1)
    expect(ctx.unresolvedForeshadowing[0].seed).toBe('open seed')
  })

  it('filters out resolved plot threads', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase(
        {
          plot_threads: [
            { id: 't1', name: 'Active', description: 'd', status: 'active', chapterReferences: [1] },
            { id: 't2', name: 'Done', description: 'd', status: 'resolved', chapterReferences: [1, 3] },
          ],
        },
        makeOutline(),
        null
      ) as any
    )

    const { assembleChapterContext } = await import('../context-assembly')
    const ctx = await assembleChapterContext('proj-1', 5)

    expect(ctx.activePlotThreads).toHaveLength(1)
    expect(ctx.activePlotThreads[0].name).toBe('Active')
  })
})

describe('assembleChapterContext — targetWordCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function makeOutlineWithLength(targetLength: string, count: number) {
    return {
      chapter_count: count,
      target_length: targetLength,
      chapters: [
        {
          number: 5,
          title: 'Test Chapter',
          summary: 'Summary.',
          beats: ['beat1'],
          characters_featured: [],
          act: 1,
          beat_sheet_mapping: 'Catalyst',
        },
      ],
    }
  }

  it('clamps high per-chapter count down to 2000', async () => {
    // standard = 80k words / 24 chapters = 3333 → clamped to 2000
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({}, makeOutlineWithLength('standard', 24), null) as any
    )
    const { assembleChapterContext } = await import('../context-assembly')
    const ctx = await assembleChapterContext('proj-1', 5)
    expect(ctx.targetWordCount).toBe(2000)
  })

  it('clamps low per-chapter count up to 1000', async () => {
    // epic = 120k words / 200 chapters = 600 → clamped to 1000
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({}, makeOutlineWithLength('epic', 200), null) as any
    )
    const { assembleChapterContext } = await import('../context-assembly')
    const ctx = await assembleChapterContext('proj-1', 5)
    expect(ctx.targetWordCount).toBe(1000)
  })

  it('passes through value within 1000-2000 range', async () => {
    // standard = 80k / 55 = 1455 → within range
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({}, makeOutlineWithLength('standard', 55), null) as any
    )
    const { assembleChapterContext } = await import('../context-assembly')
    const ctx = await assembleChapterContext('proj-1', 5)
    expect(ctx.targetWordCount).toBe(1455)
  })

  it('returns null when no target_length on outline', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({}, { chapter_count: 20, chapters: [] }, null) as any
    )
    const { assembleChapterContext } = await import('../context-assembly')
    const ctx = await assembleChapterContext('proj-1', 5)
    expect(ctx.targetWordCount).toBeNull()
  })
})
