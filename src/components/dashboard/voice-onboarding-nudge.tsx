'use client'

import { useState } from 'react'
import Link from 'next/link'
import { dismissOnboardingNudge } from '@/actions/voice'

export function VoiceOnboardingNudge() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const handleDismiss = async () => {
    setDismissed(true)
    await dismissOnboardingNudge()
  }

  return (
    <div className="mb-6 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <div>
        <strong>Set up your author voice.</strong>{' '}
        Help StoryWriter write in your style &mdash; upload a writing sample and we will analyze your voice.
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-3">
        <Link
          href="/onboarding"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Set up voice
        </Link>
        <button
          onClick={handleDismiss}
          className="text-blue-600 hover:text-blue-800 transition-colors"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
