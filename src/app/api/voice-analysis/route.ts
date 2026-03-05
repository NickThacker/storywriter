// CRITICAL: force-dynamic prevents Vercel from caching the streaming response
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { buildVoiceAnalysisPrompt, type StylePreferences } from '@/lib/voice/prompt'
import { VOICE_ANALYSIS_SCHEMA } from '@/lib/voice/schema'

interface VoiceAnalysisBody {
  samples: string[]
  preferences: StylePreferences
}

export async function POST(request: Request): Promise<Response> {
  // 1. Auth
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

  // 2. Parse body
  let body: VoiceAnalysisBody
  try {
    body = (await request.json()) as VoiceAnalysisBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { samples, preferences } = body
  if (!samples || samples.length === 0) {
    return new Response(JSON.stringify({ error: 'No writing samples provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 3. Get API key
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
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 4. Get model preference (use 'editing' task_type — closest semantic fit for voice analysis)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: modelPref } = await (supabase as any)
    .from('user_model_preferences')
    .select('model_id')
    .eq('user_id', user.id)
    .eq('task_type', 'editing')
    .single()

  const modelId =
    modelPref && typeof (modelPref as { model_id?: string }).model_id === 'string'
      ? (modelPref as { model_id: string }).model_id
      : 'anthropic/claude-sonnet-4-5'

  // 5. Build prompt
  const { systemMessage, userMessage } = buildVoiceAnalysisPrompt(samples, preferences)

  // 6. Call OpenRouter with structured JSON schema output + streaming
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
          json_schema: {
            name: 'author_persona',
            strict: true,
            schema: VOICE_ANALYSIS_SCHEMA,
          },
        },
      }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenRouter request failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!orResponse.ok) {
    const errorText = await orResponse.text()
    return new Response(
      JSON.stringify({ error: `OpenRouter error: ${orResponse.status} — ${errorText}` }),
      { status: orResponse.status, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 7. Stream SSE back to client (same headers as outline route)
  return new Response(orResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Encoding': 'none',
    },
  })
}
