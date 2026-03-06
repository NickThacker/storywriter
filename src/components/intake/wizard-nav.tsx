'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useIntakeStore, useIntakeLocked } from '@/components/intake/intake-store-provider'
import { TOTAL_STEPS } from '@/lib/stores/intake-store'
import { saveIntakeData } from '@/actions/intake'
import { ChevronLeft, ChevronRight, Wand2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
  const targetLength = useIntakeStore((s) => s.targetLength)
  const chapterCount = useIntakeStore((s) => s.chapterCount)
  const premise = useIntakeStore((s) => s.premise)
  const path = useIntakeStore((s) => s.path)
  const nextStep = useIntakeStore((s) => s.nextStep)
  const prevStep = useIntakeStore((s) => s.prevStep)

  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

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
    NextIcon = isSaving ? Loader2 : Wand2
  } else {
    nextLabel = 'Next'
  }

  const handleNext = async () => {
    if (currentStep === REVIEW_STEP) {
      // Save intake data then navigate to outline page
      setIsSaving(true)
      const intakeData = {
        path: path ?? 'wizard' as const,
        genre,
        themes,
        characters,
        setting,
        tone,
        beatSheet,
        targetLength,
        chapterCount,
        premise,
      }
      const result = await saveIntakeData(params.id, intakeData)
      if ('error' in result) {
        toast.error(result.error)
        setIsSaving(false)
        return
      }
      router.push(`/projects/${params.id}/outline`)
      return
    }
    nextStep()
  }

  const locked = useIntakeLocked()

  // Hide on step 0 (path selection handles its own navigation)
  if (currentStep === 0) return null

  // When locked, show nothing — intake is read-only
  if (locked) return null

  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border bg-background px-4 py-4">
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
        disabled={isDisabled || isSaving}
        className="gap-1"
      >
        {nextLabel}
        {NextIcon && <NextIcon className={`h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />}
      </Button>
    </div>
  )
}
