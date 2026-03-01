'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useIntakeStore } from '@/components/intake/intake-store-provider'
import { ArrowRight, Loader2 } from 'lucide-react'

export function PremiseInput() {
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const setPremise = useIntakeStore((s) => s.setPremise)
  const setPath = useIntakeStore((s) => s.setPath)
  const hydrateFromPrefill = useIntakeStore((s) => s.hydrateFromPrefill)
  const nextStep = useIntakeStore((s) => s.nextStep)

  const handleContinue = async () => {
    const trimmed = text.trim()
    if (!trimmed) return

    setIsLoading(true)

    // Set premise and path in the store immediately
    setPremise(trimmed)
    setPath('premise')

    try {
      const response = await fetch('/api/generate/premise-prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ premise: trimmed }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(data.error ?? `Request failed (${response.status})`)
      }

      const prefillData = (await response.json()) as {
        genre?: string | null
        themes?: string[]
        setting?: string | null
        tone?: string | null
        characters?: { role: string; archetype: string; name?: string }[]
      }

      // Hydrate the store with AI-inferred values
      hydrateFromPrefill({
        genre: prefillData.genre ?? null,
        themes: Array.isArray(prefillData.themes) ? prefillData.themes : [],
        setting: prefillData.setting ?? null,
        tone: prefillData.tone ?? null,
        characters: Array.isArray(prefillData.characters)
          ? prefillData.characters
          : [],
      })

      // Advance to the genre step so user can review and confirm
      nextStep()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to analyze premise'
      toast.error(`Premise analysis failed: ${message}`)
    } finally {
      setIsLoading(false)
    }
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
        disabled={isLoading}
      />
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!text.trim() || isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
