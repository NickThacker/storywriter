import type { VoiceAnalysisResult } from './schema'

/**
 * Compact Voice DNA brief for AI prompt injection.
 * Intentionally NOT human-readable — optimised for token efficiency
 * and machine parsing. No markdown, no prose headers.
 */
export function buildVoiceContextBrief(analysis: VoiceAnalysisResult): string {
  const vi  = analysis.voice_identity
  const sm  = analysis.sentence_metrics
  const pac = analysis.pacing
  const ch  = analysis.characterization
  const dlg = analysis.dialogue_style
  const sp  = analysis.sensory_palette

  const lines: string[] = ['[VOICE_DNA]']

  // Identity
  lines.push(
    `IDENTITY: genre=${vi.genre_classification} | pov=${vi.pov_type} | dist=${vi.narrative_distance}` +
    ` | sensibility=${vi.literary_sensibility}` +
    (vi.comparable_voices ? ` | comparable=${vi.comparable_voices}` : '') +
    (vi.free_indirect_discourse ? ` | fid=${vi.free_indirect_discourse}` : '')
  )

  // Prose metrics
  lines.push(
    `PROSE: avg=${sm.avg_length_words}w | range=${sm.sentence_range} | para=${sm.avg_paragraph_sentences}s` +
    ` | dlg=${sm.dialogue_percentage}% | semi=${sm.semicolon_frequency} | emdash=${sm.em_dash_frequency}`
  )
  lines.push(`STRUCTURE: ${sm.structural_pattern}`)
  lines.push(`LONG_SENT: ${sm.long_sentence_trigger}`)

  // Pacing
  lines.push(
    `PACING: ${pac.default_pace} | scene=${pac.scene_construction_pattern}` +
    ` | tension=${pac.tension_architecture}` +
    ` | compress=${pac.time_compression_usage} | expand=${pac.time_expansion_usage}`
  )

  // Characterization
  lines.push(
    `CHARACTER: ${ch.primary_technique} | emotion=${ch.emotional_expression_mode}` +
    ` | pattern=${ch.emotional_pattern}`
  )
  lines.push(`CHAR_METHOD: ${ch.technique_description}`)

  // Dialogue
  lines.push(
    `DIALOGUE: ${dlg.frequency} | func=${dlg.function} | style=${dlg.style_notes}` +
    ` | attr=${dlg.attribution_pattern}`
  )

  // Sensory palette
  lines.push(
    `SENSES: V=${sp.visual} T=${sp.tactile} A=${sp.auditory} O=${sp.olfactory} G=${sp.gustatory}` +
    (sp.figurative_language_notes ? ` | fig=${sp.figurative_language_notes}` : '')
  )

  // Themes
  if (analysis.themes.length > 0) {
    lines.push(`THEMES: ${analysis.themes.join(' | ')}`)
  }
  if (analysis.thematic_delivery) {
    lines.push(`DELIVERY: ${analysis.thematic_delivery}`)
  }

  // Scene-type rules
  if (analysis.scene_type_rules.length > 0) {
    const rules = analysis.scene_type_rules
      .map((r) => `${r.scene_type}:${r.sentence_length}|refl=${r.reflection_density}|det=${r.technical_detail}|temp=${r.emotional_temp}`)
      .join(' // ')
    lines.push(`SCENE_RULES: ${rules}`)
  }

  // Guardrails
  if (analysis.voice_guardrails.do_not.length > 0) {
    lines.push(`DO_NOT: ${analysis.voice_guardrails.do_not.join('; ')}`)
  }
  if (analysis.voice_guardrails.preserve.length > 0) {
    lines.push(`PRESERVE: ${analysis.voice_guardrails.preserve.join('; ')}`)
  }
  if (analysis.tendencies_to_monitor.length > 0) {
    lines.push(`TENDENCIES: ${analysis.tendencies_to_monitor.join('; ')}`)
  }

  // Core essence and generation instructions (always last)
  lines.push(`ESSENCE: ${analysis.voice_description}`)
  lines.push(`GUIDE: ${analysis.raw_guidance_text}`)

  return lines.join('\n')
}
