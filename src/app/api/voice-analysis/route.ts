// CRITICAL: force-dynamic prevents Vercel from caching the streaming response
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { buildVoiceAnalysisPrompt } from '@/lib/voice/prompt'
import { logPrompt } from '@/lib/logging/prompt-logger'
import { getModelForRole } from '@/lib/models/registry'
import { getApiKey } from '@/lib/api-key'

interface VoiceAnalysisBody {
  samples: string[]
}

export async function POST(request: Request): Promise<Response> {
  try {
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

    const { samples } = body
    if (!samples || samples.length === 0) {
      return new Response(JSON.stringify({ error: 'No writing samples provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Get API key
    const resolvedKey = await getApiKey()
    if (!resolvedKey) {
      console.error('[voice-analysis] No API key resolved — check OPENROUTER_API_KEY or admin settings')
      return new Response(
        JSON.stringify({ error: 'No API key available. Contact support.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 4. Get reviewer model preference for voice analysis
    const modelId = await getModelForRole(user.id, 'reviewer')
    console.log('[voice-analysis] using model:', modelId)

    // 5. Build prompt
    const { systemMessage, userMessage } = buildVoiceAnalysisPrompt(samples)

    // 6. Call OpenRouter — streaming
    logPrompt({ userId: user.id, route: 'voice-analysis', model: modelId, messages: [
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
          temperature: 0,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
          ],
        }),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OpenRouter request failed'
      console.error('[voice-analysis] fetch error:', message)
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!orResponse.ok) {
      const errorText = await orResponse.text()
      console.error('[voice-analysis] OpenRouter error:', orResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: `OpenRouter error: ${orResponse.status} — ${errorText}` }),
        { status: orResponse.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 7. Stream SSE back to client
    return new Response(orResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Encoding': 'none',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Voice analysis failed'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[voice-analysis] unhandled error:', message, stack)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
