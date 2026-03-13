'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createProjectSchema, updateProjectSchema } from '@/lib/validations/project'
import { checkProjectAccess, consumeProjectCredit } from '@/lib/billing/budget-check'
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

  // Check if user settings indicate admin (admins bypass billing)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase as any)
    .from('user_settings')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  const isAdmin = (settings as { is_admin?: boolean } | null)?.is_admin === true

  // Enforce billing limits (admins bypass)
  if (!isAdmin) {
    const access = await checkProjectAccess(user.id)
    if (!access.allowed) {
      const msg = access.reason === 'project_limit_reached'
        ? 'You have reached your plan\'s project limit. Upgrade or purchase a single project credit.'
        : 'You need an active subscription or project credit to create a project.'
      return { error: msg }
    }
  }

  // Determine billing type: credit-based if user has no subscription but has credits
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: billingSettings } = await (supabase as any)
    .from('user_settings')
    .select('subscription_tier, project_credits')
    .eq('user_id', user.id)
    .single()

  const tier = (billingSettings as { subscription_tier?: string } | null)?.subscription_tier ?? 'none'
  const credits = (billingSettings as { project_credits?: number } | null)?.project_credits ?? 0

  // Credit-based: no active subscription but has credits
  const isCreditProject = !isAdmin && tier === 'none' && credits > 0

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    title: parsed.data.title,
    genre: parsed.data.genre ?? null,
    status: 'draft',
    word_count: 0,
    chapter_count: 0,
    chapters_done: 0,
    story_bible: {},
  }

  if (isCreditProject) {
    insertData.billing_type = 'credit'
    insertData.credit_expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('projects')
    .insert(insertData)
    .select('id')
    .single()

  if (error || !data) {
    return { error: (error as { message?: string })?.message ?? 'Failed to create project' }
  }

  // Consume one project credit for credit-based projects
  if (isCreditProject) {
    await consumeProjectCredit(user.id)
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
