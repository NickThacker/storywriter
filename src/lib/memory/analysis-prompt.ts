import type {
  ProjectMemoryRow,
  PlotThread,
  ForeshadowingSeed,
  CharacterState,
  ContinuityFact,
} from '@/types/project-memory'
import type { OutlineChapter } from '@/types/database'

// ──────────────────────────────────────────────────────────────────────────────
// ChapterAnalysis — the structured output the AI produces
// ──────────────────────────────────────────────────────────────────────────────

export interface CharacterUpdate {
  name: string
  emotional_state: string
  physical_state: string
  location: string
  knowledge_gained: string[]
  relationship_changes: Record<string, string>
}

export interface TimelineEventExtract {
  event: string
  story_time: string
}

export interface PlotThreadUpdate {
  name: string                                  // match against existing by name
  new_status: 'active' | 'advanced' | 'resolved'
  development: string                           // what happened to move this thread
}

export interface NewPlotThread {
  name: string
  description: string
}

export interface ForeshadowingExtract {
  seed: string
  intended_payoff: string
}

export interface ContinuityFactExtract {
  fact: string
  category: 'time' | 'weather' | 'injury' | 'object' | 'promise' | 'other'
}

export interface ThematicExtract {
  theme: string
  development: string
}

export interface ChapterAnalysis {
  summary: string
  character_updates: CharacterUpdate[]
  timeline_events: TimelineEventExtract[]
  plot_thread_updates: PlotThreadUpdate[]
  new_plot_threads: NewPlotThread[]
  foreshadowing_paid_off: string[]    // exact seed text strings from existing foreshadowing
  new_foreshadowing: ForeshadowingExtract[]
  new_continuity_facts: ContinuityFactExtract[]
  thematic_development: ThematicExtract[]
}

// ──────────────────────────────────────────────────────────────────────────────
// buildChapterAnalysisPrompt
// ──────────────────────────────────────────────────────────────────────────────

export function buildChapterAnalysisPrompt(
  chapterNumber: number,
  chapterText: string,
  chapterOutline: OutlineChapter | null,
  memory: ProjectMemoryRow
): { system: string; user: string } {
  const identity = memory.identity

  // Serialize current character states for diff analysis
  const characterStatesSummary = Object.values(memory.character_states ?? {})
    .map((cs: CharacterState) =>
      `- ${cs.name}: emotional=${cs.emotionalState}, physical=${cs.physicalState}, location=${cs.location}`
    )
    .join('\n') || 'No character states tracked yet.'

  // Serialize active plot threads for reference
  const activeThreads = (memory.plot_threads ?? [])
    .filter((t: PlotThread) => t.status !== 'resolved')
    .map((t: PlotThread) => `- "${t.name}" [${t.status}]: ${t.description}`)
    .join('\n') || 'No active plot threads yet.'

  // Serialize unresolved foreshadowing seeds
  const unresolvedForeshadowing = (memory.foreshadowing ?? [])
    .filter((f: ForeshadowingSeed) => !f.resolved)
    .map((f: ForeshadowingSeed) => `- "${f.seed}" (intended payoff: ${f.intendedPayoff})`)
    .join('\n') || 'No unresolved foreshadowing yet.'

  // Serialize open continuity facts
  const openContinuityFacts = (memory.continuity_facts ?? [])
    .filter((f: ContinuityFact) => !f.resolved)
    .slice(-20)                                // cap to last 20 for token efficiency
    .map((f: ContinuityFact) => `- [${f.category}] ${f.fact}`)
    .join('\n') || 'None yet.'

  const outlineContext = chapterOutline
    ? `Chapter ${chapterOutline.number}: "${chapterOutline.title}"
Act: ${chapterOutline.act}
Beat sheet position: ${chapterOutline.beat_sheet_mapping}
Summary: ${chapterOutline.summary}
Beats: ${chapterOutline.beats.join(' | ')}
Featured characters: ${chapterOutline.characters_featured.join(', ')}`
    : `Chapter ${chapterNumber} (no outline data available)`

  const system = `You are a story bible analyst for a novel-writing AI system. Your job is to read a completed chapter and extract precise, structured information about what happened, how characters changed, which story threads moved, and what continuity facts were established.

You have full context: the story identity, the chapter's outline, the current character states (so you can detect changes), active plot threads (so you can advance or resolve them by name), and existing foreshadowing (so you can mark payoffs).

Be THOROUGH and SPECIFIC. Do not generalize. Capture actual names, places, revelations, injuries, promises, and events from the text — not vague summaries.

Output ONLY raw JSON with no markdown code fences, no commentary, just the JSON object.`

  const user = `## Story Identity
Genre: ${identity.genre ?? 'Unknown'}
Tone: ${identity.tone ?? 'Unknown'}
Setting: ${identity.setting ?? 'Unknown'}
Themes: ${identity.themes?.join(', ') || 'None specified'}
Premise: ${identity.premise ?? 'None specified'}

## Chapter Being Analyzed
${outlineContext}

## Current Character States (BEFORE this chapter)
${characterStatesSummary}

## Active Plot Threads (reference these by exact name when updating)
${activeThreads}

## Unresolved Foreshadowing Seeds (reference these by exact seed text when marking as paid off)
${unresolvedForeshadowing}

## Open Continuity Facts
${openContinuityFacts}

---

## Chapter Text (Chapter ${chapterNumber})

${chapterText}

---

## Required Output

Analyze the chapter above and output a single JSON object with exactly these fields:

{
  "summary": "1-2 sentence factual summary of what happened in this chapter",

  "character_updates": [
    {
      "name": "Character name (must be a named character from the text)",
      "emotional_state": "Specific emotional state at end of chapter — use concrete terms",
      "physical_state": "Physical condition — injuries, fatigue, appearance changes; 'unchanged' if nothing changed",
      "location": "Where this character is at the END of this chapter",
      "knowledge_gained": ["Specific fact or revelation they learned this chapter"],
      "relationship_changes": {
        "OtherCharacterName": "How the relationship shifted — specific and concrete"
      }
    }
  ],

  "timeline_events": [
    {
      "event": "Specific event that occurred — named characters, locations, actions",
      "story_time": "Time reference from the text (e.g. 'Tuesday morning', 'three days later', 'that evening') or 'unspecified'"
    }
  ],

  "plot_thread_updates": [
    {
      "name": "EXACT name of an existing plot thread from the Active Plot Threads list above",
      "new_status": "active | advanced | resolved",
      "development": "Specifically what happened to move or close this thread"
    }
  ],

  "new_plot_threads": [
    {
      "name": "Short, descriptive name for the new thread",
      "description": "What this thread is about and what question it raises"
    }
  ],

  "foreshadowing_paid_off": [
    "EXACT seed text from the Unresolved Foreshadowing list above that was paid off this chapter"
  ],

  "new_foreshadowing": [
    {
      "seed": "The specific detail planted in this chapter (quote or close paraphrase from the text)",
      "intended_payoff": "What this is likely setting up"
    }
  ],

  "new_continuity_facts": [
    {
      "fact": "Specific fact established in this chapter that must be maintained going forward",
      "category": "time | weather | injury | object | promise | other"
    }
  ],

  "thematic_development": [
    {
      "theme": "One of the story's themes (from the themes list above, or a newly emerging theme)",
      "development": "How this theme was expressed, deepened, complicated, or subverted in this chapter"
    }
  ]
}

Rules:
- character_updates: include every named character who has meaningful page time. Merge their state changes precisely.
- timeline_events: list all significant events in chronological order as they occur in the chapter. Aim for 3-8 events.
- plot_thread_updates: ONLY update threads that actually moved in this chapter. Do NOT invent updates to threads that had no page time.
- new_plot_threads: only threads genuinely OPENED in this chapter — new conflicts, mysteries, or commitments introduced.
- foreshadowing_paid_off: only mark as paid off if the payoff clearly happens in this chapter. Be conservative.
- new_continuity_facts: focus on facts that WILL MATTER later — injuries, physical constraints, timelines, promises, objects with significance. Skip trivial details.
- thematic_development: be specific about HOW the theme manifested, not just that it appeared.`

  return { system, user }
}
