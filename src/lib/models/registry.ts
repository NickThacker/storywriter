import { createClient } from '@/lib/supabase/server'

export type ModelRole =
  | 'prose'
  | 'reviewer'
  | 'planner'
  | 'summarizer'
  | 'validation'
  | 'oracle'
  | 'arc_synthesis'

export const MODEL_DEFAULTS: Record<ModelRole, string> = {
  prose: 'anthropic/claude-sonnet-4-5',
  reviewer: 'anthropic/claude-sonnet-4',
  planner: 'anthropic/claude-sonnet-4',
  summarizer: 'anthropic/claude-sonnet-4',
  validation: 'anthropic/claude-sonnet-4',
  oracle: 'google/gemini-3-flash-preview',
  arc_synthesis: 'anthropic/claude-sonnet-4-5',
}

/**
 * Get the user's preferred model for a given role.
 * Falls back to MODEL_DEFAULTS[role] if no preference is set.
 */
export async function getModelForRole(userId: string, role: ModelRole): Promise<string> {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('user_model_preferences')
      .select('model_id')
      .eq('user_id', userId)
      .eq('task_type', role)
      .maybeSingle()

    if (data && typeof (data as { model_id?: string }).model_id === 'string') {
      return (data as { model_id: string }).model_id
    }
  } catch {
    // Fall through to default
  }

  return MODEL_DEFAULTS[role]
}
