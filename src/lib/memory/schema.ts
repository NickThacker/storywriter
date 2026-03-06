/**
 * JSON Schema for the AI compression pass response_format.
 * Used with OpenRouter's structured JSON output to ensure the AI returns
 * a parseable CompressionResult from each chapter.
 */
export const COMPRESSION_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'A 2-3 sentence summary of this chapter\'s key events and emotional beats.',
    },
    timelineEvents: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          chapterNumber: { type: 'number' },
          event: { type: 'string' },
          storyTime: { type: 'string' },
        },
        required: ['chapterNumber', 'event', 'storyTime'],
        additionalProperties: false,
      },
    },
    plotThreadUpdates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          status: {
            type: 'string',
            enum: ['introduced', 'active', 'advanced', 'resolved'],
          },
          description: { type: 'string' },
        },
        required: ['id', 'name', 'status', 'description'],
        additionalProperties: false,
      },
    },
    characterUpdates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Character name (key)' },
          emotionalState: { type: 'string' },
          knowledge: { type: 'array', items: { type: 'string' } },
          relationships: { type: 'array', items: { type: 'string' }, description: 'e.g. "Alice: grew closer after shared danger"' },
          physicalState: { type: 'string' },
          location: { type: 'string' },
        },
        required: ['name', 'emotionalState', 'knowledge', 'relationships', 'physicalState', 'location'],
        additionalProperties: false,
      },
    },
    newContinuityFacts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fact: { type: 'string' },
          category: {
            type: 'string',
            enum: ['time', 'weather', 'injury', 'object', 'promise', 'other'],
          },
          resolved: { type: 'boolean' },
          introducedChapter: { type: 'number' },
        },
        required: ['fact', 'category', 'resolved', 'introducedChapter'],
        additionalProperties: false,
      },
    },
    resolvedContinuityFacts: {
      type: 'array',
      items: { type: 'string' },
      description: 'Exact text of previously established continuity facts that are now resolved.',
    },
    foreshadowingUpdates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          seed: { type: 'string' },
          intendedPayoff: { type: 'string' },
          resolved: { type: 'boolean' },
        },
        required: ['seed', 'intendedPayoff', 'resolved'],
        additionalProperties: false,
      },
    },
    thematicDevelopment: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          theme: { type: 'string' },
          development: { type: 'string' },
        },
        required: ['theme', 'development'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'summary',
    'timelineEvents',
    'plotThreadUpdates',
    'characterUpdates',
    'newContinuityFacts',
    'resolvedContinuityFacts',
    'foreshadowingUpdates',
    'thematicDevelopment',
  ],
  additionalProperties: false,
}
