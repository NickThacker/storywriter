'use server'

import { createClient } from '@/lib/supabase/server'
import { apiKeySchema, modelPreferenceSchema } from '@/lib/validations/settings'
import { RECOMMENDED_MODELS } from '@/lib/models'
import type { TaskType } from '@/types/database'

// ──────────────────────────────────────────────────────────────────────────────
// API Key management
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Save the user's OpenRouter API key directly in user_settings.
 * The raw key is NEVER returned to the client after this call.
 * Protected by RLS — only the owning user can read/write their row.
 */
export async function saveApiKey(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ success: boolean } | { error: string }> {
  const raw = {
    apiKey: formData.get('apiKey') as string,
  }

  const parsed = apiKeySchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid API key'
    return { error: firstError }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to save an API key' }
  }

  // Store key directly in user_settings. RLS ensures only the owner can access.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('user_settings')
    .update({ openrouter_api_key: parsed.data.apiKey })
    .eq('user_id', user.id)

  if (updateError) {
    return { error: `Failed to save API key: ${updateError.message}` }
  }

  return { success: true }
}

/**
 * Test an OpenRouter API key by calling the models endpoint server-side.
 * The key is NEVER stored or logged during this call.
 */
export async function testApiKey(
  apiKey: string
): Promise<{ valid: true } | { valid: false; error: string }> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API key is required' }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return { valid: true }
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Invalid API key' }
    }

    return { valid: false, error: `Unexpected response: ${response.status}` }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { valid: false, error: 'Connection timed out' }
    }
    return { valid: false, error: 'Connection failed' }
  }
}

/**
 * Delete the user's API key from user_settings.
 */
export async function deleteApiKey(): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to delete an API key' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('user_settings')
    .update({ openrouter_api_key: null })
    .eq('user_id', user.id)

  if (updateError) {
    return { error: `Failed to delete API key: ${updateError.message}` }
  }

  return { success: true }
}

/**
 * Get the current API key status for the authenticated user.
 * Returns only the last 4 characters of the key — NEVER the full key.
 */
export async function getApiKeyStatus(): Promise<{
  hasKey: boolean
  keyHint: string | null
  subscriptionTier: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { hasKey: false, keyHint: null, subscriptionTier: 'none' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings, error: settingsError } = await (supabase as any)
    .from('user_settings')
    .select('openrouter_api_key, subscription_tier')
    .eq('user_id', user.id)
    .single()

  if (settingsError || !settings) {
    return { hasKey: false, keyHint: null, subscriptionTier: 'none' }
  }

  const apiKey = settings?.openrouter_api_key as string | null
  const subscriptionTier = settings?.subscription_tier as string ?? 'none'

  if (!apiKey) {
    return {
      hasKey: false,
      keyHint: null,
      subscriptionTier,
    }
  }

  // Extract ONLY last 4 characters — the full key is never returned
  const keyHint = apiKey.slice(-4)

  return {
    hasKey: true,
    keyHint,
    subscriptionTier,
  }
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
  const taskTypes: TaskType[] = ['outline', 'prose', 'editing']
  return taskTypes.map((taskType) => ({
    taskType,
    modelId: stored.get(taskType) ?? RECOMMENDED_MODELS[taskType].id,
  }))
}
