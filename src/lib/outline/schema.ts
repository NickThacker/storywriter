import type { OutlineChapter } from '@/types/database'

/**
 * JSON schema used with OpenRouter's response_format: json_schema.
 * Defines the exact structure the AI must return for novel outline generation.
 */
export const OUTLINE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    premise: { type: 'string' },
    chapters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          number: { type: 'number' },
          title: { type: 'string' },
          summary: { type: 'string' },
          beats: { type: 'array', items: { type: 'string' } },
          characters_featured: { type: 'array', items: { type: 'string' } },
          beat_sheet_mapping: { type: 'string' },
          act: { type: 'number' },
        },
        required: ['number', 'title', 'summary', 'beats', 'characters_featured', 'beat_sheet_mapping', 'act'],
        additionalProperties: false,
      },
    },
    characters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          one_line: { type: 'string' },
          arc: { type: 'string' },
        },
        required: ['name', 'role', 'one_line'],
        additionalProperties: false,
      },
    },
    locations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'description'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'premise', 'chapters', 'characters', 'locations'],
  additionalProperties: false,
}

/**
 * TypeScript type for the fully parsed outline returned by the AI.
 * Matches the OUTLINE_SCHEMA structure above.
 */
export interface GeneratedOutline {
  title: string
  premise: string
  chapters: OutlineChapter[]
  characters: { name: string; role: string; one_line: string; arc?: string }[]
  locations: { name: string; description: string }[]
}
