'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { savePersona } from '@/actions/voice'
import type { AuthorPersonaRow } from '@/types/database'
import { toast } from 'sonner'

export function VoiceProfileTab({ persona }: { persona: AuthorPersonaRow | null }) {
  const [guidanceText, setGuidanceText] = useState(persona?.raw_guidance_text ?? '')
  const [isSaving, setIsSaving] = useState(false)

  if (!persona || !persona.analysis_complete) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        <p className="mb-4">No voice profile set up yet.</p>
        <Button asChild>
          <Link href="/onboarding">Set up voice profile</Link>
        </Button>
      </div>
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    const result = await savePersona({ raw_guidance_text: guidanceText })
    setIsSaving(false)
    if (result.error) {
      toast.error('Failed to save guidance text')
    } else {
      toast.success('Guidance text saved')
    }
  }

  return (
    <div className="space-y-6">
      {/* Voice summary */}
      {persona.voice_description && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Voice Summary</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{persona.voice_description}</p>
        </div>
      )}

      {/* Style descriptors grid */}
      {persona.style_descriptors && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Style Descriptors</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(persona.style_descriptors).map(([key, value]) => (
              <div key={key} className="rounded-md border bg-card p-3">
                <div className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</div>
                <div className="mt-0.5 text-sm">{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editable guidance text */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">AI Guidance Text</h3>
        <p className="text-xs text-muted-foreground">This text is injected into every generation prompt to guide the AI. You can edit it.</p>
        <textarea
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={guidanceText}
          onChange={(e) => setGuidanceText(e.target.value)}
          placeholder="e.g. Write with short, punchy sentences. Favor first-person intimate POV."
        />
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? 'Saving...' : 'Save guidance text'}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/onboarding">Re-run analysis</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/voice-report" download="author-voice-report.pdf">Download PDF report</a>
        </Button>
      </div>
    </div>
  )
}
