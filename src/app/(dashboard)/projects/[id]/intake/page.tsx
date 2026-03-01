'use client'

import { useIntakeStore } from '@/components/intake/intake-store-provider'
import { ProgressBar } from '@/components/intake/progress-bar'
import { WizardNav } from '@/components/intake/wizard-nav'
import { PathSelect } from '@/components/intake/steps/path-select'
import { GenreStep } from '@/components/intake/steps/genre-step'
import { ThemesStep } from '@/components/intake/steps/themes-step'
import { CharactersStep } from '@/components/intake/steps/characters-step'
import { SettingStep } from '@/components/intake/steps/setting-step'
import { ToneStep } from '@/components/intake/steps/tone-step'
import { ReviewScreen } from '@/components/intake/steps/review-screen'

function StepContent() {
  const currentStep = useIntakeStore((s) => s.currentStep)

  switch (currentStep) {
    case 0:
      return <PathSelect />
    case 1:
      return <GenreStep />
    case 2:
      return <ThemesStep />
    case 3:
      return <CharactersStep />
    case 4:
      return <SettingStep />
    case 5:
      return <ToneStep />
    case 6:
      return <ReviewScreen />
    default:
      return <PathSelect />
  }
}

export default function IntakePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Progress bar at top */}
      <ProgressBar />

      {/* Step content — grows to fill available space */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <StepContent />
        </div>
      </div>

      {/* Navigation at bottom */}
      <WizardNav />
    </div>
  )
}
