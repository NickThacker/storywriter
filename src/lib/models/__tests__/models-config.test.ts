import { describe, it, expect } from 'vitest'
import { RECOMMENDED_MODELS, AVAILABLE_MODELS, TASK_TYPES } from '../../models'
import type { TaskType } from '@/types/database'

const ALL_TASK_TYPES: TaskType[] = [
  'outline',
  'prose',
  'editing',
  'reviewer',
  'planner',
  'summarizer',
  'validation',
  'oracle',
  'arc_synthesis',
]

describe('RECOMMENDED_MODELS', () => {
  it('covers all 9 TaskType values', () => {
    for (const taskType of ALL_TASK_TYPES) {
      expect(RECOMMENDED_MODELS[taskType]).toBeDefined()
      expect(RECOMMENDED_MODELS[taskType].id).toBeTruthy()
      expect(RECOMMENDED_MODELS[taskType].name).toBeTruthy()
      expect(RECOMMENDED_MODELS[taskType].description).toBeTruthy()
    }
  })

  it('all recommended model IDs follow provider/model format', () => {
    for (const [, rec] of Object.entries(RECOMMENDED_MODELS)) {
      expect(rec.id).toMatch(/^[a-z-]+\/[a-z0-9._-]+$/i)
    }
  })
})

describe('TASK_TYPES', () => {
  it('includes all 9 task types', () => {
    const values = TASK_TYPES.map((t) => t.value)
    for (const taskType of ALL_TASK_TYPES) {
      expect(values).toContain(taskType)
    }
  })

  it('has no duplicate values', () => {
    const values = TASK_TYPES.map((t) => t.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('every entry has label and description', () => {
    for (const entry of TASK_TYPES) {
      expect(entry.label.length).toBeGreaterThan(0)
      expect(entry.description.length).toBeGreaterThan(0)
    }
  })
})

describe('AVAILABLE_MODELS', () => {
  it('has at least one model per major provider', () => {
    const providers = new Set(AVAILABLE_MODELS.map((m) => m.provider))
    expect(providers).toContain('Anthropic')
    expect(providers).toContain('OpenAI')
    expect(providers).toContain('Google')
  })

  it('all model IDs follow provider/model format', () => {
    for (const model of AVAILABLE_MODELS) {
      expect(model.id).toMatch(/^[a-z-]+\/[a-z0-9._-]+$/i)
    }
  })

  it('has no duplicate IDs', () => {
    const ids = AVAILABLE_MODELS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
