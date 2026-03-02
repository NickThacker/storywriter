// ──────────────────────────────────────────────────────────────────────────────
// JSON Schema for structured impact analysis output
// ──────────────────────────────────────────────────────────────────────────────

export const IMPACT_ANALYSIS_SCHEMA = {
  type: 'object' as const,
  properties: {
    affectedChapters: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          chapterNumber: { type: 'number' as const },
          description: {
            type: 'string' as const,
            description: 'Specific description of what in this chapter references or depends on the changed direction',
          },
          affectsPlotThreads: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['chapterNumber', 'description', 'affectsPlotThreads'] as const,
        additionalProperties: false,
      },
    },
  },
  required: ['affectedChapters'] as const,
  additionalProperties: false,
}

// ──────────────────────────────────────────────────────────────────────────────
// Prompt builder
// ──────────────────────────────────────────────────────────────────────────────

const SYSTEM_MESSAGE = `You are a continuity analyst for a novel writing tool.

Given a direction change on a completed chapter, analyze subsequent chapters for content that CONCRETELY references or depends on the changed material.

Rules:
- Only flag chapters that have CONCRETE references to the changed direction — a specific character decision, plot event, object, or consequence that was introduced by or directly results from the changed direction
- Do NOT flag chapters speculatively (e.g., "this might be affected because the tone changed")
- For each flagged chapter, describe specifically what content is affected (quote or paraphrase the relevant passage) and which plot threads are impacted
- If no chapters are concretely affected, return an empty affectedChapters array
- Keep descriptions concise and actionable — the author needs to know exactly what to look for when they re-read that chapter

Your response must be valid JSON matching the provided schema.`

/**
 * Build the system + user messages for impact analysis.
 * Called when a user changes a prior chapter's direction and wants to see
 * which downstream chapters (with existing text) are concretely affected.
 */
export function buildImpactPrompt(
  changedChapterNumber: number,
  changedChapterSummary: string,
  oldDirection: string | null,
  newDirection: string,
  downstreamChapters: Array<{ number: number; title: string; text: string; summary: string }>
): { systemMessage: string; userMessage: string } {
  // Build the downstream chapters section (full text for thorough analysis)
  const downstreamSection = downstreamChapters
    .map((ch) => {
      return `### Chapter ${ch.number}: "${ch.title}"

**Summary:**
${ch.summary}

**Full Text:**
${ch.text}`
    })
    .join('\n\n---\n\n')

  const userMessage = `## Changed Chapter: Chapter ${changedChapterNumber}

### Chapter Summary
${changedChapterSummary}

### Previous Direction (what was written with)
${oldDirection ?? '(no explicit direction was set — the chapter was written with default context)'}

### New Direction (what the author now wants)
${newDirection}

---

## Downstream Chapters to Analyze

The following chapters have already been written. Analyze each one for CONCRETE content that references or depends on the OLD direction and would need to be revisited given the NEW direction.

${downstreamSection}

---

## Your Task

Return a JSON object with an "affectedChapters" array. For each chapter that has concrete references to the changed direction, include:
- chapterNumber: the chapter number
- description: specific description of what content is affected and why
- affectsPlotThreads: list of plot thread names that are impacted (empty array if none)

Only include chapters with concrete dependencies — omit chapters that are thematically fine as-is.`

  return {
    systemMessage: SYSTEM_MESSAGE,
    userMessage,
  }
}
