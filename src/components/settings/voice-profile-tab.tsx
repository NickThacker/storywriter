'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { savePersona } from '@/actions/voice'
import type { AuthorPersonaRow } from '@/types/database'
import type { VoiceAnalysisResult, SceneTypeRule } from '@/lib/voice/schema'
import { toast } from 'sonner'

/* ─── Utility ─── */

function label(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ─── Section heading ─── */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[0.65rem] uppercase tracking-[0.12em] mb-4"
      style={{ color: 'var(--gold)' }}
    >
      {children}
    </h3>
  )
}

/* ─── Big stat number ─── */
function StatCard({ value, unit, caption }: { value: string | number; unit?: string; caption: string }) {
  return (
    <div className="border border-border bg-card p-4 text-center" style={{ borderRadius: 0 }}>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-2xl font-light" style={{ fontFamily: 'var(--font-literata)', color: 'var(--gold)' }}>
          {value}
        </span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mt-1.5">{caption}</p>
    </div>
  )
}

/* ─── Ring / donut chart for percentage ─── */
function RingChart({ value, max = 100, caption }: { value: number; max?: number; caption: string }) {
  const pct = Math.round((value / max) * 100)
  const r = 32
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * pct) / 100

  return (
    <div className="border border-border bg-card p-4 flex flex-col items-center" style={{ borderRadius: 0 }}>
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
          <circle
            cx="40" cy="40" r={r} fill="none"
            stroke="var(--gold)" strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="butt"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-light" style={{ fontFamily: 'var(--font-literata)', color: 'var(--gold)' }}>
            {pct}%
          </span>
        </div>
      </div>
      <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mt-2">{caption}</p>
    </div>
  )
}

/* ─── Horizontal bar ─── */
function SensoryBar({ label: barLabel, value, max = 5 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100)
  const intensityLabel = ['', 'Absent', 'Rare', 'Selective', 'Frequent', 'Primary'][value] ?? ''
  return (
    <div className="flex items-center gap-3">
      <span className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground w-20 shrink-0">{barLabel}</span>
      <div className="flex-1 h-2 bg-border/50 overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, var(--gold), oklch(0.75 0.1 62))` }}
        />
      </div>
      <span className="text-[0.6rem] text-muted-foreground w-16 text-right">{intensityLabel}</span>
    </div>
  )
}

/* ─── Frequency badge ─── */
function FrequencyBadge({ label: text, level }: { label: string; level: string }) {
  const colorMap: Record<string, string> = {
    'Very Low': 'border-border text-muted-foreground/60',
    'Low': 'border-border text-muted-foreground',
    'Medium': 'border-[color:var(--gold)]/30 text-foreground',
    'High': 'border-[color:var(--gold)]/60 text-[color:var(--gold)]',
    'Very High': 'border-[color:var(--gold)] text-[color:var(--gold)]',
  }
  const cls = colorMap[level] ?? 'border-border text-muted-foreground'
  return (
    <div className={`border px-3 py-2 text-center ${cls}`} style={{ borderRadius: 0 }}>
      <p className="text-xs">{level}</p>
      <p className="text-[0.55rem] uppercase tracking-[0.1em] text-muted-foreground mt-0.5">{text}</p>
    </div>
  )
}

/* ─── Scene type heat cell ─── */
const HEAT_COLORS: Record<string, string> = {
  'Low': 'bg-border/40 text-muted-foreground',
  'Medium': 'bg-[color:var(--gold)]/10 text-foreground',
  'Medium-Low': 'bg-border/60 text-muted-foreground',
  'Medium-High': 'bg-[color:var(--gold)]/20 text-foreground',
  'High': 'bg-[color:var(--gold)]/30 text-[color:var(--gold)]',
  'Very High': 'bg-[color:var(--gold)]/40 text-[color:var(--gold)]',
  'Cool': 'bg-blue-950/30 text-blue-300/80',
  'Warm': 'bg-amber-950/30 text-amber-300/80',
  'Hot': 'bg-red-950/30 text-red-300/80',
  'Variable': 'bg-purple-950/30 text-purple-300/80',
}

function heatClass(val: string) {
  for (const [key, cls] of Object.entries(HEAT_COLORS)) {
    if (val.toLowerCase().includes(key.toLowerCase())) return cls
  }
  return 'bg-card text-muted-foreground'
}

/* ─── Prose paragraph block ─── */
function ProseBlock({ text, className = '' }: { text: string; className?: string }) {
  return <p className={`text-sm text-muted-foreground leading-relaxed ${className}`}>{text}</p>
}

/* ─── Tag pill ─── */
function Tag({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'preserve' | 'avoid' }) {
  const cls = {
    default: 'border-border text-foreground/80',
    preserve: 'border-emerald-800/40 text-emerald-300/80 bg-emerald-950/20',
    avoid: 'border-red-800/40 text-red-300/80 bg-red-950/20',
  }[variant]
  return (
    <span className={`inline-block border px-2.5 py-1 text-xs ${cls}`} style={{ borderRadius: 0 }}>
      {children}
    </span>
  )
}

/* ═══════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════ */

export function VoiceProfileTab({ persona }: { persona: AuthorPersonaRow | null }) {
  const [guidanceText, setGuidanceText] = useState(persona?.raw_guidance_text ?? '')
  const [isSaving, setIsSaving] = useState(false)

  if (!persona || !persona.analysis_complete) {
    return (
      <div
        className="border border-dashed border-border p-8 text-center text-muted-foreground"
        style={{ borderRadius: 0 }}
      >
        <p className="mb-4">No voice profile set up yet.</p>
        <Button asChild variant="outline" style={{ borderRadius: 0 }}>
          <Link href="/onboarding">Set up voice profile</Link>
        </Button>
      </div>
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    const result = await savePersona({ raw_guidance_text: guidanceText })
    setIsSaving(false)
    if (result.error) {
      toast.error('Failed to save guidance text')
    } else {
      toast.success('Guidance text saved')
    }
  }

  // Cast the rich analysis data
  const a = persona.style_descriptors as unknown as VoiceAnalysisResult | null

  return (
    <div className="space-y-10">

      {/* ── Voice Summary ── */}
      {persona.voice_description && (
        <div>
          <SectionHeading>Voice Summary</SectionHeading>
          <div className="border-l-2" style={{ borderColor: 'color-mix(in oklch, var(--gold), transparent 60%)' }}>
            <p
              className="text-base leading-relaxed text-foreground/90"
              style={{ fontFamily: 'var(--font-literata)', paddingLeft: '10px' }}
            >
              {persona.voice_description}
            </p>
          </div>
        </div>
      )}

      {/* ── Voice Identity ── */}
      {a?.voice_identity && (
        <div>
          <SectionHeading>Voice Identity</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border bg-card p-4 col-span-2" style={{ borderRadius: 0 }}>
              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1">Genre</p>
              <p className="text-sm text-foreground">{a.voice_identity.genre_classification}</p>
              {a.voice_identity.literary_sensibility && (
                <p className="text-xs text-muted-foreground mt-1.5">{a.voice_identity.literary_sensibility}</p>
              )}
            </div>
            <div className="border border-border bg-card p-4" style={{ borderRadius: 0 }}>
              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1">Point of View</p>
              <p className="text-sm text-foreground">{a.voice_identity.pov_type}</p>
            </div>
            <div className="border border-border bg-card p-4" style={{ borderRadius: 0 }}>
              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1">Narrative Distance</p>
              <p className="text-sm text-foreground">{a.voice_identity.narrative_distance}</p>
            </div>
            {a.voice_identity.comparable_voices && (
              <div className="border border-border bg-card p-4 col-span-2" style={{ borderRadius: 0 }}>
                <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1">Comparable Voices</p>
                <p className="text-sm text-foreground" style={{ fontFamily: 'var(--font-literata)' }}>
                  {a.voice_identity.comparable_voices}
                </p>
              </div>
            )}
            {a.voice_identity.free_indirect_discourse && (
              <div className="border border-border bg-card p-4 col-span-2" style={{ borderRadius: 0 }}>
                <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1">Free Indirect Discourse</p>
                <p className="text-sm text-muted-foreground">{a.voice_identity.free_indirect_discourse}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sentence Architecture ── */}
      {a?.sentence_metrics && (
        <div>
          <SectionHeading>Sentence Architecture</SectionHeading>

          {/* Stat cards row */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatCard value={a.sentence_metrics.avg_length_words} unit="words" caption="Avg Sentence" />
            <StatCard value={a.sentence_metrics.avg_paragraph_sentences} unit="sent" caption="Per Paragraph" />
            <RingChart value={a.sentence_metrics.dialogue_percentage} caption="Dialogue" />
            <StatCard value={a.sentence_metrics.sentence_range} caption="Sentence Range" />
          </div>

          {/* Punctuation frequency badges */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <FrequencyBadge label="Semicolons" level={a.sentence_metrics.semicolon_frequency} />
            <FrequencyBadge label="Em dashes" level={a.sentence_metrics.em_dash_frequency} />
          </div>

          {/* Prose descriptions */}
          <div className="space-y-3">
            {a.sentence_metrics.structural_pattern && (
              <div className="border border-border bg-card p-4" style={{ borderRadius: 0 }}>
                <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1.5">Structural Pattern</p>
                <ProseBlock text={a.sentence_metrics.structural_pattern} />
              </div>
            )}
            {a.sentence_metrics.long_sentence_trigger && (
              <div className="border border-border bg-card p-4" style={{ borderRadius: 0 }}>
                <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1.5">What Lengthens Sentences</p>
                <ProseBlock text={a.sentence_metrics.long_sentence_trigger} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pacing & Rhythm ── */}
      {a?.pacing && (
        <div>
          <SectionHeading>Pacing & Rhythm</SectionHeading>
          <div className="space-y-3">
            {([
              ['Default Pace', a.pacing.default_pace],
              ['Tension Architecture', a.pacing.tension_architecture],
              ['Scene Construction', a.pacing.scene_construction_pattern],
              ['Time Expansion', a.pacing.time_expansion_usage],
              ['Time Compression', a.pacing.time_compression_usage],
            ] as const).filter(([, v]) => v).map(([heading, text]) => (
              <div key={heading} className="border border-border bg-card p-4" style={{ borderRadius: 0 }}>
                <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1.5">{heading}</p>
                <ProseBlock text={text!} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Characterization ── */}
      {a?.characterization && (
        <div>
          <SectionHeading>Characterization</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border bg-card p-4" style={{ borderRadius: 0 }}>
              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1">Primary Technique</p>
              <p className="text-sm text-foreground font-medium" style={{ fontFamily: 'var(--font-literata)' }}>
                {a.characterization.primary_technique}
              </p>
              {a.characterization.technique_description && (
                <ProseBlock text={a.characterization.technique_description} className="mt-2" />
              )}
            </div>
            <div className="border border-border bg-card p-4" style={{ borderRadius: 0 }}>
              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1">Emotional Expression</p>
              <p className="text-sm text-foreground font-medium" style={{ fontFamily: 'var(--font-literata)' }}>
                {a.characterization.emotional_expression_mode}
              </p>
              {a.characterization.emotional_pattern && (
                <ProseBlock text={a.characterization.emotional_pattern} className="mt-2" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Dialogue Style ── */}
      {a?.dialogue_style && (
        <div>
          <SectionHeading>Dialogue Style</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            {([
              ['Role in Story', a.dialogue_style.function],
              ['Frequency', a.dialogue_style.frequency],
              ['Style Notes', a.dialogue_style.style_notes],
              ['Attribution Pattern', a.dialogue_style.attribution_pattern],
            ] as const).filter(([, v]) => v).map(([heading, text]) => (
              <div key={heading} className="border border-border bg-card p-4" style={{ borderRadius: 0 }}>
                <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1.5">{heading}</p>
                <ProseBlock text={text!} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sensory Palette ── */}
      {a?.sensory_palette && (
        <div>
          <SectionHeading>Sensory Palette</SectionHeading>
          <div className="border border-border bg-card p-5" style={{ borderRadius: 0 }}>
            <div className="space-y-3">
              {(['visual', 'tactile', 'auditory', 'olfactory', 'gustatory'] as const)
                .filter((k) => typeof a.sensory_palette[k] === 'number')
                .map((k) => (
                  <SensoryBar key={k} label={k} value={a.sensory_palette[k]} />
                ))}
            </div>
            {a.sensory_palette.figurative_language_notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1.5">Figurative Language</p>
                <ProseBlock text={a.sensory_palette.figurative_language_notes} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Themes ── */}
      {a?.themes && a.themes.length > 0 && (
        <div>
          <SectionHeading>Themes</SectionHeading>
          <div className="flex flex-wrap gap-2 mb-3">
            {a.themes.map((t, i) => <Tag key={i}>{t}</Tag>)}
          </div>
          {a.thematic_delivery && (
            <div className="border border-border bg-card p-4 mt-3" style={{ borderRadius: 0 }}>
              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground mb-1.5">How Themes Are Delivered</p>
              <ProseBlock text={a.thematic_delivery} />
            </div>
          )}
        </div>
      )}

      {/* ── Scene Type Rules ── */}
      {a?.scene_type_rules && a.scene_type_rules.length > 0 && (
        <div>
          <SectionHeading>Scene Type Variation</SectionHeading>
          <p className="text-xs text-muted-foreground mb-3">
            How your writing style shifts across different types of scenes.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground font-normal">Scene Type</th>
                  <th className="text-left py-2 px-3 text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground font-normal">Sentence Length</th>
                  <th className="text-left py-2 px-3 text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground font-normal">Reflection</th>
                  <th className="text-left py-2 px-3 text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground font-normal">Detail</th>
                  <th className="text-left py-2 pl-3 text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground font-normal">Emotional Temp</th>
                </tr>
              </thead>
              <tbody>
                {a.scene_type_rules.map((rule: SceneTypeRule, i: number) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2.5 pr-3 text-foreground font-medium whitespace-nowrap">{rule.scene_type}</td>
                    <td className="py-2.5 px-3"><span className={`inline-block px-2 py-0.5 text-[0.65rem] ${heatClass(rule.sentence_length)}`}>{rule.sentence_length}</span></td>
                    <td className="py-2.5 px-3"><span className={`inline-block px-2 py-0.5 text-[0.65rem] ${heatClass(rule.reflection_density)}`}>{rule.reflection_density}</span></td>
                    <td className="py-2.5 px-3"><span className={`inline-block px-2 py-0.5 text-[0.65rem] ${heatClass(rule.technical_detail)}`}>{rule.technical_detail}</span></td>
                    <td className="py-2.5 pl-3"><span className={`inline-block px-2 py-0.5 text-[0.65rem] ${heatClass(rule.emotional_temp)}`}>{rule.emotional_temp}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Voice Guardrails ── */}
      {a?.voice_guardrails && (
        <div>
          <SectionHeading>Voice Guardrails</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            {a.voice_guardrails.preserve && a.voice_guardrails.preserve.length > 0 && (
              <div className="border border-border bg-card p-4" style={{ borderRadius: 0 }}>
                <p className="text-[0.6rem] uppercase tracking-[0.1em] text-emerald-400/70 mb-3">Always Preserve</p>
                <ul className="space-y-2">
                  {a.voice_guardrails.preserve.map((item, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="text-emerald-400/60 shrink-0 mt-px">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {a.voice_guardrails.do_not && a.voice_guardrails.do_not.length > 0 && (
              <div className="border border-border bg-card p-4" style={{ borderRadius: 0 }}>
                <p className="text-[0.6rem] uppercase tracking-[0.1em] text-red-400/70 mb-3">Never Do</p>
                <ul className="space-y-2">
                  {a.voice_guardrails.do_not.map((item, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="text-red-400/60 shrink-0 mt-px">&times;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tendencies to Monitor ── */}
      {a?.tendencies_to_monitor && a.tendencies_to_monitor.length > 0 && (
        <div>
          <SectionHeading>Tendencies to Monitor</SectionHeading>
          <p className="text-xs text-muted-foreground mb-3">
            Patterns in your writing that the AI watches for and self-corrects during generation.
          </p>
          <div className="space-y-2">
            {a.tendencies_to_monitor.map((t, i) => (
              <div key={i} className="flex gap-3 border border-border bg-card px-4 py-2.5" style={{ borderRadius: 0 }}>
                <span className="text-[color:var(--gold)]/60 text-xs shrink-0 mt-px">{i + 1}</span>
                <p className="text-xs text-muted-foreground">{t}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Editable guidance text ── */}
      <div>
        <SectionHeading>AI Guidance Text</SectionHeading>
        <p className="text-[0.7rem] text-muted-foreground mb-3">
          This text is injected into every generation prompt to guide the AI. You can edit it to fine-tune how your voice is applied.
        </p>
        <textarea
          className="w-full min-h-[100px] border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[color:var(--gold)]/60 transition-colors"
          style={{ borderRadius: 0 }}
          value={guidanceText}
          onChange={(e) => setGuidanceText(e.target.value)}
          placeholder="e.g. Write with short, punchy sentences. Favor first-person intimate POV."
        />
        <Button
          onClick={handleSave}
          disabled={isSaving}
          variant="outline"
          className="text-[0.68rem] uppercase tracking-[0.1em] cursor-pointer mt-2"
          style={{ borderRadius: 0 }}
        >
          {isSaving ? 'Saving...' : 'Save guidance text'}
        </Button>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 border-t border-border pt-6">
        <Button asChild variant="outline" className="text-[0.68rem] uppercase tracking-[0.1em]" style={{ borderRadius: 0 }}>
          <Link href="/onboarding">Re-run analysis</Link>
        </Button>
        <Button asChild variant="outline" className="text-[0.68rem] uppercase tracking-[0.1em]" style={{ borderRadius: 0 }}>
          <a href="/api/voice-report" download="author-voice-report.pdf">Download PDF</a>
        </Button>
      </div>
    </div>
  )
}
