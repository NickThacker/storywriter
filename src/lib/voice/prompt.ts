import { MAX_SAMPLE_CHARS } from './text-extraction'

export interface StylePreferences {
  tonePreference: string | null
  pacingPreference: string | null
  dialogueRatio: string | null
  darkLightTheme: string | null
  povPreference: string | null
  dictionLevel: string | null
}

/**
 * Build system + user messages for the voice analysis AI call.
 * Truncates combined samples to MAX_SAMPLE_CHARS to avoid token limit errors.
 */
export function buildVoiceAnalysisPrompt(
  samples: string[],  // Array of writing sample text strings
  preferences: StylePreferences
): { systemMessage: string; userMessage: string } {
  const combinedSamples = samples.join('\n\n---\n\n').slice(0, MAX_SAMPLE_CHARS)

  const prefLines = [
    preferences.tonePreference ? `Tone preference: ${preferences.tonePreference}` : null,
    preferences.pacingPreference ? `Pacing: ${preferences.pacingPreference}` : null,
    preferences.dialogueRatio ? `Dialogue ratio: ${preferences.dialogueRatio}` : null,
    preferences.darkLightTheme ? `Thematic tone: ${preferences.darkLightTheme}` : null,
    preferences.povPreference ? `POV preference: ${preferences.povPreference}` : null,
    preferences.dictionLevel ? `Diction level: ${preferences.dictionLevel}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const systemMessage = `You are an expert literary editor and writing coach specializing in author voice analysis. Your task is to analyze writing samples to identify the author's distinctive style, voice, and thematic preferences.

Produce a structured JSON analysis that captures:
1. Objective style descriptors (sentence structure, rhythm, diction, POV)
2. Thematic preferences (tone, pacing, dialogue balance, dark/light themes)
3. A voice_description: a 2-4 sentence prose paragraph that captures the essence of this author's voice — written to be used as context in an AI system prompt
4. raw_guidance_text: precise, actionable AI instruction text (e.g., "Write with short, punchy sentences. Favor first-person intimate POV. Maintain a dark, literary tone.") — this text will be injected directly into generation prompts
5. data_observations: factual observations about measurable style dimensions for use in a PDF report

Be specific and concrete. Avoid generic literary praise. Focus on patterns that distinguish THIS writer from others.`

  const userMessage = `Analyze the following writing sample(s) and produce a voice analysis JSON.

${prefLines ? `Author's self-reported preferences:\n${prefLines}\n\n` : ''}Writing sample(s) (up to ${MAX_SAMPLE_CHARS} characters):

${combinedSamples}`

  return { systemMessage, userMessage }
}
