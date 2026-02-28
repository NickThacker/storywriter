import { z } from 'zod'

export const createProjectSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters')
    .trim(),
  genre: z.string().optional(),
})

export const updateProjectSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be at most 200 characters')
      .trim()
      .optional(),
    genre: z.string().nullable().optional(),
    status: z.enum(['draft', 'writing', 'complete']).optional(),
    word_count: z.number().int().min(0).optional(),
    chapter_count: z.number().int().min(0).optional(),
    chapters_done: z.number().int().min(0).optional(),
    story_bible: z.record(z.string(), z.unknown()).optional(),
  })
  .partial()

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
