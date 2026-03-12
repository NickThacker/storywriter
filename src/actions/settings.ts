'use server'

import { createClient } from '@/lib/supabase/server'
import { apiKeySchema, modelPreferenceSchema } from '@/lib/validations/settings'
import { RECOMMENDED_MODELS } from '@/lib/models'
import type { TaskType } from '@/types/database'

const ADMIN_EMAIL = 'nick@nickthacker.com'

// ──────────────────────────────────────────────────────────────────────────────
// API Key management — admin only
// The admin's OpenRouter key powers all users silently.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Save the admin's OpenRouter API key. Only nick@nickthacker.com can call this.
 */
export async function saveApiKey(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ success: boolean } | { error: string }> {
  const raw = { apiKey: formData.get('apiKey') as string }

  const parsed = apiKeySchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid API key' }
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'You must be logged in' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Only the admin can update the API key' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('user_settings')
    .upsert(
      { user_id: user.id, openrouter_api_key: parsed.data.apiKey },
      { onConflict: 'user_id' }
    )

  if (updateError) return { error: `Failed to save API key: ${updateError.message}` }
  return { success: true }
}

/**
 * Check if the current user is the admin (for conditional UI).
 */
export async function getIsAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

// ──────────────────────────────────────────────────────────────────────────────
// Model preferences
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Save per-task model preferences for the authenticated user.
 */
export async function saveModelPreferences(
  preferences: { taskType: string; modelId: string }[]
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to save model preferences' }
  }

  // Validate each preference
  for (const pref of preferences) {
    const parsed = modelPreferenceSchema.safeParse(pref)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Invalid preference'
      return { error: `Invalid preference for ${pref.taskType}: ${firstError}` }
    }
  }

  // Upsert each preference — unique constraint on (user_id, task_type)
  for (const pref of preferences) {
    const { error: upsertError } = await supabase
      .from('user_model_preferences')
      .upsert(
        {
          user_id: user.id,
          task_type: pref.taskType as TaskType,
          model_id: pref.modelId,
        } as any,
        { onConflict: 'user_id,task_type' }
      )

    if (upsertError) {
      return { error: `Failed to save preference for ${pref.taskType}: ${upsertError.message}` }
    }
  }

  return { success: true }
}

/**
 * Get the current model preferences for the authenticated user.
 * Falls back to RECOMMENDED_MODELS defaults for any unset task type.
 */
export async function getModelPreferences(): Promise<
  { taskType: string; modelId: string }[]
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    // Return defaults for all task types
    return Object.entries(RECOMMENDED_MODELS).map(([taskType, model]) => ({
      taskType,
      modelId: model.id,
    }))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from('user_model_preferences')
    .select('task_type, model_id')
    .eq('user_id', user.id)

  if (error) {
    // Return defaults on error
    return Object.entries(RECOMMENDED_MODELS).map(([taskType, model]) => ({
      taskType,
      modelId: model.id,
    }))
  }

  // Build a map of stored preferences
  const stored = new Map(
    (rows as { task_type: string; model_id: string }[] | null)?.map((r) => [r.task_type, r.model_id]) ?? []
  )

  // Fill in defaults for any task type not explicitly set
  const taskTypes: TaskType[] = [
    'outline', 'prose', 'editing',
    'reviewer', 'planner', 'summarizer', 'validation', 'oracle', 'arc_synthesis',
  ]
  return taskTypes.map((taskType) => ({
    taskType,
    modelId: stored.get(taskType) ?? RECOMMENDED_MODELS[taskType].id,
  }))
}
