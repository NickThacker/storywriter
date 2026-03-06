import type { IntakeData } from '@/lib/validations/intake'
import { getBeatSheetById } from '@/lib/data/beat-sheets'
import type { AuthorPersona } from '@/types/database'
import type { VoiceAnalysisResult } from '@/lib/voice/schema'
import { buildVoiceContextBrief } from '@/lib/voice/context-brief'

const SYSTEM_MESSAGE = `You are an expert novel outliner and story architect. Your task is to create a detailed, well-structured novel outline that follows the specified beat sheet structure precisely.

Your output must strictly follow the provided JSON schema. Every chapter must be mapped to a specific beat in the beat sheet. Character arcs should develop meaningfully across the full novel. Locations should feel grounded and consistent throughout.

Focus on:
- Clear narrative momentum from chapter to chapter
- Authentic character development with meaningful arcs
- Thematic resonance that builds toward the climax
- Genre-appropriate pacing and tone

When no author premise is provided, your PRIMARY creative task is to invent a fresh, original story concept before structuring the outline. In that case:
- Actively avoid the most statistically overused setups for the requested genre. For romance: do NOT default to inherited estates, vineyards, bakeries, or businesses; returning to a hometown after a loss; rivals-to-lovers in a corporate competition; or a city professional stranded in a small town — unless you have a genuinely subversive take.
- Choose specific, unexpected professions, locations, and inciting situations that most novels in this genre never explore.
- Every story element should be concrete and particular — "a forensic accountant investigating a fraudulent nonprofit" beats "a businesswoman discovers love." Specificity is originality.
- The concept should feel like it could only have happened to these exact characters in this exact world.`

/**
 * Build the user message for outline generation from intake wizard data.
 * Returns an object with both system and user messages for OpenRouter.
 * Optionally accepts an AuthorPersona to inject voice context into the system message.
 */
export function buildOutlinePrompt(intakeData: IntakeData, persona?: AuthorPersona | null): {
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

  const hasPremise = !!(intakeData.premise && intakeData.premise.trim())

  const premiseLine = hasPremise
    ? `\nPremise: ${intakeData.premise!.trim()}`
    : ''

  const originalityBlock = hasPremise ? '' : `

No author premise was provided — you must invent the story concept entirely. Originality is required:
- Avoid the most common ${intakeData.genre ?? 'genre'} tropes. Do not default to the first familiar setup that comes to mind.
- Invent a specific, surprising inciting situation grounded in real human experience — one that most novels in this genre never use.
- Pick unexpected professions, locations, and relationship dynamics that feel fresh and particular.
- Derive the novel's title from your invented concept, not from a genre-generic phrase.`

  const beatSheetId = intakeData.beatSheet ?? 'three-act'
  const beatSheet = getBeatSheetById(beatSheetId)
  const beatNameList = beatSheet
    ? beatSheet.beats.map((b) => `"${b.name}"`).join(', ')
    : ''

  const userMessage = `Create a detailed novel outline with the following parameters:
Genre: ${intakeData.genre ?? 'Not specified'}
Themes: ${themesLine || 'Not specified'}
Tone: ${intakeData.tone ?? 'Not specified'}
Setting: ${intakeData.setting ?? 'Not specified'}
Beat sheet structure: ${beatSheet?.name ?? beatSheetId}
Target length: ${intakeData.targetLength} (${intakeData.chapterCount} chapters)
Characters requested:
${characterLines || '- No specific characters requested'}${premiseLine}${originalityBlock}

Generate exactly ${intakeData.chapterCount} chapters. Include 3-5 plot beats per chapter. Identify featured characters and primary location for each chapter. Create compelling character arcs that span the full novel.

IMPORTANT — beat_sheet_mapping: For each chapter's beat_sheet_mapping field, you MUST use EXACTLY one of these beat names (copy the name verbatim): ${beatNameList}. Every beat must be assigned to at least one chapter. Do NOT paraphrase or invent beat names — use only the exact names from this list.`

  let voiceSection = ''
  if (persona) {
    const richAnalysis = persona.style_descriptors as unknown as VoiceAnalysisResult | null
    if (richAnalysis?.voice_identity) {
      voiceSection = `\n\n${buildVoiceContextBrief(richAnalysis)}`
    } else if (persona.voice_description || persona.raw_guidance_text) {
      voiceSection =
        (persona.voice_description ? `\n\nAuthor Voice:\n${persona.voice_description}` : '') +
        (persona.raw_guidance_text ? `\n\nAuthor Guidance:\n${persona.raw_guidance_text}` : '')
    }
  }

  return {
    systemMessage: SYSTEM_MESSAGE + voiceSection,
    userMessage,
  }
}

/**
 * Build the user message for outline regeneration with optional directional feedback.
 * Appends regeneration direction to the base prompt when provided.
 * Optionally accepts an AuthorPersona to inject voice context into the system message.
 */
export function buildRegeneratePrompt(
  intakeData: IntakeData,
  direction?: string,
  persona?: AuthorPersona | null
): { systemMessage: string; userMessage: string } {
  const base = buildOutlinePrompt(intakeData, persona)

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
