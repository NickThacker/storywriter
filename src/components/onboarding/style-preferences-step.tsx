'use client'

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CardPicker, type CardOption } from '@/components/intake/card-picker'
import { useVoiceWizardStore } from '@/components/onboarding/onboarding-store-provider'
import { savePersona } from '@/actions/voice'

// ── Preference option sets ────────────────────────────────────────────────────

const TONE_OPTIONS: CardOption[] = [
  { id: 'literary', label: 'Literary & Lyrical' },
  { id: 'direct', label: 'Direct & Gritty' },
  { id: 'warm', label: 'Warm & Intimate' },
  { id: 'dark', label: 'Dark & Brooding' },
  { id: 'witty', label: 'Witty & Sharp' },
]

const PACING_OPTIONS: CardOption[] = [
  { id: 'fast', label: 'Fast & Propulsive' },
  { id: 'deliberate', label: 'Deliberate & Measured' },
  { id: 'variable', label: 'Variable (action + reflection)' },
  { id: 'slow-burn', label: 'Slow-burn atmospheric' },
]

const DIALOGUE_OPTIONS: CardOption[] = [
  { id: 'heavy', label: 'Heavy dialogue (character-driven)' },
  { id: 'balanced', label: 'Balanced mix' },
  { id: 'sparse', label: 'Sparse dialogue (prose-driven)' },
  { id: 'interior', label: 'Interior monologue focused' },
]

const DARK_LIGHT_OPTIONS: CardOption[] = [
  { id: 'dark-complex', label: 'Dark & Complex' },
  { id: 'hopeful', label: 'Hopeful with tension' },
  { id: 'light', label: 'Light & Uplifting' },
  { id: 'ambiguous', label: 'Morally ambiguous' },
]

const POV_OPTIONS: CardOption[] = [
  { id: 'first', label: 'First person (intimate)' },
  { id: 'third-limited', label: 'Third person limited' },
  { id: 'third-omniscient', label: 'Third person omniscient' },
  { id: 'second', label: 'Second person (experimental)' },
]

const DICTION_OPTIONS: CardOption[] = [
  { id: 'literary-elevated', label: 'Literary (elevated vocabulary)' },
  { id: 'contemporary', label: 'Contemporary & Accessible' },
  { id: 'stark', label: 'Stark & Minimalist' },
  { id: 'genre-specific', label: 'Genre-specific register' },
]

// ── Section wrapper ───────────────────────────────────────────────────────────

function PreferenceGroup({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string
  options: CardOption[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <CardPicker
        options={options}
        selected={selected ?? ''}
        onSelect={onSelect}
        columns={2}
      />
    </div>
  )
}

// ── Step component ────────────────────────────────────────────────────────────

export function StylePreferencesStep() {
  const tonePreference = useVoiceWizardStore((s) => s.tonePreference)
  const pacingPreference = useVoiceWizardStore((s) => s.pacingPreference)
  const dialogueRatio = useVoiceWizardStore((s) => s.dialogueRatio)
  const darkLightTheme = useVoiceWizardStore((s) => s.darkLightTheme)
  const povPreference = useVoiceWizardStore((s) => s.povPreference)
  const dictionLevel = useVoiceWizardStore((s) => s.dictionLevel)
  const setStylePreference = useVoiceWizardStore((s) => s.setStylePreference)
  const nextStep = useVoiceWizardStore((s) => s.nextStep)
  const prevStep = useVoiceWizardStore((s) => s.prevStep)

  const [isSaving, setIsSaving] = useState(false)

  async function handleNext() {
    setIsSaving(true)
    await savePersona({ wizard_step: 3 })
    setIsSaving(false)
    nextStep()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Select your preferred style in each category. All selections are optional — the AI will infer from your writing samples regardless.
        </p>
      </div>

      <PreferenceGroup
        title="Tone"
        options={TONE_OPTIONS}
        selected={tonePreference}
        onSelect={(id) => setStylePreference('tonePreference', id)}
      />

      <PreferenceGroup
        title="Pacing"
        options={PACING_OPTIONS}
        selected={pacingPreference}
        onSelect={(id) => setStylePreference('pacingPreference', id)}
      />

      <PreferenceGroup
        title="Dialogue Ratio"
        options={DIALOGUE_OPTIONS}
        selected={dialogueRatio}
        onSelect={(id) => setStylePreference('dialogueRatio', id)}
      />

      <PreferenceGroup
        title="Thematic Tone"
        options={DARK_LIGHT_OPTIONS}
        selected={darkLightTheme}
        onSelect={(id) => setStylePreference('darkLightTheme', id)}
      />

      <PreferenceGroup
        title="Point of View"
        options={POV_OPTIONS}
        selected={povPreference}
        onSelect={(id) => setStylePreference('povPreference', id)}
      />

      <PreferenceGroup
        title="Diction Level"
        options={DICTION_OPTIONS}
        selected={dictionLevel}
        onSelect={(id) => setStylePreference('dictionLevel', id)}
      />

      {/* Nav */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="ghost" onClick={prevStep} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={isSaving} className="gap-1">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
