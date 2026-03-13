'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Lock, Pencil, ArrowRight, User, Mic, Shield, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useIntakeStore, useIntakeLocked } from '@/components/intake/intake-store-provider'
import { GENRES } from '@/lib/data/genres'
import { THEMES } from '@/lib/data/themes'
import { TONES } from '@/lib/data/tones'
import { SETTINGS } from '@/lib/data/settings'
import { BEAT_SHEETS } from '@/lib/data/beat-sheets'
import { LENGTH_PRESETS } from '@/lib/data/lengths'
import type { VoiceAnalysisResult } from '@/lib/voice/schema'

// Step indices for edit navigation
const STEP_GENRE = 1
const STEP_THEMES = 2
const STEP_CHARACTERS = 3
const STEP_SETTING = 4
const STEP_TONE = 5

// ── AI context descriptions — what each choice injects into generation ─────

const GENRE_AI_CONTEXT: Record<string, string> = {
  fantasy: 'World-building logic, magic system consistency, mythic stakes and escalation patterns',
  romance: 'Romantic tension pacing, emotional beats, relationship arc tracking across chapters',
  thriller: 'Threat escalation, pacing pressure, countdown structures and stakes amplification',
  'sci-fi': 'Technological consistency, speculative extrapolation, concept-grounded world logic',
  literary: 'Character interiority, thematic resonance, prose rhythm and symbolic layering',
}

const TONE_AI_CONTEXT: Record<string, string> = {
  dark: 'Unflinching prose register, moral ambiguity, consequence without consolation',
  hopeful: 'Light amid difficulty, earned optimism, redemptive arc shaping',
  witty: 'Sharp dialogue cadence, subverted expectations, comic timing in pacing',
  lyrical: 'Poetic prose cadence, atmospheric layering, emotionally resonant imagery',
}

const SETTING_AI_CONTEXT: Record<string, string> = {
  'urban-modern': 'Modern cultural references, digital-age social dynamics, city as backdrop for collision',
  historical: 'Period-authentic detail, social constraints of the era, historical event grounding',
  'secondary-world': 'Internally consistent world rules, invented geography and culture, myth logic',
  rural: 'Landscape as character, community-scale drama, isolation as psychological pressure',
  space: 'Speculative technology, orbital/planetary dynamics, extrapolated political systems',
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
      {children}
    </p>
  )
}

function MissingAlert({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
      <span className="text-xs text-destructive">{label}</span>
    </div>
  )
}

// A row in the two-column blueprint ↔ AI context layout
function BlueprintRow({
  label,
  onEdit,
  locked,
  left,
  right,
  missing,
  missingLabel,
}: {
  label: string
  onEdit: () => void
  locked?: boolean
  left: React.ReactNode
  right: React.ReactNode
  missing?: boolean
  missingLabel?: string
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
      {/* Left: user's choice */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <SectionLabel>{label}</SectionLabel>
          {!locked && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <Pencil className="h-2.5 w-2.5" />
              Edit
            </button>
          )}
        </div>
        {missing ? <MissingAlert label={missingLabel ?? `${label} required`} /> : left}
      </div>

      {/* Arrow connector */}
      <div className="flex h-full items-center pt-5">
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
      </div>

      {/* Right: AI context */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel>AI context</SectionLabel>
        {missing ? (
          <div className="h-8 rounded-md border border-dashed border-border" />
        ) : (
          right
        )}
      </div>
    </div>
  )
}

// Beat sheet arc visualization
function BeatArc({ beatSheetId, chapterCount }: { beatSheetId: string; chapterCount: number }) {
  const beatSheet = BEAT_SHEETS.find((bs) => bs.id === beatSheetId)
  if (!beatSheet) return null

  const actColors: Record<number, string> = {
    1: 'bg-blue-500/70',
    2: 'bg-violet-500/70',
    3: 'bg-emerald-500/70',
  }
  const actLabels: Record<number, string> = { 1: 'Act 1', 2: 'Act 2', 3: 'Act 3' }

  // Group beats by act for the segment bar
  const actSegments = [1, 2, 3].map((act) => {
    const actsBeats = beatSheet.beats.filter((b) => b.act === act)
    const start = Math.min(...actsBeats.map((b) => b.positionPercent))
    const end = Math.max(...actsBeats.map((b) => b.positionPercent))
    return { act, start, end, beats: actsBeats }
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{beatSheet.name}</p>
          <p className="text-xs text-muted-foreground">{beatSheet.description}</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {chapterCount} chapters
        </Badge>
      </div>

      {/* Arc bar */}
      <div className="relative h-7 w-full overflow-hidden rounded-md bg-muted">
        {actSegments.map(({ act, start, end }) => (
          <div
            key={act}
            className={`absolute inset-y-0 flex items-center justify-center ${actColors[act]}`}
            style={{ left: `${start}%`, width: `${end - start}%` }}
          >
            <span className="text-[10px] font-bold text-white drop-shadow-sm">
              {actLabels[act]}
            </span>
          </div>
        ))}

        {/* Beat markers */}
        {beatSheet.beats.map((beat) => (
          <div
            key={beat.id}
            className="absolute inset-y-0 w-px bg-background/40"
            style={{ left: `${beat.positionPercent}%` }}
            title={beat.name}
          />
        ))}
      </div>

      {/* Beat list — scrollable row */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {beatSheet.beats.map((beat) => (
          <div
            key={beat.id}
            className="shrink-0 rounded-md border border-border bg-muted/50 px-2 py-1"
            title={beat.description}
          >
            <p className="text-[10px] font-medium text-foreground whitespace-nowrap">{beat.name}</p>
            <p className="text-[10px] text-muted-foreground">{beat.positionPercent}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Voice profile preview panel
function VoiceProfilePanel({ analysis }: { analysis: VoiceAnalysisResult }) {
  const vi = analysis.voice_identity
  const sm = analysis.sentence_metrics
  const pac = analysis.pacing

  const sensoryMap = [
    { label: 'Visual', value: analysis.sensory_palette.visual },
    { label: 'Tactile', value: analysis.sensory_palette.tactile },
    { label: 'Auditory', value: analysis.sensory_palette.auditory },
    { label: 'Olfactory', value: analysis.sensory_palette.olfactory },
  ]

  const levelToWidth: Record<string, string> = {
    'Very Low': 'w-[10%]', Low: 'w-[25%]', Medium: 'w-[50%]', High: 'w-[75%]', 'Very High': 'w-[95%]',
    Minimal: 'w-[10%]', Moderate: 'w-[50%]', Rich: 'w-[80%]', Dominant: 'w-[95%]',
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Identity row */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="gap-1 text-xs">
          <Mic className="h-3 w-3" />
          {vi.pov_type}
        </Badge>
        <Badge variant="secondary" className="text-xs">{vi.narrative_distance} distance</Badge>
        <Badge variant="secondary" className="text-xs">{vi.literary_sensibility}</Badge>
        {vi.comparable_voices && (
          <Badge variant="outline" className="text-xs italic">{vi.comparable_voices}</Badge>
        )}
      </div>

      {/* Three-column breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {/* Prose metrics */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Prose</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Avg sentence</span>
              <span className="font-medium">{sm.avg_length_words}w</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Dialogue</span>
              <span className="font-medium">{sm.dialogue_percentage}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pace</span>
              <span className="font-medium capitalize">{pac.default_pace}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Em dash</span>
              <span className="font-medium">{sm.em_dash_frequency}</span>
            </div>
          </div>
        </div>

        {/* Preserve / Do not */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-emerald-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Preserve</p>
          </div>
          <ul className="flex flex-col gap-1">
            {analysis.voice_guardrails.preserve.slice(0, 4).map((item, i) => (
              <li key={i} className="text-[11px] text-foreground leading-tight">• {item}</li>
            ))}
          </ul>
        </div>

        {/* Avoid */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <EyeOff className="h-3 w-3 text-amber-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Avoid</p>
          </div>
          <ul className="flex flex-col gap-1">
            {analysis.voice_guardrails.do_not.slice(0, 4).map((item, i) => (
              <li key={i} className="text-[11px] text-foreground leading-tight">• {item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sensory palette bars */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Sensory palette</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {sensoryMap.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-14 text-[10px] text-muted-foreground shrink-0">{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full bg-primary/60 transition-all ${levelToWidth[value] ?? 'w-[40%]'}`}
                />
              </div>
              <span className="w-14 text-[10px] text-muted-foreground text-right shrink-0">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Essence */}
      <blockquote className="border-l-2 border-primary/40 pl-3 text-xs italic text-muted-foreground leading-relaxed">
        {analysis.voice_description}
      </blockquote>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// ReviewScreen
// ──────────────────────────────────────────────────────────────────────────────

export function ReviewScreen() {
  const genre = useIntakeStore((s) => s.genre)
  const themes = useIntakeStore((s) => s.themes)
  const characters = useIntakeStore((s) => s.characters)
  const setting = useIntakeStore((s) => s.setting)
  const tone = useIntakeStore((s) => s.tone)
  const beatSheet = useIntakeStore((s) => s.beatSheet)
  const targetLength = useIntakeStore((s) => s.targetLength)
  const chapterCount = useIntakeStore((s) => s.chapterCount)
  const premise = useIntakeStore((s) => s.premise)
  const path = useIntakeStore((s) => s.path)
  const goToStep = useIntakeStore((s) => s.goToStep)
  const locked = useIntakeLocked()

  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysisResult | null>(null)

  // Fetch author persona for voice preview
  useEffect(() => {
    fetch('/api/author-persona')
      .then((r) => r.ok ? r.json() : null)
      .then((data: { style_descriptors?: VoiceAnalysisResult } | null) => {
        const analysis = data?.style_descriptors
        if (analysis?.voice_identity) {
          setVoiceAnalysis(analysis)
        }
      })
      .catch(() => null)
  }, [])

  const genreData = GENRES.find((g) => g.id === genre)
  const themeData = themes.map((id) => THEMES.find((t) => t.id === id)).filter(Boolean)
  const settingData = SETTINGS.find((s) => s.id === setting)
  const toneData = TONES.find((t) => t.id === tone)
  const lengthData = LENGTH_PRESETS.find((lp) => lp.id === targetLength)

  const genreContext = genre ? GENRE_AI_CONTEXT[genre] : null
  const toneContext = tone ? TONE_AI_CONTEXT[tone] : null
  const settingContext = setting ? SETTING_AI_CONTEXT[setting] : null

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Story blueprint</h2>
        {locked ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>Locked — an outline has already been generated from these settings.</span>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Review your choices and see exactly how they shape the AI&apos;s generation context.
          </p>
        )}
      </div>

      {/* Premise — full width callout */}
      {path === 'premise' && premise && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <SectionLabel>Your premise</SectionLabel>
              <blockquote className="text-sm italic text-foreground leading-relaxed">
                &ldquo;{premise}&rdquo;
              </blockquote>
            </div>
            {!locked && (
              <Button variant="ghost" size="sm" onClick={() => goToStep(0)} className="h-7 gap-1.5 text-xs shrink-0">
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Two-column blueprint ↔ AI context */}
      <div className="rounded-xl border border-border bg-card">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 border-b border-border px-5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your choices</p>
          <div className="w-5" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">How the AI reads this</p>
        </div>

        <div className="flex flex-col divide-y divide-border px-5">

          {/* Genre */}
          <div className="py-4">
            <BlueprintRow
              label="Genre"
              onEdit={() => goToStep(STEP_GENRE)}
              locked={locked}
              missing={!genre}
              missingLabel="Genre required — select a genre."
              left={
                genreData ? (
                  <div>
                    <p className="text-sm font-semibold text-foreground">{genreData.label}</p>
                    <p className="text-xs text-muted-foreground">{genreData.description}</p>
                  </div>
                ) : null
              }
              right={
                genreContext ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">{genreContext}</p>
                ) : null
              }
            />
          </div>

          {/* Themes */}
          <div className="py-4">
            <BlueprintRow
              label="Themes"
              onEdit={() => goToStep(STEP_THEMES)}
              locked={locked}
              missing={themes.length === 0}
              missingLabel="Select at least one theme."
              left={
                <div className="flex flex-wrap gap-1.5">
                  {themeData.map((t) =>
                    t ? <Badge key={t.id} variant="secondary" className="text-xs">{t.label}</Badge> : null
                  )}
                </div>
              }
              right={
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Each theme is tracked as a running thread across all chapters. The AI reinforces, complicates, and pays off thematic threads at structurally appropriate moments.
                </p>
              }
            />
          </div>

          {/* Characters */}
          <div className="py-4">
            <BlueprintRow
              label="Characters"
              onEdit={() => goToStep(STEP_CHARACTERS)}
              locked={locked}
              missing={characters.length === 0}
              missingLabel="Add at least one character."
              left={
                <div className="flex flex-col gap-1.5">
                  {characters.map((char, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
                      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">{char.name}</span>
                      {(char.appearance || char.personality || char.backstory || char.arc) && (
                        <span className="text-xs text-muted-foreground">
                          ({[char.appearance && 'appearance', char.personality && 'personality', char.backstory && 'backstory', char.arc && 'arc'].filter(Boolean).join(', ')})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              }
              right={
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Named characters are enforced throughout generation. The AI must include all listed characters in the outline and cannot invent new named characters during chapter writing.
                </p>
              }
            />
          </div>

          {/* Setting */}
          <div className="py-4">
            <BlueprintRow
              label="Setting"
              onEdit={() => goToStep(STEP_SETTING)}
              locked={locked}
              missing={!setting}
              missingLabel="Setting required."
              left={
                settingData ? (
                  <div>
                    <p className="text-sm font-semibold text-foreground">{settingData.label}</p>
                    <p className="text-xs text-muted-foreground">{settingData.description}</p>
                  </div>
                ) : null
              }
              right={
                settingContext ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">{settingContext}</p>
                ) : null
              }
            />
          </div>

          {/* Tone */}
          <div className="py-4">
            <BlueprintRow
              label="Tone"
              onEdit={() => goToStep(STEP_TONE)}
              locked={locked}
              missing={!tone}
              missingLabel="Tone required."
              left={
                toneData ? (
                  <div>
                    <p className="text-sm font-semibold text-foreground">{toneData.label}</p>
                    <p className="text-xs text-muted-foreground">{toneData.description}</p>
                  </div>
                ) : null
              }
              right={
                toneContext ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">{toneContext}</p>
                ) : null
              }
            />
          </div>

        </div>
      </div>

      {/* Beat sheet arc */}
      {beatSheet && (
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionLabel>Story structure</SectionLabel>
          <div className="mt-3">
            <BeatArc beatSheetId={beatSheet} chapterCount={chapterCount} />
          </div>
          {lengthData && (
            <p className="mt-3 text-xs text-muted-foreground">
              {lengthData.label} · {chapterCount} chapters · beats map automatically to chapter ranges
            </p>
          )}
        </div>
      )}

      {/* Voice profile — shown only if analysis exists */}
      {voiceAnalysis && (
        <div className="rounded-xl border border-primary/20 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mic className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Your voice profile is active</p>
            <Badge variant="secondary" className="text-xs ml-auto">Injected into every chapter</Badge>
          </div>
          <VoiceProfilePanel analysis={voiceAnalysis} />
        </div>
      )}

    </div>
  )
}
