/**
 * Centralized API key resolution.
 *
 * All users share the platform's OpenRouter API key (from admin settings or env var).
 * The admin (nick@nickthacker.com) can update the key via the Settings page;
 * all other users' generation calls use it silently.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'nick@nickthacker.com'

let cachedAdminKey: string | null = null
let cachedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch the admin's OpenRouter API key from user_settings.
 * Uses a short TTL cache to avoid hitting DB on every generation.
 * Falls back to OPENROUTER_API_KEY env var.
 */
export async function getApiKey(): Promise<string | null> {
  // Check cache first
  if (cachedAdminKey && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedAdminKey
  }

  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Look up admin user by email via auth.users → user_settings
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const adminUser = authUsers?.users?.find((u) => u.email === ADMIN_EMAIL)

    if (adminUser) {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('openrouter_api_key')
        .eq('user_id', adminUser.id)
        .single()

      const key = (settings as { openrouter_api_key: string | null } | null)?.openrouter_api_key
      if (key) {
        cachedAdminKey = key
        cachedAt = Date.now()
        return key
      }
    }
  } catch (err) {
    console.error('[api-key] Failed to fetch admin key from DB:', err)
  }

  // Fallback to env var
  return process.env.OPENROUTER_API_KEY || null
}

/**
 * @deprecated Use getApiKey() instead. Kept for backward compat during migration.
 */
export function getOpenRouterApiKey(userKey: string | null): string | null {
  return userKey || process.env.OPENROUTER_API_KEY || null
}
