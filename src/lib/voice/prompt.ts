import { MAX_SAMPLE_CHARS } from './text-extraction'

/**
 * Build system + user messages for the voice analysis AI call.
 * Requests a comprehensive Voice DNA Profile matching the style-anchor format.
 */
export function buildVoiceAnalysisPrompt(
  samples: string[]
): { systemMessage: string; userMessage: string } {
  const combinedSamples = samples.join('\n\n---\n\n').slice(0, MAX_SAMPLE_CHARS)

  const systemMessage = `You are an expert literary editor producing a comprehensive Voice DNA Profile — a detailed analysis document that captures an author's distinctive style so precisely that an AI writing assistant can reproduce it consistently across a full novel.

Analyze the provided writing samples and produce a structured JSON analysis. Be specific and concrete. Reference actual patterns from the text. Avoid generic literary praise.

IMPORTANT: Respond with ONLY the raw JSON object. No markdown code fences, no preamble, no explanation — just the JSON, starting with { and ending with }.

## Field-by-field instructions

**voice_description**: 2–4 sentence prose paragraph capturing the essence of this author's voice. Written to be injected directly into AI generation system prompts. Must be specific enough to distinguish this voice from others.

**raw_guidance_text**: Precise, actionable AI instructions (e.g., "Write with short declarative sentences averaging 15–20 words. Use close third-person limited POV. Build tension through emotional weight and accumulation, not acceleration. Avoid adverbs, flowery metaphor, and exposition through dialogue."). This text is injected verbatim into every generation prompt.

**voice_identity**:
- genre_classification: Primary genre(s), e.g. "Thriller / Adventure" or "Literary Fiction"
- literary_sensibility: Where this voice sits on the literary↔genre spectrum, e.g. "Genre fiction with literary craft — takes setting, character interiority, and thematic subtext seriously"
- comparable_voices: Authors this voice resembles and WHY, e.g. "Crichton's observational precision meets C.J. Box's quiet protagonist interiority; procedural authenticity of Craig Johnson"
- pov_type: e.g. "Third-person limited, locked to single protagonist"
- narrative_distance: e.g. "Very close — camera sits inside protagonist's head"
- free_indirect_discourse: Frequency and character, e.g. "Frequent and natural; character thoughts blend into narration without italics or attribution tags"

**sentence_metrics** (quantitative — used for charts in the PDF report):
- avg_length_words: Estimated average sentence length as an integer (count words in several sentences)
- sentence_range: Full range including outliers, e.g. "4–45 words"
- avg_paragraph_sentences: Average sentences per paragraph as a decimal, e.g. 2.5
- dialogue_percentage: Estimated percentage of total text that is dialogue, integer 0–100
- semicolon_frequency: Exactly one of: "Very Low", "Low", "Medium", "High", "Very High"
- em_dash_frequency: Exactly one of: "Very Low", "Low", "Medium", "High", "Very High"
- structural_pattern: 1–2 sentence description of the dominant sentence structure and what it reveals about the author's mind or voice
- long_sentence_trigger: What causes sentences to lengthen in this prose (e.g. "Technical expertise mode", "Emotional revelation", "Complex moral reasoning")

**pacing**:
- scene_construction_pattern: How scenes are architecturally built, e.g. "Action-reflection-action-reflection interleaving — physical sequences consistently interrupted by internal commentary"
- tension_architecture: How tension is generated and sustained, e.g. "Through accumulated emotional weight rather than pace acceleration; questions of meaning over questions of outcome"
- default_pace: The baseline narrative speed, e.g. "Deliberate and measured; scenes breathe"
- time_compression_usage: When and how the author speeds past time, e.g. "Procedural sequences and crew logistics; used to skip mechanics in favor of meaning"
- time_expansion_usage: When and how the author slows time, e.g. "Moments of observation, relationship, or emotional significance"

**characterization**:
- primary_technique: Name the technique, e.g. "Knowledge-Based Revelation", "Physical Detail Accumulation", "Dialogue-Driven Exposure", "Contrast Characterization"
- technique_description: 2–3 sentences explaining how this technique works in this specific voice. What does the author reveal and how?
- emotional_expression_mode: How emotions register in the prose, e.g. "Understated", "Expressionist", "Confessional", "Displaced onto environment"
- emotional_pattern: The specific pattern of emotional delivery, e.g. "Physical observation carries emotional weight the narrator refuses to name; small gestures do the work of monologue"

**dialogue_style**:
- frequency: e.g. "Minimal (~5–10% of text)" or "Moderate (~25–30%)" or "Heavy (~50%+)"
- function: What role dialogue plays in this narrative, e.g. "Strictly functional — conveys necessary information, advances plot, never used for exposition"
- style_notes: Characteristic patterns, e.g. "Clipped, professional, realistic; no exposition through dialogue; follows real-world institutional communication patterns"
- attribution_pattern: How speech is tagged, e.g. "Simple 'said' throughout; avoids adverb-heavy tags; action beats used as alternatives to dialogue tags"

**sensory_palette** — score each sense 1–5:
- 1 = Absent (not used in the samples)
- 2 = Rare (one or two instances)
- 3 = Selective (used meaningfully in a few places)
- 4 = Frequent (appears throughout, clearly intentional)
- 5 = Primary (the dominant sensory mode)
- figurative_language_notes: Prose on metaphor/simile density, personification, and whether figurative language is used or avoided and to what effect

**themes**: Array of 4–8 specific themes identified in the samples. Write as precise phrases, not vague generalities. E.g. "Human intrusion into natural systems — treated with quiet anger, never preachiness" not just "nature".

**thematic_delivery**: How themes enter the text — explicit vs embedded, authorial stance, whether the narrator editorializes.

**voice_guardrails**:
- do_not: 6–10 specific patterns to AVOID that would break or flatten this voice. Be concrete: name actual techniques that conflict with this style.
- preserve: 6–10 specific patterns to KEEP that are definitional to this voice. Be concrete: name actual techniques this author uses that must be maintained.

**scene_type_rules**: Exactly 5 entries, one for each scene type listed. These represent how the core voice parameters flex across scene types:
1. "Action / Field Work"
2. "Introspection / Reflection"
3. "Dialogue Scenes"
4. "Discovery / Reveal"
5. "Quiet / Transitional"

For each:
- sentence_length: e.g. "Short (8–14 words)", "Medium (15–25 words)", "Variable", "Very short (5–10 words)"
- reflection_density: exactly "Low", "Medium", or "High"
- technical_detail: exactly "Low", "Medium", or "High"
- emotional_temp: e.g. "Cool", "Warm", "Rising", "Melancholic", "Neutral", "Charged"

**tendencies_to_monitor**: 3–5 patterns that are NOT flaws but could become repetitive over novel-length work. Reviewers should flag these if appearing in excess. Be specific to what you observed in this author's samples.

**style_descriptors** (legacy summary — short phrases):
- sentence_length, rhythm, diction_level, pov_preference

**thematic_preferences** (legacy summary — short phrases):
- tone, pacing, dialogue_ratio, dark_light_theme

**data_observations** (legacy):
- sentence_length_distribution, vocabulary_richness, dialogue_percentage, pov_consistency`

  const userMessage = `Analyze the following writing sample(s) and produce a comprehensive Voice DNA Profile JSON.

Writing sample(s) (up to ${MAX_SAMPLE_CHARS.toLocaleString()} characters):

${combinedSamples}`

  return { systemMessage, userMessage }
}
