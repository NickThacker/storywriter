'use client'

import { useState } from 'react'
import { Wand2, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIntakeStore } from '@/components/intake/intake-store-provider'
import { PremiseInput } from '@/components/intake/premise-input'

type PathChoice = 'wizard' | 'premise' | null

export function PathSelect() {
  const [localPath, setLocalPath] = useState<PathChoice>(null)
  const setPath = useIntakeStore((s) => s.setPath)
  const nextStep = useIntakeStore((s) => s.nextStep)

  const handleSelect = (choice: PathChoice) => {
    if (choice === null) return
    setLocalPath(choice)
    if (choice === 'wizard') {
      setPath('wizard')
      nextStep()
    }
    // For 'premise', we show the PremiseInput inline below
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          How would you like to start?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose your path to get the creative process going.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Guided wizard card */}
        <button
          type="button"
          onClick={() => handleSelect('wizard')}
          className={cn(
            'flex flex-col items-start gap-4 rounded-xl border-2 p-6 text-left transition-colors',
            localPath === 'wizard'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          )}
          aria-pressed={localPath === 'wizard'}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wand2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Build Step by Step
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Answer a series of guided questions about genre, themes, characters, and style. Great for exploring your story from scratch.
            </p>
          </div>
        </button>

        {/* Premise paste card */}
        <button
          type="button"
          onClick={() => handleSelect('premise')}
          className={cn(
            'flex flex-col items-start gap-4 rounded-xl border-2 p-6 text-left transition-colors',
            localPath === 'premise'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          )}
          aria-pressed={localPath === 'premise'}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Lightbulb className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              I Already Have an Idea
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste your premise, logline, or synopsis. AI will analyze your idea and pre-fill the wizard with suggested answers.
            </p>
          </div>
        </button>
      </div>

      {/* Show premise input inline when that path is chosen */}
      {localPath === 'premise' && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-base font-semibold text-foreground">
            Paste your idea
          </h3>
          <PremiseInput />
        </div>
      )}
    </div>
  )
}
