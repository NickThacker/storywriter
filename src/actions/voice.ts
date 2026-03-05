'use server'

import { createClient } from '@/lib/supabase/server'
import type { AuthorPersonaRow, AuthorPersonaUpdate } from '@/types/database'

/**
 * Get the current user's author persona. Returns null if not yet created.
 */
export async function getPersona(): Promise<AuthorPersonaRow | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('author_personas')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return (data as AuthorPersonaRow) ?? null
}

/**
 * Upsert the current user's author persona.
 * Creates the row if it doesn't exist; updates if it does.
 */
export async function savePersona(
  update: AuthorPersonaUpdate & { wizard_step?: number; analysis_complete?: boolean }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('author_personas')
    .upsert(
      { user_id: user.id, ...update },
      { onConflict: 'user_id' }
    )

  if (error) return { error: error.message }
  return {}
}

/**
 * Mark the onboarding nudge as dismissed for the current user.
 * Sets voice_onboarding_dismissed = true in user_settings.
 */
export async function dismissOnboardingNudge(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('user_settings')
    .upsert(
      { user_id: user.id, voice_onboarding_dismissed: true },
      { onConflict: 'user_id' }
    )

  if (error) return { error: error.message }
  return {}
}
