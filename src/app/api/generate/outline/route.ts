// CRITICAL: force-dynamic prevents Vercel from caching the streaming response
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { OUTLINE_SCHEMA } from '@/lib/outline/schema'
import { buildOutlinePrompt, buildRegeneratePrompt } from '@/lib/outline/prompt'
import type { IntakeData } from '@/lib/validations/intake'

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings, error: settingsError } = await (supabase as any)
    .from('user_settings')
    .select('openrouter_api_key')
    .eq('user_id', user.id)
    .single()

  const apiKey =
    settingsError || !settings
      ? null
      : ((settings as { openrouter_api_key: string | null }).openrouter_api_key ?? null)

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'No OpenRouter API key configured. Add your key in Settings.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // 4. Retrieve user's preferred outline model
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: modelPref } = await (supabase as any)
    .from('user_model_preferences')
    .select('model_id')
    .eq('user_id', user.id)
    .eq('task_type', 'outline')
    .single()

  const modelId =
    modelPref && typeof (modelPref as { model_id?: string }).model_id === 'string'
      ? (modelPref as { model_id: string }).model_id
      : 'anthropic/claude-sonnet-4-5'

  // 5. Build the prompt
  const { systemMessage, userMessage } = direction
    ? buildRegeneratePrompt(intakeData, direction)
    : buildOutlinePrompt(intakeData)

  // 6. Call OpenRouter directly with streaming and structured JSON schema output
  let orResponse: Response
  try {
    orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'StoryWriter',
      },
      body: JSON.stringify({
        model: modelId,
        stream: true,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'novel_outline', strict: true, schema: OUTLINE_SCHEMA },
        },
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
