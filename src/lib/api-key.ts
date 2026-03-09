/**
 * Centralized API key resolution.
 *
 * Priority: user's personal key (BYOK) > platform key from env var.
 * Returns null only when neither source provides a key (misconfigured deployment).
 */
export function getOpenRouterApiKey(userKey: string | null): string | null {
  return userKey || process.env.OPENROUTER_API_KEY || null
}
