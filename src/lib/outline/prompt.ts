import type { IntakeData } from '@/lib/validations/intake'

const SYSTEM_MESSAGE = `You are an expert novel outliner and story architect. Your task is to create a detailed, well-structured novel outline that follows the specified beat sheet structure precisely.

Your output must strictly follow the provided JSON schema. Every chapter must be mapped to a specific beat in the beat sheet. Character arcs should develop meaningfully across the full novel. Locations should feel grounded and consistent throughout.

Focus on:
- Clear narrative momentum from chapter to chapter
- Authentic character development with meaningful arcs
- Thematic resonance that builds toward the climax
- Genre-appropriate pacing and tone`

/**
 * Build the user message for outline generation from intake wizard data.
 * Returns an object with both system and user messages for OpenRouter.
 */
export function buildOutlinePrompt(intakeData: IntakeData): {
  systemMessage: string
  userMessage: string
} {
  const characterLines = intakeData.characters
    .map((c) => {
      const namePart = c.name ? ` named "${c.name}"` : ''
      return `- ${c.role}${namePart} (${c.archetype})`
    })
    .join('\n')

  const themesLine = intakeData.themes.join(', ')

  const premiseLine =
    intakeData.premise && intakeData.premise.trim()
      ? `\nPremise: ${intakeData.premise.trim()}`
      : ''

  const userMessage = `Create a detailed novel outline with the following parameters:
Genre: ${intakeData.genre ?? 'Not specified'}
Themes: ${themesLine || 'Not specified'}
Tone: ${intakeData.tone ?? 'Not specified'}
Setting: ${intakeData.setting ?? 'Not specified'}
Beat sheet structure: ${intakeData.beatSheet ?? 'Three-Act Structure'}
Target length: ${intakeData.targetLength} (${intakeData.chapterCount} chapters)
Characters requested:
${characterLines || '- No specific characters requested'}${premiseLine}

Generate exactly ${intakeData.chapterCount} chapters. Map each chapter to the appropriate beat in the ${intakeData.beatSheet ?? 'three-act'} beat sheet. Include 3-5 plot beats per chapter. Identify featured characters and primary location for each chapter. Create compelling character arcs that span the full novel.`

  return {
    systemMessage: SYSTEM_MESSAGE,
    userMessage,
  }
}

/**
 * Build the user message for outline regeneration with optional directional feedback.
 * Appends regeneration direction to the base prompt when provided.
 */
export function buildRegeneratePrompt(
  intakeData: IntakeData,
  direction?: string
): { systemMessage: string; userMessage: string } {
  const base = buildOutlinePrompt(intakeData)

  if (!direction || !direction.trim()) {
    return base
  }

  const userMessage = `${base.userMessage}

Regeneration direction: ${direction.trim()}

Please incorporate the above feedback into the new outline. Make meaningful changes that address the requested direction while maintaining overall narrative coherence.`

  return {
    systemMessage: base.systemMessage,
    userMessage,
  }
}
