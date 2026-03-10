import { createClient } from '@/lib/supabase/server'
import { collectCharacterHistory } from '@/lib/arc/collect-character-history'
import type { CharacterArc, ArcTrajectoryPoint, ArcKeyMoment, ProjectMemoryRow } from '@/types/project-memory'

import { MODEL_DEFAULTS } from '@/lib/models/registry'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_ARC_MODEL = MODEL_DEFAULTS.arc_synthesis

interface ArcLLMResponse {
  arc_summary: string
  arc_trajectory: ArcTrajectoryPoint[]
  key_moments: ArcKeyMoment[]
  unresolved_threads: string[]
}

/**
 * Synthesize the arc for a single character by examining all chapter checkpoints
 * through the given chapter number.
 */
export async function synthesizeCharacterArc(
  projectId: string,
  characterName: string,
  chapterNumber: number,
  apiKey: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<CharacterArc> {
  // Look up model preference for arc_synthesis
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: modelPref } = await (supabase as any)
    .from('user_model_preferences')
    .select('model_id')
    .eq('user_id', userId)
    .eq('task_type', 'arc_synthesis')
    .maybeSingle()

  const modelId =
    modelPref && typeof (modelPref as { model_id?: string }).model_id === 'string'
      ? (modelPref as { model_id: string }).model_id
      : DEFAULT_ARC_MODEL

  // Collect chapter history for this character
  const history = await collectCharacterHistory(projectId, characterName, chapterNumber, supabase)

  if (history.appearsInChapters.length === 0) {
    throw new Error(`Character ${characterName} has not appeared yet`)
  }

  // Build prompt — only include chapters where the character appears
  const relevantEntries = history.entries.filter((e) => e.stateChange !== null)

  const historyLines = relevantEntries
    .map((e) => {
      return [
        `Chapter ${e.chapterNumber}: ${e.summary}`,
        `State change: ${e.stateChange}`,
        `Excerpt: ${e.textExcerpt}`,
      ].join('\n')
    })
    .join('\n\n')

  const systemMessage =
    'You are a narrative analyst specializing in character arc analysis. You will receive chapter summaries from a novel featuring a specific character. Identify the character\'s arc trajectory — how they have changed emotionally, psychologically, and situationally. Return JSON only, no prose or markdown fences.'

  const userMessage = `CHARACTER: ${characterName}

CHAPTER HISTORY (chapters where this character appears):
${historyLines}

Return JSON:
{
  "arc_summary": "One sentence: the emotional/psychological journey so far",
  "arc_trajectory": [{ "chapter": N, "state": "brief state", "pivot_description": "what changed" }],
  "key_moments": [{ "chapter": N, "description": "what happened that mattered" }],
  "unresolved_threads": ["things seeded in arc not yet paid off"]
}
Output ONLY raw JSON.`

  // Call OpenRouter (non-streaming)
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'StoryWriter',
    },
    body: JSON.stringify({
      model: modelId,
      stream: false,
      temperature: 0,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown')
    throw new Error(`OpenRouter arc synthesis failed (${response.status}): ${errText}`)
  }

  const responseJson = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const rawContent = responseJson.choices?.[0]?.message?.content ?? ''

  let parsed: ArcLLMResponse
  try {
    // Strip markdown fences if present despite instructions
    const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    parsed = JSON.parse(cleaned) as ArcLLMResponse
  } catch (err) {
    throw new Error(`Failed to parse arc synthesis JSON: ${err instanceof Error ? err.message : String(err)}`)
  }

  const now = new Date().toISOString()

  // Upsert to character_arcs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upserted, error: upsertError } = await (supabase as any)
    .from('character_arcs')
    .upsert(
      {
        project_id: projectId,
        character_name: characterName,
        arc_summary: parsed.arc_summary ?? '',
        arc_trajectory: parsed.arc_trajectory ?? [],
        key_moments: parsed.key_moments ?? [],
        unresolved_threads: parsed.unresolved_threads ?? [],
        synthesized_through_chapter: chapterNumber,
        model_used: modelId,
        updated_at: now,
      },
      { onConflict: 'project_id,character_name' }
    )
    .select()
    .single()

  if (upsertError || !upserted) {
    throw new Error(`Failed to upsert character arc: ${upsertError?.message ?? 'no data returned'}`)
  }

  return upserted as CharacterArc
}

/**
 * Synthesize arcs for all characters currently tracked in project_memory.
 * Creates its own Supabase client. Runs in parallel with allSettled.
 */
export async function synthesizeAllArcs(
  projectId: string,
  chapterNumber: number,
  apiKey: string,
  userId: string
): Promise<{ synthesized: string[]; failed: string[]; skipped: string[] }> {
  const supabase = await createClient()

  // Fetch character names from project_memory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memRow, error: memError } = await (supabase as any)
    .from('project_memory')
    .select('character_states')
    .eq('project_id', projectId)
    .maybeSingle()

  if (memError || !memRow) {
    console.error('[synthesizeAllArcs] failed to fetch project_memory:', memError)
    return { synthesized: [], failed: [], skipped: [] }
  }

  const characterStates = (memRow as Pick<ProjectMemoryRow, 'character_states'>).character_states ?? {}
  const characterNames = Object.keys(characterStates)

  if (characterNames.length === 0) {
    return { synthesized: [], failed: [], skipped: [] }
  }

  const results = await Promise.allSettled(
    characterNames.map((name) =>
      synthesizeCharacterArc(projectId, name, chapterNumber, apiKey, userId, supabase)
    )
  )

  const synthesized: string[] = []
  const failed: string[] = []
  const skipped: string[] = []

  results.forEach((result, idx) => {
    const name = characterNames[idx]
    if (result.status === 'fulfilled') {
      synthesized.push(name)
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
      if (reason.includes('has not appeared yet')) {
        skipped.push(name)
      } else {
        console.error(`[synthesizeAllArcs] failed for "${name}":`, reason)
        failed.push(name)
      }
    }
  })

  return { synthesized, failed, skipped }
}
