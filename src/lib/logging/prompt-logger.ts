import { createClient } from '@/lib/supabase/server'

export interface PromptLogEntry {
  userId: string
  route: string
  model: string
  messages: { role: string; content: string }[]
}

/**
 * Fire-and-forget: logs the prompt payload to prompt_logs.
 * Never throws or awaits — must never block the generation call.
 */
export function logPrompt(entry: PromptLogEntry): void {
  void (async () => {
    try {
      const supabase = await createClient()
      const charCount = entry.messages.reduce((sum, m) => sum + m.content.length, 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('prompt_logs').insert({
        user_id:    entry.userId,
        route:      entry.route,
        model:      entry.model,
        messages:   entry.messages,
        char_count: charCount,
      })
    } catch {
      // Intentionally swallowed — logging must never break generation
    }
  })()
}
