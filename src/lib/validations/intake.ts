import { z } from 'zod'

export const intakeDataSchema = z.object({
  path: z.enum(['wizard', 'premise']),
  genre: z.string().nullable(),
  themes: z.array(z.string()),
  characters: z.array(
    z.object({
      role: z.string(),
      archetype: z.string(),
      name: z.string().optional(),
    })
  ),
  setting: z.string().nullable(),
  tone: z.string().nullable(),
  beatSheet: z.string().nullable(),
  targetLength: z.enum(['short', 'standard', 'epic']),
  chapterCount: z.number().int().min(5).max(60),
  premise: z.string().nullable(),
})

export type IntakeData = z.infer<typeof intakeDataSchema>
