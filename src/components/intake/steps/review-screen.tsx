'use client'

import { AlertCircle, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useIntakeStore } from '@/components/intake/intake-store-provider'
import { GENRES } from '@/lib/data/genres'
import { THEMES } from '@/lib/data/themes'
import { TONES } from '@/lib/data/tones'
import { SETTINGS } from '@/lib/data/settings'
import { BEAT_SHEETS } from '@/lib/data/beat-sheets'
import { LENGTH_PRESETS } from '@/lib/data/lengths'

// Step indices for edit navigation
const STEP_GENRE = 1
const STEP_THEMES = 2
const STEP_CHARACTERS = 3
const STEP_SETTING = 4
const STEP_TONE = 5

interface ReviewSectionProps {
  title: string
  onEdit: () => void
  missing?: boolean
  missingLabel?: string
  children: React.ReactNode
}

function ReviewSection({
  title,
  onEdit,
  missing,
  missingLabel,
  children,
}: ReviewSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 gap-1.5 text-xs"
          aria-label={`Edit ${title}`}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </div>

      {missing ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="text-sm text-destructive">
            {missingLabel ?? `${title} is required — please complete this step.`}
          </span>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

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

  // Resolve display labels
  const genreData = GENRES.find((g) => g.id === genre)
  const themeData = themes.map((id) => THEMES.find((t) => t.id === id)).filter(Boolean)
  const settingData = SETTINGS.find((s) => s.id === setting)
  const toneData = TONES.find((t) => t.id === tone)
  const beatSheetData = BEAT_SHEETS.find((bs) => bs.id === beatSheet)
  const lengthData = LENGTH_PRESETS.find((lp) => lp.id === targetLength)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Review your story details
        </h2>
        <p className="mt-1 text-muted-foreground">
          Check everything looks right before generating your outline. You can edit any section.
        </p>
      </div>

      <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6">

        {/* Premise (shown if premise path was used) */}
        {path === 'premise' && premise && (
          <ReviewSection
            title="Premise"
            onEdit={() => goToStep(0)}
          >
            <blockquote className="border-l-4 border-primary pl-4 text-sm italic text-foreground">
              {premise}
            </blockquote>
          </ReviewSection>
        )}

        {/* Genre */}
        <ReviewSection
          title="Genre"
          onEdit={() => goToStep(STEP_GENRE)}
          missing={!genre}
          missingLabel="Genre is required — please select a genre."
        >
          {genreData && (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{genreData.label}</span>
              <span className="text-sm text-muted-foreground">{genreData.description}</span>
            </div>
          )}
        </ReviewSection>

        <div className="border-t border-border" />

        {/* Themes */}
        <ReviewSection
          title="Themes"
          onEdit={() => goToStep(STEP_THEMES)}
          missing={themes.length === 0}
          missingLabel="Select at least one theme."
        >
          <div className="flex flex-wrap gap-2">
            {themeData.map((theme) =>
              theme ? (
                <Badge key={theme.id} variant="secondary">
                  {theme.label}
                </Badge>
              ) : null
            )}
          </div>
        </ReviewSection>

        <div className="border-t border-border" />

        {/* Characters */}
        <ReviewSection
          title="Characters"
          onEdit={() => goToStep(STEP_CHARACTERS)}
          missing={characters.length === 0}
          missingLabel="Add at least one character role."
        >
          <ul className="flex flex-col gap-1.5">
            {characters.map((char, i) => (
              <li key={`${char.role}-${i}`} className="flex items-center gap-2 text-sm">
                <span className="font-medium capitalize text-foreground">{char.role}</span>
                {char.name && (
                  <span className="text-muted-foreground">— {char.name}</span>
                )}
              </li>
            ))}
          </ul>
        </ReviewSection>

        <div className="border-t border-border" />

        {/* Setting */}
        <ReviewSection
          title="Setting"
          onEdit={() => goToStep(STEP_SETTING)}
          missing={!setting}
          missingLabel="Setting is required — please select a setting."
        >
          {settingData && (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{settingData.label}</span>
              <span className="text-sm text-muted-foreground">{settingData.description}</span>
            </div>
          )}
        </ReviewSection>

        <div className="border-t border-border" />

        {/* Tone */}
        <ReviewSection
          title="Tone"
          onEdit={() => goToStep(STEP_TONE)}
          missing={!tone}
          missingLabel="Tone is required — please select a tone."
        >
          {toneData && (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{toneData.label}</span>
              <span className="text-sm text-muted-foreground">{toneData.description}</span>
            </div>
          )}
        </ReviewSection>

        <div className="border-t border-border" />

        {/* Structure */}
        <ReviewSection
          title="Structure"
          onEdit={() => goToStep(STEP_TONE)}
          missing={!beatSheet}
          missingLabel="Story structure is required — please select a beat sheet."
        >
          {beatSheetData && lengthData && (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{beatSheetData.name}</span>
              <span className="text-sm text-muted-foreground">
                {lengthData.label} &mdash; {chapterCount} chapters
              </span>
            </div>
          )}
          {beatSheetData && !lengthData && (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{beatSheetData.name}</span>
              <span className="text-sm text-muted-foreground">
                {chapterCount} chapters
              </span>
            </div>
          )}
        </ReviewSection>

      </div>
    </div>
  )
}
