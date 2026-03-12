import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getModelPreferences } from '@/actions/settings'
import { getBillingStatus } from '@/actions/billing'
import { getPersona } from '@/actions/voice'
import { ModelSelector } from '@/components/settings/model-selector'
import { BillingSection } from '@/components/billing/billing-section'
import { VoiceProfileTab } from '@/components/settings/voice-profile-tab'
import { SettingsTabs } from '@/components/settings/settings-tabs'

export const metadata: Metadata = {
  title: 'Settings — Meridian',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [modelPreferences, billingStatusResult, persona] = await Promise.all([
    getModelPreferences(),
    getBillingStatus(),
    getPersona(),
  ])

  const billingStatus = 'error' in billingStatusResult ? null : billingStatusResult

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div className="border-b border-border pb-5">
        <p
          className="text-[0.65rem] uppercase tracking-[0.15em] mb-2"
          style={{ color: 'var(--gold)' }}
        >
          Configuration
        </p>
        <h1
          className="font-[family-name:var(--font-literata)] text-foreground"
          style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 400, lineHeight: 1.1 }}
        >
          Settings
        </h1>
      </div>

      <SettingsTabs
        modelPreferences={modelPreferences}
        billingStatus={billingStatus}
        persona={persona}
      />
    </div>
  )
}
