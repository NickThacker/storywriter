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
      <div
        className="border border-dashed border-border p-8 text-center text-muted-foreground"
        style={{ borderRadius: 0 }}
      >
        <p className="mb-4">No voice profile set up yet.</p>
        <Button asChild variant="outline" style={{ borderRadius: 0 }}>
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
    <div className="space-y-8">
      {/* Voice summary */}
      {persona.voice_description && (
        <div className="space-y-2">
          <p
            className="text-[0.65rem] uppercase tracking-[0.1em]"
            style={{ color: 'var(--gold)' }}
          >
            Voice Summary
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{persona.voice_description}</p>
        </div>
      )}

      {/* Style descriptors */}
      {persona.style_descriptors && (
        <div className="space-y-3">
          <p
            className="text-[0.65rem] uppercase tracking-[0.1em]"
            style={{ color: 'var(--gold)' }}
          >
            Style Descriptors
          </p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(persona.style_descriptors).map(([key, value]) => (
              <div
                key={key}
                className="border border-border bg-card p-3"
                style={{ borderRadius: 0 }}
              >
                <div className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">{key.replace(/_/g, ' ')}</div>
                <div className="mt-1 text-sm text-foreground">{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editable guidance text */}
      <div className="space-y-3">
        <p
          className="text-[0.65rem] uppercase tracking-[0.1em]"
          style={{ color: 'var(--gold)' }}
        >
          AI Guidance Text
        </p>
        <p className="text-[0.7rem] text-muted-foreground">This text is injected into every generation prompt to guide the AI. You can edit it.</p>
        <textarea
          className="w-full min-h-[100px] border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[color:var(--gold)]/60 transition-colors"
          style={{ borderRadius: 0 }}
          value={guidanceText}
          onChange={(e) => setGuidanceText(e.target.value)}
          placeholder="e.g. Write with short, punchy sentences. Favor first-person intimate POV."
        />
        <Button
          onClick={handleSave}
          disabled={isSaving}
          variant="outline"
          className="text-[0.68rem] uppercase tracking-[0.1em] cursor-pointer"
          style={{ borderRadius: 0 }}
        >
          {isSaving ? 'Saving...' : 'Save guidance text'}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t border-border pt-6">
        <Button asChild variant="outline" className="text-[0.68rem] uppercase tracking-[0.1em]" style={{ borderRadius: 0 }}>
          <Link href="/onboarding">Re-run analysis</Link>
        </Button>
        <Button asChild variant="outline" className="text-[0.68rem] uppercase tracking-[0.1em]" style={{ borderRadius: 0 }}>
          <a href="/api/voice-report" download="author-voice-report.pdf">Download PDF</a>
        </Button>
      </div>
    </div>
  )
}
