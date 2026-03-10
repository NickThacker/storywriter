import type { ProjectMemoryRow } from '@/types/project-memory'

const SYSTEM_MESSAGE = `You are a story continuity analyst. Your job is to read a chapter of a novel and extract structured state updates that track the evolving narrative.

You will receive:
1. The chapter text
2. The current state of all trackers (plot threads, character states, continuity facts, foreshadowing, thematic development)

Your output must be a JSON object that describes ONLY what changed in this chapter. Be precise and factual — extract only what is explicitly shown or strongly implied in the text.

Guidelines:
- Plot threads: Use existing thread IDs when updating. Only create new threads for genuinely new plot lines. Use kebab-case IDs for new threads.
- Character states: Only include characters who appear or are meaningfully referenced in this chapter.
- Continuity facts: Track concrete details that must stay consistent — injuries, objects given/received, promises made, time of day, weather, physical changes. Don't track vague emotional states as continuity facts.
- Foreshadowing: Only flag deliberate narrative seeds (objects described with unusual emphasis, cryptic dialogue, unresolved questions planted for the reader).
- Thematic development: Identify how the chapter's events advance the story's core themes. Be specific about HOW, not just THAT.
- Timeline events: Major plot events only, not every scene transition. Include in-story time references when available.`

/**
 * Build the system + user messages for the AI compression pass.
 * The AI reads the chapter text + current tracker state and returns
 * structured JSON describing what changed.
 */
export function buildCompressionPrompt(
  chapterNumber: number,
  chapterTitle: string,
  chapterText: string,
  currentTrackers: ProjectMemoryRow
): { systemMessage: string; userMessage: string } {
  // Build a compact representation of current state for context
  const activeThreads = (currentTrackers.plot_threads ?? [])
    .filter((t) => t.status !== 'resolved')
    .map((t) => `- [${t.id}] "${t.name}" (${t.status}): ${t.description}`)
    .join('\n')

  const characterStates = Object.entries(currentTrackers.character_states ?? {})
    .map(
      ([name, state]) =>
        `- ${name}: ${state.emotionalState}, at ${state.location}. Knows: ${(state.knowledge ?? []).slice(-3).join('; ')}`
    )
    .join('\n')

  const unresolvedFacts = (currentTrackers.continuity_facts ?? [])
    .filter((f) => !f.resolved)
    .map((f) => `- [Ch${f.introducedChapter}] ${f.fact} (${f.category})`)
    .join('\n')

  const unresolvedForeshadowing = (currentTrackers.foreshadowing ?? [])
    .filter((f) => !f.resolved)
    .map((f) => `- [Ch${f.plantedChapter}] ${f.seed} → ${f.intendedPayoff}`)
    .join('\n')

  const themes = (currentTrackers.identity?.themes ?? []).join(', ')

  const userMessage = `## Chapter ${chapterNumber}: "${chapterTitle}"

### Chapter Text
${chapterText}

---

### Current Tracker State

**Active Plot Threads:**
${activeThreads || '(none yet)'}

**Character States:**
${characterStates || '(none yet)'}

**Unresolved Continuity Facts:**
${unresolvedFacts || '(none yet)'}

**Unresolved Foreshadowing:**
${unresolvedForeshadowing || '(none yet)'}

**Story Themes:** ${themes || '(not specified)'}

---

### Instructions
Analyze Chapter ${chapterNumber} and produce a JSON object describing all state changes. Remember:
- Use existing thread IDs (e.g., "main-plot", "character-jane-doe") when updating threads
- Set chapterNumber to ${chapterNumber} for all new timeline events and continuity facts
- Only include characters who appear in this chapter
- Be concise but precise — every detail matters for continuity`

  return {
    systemMessage: SYSTEM_MESSAGE,
    userMessage,
  }
}
