import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ChapterContextPackage } from '@/types/project-memory'

// Mock getModelForRole
vi.mock('@/lib/models/registry', () => ({
  getModelForRole: vi.fn().mockResolvedValue('anthropic/claude-haiku-4-5-20251001'),
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { runContinuityAudit } = await import('../continuity-auditor')

function makeMinimalContext(overrides?: Partial<ChapterContextPackage>): ChapterContextPackage {
  return {
    identity: {
      genre: 'thriller',
      themes: [],
      tone: 'tense',
      setting: 'urban',
      premise: 'A detective hunts a serial killer.',
      castList: ['Detective Shaw'],
      locationList: ['Precinct'],
      storyBibleSummary: null,
      narrativeVoiceNotes: null,
    },
    chapterNumber: 8,
    totalChapters: 30,
    targetWordCount: 1500,
    act: 2,
    beatSheetMapping: 'Midpoint',
    chapterTitle: 'The Revelation',
    chapterSummary: 'Shaw discovers the killer is someone close.',
    chapterBeats: ['Shaw reviews evidence', 'The twist reveal'],
    featuredCharacters: ['Detective Shaw'],
    previousChapterText: null,
    previousChapterSummary: null,
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

function mockApiResponse(body: object, status = 200) {
  mockFetch.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(body) } }],
    }),
  })
}

describe('runContinuityAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns clear to proceed when no issues', async () => {
    mockApiResponse({ issues: [], clearToProceed: true })

    const result = await runContinuityAudit(makeMinimalContext(), 'test-key', 'user-1')

    expect(result.clearToProceed).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('returns issues with correct structure', async () => {
    mockApiResponse({
      issues: [
        {
          severity: 'high',
          description: 'Shaw was injured in Ch7 but is running here',
          conflictingFact: 'Shaw has a broken leg (Ch7)',
          suggestedResolution: 'Mention he is limping or using crutches',
        },
      ],
      clearToProceed: false,
    })

    const result = await runContinuityAudit(makeMinimalContext(), 'test-key', 'user-1')

    expect(result.clearToProceed).toBe(false)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].severity).toBe('high')
    expect(result.issues[0].description).toContain('injured')
  })

  it('throws on non-200 API response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(
      runContinuityAudit(makeMinimalContext(), 'test-key', 'user-1')
    ).rejects.toThrow('Auditor API error: 500')
  })

  it('throws on malformed JSON in response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'not valid json' } }],
      }),
    })

    await expect(
      runContinuityAudit(makeMinimalContext(), 'test-key', 'user-1')
    ).rejects.toThrow()
  })

  it('sends correct headers to OpenRouter', async () => {
    mockApiResponse({ issues: [], clearToProceed: true })

    await runContinuityAudit(makeMinimalContext(), 'my-api-key', 'user-1')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(opts.headers.Authorization).toBe('Bearer my-api-key')
    expect(opts.headers['X-Title']).toBe('StoryWriter')
  })

  it('includes continuity facts in the prompt', async () => {
    mockApiResponse({ issues: [], clearToProceed: true })

    const ctx = makeMinimalContext({
      unresolvedContinuityFacts: [
        { fact: 'Shaw has a broken leg', category: 'injury', resolved: false, introducedChapter: 7 },
      ],
    })

    await runContinuityAudit(ctx, 'test-key', 'user-1')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const userContent = body.messages[1].content
    expect(userContent).toContain('Shaw has a broken leg')
    expect(userContent).toContain('Ch7')
  })

  it('includes character states in the prompt', async () => {
    mockApiResponse({ issues: [], clearToProceed: true })

    const ctx = makeMinimalContext({
      characterStates: [
        {
          name: 'Detective Shaw',
          emotionalState: 'frustrated',
          physicalState: 'injured',
          location: 'hospital',
          knowledge: [],
          relationships: {},
        },
      ],
    })

    await runContinuityAudit(ctx, 'test-key', 'user-1')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const userContent = body.messages[1].content
    expect(userContent).toContain('Detective Shaw')
    expect(userContent).toContain('emotional=frustrated')
    expect(userContent).toContain('physical=injured')
  })

  it('includes chapter beats in the prompt', async () => {
    mockApiResponse({ issues: [], clearToProceed: true })

    await runContinuityAudit(makeMinimalContext(), 'test-key', 'user-1')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const userContent = body.messages[1].content
    expect(userContent).toContain('Shaw reviews evidence')
    expect(userContent).toContain('The twist reveal')
  })

  it('shows "None" placeholders for empty context arrays', async () => {
    mockApiResponse({ issues: [], clearToProceed: true })

    await runContinuityAudit(makeMinimalContext(), 'test-key', 'user-1')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const userContent = body.messages[1].content
    expect(userContent).toContain('CONTINUITY FACTS:\nNone')
    expect(userContent).toContain('CHARACTER STATES:\nNone')
    expect(userContent).toContain('ACTIVE PLOT THREADS:\nNone')
  })

  it('requests json_object response format', async () => {
    mockApiResponse({ issues: [], clearToProceed: true })

    await runContinuityAudit(makeMinimalContext(), 'test-key', 'user-1')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.response_format).toEqual({ type: 'json_object' })
  })
})
