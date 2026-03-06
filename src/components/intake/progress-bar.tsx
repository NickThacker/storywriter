'use client'

import { cn } from '@/lib/utils'
import { useIntakeStore, useIntakeLocked } from '@/components/intake/intake-store-provider'

const STEP_LABELS = [
  'Path',
  'Genre',
  'Themes',
  'Characters',
  'Setting',
  'Tone & Style',
  'Review',
]

// Steps 1-6 (visible in progress bar — step 0 is path selection, hidden)
const VISIBLE_STEPS = STEP_LABELS.slice(1)

export function ProgressBar() {
  const currentStep = useIntakeStore((s) => s.currentStep)
  const locked = useIntakeLocked()

  // Hide on step 0 (path selection) or when locked (read-only view)
  if (currentStep === 0 || locked) return null

  // Map currentStep (1-6) to progress steps (0-5)
  const progressIndex = currentStep - 1

  return (
    <nav aria-label="Wizard progress" className="w-full px-4 py-4">
      <ol className="flex items-center justify-center gap-0">
        {VISIBLE_STEPS.map((label, index) => {
          const isCompleted = index < progressIndex
          const isCurrent = index === progressIndex

          return (
            <li key={label} className="flex items-center">
              {/* Step indicator */}
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'hidden text-xs sm:block',
                    isCurrent
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </div>

              {/* Connector line (not after last step) */}
              {index < VISIBLE_STEPS.length - 1 && (
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
