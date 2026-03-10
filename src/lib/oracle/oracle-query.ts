import { createClient } from '@/lib/supabase/server'
import { assembleManuscript } from './assemble-manuscript'
import { hashOutline } from './outline-hash'
import type { OutlineChapter } from '@/types/database'
import { MODEL_DEFAULTS } from '@/lib/models/registry'

const DEFAULT_ORACLE_MODEL = MODEL_DEFAULTS.oracle

export interface OracleOutput {
  callbacks: string[]
  contradictionRisks: string[]
  unresolvedMotifs: string[]
  setupPayoffs: string[]
  characterMoments: string[]
}

export interface OracleResult {
  oracleOutput: OracleOutput
  cached: boolean
  chaptersAnalyzed: number
}

interface OracleCacheRow {
  oracle_output: OracleOutput
  model_used: string
}

export async function queryOracle(
  projectId: string,
  chapterNumber: number,
  apiKey: string,
  userId: string
): Promise<OracleResult> {
  const supabase = await createClient()

  // Fetch outline + user model preference in parallel
  const [outlineResult, modelPrefResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('outlines')
      .select('chapters')
      .eq('project_id', projectId)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('user_model_preferences')
      .select('model_id')
      .eq('user_id', userId)
      .eq('task_type', 'oracle')
      .maybeSingle(),
  ])

  const outlineChapters = (outlineResult.data as { chapters: OutlineChapter[] } | null)?.chapters ?? []
  const chapterOutline = outlineChapters.find((c) => c.number === chapterNumber) ?? null

  const modelId =
    modelPrefResult.data && typeof (modelPrefResult.data as { model_id?: string }).model_id === 'string'
      ? (modelPrefResult.data as { model_id: string }).model_id
      : DEFAULT_ORACLE_MODEL

  // Compute outline hash for cache key
  const outlineHash = hashOutline(outlineChapters)

  console.log(`[oracle] project=${projectId} chapter=${chapterNumber} model=${modelId}`)

  // Check cache
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cached, error: cacheError } = await (supabase as any)
    .from('oracle_cache')
    .select('oracle_output, model_used')
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber)
    .eq('outline_hash', outlineHash)
    .maybeSingle()

  if (cacheError) {
    console.error('[oracle] oracle_cache query error (table may not exist):', cacheError.message)
    throw new Error(`oracle_cache query failed: ${cacheError.message}`)
  }

  if (cached) {
    console.log(`[oracle] cache hit for chapter ${chapterNumber}`)
    const row = cached as OracleCacheRow
    return {
      oracleOutput: row.oracle_output,
      cached: true,
      chaptersAnalyzed: chapterNumber - 1,
    }
  }

  // Cache miss — assemble manuscript and call Gemini
  const { text: manuscriptText, chaptersIncluded } = await assembleManuscript(projectId, chapterNumber)

  console.log(`[oracle] manuscript assembled: ${chaptersIncluded} chapters, ${manuscriptText.length} chars`)

  if (!manuscriptText) {
    // Chapter 1 or no prior text — return empty oracle
    console.log('[oracle] no prior manuscript text — skipping Gemini call')
    const empty: OracleOutput = {
      callbacks: [],
      contradictionRisks: [],
      unresolvedMotifs: [],
      setupPayoffs: [],
      characterMoments: [],
    }
    return { oracleOutput: empty, cached: false, chaptersAnalyzed: 0 }
  }

  const chapterContext = chapterOutline
    ? `Title: "${chapterOutline.title}"
Act: ${chapterOutline.act}
Beat: ${chapterOutline.beat_sheet_mapping}
Summary: ${chapterOutline.summary}
Beats: ${chapterOutline.beats.join(' | ')}
Featured characters: ${chapterOutline.characters_featured.join(', ')}`
    : `Chapter ${chapterNumber} (no outline data)`

  const systemPrompt = `You are a manuscript analyst for a novel writing system. You will receive the full text of a novel-in-progress and the outline beat for the upcoming chapter. Your job is to surface specific, actionable intelligence to help the writer maintain long-range coherence. Return JSON only — no prose, no markdown fences.`

  const userPrompt = `FULL MANUSCRIPT SO FAR (${chaptersIncluded} chapters):

${manuscriptText}

---

UPCOMING CHAPTER ${chapterNumber} OUTLINE:
${chapterContext}

---

Return a JSON object with exactly these fields:
{
  "callbacks": ["specific passages or details from earlier chapters worth echoing or referencing in chapter ${chapterNumber}"],
  "contradictionRisks": ["things established in earlier chapters that could conflict with the upcoming beats"],
  "unresolvedMotifs": ["recurring images, phrases, or themes from the manuscript that could be reinforced here"],
  "setupPayoffs": ["foreshadowed elements planted earlier that could naturally pay off in chapter ${chapterNumber}"],
  "characterMoments": ["specific moments in the manuscript relevant to the featured characters in this chapter"]
}

Each array should contain 2–5 specific, concrete strings referencing actual content from the manuscript. Return empty arrays if nothing applies. Output ONLY raw JSON.`

  const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!orResponse.ok) {
    throw new Error(`Oracle model request failed: ${orResponse.status}`)
  }

  const orJson = (await orResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = orJson.choices?.[0]?.message?.content
  if (!content) throw new Error('No content from oracle model')

  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const oracleOutput = JSON.parse(cleaned) as OracleOutput

  // Cache the result (upsert in case of race)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: cacheWriteError } = await (supabase as any)
    .from('oracle_cache')
    .upsert(
      {
        project_id: projectId,
        outline_hash: outlineHash,
        chapter_number: chapterNumber,
        oracle_output: oracleOutput,
        model_used: modelId,
      },
      { onConflict: 'project_id,chapter_number,outline_hash' }
    )

  if (cacheWriteError) {
    console.error('[oracle] Failed to cache oracle result:', cacheWriteError.message)
  }

  return { oracleOutput, cached: false, chaptersAnalyzed: chaptersIncluded }
}
