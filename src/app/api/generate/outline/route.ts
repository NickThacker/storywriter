// CRITICAL: force-dynamic prevents Vercel from caching the streaming response
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { buildOutlinePrompt, buildRegeneratePrompt } from '@/lib/outline/prompt'
import type { IntakeData } from '@/lib/validations/intake'
import { checkGenerationAccess } from '@/lib/billing/budget-check'
import { logPrompt } from '@/lib/logging/prompt-logger'
import { getModelForRole } from '@/lib/models/registry'
import { getApiKey } from '@/lib/api-key'

interface GenerateOutlineBody {
  projectId: string
  intakeData: IntakeData
  direction?: string
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authenticate user
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Parse request body
  let body: GenerateOutlineBody
  try {
    body = (await request.json()) as GenerateOutlineBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { projectId, intakeData, direction } = body

  if (!projectId || !intakeData) {
    return new Response(JSON.stringify({ error: 'Missing projectId or intakeData' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 3. Retrieve API key server-side — NEVER expose to browser
  const resolvedKey = await getApiKey()
  if (!resolvedKey) {
    return new Response(
      JSON.stringify({ error: 'No API key available. Contact support.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // 3a. Generation access check — verify subscription/credit status
  const accessCheck = await checkGenerationAccess(user.id, projectId)
  if (!accessCheck.allowed) {
    const messages: Record<string, string> = {
      no_subscription: 'No active subscription. Subscribe to start generating.',
      project_expired: 'Project credit has expired. Purchase a new credit to continue.',
      project_limit_reached: 'Project limit reached. Upgrade your plan or purchase a credit.',
      project_not_found: 'Project not found.',
    }
    return new Response(
      JSON.stringify({
        error: messages[accessCheck.reason!] ?? 'Generation not allowed.',
        code: accessCheck.reason,
      }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 4. Retrieve user's preferred outline model and persona in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [modelId, { data: personaData }] = await Promise.all([
    getModelForRole(user.id, 'planner'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('author_personas')
      .select('voice_description, raw_guidance_text, style_descriptors')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const persona = (personaData as any) ?? null

  // 5. Build the prompt — pass persona for voice injection (fail-open: null persona is fine)
  const { systemMessage, userMessage } = direction
    ? buildRegeneratePrompt(intakeData, direction, persona)
    : buildOutlinePrompt(intakeData, persona)

  // 6. Call OpenRouter directly with streaming and structured JSON schema output
  logPrompt({ userId: user.id, route: 'outline', model: modelId, messages: [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userMessage },
  ] })

  let orResponse: Response
  try {
    orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolvedKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Meridian',
      },
      body: JSON.stringify({
        model: modelId,
        stream: true,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
      }),
    })
  } catch (err) {
    console.error('OpenRouter fetch error:', err)
    return new Response(JSON.stringify({ error: 'Failed to connect to OpenRouter' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 7. If OpenRouter response not OK, return 502 with error message
  if (!orResponse.ok) {
    const errorText = await orResponse.text().catch(() => 'Unknown upstream error')
    console.error('OpenRouter error response:', orResponse.status, errorText)
    return new Response(
      JSON.stringify({ error: `Outline generation failed: ${errorText}` }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // 8. Stream the OpenRouter response body through to the client as SSE
  const responseBody = orResponse.body
  if (!responseBody) {
    return new Response(JSON.stringify({ error: 'Empty response from OpenRouter' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 9. Return with proper SSE headers
  return new Response(responseBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Encoding': 'none',
    },
  })
}
