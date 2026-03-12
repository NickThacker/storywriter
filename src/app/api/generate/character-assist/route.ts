import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logPrompt } from '@/lib/logging/prompt-logger'
import { getModelForRole } from '@/lib/models/registry'
import { getOpenRouterApiKey } from '@/lib/api-key'

interface CharacterAssistRequest {
  action: 'suggest-names' | 'flesh-out' | 'suggest-cast'
  genre?: string
  setting?: string
  tone?: string
  themes?: string[]
  character?: { name: string; appearance?: string; personality?: string }
  count?: number
  existingCharacters?: string[]
}

const MOCK_NAMES = { names: ['Elena', 'Marcus', 'Zara', 'Felix', 'Ava'] }

const MOCK_FLESH_OUT = {
  appearance:
    'Tall and lean with sharp features, dark hair often falling across watchful grey eyes. Moves with quiet, deliberate grace.',
  personality:
    'Intensely curious and fiercely independent, with a dry wit that masks deep empathy. Struggles to ask for help but never hesitates to offer it.',
  backstory:
    'Grew up in a small coastal town, raised by a grandmother who taught them to read the weather and the moods of strangers. Left home at seventeen to chase answers to questions nobody else was asking.',
  arc: 'Must learn that vulnerability is not weakness, and that the connections they keep at arm\'s length are the very things that will save them.',
}

const MOCK_CAST = {
  characters: [
    {
      name: 'Elena',
      appearance: 'Petite with warm brown skin and a constellation of freckles. Wild curls she never bothers to tame.',
      personality: 'Bold and quick-tongued, with an infectious laugh. Hides her insecurities behind relentless optimism.',
      backstory: 'A former prodigy who burned out young and is now trying to find meaning beyond achievement.',
      arc: 'Discovers that starting over is not failure but the bravest thing she has ever done.',
    },
    {
      name: 'Marcus',
      appearance: 'Broad-shouldered with calloused hands and kind eyes. A faded scar runs along his jawline.',
      personality: 'Quiet and steady, a natural listener. Loyal to a fault, sometimes at the expense of his own needs.',
      backstory: 'The eldest of five siblings, he became the family anchor after their parents separated. Never had a dream that was just his own.',
      arc: 'Learns to want something for himself without guilt.',
    },
    {
      name: 'Zara',
      appearance: 'Striking and angular, with deep-set eyes and silver rings on every finger. Always dressed in black.',
      personality: 'Sharp, ambitious, and unapologetically blunt. Respects competence above all else.',
      backstory: 'Rose from nothing through sheer force of will. Trusts systems more than people because systems can be mastered.',
      arc: 'Confronts the cost of control and finds strength in letting go.',
    },
  ],
}

function buildSuggestNamesPrompt(req: CharacterAssistRequest): string {
  const count = req.count ?? 5
  const parts = [`Generate exactly ${count} character names that would fit naturally in a story.`]
  if (req.genre) parts.push(`Genre: ${req.genre}`)
  if (req.setting) parts.push(`Setting: ${req.setting}`)
  if (req.tone) parts.push(`Tone: ${req.tone}`)
  if (req.themes?.length) parts.push(`Themes: ${req.themes.join(', ')}`)
  if (req.existingCharacters?.length) {
    parts.push(`Avoid these names (already in use): ${req.existingCharacters.join(', ')}`)
  }
  parts.push('\nReturn a JSON object with a single "names" array of strings. No explanations.')
  return parts.join('\n')
}

function buildFleshOutPrompt(req: CharacterAssistRequest): string {
  const parts = ['Expand on this character with rich, specific details.']
  if (req.character) {
    parts.push(`Character name: ${req.character.name}`)
    if (req.character.appearance) parts.push(`Existing appearance notes: ${req.character.appearance}`)
    if (req.character.personality) parts.push(`Existing personality notes: ${req.character.personality}`)
  }
  if (req.genre) parts.push(`Genre: ${req.genre}`)
  if (req.setting) parts.push(`Setting: ${req.setting}`)
  if (req.tone) parts.push(`Tone: ${req.tone}`)
  if (req.themes?.length) parts.push(`Themes: ${req.themes.join(', ')}`)
  parts.push(
    '\nReturn a JSON object with these fields: "appearance" (2-3 sentences of vivid physical description), "personality" (2-3 sentences covering temperament, voice, and quirks), "backstory" (2-3 sentences of formative history), "arc" (1-2 sentences describing their growth trajectory). No explanations outside the JSON.'
  )
  return parts.join('\n')
}

function buildSuggestCastPrompt(req: CharacterAssistRequest): string {
  const parts = ['Generate 3-5 compelling characters that would work together in a story.']
  if (req.genre) parts.push(`Genre: ${req.genre}`)
  if (req.setting) parts.push(`Setting: ${req.setting}`)
  if (req.tone) parts.push(`Tone: ${req.tone}`)
  if (req.themes?.length) parts.push(`Themes: ${req.themes.join(', ')}`)
  if (req.existingCharacters?.length) {
    parts.push(`Avoid these names (already in use): ${req.existingCharacters.join(', ')}`)
  }
  parts.push(
    '\nReturn a JSON object with a "characters" array. Each character has: "name" (string), "appearance" (2-3 sentences), "personality" (2-3 sentences), "backstory" (2-3 sentences), "arc" (1-2 sentences). No explanations outside the JSON.'
  )
  return parts.join('\n')
}

const SYSTEM_PROMPT =
  'You are a creative writing assistant specializing in character creation. Generate vivid, original characters that avoid cliches. Return ONLY valid JSON — no markdown, no explanations.'

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
  let body: CharacterAssistRequest
  try {
    body = (await request.json()) as CharacterAssistRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body
  if (!action || !['suggest-names', 'flesh-out', 'suggest-cast'].includes(action)) {
    return NextResponse.json(
      { error: 'Invalid action. Must be suggest-names, flesh-out, or suggest-cast' },
      { status: 400 }
    )
  }

  // 3. Check if user has an API key configured
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

  const resolvedKey = getOpenRouterApiKey(apiKey)

  // 4a. No API key available — return mock data
  if (!resolvedKey) {
    switch (action) {
      case 'suggest-names':
        return NextResponse.json(MOCK_NAMES)
      case 'flesh-out':
        return NextResponse.json(MOCK_FLESH_OUT)
      case 'suggest-cast':
        return NextResponse.json(MOCK_CAST)
    }
  }

  // 4b. Build action-specific prompt
  let userPrompt: string
  switch (action) {
    case 'suggest-names':
      userPrompt = buildSuggestNamesPrompt(body)
      break
    case 'flesh-out':
      userPrompt = buildFleshOutPrompt(body)
      break
    case 'suggest-cast':
      userPrompt = buildSuggestCastPrompt(body)
      break
  }

  // 5. Call OpenRouter
  try {
    const [model, controller] = await Promise.all([
      getModelForRole(user.id, 'planner'),
      Promise.resolve(new AbortController()),
    ])
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: userPrompt },
    ]

    logPrompt({
      userId: user.id,
      route: 'character-assist',
      model,
      messages,
    })

    const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolvedKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://meridianwrite.com',
        'X-Title': 'Meridian',
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!orResponse.ok) {
      const errorText = await orResponse.text().catch(() => 'Unknown error')
      console.error('OpenRouter error:', orResponse.status, errorText)
      return NextResponse.json({ error: 'AI inference failed' }, { status: 502 })
    }

    const orData = (await orResponse.json()) as {
      choices?: { message?: { content?: string } }[]
    }

    const content = orData.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 })
    }

    let parsed: unknown
    try {
      let cleaned = content.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 502 })
    }

    return NextResponse.json(parsed)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'AI request timed out' }, { status: 504 })
    }
    console.error('Character assist error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
