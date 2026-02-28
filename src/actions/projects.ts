'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createProjectSchema, updateProjectSchema } from '@/lib/validations/project'
import type { ProjectRow } from '@/types/database'

export async function createProject(
  prevState: { error?: string; projectId?: string } | null,
  formData: FormData
): Promise<{ error: string } | { projectId: string }> {
  const raw = {
    title: formData.get('title') as string,
    genre: (formData.get('genre') as string) || undefined,
  }

  const parsed = createProjectSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { error: firstError }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('projects')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      genre: parsed.data.genre ?? null,
      status: 'draft',
      word_count: 0,
      chapter_count: 0,
      chapters_done: 0,
      story_bible: {},
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: (error as { message?: string })?.message ?? 'Failed to create project' }
  }

  revalidatePath('/dashboard')
  return { projectId: (data as { id: string }).id }
}

export async function deleteProject(
  projectId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateProject(
  projectId: string,
  updates: Partial<ProjectRow>
): Promise<{ success: true } | { error: string }> {
  const parsed = updateProjectSchema.safeParse(updates)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { error: firstError }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('projects')
    .update(parsed.data)
    .eq('id', projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
