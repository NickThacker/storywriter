'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mic, X } from 'lucide-react'
import { dismissOnboardingNudge } from '@/actions/voice'

export function VoiceOnboardingNudge() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const handleDismiss = async () => {
    setDismissed(true)
    await dismissOnboardingNudge()
  }

  return (
    <div className="mb-6 flex items-center gap-4 border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/[0.03] px-5 py-3.5">
      <Mic className="h-4 w-4 shrink-0 text-[color:var(--gold)]" />
      <div className="flex-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Set up your author voice.</span>{' '}
        Upload a writing sample and Meridian will match your style.
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/onboarding"
          className="border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 px-3.5 py-1.5 text-[0.65rem] uppercase tracking-[0.1em] text-[color:var(--gold)] hover:bg-[color:var(--gold)]/20 transition-colors"
        >
          Set up voice
        </Link>
        <button
          onClick={handleDismiss}
          className="p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
