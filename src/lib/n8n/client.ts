/**
 * Server-side n8n webhook client — NEVER import in Client Components.
 *
 * Security pattern:
 *   N8N_BASE_URL and N8N_WEBHOOK_SECRET must NOT have NEXT_PUBLIC_ prefix.
 *   These values are only available at runtime on the server and are never
 *   sent to the browser.
 *
 * n8n shared-secret validation:
 *   The n8n instance validates the shared secret via an IF node that is the
 *   first node after the Webhook trigger.
 *   IF node condition: {{ $request.headers['x-webhook-secret'] === $env.WEBHOOK_SECRET }}
 *   If the condition is false, n8n responds with 401 and the workflow halts.
 */

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class N8nError extends Error {
  status: number
  body: string

  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'N8nError'
    this.status = status
    this.body = body
  }
}

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if both N8N_BASE_URL and N8N_WEBHOOK_SECRET are set.
 * Use this to conditionally show/hide n8n-dependent features and to fail
 * gracefully in development when n8n is not running.
 */
export function isN8nConfigured(): boolean {
  return Boolean(process.env.N8N_BASE_URL && process.env.N8N_WEBHOOK_SECRET)
}

// ---------------------------------------------------------------------------
// Webhook client
// ---------------------------------------------------------------------------

/**
 * Trigger an n8n webhook workflow and return its response.
 *
 * @param webhookPath - The webhook path registered in n8n (e.g. "test", "generate-chapter")
 * @param payload     - JSON-serializable payload to send as the request body
 * @returns           The parsed JSON response from n8n
 * @throws N8nError   On non-2xx responses (includes HTTP status and raw body)
 * @throws TypeError  If N8N_BASE_URL or N8N_WEBHOOK_SECRET are not configured
 */
export async function triggerN8nWorkflow(
  webhookPath: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  const baseUrl = process.env.N8N_BASE_URL
  const secret = process.env.N8N_WEBHOOK_SECRET

  if (!baseUrl || !secret) {
    throw new TypeError(
      'N8N_BASE_URL and N8N_WEBHOOK_SECRET must be set. ' +
        'These are server-only environment variables and must NOT have NEXT_PUBLIC_ prefix.'
    )
  }

  const url = `${baseUrl}/webhook/${webhookPath}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': secret,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000), // 30-second timeout
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '(unreadable body)')
    throw new N8nError(
      `n8n webhook responded with ${response.status} ${response.statusText}`,
      response.status,
      body
    )
  }

  return response.json()
}
