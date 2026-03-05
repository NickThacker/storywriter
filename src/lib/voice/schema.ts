export interface VoiceAnalysisResult {
  style_descriptors: {
    sentence_length: string
    rhythm: string
    diction_level: string
    pov_preference: string
  }
  thematic_preferences: {
    tone: string
    pacing: string
    dialogue_ratio: string
    dark_light_theme: string
  }
  voice_description: string
  raw_guidance_text: string
  data_observations: {
    sentence_length_distribution: string
    vocabulary_richness: string
    dialogue_percentage: string
    pov_consistency: string
  }
}

export const VOICE_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    style_descriptors: {
      type: 'object',
      properties: {
        sentence_length: { type: 'string' },
        rhythm: { type: 'string' },
        diction_level: { type: 'string' },
        pov_preference: { type: 'string' },
      },
      required: ['sentence_length', 'rhythm', 'diction_level', 'pov_preference'],
      additionalProperties: false,
    },
    thematic_preferences: {
      type: 'object',
      properties: {
        tone: { type: 'string' },
        pacing: { type: 'string' },
        dialogue_ratio: { type: 'string' },
        dark_light_theme: { type: 'string' },
      },
      required: ['tone', 'pacing', 'dialogue_ratio', 'dark_light_theme'],
      additionalProperties: false,
    },
    voice_description: { type: 'string' },
    raw_guidance_text: { type: 'string' },
    data_observations: {
      type: 'object',
      properties: {
        sentence_length_distribution: { type: 'string' },
        vocabulary_richness: { type: 'string' },
        dialogue_percentage: { type: 'string' },
        pov_consistency: { type: 'string' },
      },
      required: [
        'sentence_length_distribution',
        'vocabulary_richness',
        'dialogue_percentage',
        'pov_consistency',
      ],
      additionalProperties: false,
    },
  },
  required: [
    'style_descriptors',
    'thematic_preferences',
    'voice_description',
    'raw_guidance_text',
    'data_observations',
  ],
  additionalProperties: false,
} as const
