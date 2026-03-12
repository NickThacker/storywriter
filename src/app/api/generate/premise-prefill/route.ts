import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logPrompt } from '@/lib/logging/prompt-logger'
import { getModelForRole } from '@/lib/models/registry'
import { getApiKey } from '@/lib/api-key'

interface PrefillResult {
  genre: string | null
  themes: string[]
  setting: string | null
  tone: string | null
  characters: { name: string; appearance?: string; personality?: string; backstory?: string }[]
}

const MOCK_PREFILL: PrefillResult = {
  genre: 'literary',
  themes: ['identity'],
  setting: 'urban-modern',
  tone: 'lyrical',
  characters: [{ name: 'Unnamed protagonist' }],
}

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Authenticate user
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const premise =
    body !== null &&
    typeof body === 'object' &&
    'premise' in body &&
    typeof (body as Record<string, unknown>).premise === 'string'
      ? ((body as Record<string, unknown>).premise as string).trim()
      : null

  if (!premise) {
    return NextResponse.json(
      { error: 'Missing or empty premise field' },
      { status: 400 }
    )
  }

  // 3. Get API key
  const resolvedKey = await getApiKey()

  // 4a. No API key available — return mock prefill for local development
  if (!resolvedKey) {
    return NextResponse.json(MOCK_PREFILL)
  }

  // 4b. API key exists — call OpenRouter for structured inference
  const systemPrompt = `You are a creative writing assistant. Given a story premise, infer the following details and return them as a JSON object:
- genre: the primary genre (e.g. "fantasy", "romance", "thriller", "literary", "sci-fi", "mystery", "historical")
- themes: an array of 1-3 thematic keywords (e.g. ["identity", "redemption"])
- setting: the primary setting category (e.g. "medieval-fantasy", "urban-modern", "space-opera", "contemporary")
- tone: the narrative tone (e.g. "lyrical", "dark", "humorous", "suspenseful", "romantic")
- characters: an array of key characters mentioned or implied in the premise, each with:
  - name: the character's actual name if mentioned, or a descriptive placeholder like "unnamed detective" if only a role is described
  - appearance: brief physical description if mentioned in the premise (optional)
  - personality: personality traits if evident from the premise (optional)
  - backstory: relevant background if mentioned (optional)

Return ONLY valid JSON. Do not include explanations or markdown.`

  try {
    const [prefillModel, controller] = await Promise.all([
      getModelForRole(user.id, 'planner'),
      Promise.resolve(new AbortController()),
    ])
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    logPrompt({ userId: user.id, route: 'premise-prefill', model: prefillModel, messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Infer story details from this premise:\n\n${premise}` },
    ] })

    const orResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resolvedKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://meridianwrite.com',
          'X-Title': 'Meridian',
        },
        body: JSON.stringify({
          model: prefillModel,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Infer story details from this premise:\n\n${premise}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 512,
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!orResponse.ok) {
      const errorText = await orResponse.text().catch(() => 'Unknown error')
      console.error('OpenRouter error:', orResponse.status, errorText)
      return NextResponse.json(
        { error: 'AI inference failed' },
        { status: 502 }
      )
    }

    const orData = (await orResponse.json()) as {
      choices?: { message?: { content?: string } }[]
    }

    const content = orData.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'Empty response from AI' },
        { status: 502 }
      )
    }

    let prefill: Partial<PrefillResult>
    try {
      let cleaned = content.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }
      prefill = JSON.parse(cleaned) as Partial<PrefillResult>
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON from AI' },
        { status: 502 }
      )
    }

    const result: PrefillResult = {
      genre: typeof prefill.genre === 'string' ? prefill.genre : null,
      themes: Array.isArray(prefill.themes)
        ? (prefill.themes as unknown[]).filter((t): t is string => typeof t === 'string')
        : [],
      setting: typeof prefill.setting === 'string' ? prefill.setting : null,
      tone: typeof prefill.tone === 'string' ? prefill.tone : null,
      characters: Array.isArray(prefill.characters)
        ? (prefill.characters as unknown[]).filter(
            (c): c is { name: string; appearance?: string; personality?: string; backstory?: string } =>
              c !== null &&
              typeof c === 'object' &&
              'name' in (c as object) &&
              typeof (c as Record<string, unknown>).name === 'string'
          )
        : [],
    }

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'AI request timed out' }, { status: 504 })
    }
    console.error('Premise prefill error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
