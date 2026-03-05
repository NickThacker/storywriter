import type { ChapterContextPackage } from '@/types/project-memory'
import type { AuthorPersona } from '@/types/database'

/**
 * Build the system + user messages for chapter generation.
 * Converts the assembled ChapterContextPackage into clearly labeled
 * prompt sections that the AI uses to write the chapter.
 * Optionally accepts an AuthorPersona to inject voice context into the system message.
 */
export function buildChapterPrompt(
  context: ChapterContextPackage,
  adjustments?: string,
  persona?: AuthorPersona | null
): {
  systemMessage: string
  userMessage: string
} {
  const { identity } = context

  const personaSection = persona?.voice_description
    ? `\n\nAuthor Voice:\n${persona.voice_description}`
    : ''
  const guidanceSection = persona?.raw_guidance_text
    ? `\n\nAuthor Guidance:\n${persona.raw_guidance_text}`
    : ''

  const systemMessage = `You are an expert novelist writing Chapter ${context.chapterNumber} of a ${identity.genre ?? 'literary fiction'} novel.

Tone: ${identity.tone ?? 'engaging and immersive'}
Setting: ${identity.setting ?? 'as established in the story'}
${identity.narrativeVoiceNotes ? `Voice notes: ${identity.narrativeVoiceNotes}` : ''}

Write in a consistent narrative voice that matches the established style. Focus on:
- Vivid, sensory prose that shows rather than tells
- Natural dialogue that reveals character
- Pacing appropriate to the beat sheet position
- Seamless continuity with previous chapters
- Advancing the plot threads assigned to this chapter

You must maintain perfect continuity with all established facts. If a character was injured in a previous chapter, they're still injured unless healed. If an object was placed somewhere, it's still there unless moved. Time must flow consistently.

Formatting rules:
- Use *italics* (single asterisks) for internal thoughts, overheard phone calls, letters, text messages, flashbacks, foreign words, and emphasis — just as a published novel would use italics.
- Use **bold** (double asterisks) sparingly, only for extreme emphasis.
- Separate paragraphs with blank lines.
- Do not include chapter numbers or titles in the output — just the prose.${personaSection}${guidanceSection}`

  // Build the user message with all context sections
  const sections: string[] = []

  // Story identity
  if (identity.premise) {
    sections.push(`## Premise\n${identity.premise}`)
  }
  if (identity.themes.length > 0) {
    sections.push(`## Themes\n${identity.themes.join(', ')}`)
  }

  // Chapter assignment
  sections.push(
    `## Chapter ${context.chapterNumber}: "${context.chapterTitle}"\n\n**Summary:** ${context.chapterSummary}\n\n**Beats to hit:**\n${context.chapterBeats.map((b) => `- ${b}`).join('\n')}\n\n**Featured characters:** ${context.featuredCharacters.join(', ') || 'None specified'}`
  )

  // Previous chapter context (voice continuity)
  if (context.previousChapterSummary) {
    sections.push(
      `## Previous Chapter (${context.chapterNumber - 1}) Summary\n${context.previousChapterSummary}`
    )
  }
  if (context.previousChapterText) {
    sections.push(
      `## End of Previous Chapter (for voice continuity)\n${context.previousChapterText}`
    )
  }

  // Active plot threads
  if (context.activePlotThreads.length > 0) {
    const threadLines = context.activePlotThreads
      .map(
        (t) =>
          `- **${t.name}** (${t.status}): ${t.description}`
      )
      .join('\n')
    sections.push(`## Active Plot Threads\n${threadLines}`)
  }

  // Character states
  if (context.characterStates.length > 0) {
    const charLines = context.characterStates
      .map((c) => {
        const relLines = Object.entries(c.relationships)
          .map(([name, rel]) => `  - ${name}: ${rel}`)
          .join('\n')
        return `### ${c.name}\n- Emotional state: ${c.emotionalState}\n- Physical state: ${c.physicalState}\n- Location: ${c.location}\n- Key knowledge: ${c.knowledge.slice(-5).join('; ')}\n- Relationships:\n${relLines}`
      })
      .join('\n\n')
    sections.push(`## Character States\n${charLines}`)
  }

  // Continuity facts
  if (context.unresolvedContinuityFacts.length > 0) {
    const factLines = context.unresolvedContinuityFacts
      .map((f) => `- [Ch${f.introducedChapter}, ${f.category}] ${f.fact}`)
      .join('\n')
    sections.push(
      `## Continuity Facts (must maintain)\n${factLines}`
    )
  }

  // Foreshadowing
  if (context.unresolvedForeshadowing.length > 0) {
    const fLines = context.unresolvedForeshadowing
      .map(
        (f) =>
          `- [Planted Ch${f.plantedChapter}] ${f.seed} → intended payoff: ${f.intendedPayoff}`
      )
      .join('\n')
    sections.push(`## Unresolved Foreshadowing\n${fLines}`)
  }

  // Recent thematic development
  if (context.recentThematicDevelopment.length > 0) {
    const tLines = context.recentThematicDevelopment
      .map((t) => `- Ch${t.chapterNumber} — ${t.theme}: ${t.development}`)
      .join('\n')
    sections.push(`## Recent Thematic Development\n${tLines}`)
  }

  // Timeline
  if (context.timeline.length > 0) {
    const tlLines = context.timeline
      .slice(-10) // last 10 events for recency
      .map((t) => `- Ch${t.chapterNumber} [${t.storyTime}]: ${t.event}`)
      .join('\n')
    sections.push(`## Recent Timeline\n${tlLines}`)
  }

  let userMessage = sections.join('\n\n---\n\n')

  // Append rewrite adjustments when provided
  if (adjustments && adjustments.trim().length > 0) {
    userMessage += `\n\n---\n\n## Rewrite Adjustments\nThe author has requested the following adjustments for this chapter:\n${adjustments}\n\nIncorporate these adjustments while maintaining continuity with the established story.`
  }

  return { systemMessage, userMessage }
}
