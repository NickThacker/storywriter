'use client'

import { Button } from '@/components/ui/button'
import { useIntakeStore } from '@/components/intake/intake-store-provider'
import { TOTAL_STEPS } from '@/lib/stores/intake-store'
import { ChevronLeft, ChevronRight, Wand2 } from 'lucide-react'

// Step indices that require a selection before Next is enabled
const REVIEW_STEP = TOTAL_STEPS - 1 // step 6
const TONE_STEP = 5

function useNextDisabled(
  currentStep: number,
  genre: string | null,
  themes: string[],
  characters: { role: string; archetype: string; name?: string }[],
  setting: string | null,
  tone: string | null,
  beatSheet: string | null
): boolean {
  switch (currentStep) {
    case 1: return genre === null
    case 2: return themes.length === 0
    case 3: return characters.length === 0
    case 4: return setting === null
    case TONE_STEP: return tone === null || beatSheet === null
    default: return false
  }
}

export function WizardNav() {
  const currentStep = useIntakeStore((s) => s.currentStep)
  const genre = useIntakeStore((s) => s.genre)
  const themes = useIntakeStore((s) => s.themes)
  const characters = useIntakeStore((s) => s.characters)
  const setting = useIntakeStore((s) => s.setting)
  const tone = useIntakeStore((s) => s.tone)
  const beatSheet = useIntakeStore((s) => s.beatSheet)
  const nextStep = useIntakeStore((s) => s.nextStep)
  const prevStep = useIntakeStore((s) => s.prevStep)

  const isDisabled = useNextDisabled(
    currentStep,
    genre,
    themes,
    characters,
    setting,
    tone,
    beatSheet
  )

  // Determine Next button label
  let nextLabel: string
  let NextIcon: React.ElementType | null = ChevronRight
  if (currentStep === TONE_STEP) {
    nextLabel = 'Review'
  } else if (currentStep === REVIEW_STEP) {
    nextLabel = 'Generate Outline'
    NextIcon = Wand2
  } else {
    nextLabel = 'Next'
  }

  // Handle generate outline click (placeholder until Plan 05)
  const handleNext = () => {
    if (currentStep === REVIEW_STEP) {
      // Plan 05: wire to outline generation API
      // For now, this is a placeholder
      console.log('Generate outline — wiring in Plan 05')
      return
    }
    nextStep()
  }

  // Hide on step 0 (path selection handles its own navigation)
  if (currentStep === 0) return null

  return (
    <div className="flex items-center justify-between border-t border-border bg-background px-4 py-4">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={prevStep}
        className="gap-1"
        aria-label="Go back"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Next / Review / Generate button */}
      <Button
        onClick={handleNext}
        disabled={isDisabled}
        className="gap-1"
      >
        {nextLabel}
        {NextIcon && <NextIcon className="h-4 w-4" />}
      </Button>
    </div>
  )
}
