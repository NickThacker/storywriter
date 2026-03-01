'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useIntakeStore } from '@/components/intake/intake-store-provider'
import { ArrowRight } from 'lucide-react'

export function PremiseInput() {
  const [text, setText] = useState('')
  const setPremise = useIntakeStore((s) => s.setPremise)
  const setPath = useIntakeStore((s) => s.setPath)
  const nextStep = useIntakeStore((s) => s.nextStep)

  const handleContinue = () => {
    if (!text.trim()) return
    setPremise(text.trim())
    setPath('premise')
    // Plan 04: POST to /api/generate/premise-prefill and hydrate store
    // For now, advance to genre step
    nextStep()
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Paste your novel premise, logline, or synopsis. AI will help fill in the details.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. A disgraced detective must solve a murder in a dying mining colony on Europa before the killer escapes on the last ship home..."
        rows={6}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!text.trim()}
          className="gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
