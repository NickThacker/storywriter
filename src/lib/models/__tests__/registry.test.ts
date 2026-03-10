import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MODEL_DEFAULTS, type ModelRole } from '../registry'

// Mock Supabase client
const mockMaybeSingle = vi.fn()
const mockEq2 = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockEq1 = vi.fn(() => ({ eq: mockEq2 }))
const mockSelect = vi.fn(() => ({ eq: mockEq1 }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}))

// Import after mocking
const { getModelForRole } = await import('../registry')

describe('MODEL_DEFAULTS', () => {
  const allRoles: ModelRole[] = [
    'prose',
    'reviewer',
    'planner',
    'summarizer',
    'validation',
    'oracle',
    'arc_synthesis',
  ]

  it('has a default for every ModelRole', () => {
    for (const role of allRoles) {
      expect(MODEL_DEFAULTS[role]).toBeDefined()
      expect(typeof MODEL_DEFAULTS[role]).toBe('string')
    }
  })

  it('all defaults follow provider/model format', () => {
    for (const [, modelId] of Object.entries(MODEL_DEFAULTS)) {
      expect(modelId).toMatch(/^[a-z-]+\/[a-z0-9._-]+$/i)
    }
  })
})

describe('getModelForRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user preference when set in DB', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { model_id: 'openai/gpt-4o' },
      error: null,
    })

    const result = await getModelForRole('user-123', 'prose')
    expect(result).toBe('openai/gpt-4o')
    expect(mockFrom).toHaveBeenCalledWith('user_model_preferences')
    expect(mockEq1).toHaveBeenCalledWith('user_id', 'user-123')
    expect(mockEq2).toHaveBeenCalledWith('task_type', 'prose')
  })

  it('returns default when no user preference exists', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    })

    const result = await getModelForRole('user-123', 'prose')
    expect(result).toBe(MODEL_DEFAULTS.prose)
  })

  it('returns default when DB returns non-string model_id', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { model_id: null },
      error: null,
    })

    const result = await getModelForRole('user-123', 'validation')
    expect(result).toBe(MODEL_DEFAULTS.validation)
  })

  it('falls back to default on Supabase error', async () => {
    mockMaybeSingle.mockRejectedValue(new Error('DB connection failed'))

    const result = await getModelForRole('user-123', 'oracle')
    expect(result).toBe(MODEL_DEFAULTS.oracle)
  })
})
