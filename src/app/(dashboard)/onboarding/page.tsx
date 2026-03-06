'use client'

import { useVoiceWizardStore } from '@/components/onboarding/onboarding-store-provider'
import { TOTAL_VOICE_STEPS } from '@/lib/stores/voice-wizard-store'
import { WritingSamplesStep } from '@/components/onboarding/writing-samples-step'
import { AnalysisResultsStep } from '@/components/onboarding/analysis-results-step'
import { cn } from '@/lib/utils'

const STEP_TITLES = ['Writing Samples', 'Voice Analysis']

function VoiceProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Wizard progress" className="w-full">
      <ol className="flex items-center gap-0">
        {STEP_TITLES.map((label, index) => {
          const stepNum = index + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep

          return (
            <li key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                    isCompleted
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCurrent
                        ? 'border-primary bg-background text-primary'
                        : 'border-border bg-background text-muted-foreground'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={cn(
                    'hidden text-xs sm:block',
                    isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </div>

              {index < STEP_TITLES.length - 1 && (
                <div
                  className={cn(
                    'mx-1 h-0.5 w-8 sm:w-12 transition-colors',
                    isCompleted ? 'bg-primary' : 'bg-border'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default function OnboardingPage() {
  const currentStep = useVoiceWizardStore((s) => s.currentStep)

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8 px-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Author Voice Setup</h1>
        <p className="mt-1 text-muted-foreground">
          Provide writing samples so StoryWriter can match your style.
        </p>
      </div>
      <VoiceProgressBar currentStep={currentStep} />
      <div className="text-sm font-medium text-muted-foreground">
        Step {currentStep} of {TOTAL_VOICE_STEPS} &mdash; {STEP_TITLES[currentStep - 1]}
      </div>
      {currentStep === 1 && <WritingSamplesStep />}
      {currentStep === 2 && <AnalysisResultsStep />}
    </div>
  )
}
