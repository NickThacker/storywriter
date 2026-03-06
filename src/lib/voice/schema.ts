export interface SceneTypeRule {
  scene_type: string
  sentence_length: string
  reflection_density: string
  technical_detail: string
  emotional_temp: string
}

export interface VoiceAnalysisResult {
  // Core identity (backward-compat — always populated)
  voice_description: string
  raw_guidance_text: string

  // 1. Voice Identity
  voice_identity: {
    genre_classification: string
    literary_sensibility: string
    comparable_voices: string
    pov_type: string
    narrative_distance: string
    free_indirect_discourse: string
  }

  // 2. Sentence Architecture — includes numeric fields for charting
  sentence_metrics: {
    avg_length_words: number        // integer estimate, e.g. 18
    sentence_range: string          // e.g. "4–45 words"
    avg_paragraph_sentences: number // decimal ok, e.g. 2.5
    dialogue_percentage: number     // integer 0–100
    semicolon_frequency: string     // "Very Low" | "Low" | "Medium" | "High" | "Very High"
    em_dash_frequency: string
    structural_pattern: string      // prose description of dominant sentence pattern
    long_sentence_trigger: string   // what causes sentences to lengthen
  }

  // 3. Pacing & Rhythm
  pacing: {
    scene_construction_pattern: string
    tension_architecture: string
    default_pace: string
    time_compression_usage: string
    time_expansion_usage: string
  }

  // 4. Characterization Method
  characterization: {
    primary_technique: string
    technique_description: string
    emotional_expression_mode: string
    emotional_pattern: string
  }

  // 5. Dialogue Style
  dialogue_style: {
    frequency: string
    function: string
    style_notes: string
    attribution_pattern: string
  }

  // 6. Sensory Palette — scored 1–5 for bar charts
  sensory_palette: {
    visual: number    // 1=absent, 2=rare, 3=selective, 4=frequent, 5=primary
    tactile: number
    auditory: number
    olfactory: number
    gustatory: number
    figurative_language_notes: string
  }

  // 7. Themes
  themes: string[]
  thematic_delivery: string

  // 8. Voice Guardrails
  voice_guardrails: {
    do_not: string[]
    preserve: string[]
  }

  // 9. Scene-Type Variation Rules (5 scene types)
  scene_type_rules: SceneTypeRule[]

  // 10. Tendencies to Monitor
  tendencies_to_monitor: string[]

  // Legacy fields — kept for backward compat with existing DB display code
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
    voice_description: { type: 'string' },
    raw_guidance_text: { type: 'string' },
    voice_identity: {
      type: 'object',
      properties: {
        genre_classification: { type: 'string' },
        literary_sensibility: { type: 'string' },
        comparable_voices: { type: 'string' },
        pov_type: { type: 'string' },
        narrative_distance: { type: 'string' },
        free_indirect_discourse: { type: 'string' },
      },
      required: ['genre_classification', 'literary_sensibility', 'comparable_voices', 'pov_type', 'narrative_distance', 'free_indirect_discourse'],
      additionalProperties: false,
    },
    sentence_metrics: {
      type: 'object',
      properties: {
        avg_length_words: { type: 'number' },
        sentence_range: { type: 'string' },
        avg_paragraph_sentences: { type: 'number' },
        dialogue_percentage: { type: 'number' },
        semicolon_frequency: { type: 'string' },
        em_dash_frequency: { type: 'string' },
        structural_pattern: { type: 'string' },
        long_sentence_trigger: { type: 'string' },
      },
      required: ['avg_length_words', 'sentence_range', 'avg_paragraph_sentences', 'dialogue_percentage', 'semicolon_frequency', 'em_dash_frequency', 'structural_pattern', 'long_sentence_trigger'],
      additionalProperties: false,
    },
    pacing: {
      type: 'object',
      properties: {
        scene_construction_pattern: { type: 'string' },
        tension_architecture: { type: 'string' },
        default_pace: { type: 'string' },
        time_compression_usage: { type: 'string' },
        time_expansion_usage: { type: 'string' },
      },
      required: ['scene_construction_pattern', 'tension_architecture', 'default_pace', 'time_compression_usage', 'time_expansion_usage'],
      additionalProperties: false,
    },
    characterization: {
      type: 'object',
      properties: {
        primary_technique: { type: 'string' },
        technique_description: { type: 'string' },
        emotional_expression_mode: { type: 'string' },
        emotional_pattern: { type: 'string' },
      },
      required: ['primary_technique', 'technique_description', 'emotional_expression_mode', 'emotional_pattern'],
      additionalProperties: false,
    },
    dialogue_style: {
      type: 'object',
      properties: {
        frequency: { type: 'string' },
        function: { type: 'string' },
        style_notes: { type: 'string' },
        attribution_pattern: { type: 'string' },
      },
      required: ['frequency', 'function', 'style_notes', 'attribution_pattern'],
      additionalProperties: false,
    },
    sensory_palette: {
      type: 'object',
      properties: {
        visual: { type: 'number' },
        tactile: { type: 'number' },
        auditory: { type: 'number' },
        olfactory: { type: 'number' },
        gustatory: { type: 'number' },
        figurative_language_notes: { type: 'string' },
      },
      required: ['visual', 'tactile', 'auditory', 'olfactory', 'gustatory', 'figurative_language_notes'],
      additionalProperties: false,
    },
    themes: { type: 'array', items: { type: 'string' } },
    thematic_delivery: { type: 'string' },
    voice_guardrails: {
      type: 'object',
      properties: {
        do_not: { type: 'array', items: { type: 'string' } },
        preserve: { type: 'array', items: { type: 'string' } },
      },
      required: ['do_not', 'preserve'],
      additionalProperties: false,
    },
    scene_type_rules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          scene_type: { type: 'string' },
          sentence_length: { type: 'string' },
          reflection_density: { type: 'string' },
          technical_detail: { type: 'string' },
          emotional_temp: { type: 'string' },
        },
        required: ['scene_type', 'sentence_length', 'reflection_density', 'technical_detail', 'emotional_temp'],
        additionalProperties: false,
      },
    },
    tendencies_to_monitor: { type: 'array', items: { type: 'string' } },
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
    data_observations: {
      type: 'object',
      properties: {
        sentence_length_distribution: { type: 'string' },
        vocabulary_richness: { type: 'string' },
        dialogue_percentage: { type: 'string' },
        pov_consistency: { type: 'string' },
      },
      required: ['sentence_length_distribution', 'vocabulary_richness', 'dialogue_percentage', 'pov_consistency'],
      additionalProperties: false,
    },
  },
  required: [
    'voice_description', 'raw_guidance_text',
    'voice_identity', 'sentence_metrics', 'pacing', 'characterization',
    'dialogue_style', 'sensory_palette', 'themes', 'thematic_delivery',
    'voice_guardrails', 'scene_type_rules', 'tendencies_to_monitor',
    'style_descriptors', 'thematic_preferences', 'data_observations',
  ],
  additionalProperties: false,
} as const
