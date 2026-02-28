import { z } from 'zod'

// OpenRouter API keys start with "sk-or-" but we accept any "sk-" prefix
// to allow for future key formats without breaking validation.
export const apiKeySchema = z.object({
  apiKey: z
    .string()
    .min(10, 'API key must be at least 10 characters')
    .startsWith('sk-', 'API key must start with "sk-"'),
})

export const modelPreferenceSchema = z.object({
  taskType: z.enum(['outline', 'prose', 'editing']),
  modelId: z.string().min(1, 'Model ID is required'),
})

export type ApiKeyInput = z.infer<typeof apiKeySchema>
export type ModelPreferenceInput = z.infer<typeof modelPreferenceSchema>
