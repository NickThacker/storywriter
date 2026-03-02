import type { OutlineChapter } from '@/types/database'
import type { StateDiff } from '@/types/project-memory'

// ──────────────────────────────────────────────────────────────────────────────
// JSON Schema for structured direction options output
// ──────────────────────────────────────────────────────────────────────────────

export const DIRECTION_OPTIONS_SCHEMA = {
  type: 'object' as const,
  properties: {
    options: {
      type: 'array' as const,
      minItems: 2,   // CONTEXT.md locks "2-4 AI-generated options"
      maxItems: 4,   // CONTEXT.md locks "2-4 AI-generated options"
      items: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, description: 'Unique identifier (e.g., "opt-1")' },
          title: { type: 'string' as const, description: 'One-sentence bold hook describing this direction' },
          body: { type: 'string' as const, description: '3-4 sentence paragraph elaborating on tone, pacing, and character focus for this direction' },
        },
        required: ['id', 'title', 'body'] as const,
        additionalProperties: false,
      },
    },
  },
  required: ['options'] as const,
  additionalProperties: false,
}

// ──────────────────────────────────────────────────────────────────────────────
// Prompt builder
// ──────────────────────────────────────────────────────────────────────────────

const SYSTEM_MESSAGE = `You are a creative writing consultant helping an author plan the execution of their next chapter.

Generate 2-4 distinct direction options for the upcoming chapter. Each option must stay strictly within the approved outline's plot beats — they control HOW the beats are executed (tone, pacing, character emphasis, scene focus, emotional register), not WHAT happens plot-wise.

Rules:
- Do NOT introduce new plot events that aren't in the outline beats
- Do NOT resolve threads that the outline doesn't resolve in this chapter
- Each option must be genuinely distinct from the others — give the author a meaningful creative choice
- Options should vary along dimensions like: intimate vs. epic scope, slow-burn tension vs. immediate confrontation, internal character focus vs. external action, dark tone vs. hopeful undercurrent
- Each option must have: a bold one-sentence hook (title) and a 3-4 sentence paragraph (body) describing tone, pacing, and character emphasis

Your response must be valid JSON matching the provided schema.`

/**
 * Build the system + user messages for direction options generation.
 * The AI receives context about the just-completed chapter and the next
 * chapter's outline beats, then generates 2-4 execution-level options.
 */
export function buildDirectionPrompt(
  chapterNumber: number,
  chapterTitle: string,
  chapterSummary: string,
  chapterStateDiff: StateDiff | null,
  nextChapter: OutlineChapter | null,
  genre: string | null,
  tone: string | null
): { systemMessage: string; userMessage: string } {
  if (!nextChapter) {
    // This should not be called for the last chapter, but guard gracefully
    throw new Error('buildDirectionPrompt: nextChapter is null — direction options are not generated for the last chapter')
  }

  // Build state diff summary
  let stateDiffSection = '(no state diff available)'
  if (chapterStateDiff) {
    const parts: string[] = []
    if (chapterStateDiff.newThreads.length > 0) {
      parts.push(`New threads introduced: ${chapterStateDiff.newThreads.join(', ')}`)
    }
    if (chapterStateDiff.advancedThreads.length > 0) {
      parts.push(`Threads advanced: ${chapterStateDiff.advancedThreads.join(', ')}`)
    }
    if (chapterStateDiff.resolvedThreads.length > 0) {
      parts.push(`Threads resolved: ${chapterStateDiff.resolvedThreads.join(', ')}`)
    }
    const characterChanges = Object.entries(chapterStateDiff.characterChanges)
    if (characterChanges.length > 0) {
      parts.push(
        'Character changes:\n' +
          characterChanges.map(([name, change]) => `  - ${name}: ${change}`).join('\n')
      )
    }
    if (chapterStateDiff.newContinuityFacts.length > 0) {
      parts.push(`New continuity facts: ${chapterStateDiff.newContinuityFacts.join('; ')}`)
    }
    if (chapterStateDiff.newForeshadowing.length > 0) {
      parts.push(`New foreshadowing planted: ${chapterStateDiff.newForeshadowing.join('; ')}`)
    }
    stateDiffSection = parts.length > 0 ? parts.join('\n') : '(no significant narrative changes detected)'
  }

  // Build next chapter beats list
  const beatsSection =
    nextChapter.beats.length > 0
      ? nextChapter.beats.map((b, i) => `${i + 1}. ${b}`).join('\n')
      : '(no beats specified)'

  // Build featured characters section
  const charactersSection =
    nextChapter.characters_featured && nextChapter.characters_featured.length > 0
      ? nextChapter.characters_featured.join(', ')
      : '(not specified)'

  const userMessage = `## Project Context
Genre: ${genre ?? 'Not specified'}
Tone: ${tone ?? 'Not specified'}

---

## Just-Completed Chapter: Chapter ${chapterNumber} — "${chapterTitle}"

### Summary
${chapterSummary}

### Narrative State Changes
${stateDiffSection}

---

## Upcoming Chapter: Chapter ${nextChapter.number} — "${nextChapter.title}"

### Outline Summary
${nextChapter.summary}

### Required Beats (MUST be executed — do not deviate)
${beatsSection}

### Featured Characters
${charactersSection}

### Act
Act ${nextChapter.act}

---

## Your Task
Generate 2-4 direction options for Chapter ${nextChapter.number}. Each option must execute the beats above in a distinct way. Vary tone, pacing, scene focus, and character emphasis — but never alter WHAT happens according to the beats.

Return JSON with an "options" array where each option has: id (e.g., "opt-1"), title (one-sentence bold hook), body (3-4 sentences on tone, pacing, character emphasis).`

  return {
    systemMessage: SYSTEM_MESSAGE,
    userMessage,
  }
}
