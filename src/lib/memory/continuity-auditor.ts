import { getModelForRole } from '@/lib/models/registry'
import type { ChapterContextPackage } from '@/types/project-memory'

export interface ContinuityIssue {
  severity: 'high' | 'medium' | 'low'
  description: string
  conflictingFact: string
  sourceChapter: number | null
  suggestedResolution: string
}

export interface AuditResult {
  issues: ContinuityIssue[]
  clearToProceed: boolean
}

const AUDITOR_SYSTEM = `You are a continuity checker for a novel writing system. You will receive the current memory state of a novel project and the outline for the next chapter to be written. Identify any contradictions or continuity risks between the chapter plan and the established facts. Return JSON only.`

export async function runContinuityAudit(
  context: ChapterContextPackage,
  apiKey: string,
  userId: string
): Promise<AuditResult> {
  const modelId = await getModelForRole(userId, 'validation')

  // Build audit prompt
  const continuityFactsText = context.unresolvedContinuityFacts.length > 0
    ? context.unresolvedContinuityFacts
        .map((f) => `- [Ch${f.introducedChapter}, ${f.category}] ${f.fact}`)
        .join('\n')
    : 'None'

  const characterStatesText = context.characterStates.length > 0
    ? context.characterStates
        .map((c) => `${c.name}: emotional=${c.emotionalState}, physical=${c.physicalState}, location=${c.location}`)
        .join('\n')
    : 'None'

  const plotThreadsText = context.activePlotThreads.length > 0
    ? context.activePlotThreads
        .map((t) => `- ${t.name} (${t.status}): ${t.description}`)
        .join('\n')
    : 'None'

  const beatsText = context.chapterBeats.length > 0
    ? context.chapterBeats.map((b) => `- ${b}`).join('\n')
    : 'None provided'

  const userMessage = `CONTINUITY FACTS:
${continuityFactsText}

CHARACTER STATES:
${characterStatesText}

ACTIVE PLOT THREADS:
${plotThreadsText}

UPCOMING CHAPTER ${context.chapterNumber} OUTLINE:
Title: ${context.chapterTitle}
Summary: ${context.chapterSummary}
Beats:
${beatsText}
Featured characters: ${context.featuredCharacters.join(', ') || 'None specified'}

Return JSON:
{
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "description": "...",
      "conflictingFact": "...",
      "sourceChapter": <number or null — the chapter where the conflicting fact was established>,
      "suggestedResolution": "..."
    }
  ],
  "clearToProceed": boolean
}

clearToProceed must be false if any high severity issue exists. Only flag real contradictions — not style choices or minor inconsistencies. Return {"issues":[],"clearToProceed":true} if no problems are found.`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'StoryWriter',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: AUDITOR_SYSTEM },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    throw new Error(`Auditor API error: ${response.status}`)
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content ?? ''
  const parsed = JSON.parse(content) as AuditResult
  return parsed
}
