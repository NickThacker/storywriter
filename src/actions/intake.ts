'use server'

import { createClient } from '@/lib/supabase/server'
import { intakeDataSchema, type IntakeData } from '@/lib/validations/intake'

/**
 * Save intake wizard data to the project's intake_data JSONB column.
 * Also updates the project's genre field if genre is provided.
 * Verifies user ownership before writing.
 */
export async function saveIntakeData(
  projectId: string,
  data: IntakeData
): Promise<{ success: true } | { error: string }> {
  const parsed = intakeDataSchema.safeParse(data)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid intake data'
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

  // Verify the user owns this project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return { error: 'Project not found or access denied' }
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    intake_data: parsed.data,
  }

  // Also sync genre to the top-level column if provided
  if (parsed.data.genre) {
    updatePayload.genre = parsed.data.genre
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('projects')
    .update(updatePayload)
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  return { success: true }
}

/**
 * Retrieve a project's saved intake data.
 * Used by the intake layout to hydrate the store with previously saved state.
 * Verifies user ownership before reading.
 */
export async function getIntakeData(
  projectId: string
): Promise<{ data: IntakeData | null } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('intake_data')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return { error: 'Project not found or access denied' }
  }

  const rawIntakeData = (project as { intake_data: unknown }).intake_data

  if (!rawIntakeData) {
    return { data: null }
  }

  // Validate saved data conforms to schema (graceful degradation if schema changed)
  const parsed = intakeDataSchema.safeParse(rawIntakeData)
  if (!parsed.success) {
    // Data exists but doesn't match current schema — treat as no saved data
    return { data: null }
  }

  return { data: parsed.data }
}
