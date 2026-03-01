export const LENGTH_PRESETS = [
  {
    id: 'short',
    label: 'Short Novel',
    description: '~50,000 words',
    wordCount: 50000,
    defaultChapters: 15,
  },
  {
    id: 'standard',
    label: 'Standard Novel',
    description: '~80,000 words',
    wordCount: 80000,
    defaultChapters: 24,
  },
  {
    id: 'epic',
    label: 'Epic Novel',
    description: '~120,000 words',
    wordCount: 120000,
    defaultChapters: 36,
  },
] as const

export type LengthPresetId = (typeof LENGTH_PRESETS)[number]['id']
