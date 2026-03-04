import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getApiKeyStatus, getModelPreferences } from '@/actions/settings'
import { getBillingStatus } from '@/actions/billing'
import { ApiKeyForm } from '@/components/settings/api-key-form'
import { ModelSelector } from '@/components/settings/model-selector'
import { BillingSection } from '@/components/billing/billing-section'

export const metadata: Metadata = {
  title: 'Settings — StoryWriter',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [apiKeyStatus, modelPreferences, billingStatusResult] = await Promise.all([
    getApiKeyStatus(),
    getModelPreferences(),
    getBillingStatus(),
  ])

  const billingStatus = 'error' in billingStatusResult ? null : billingStatusResult

  const showSetupBanner =
    apiKeyStatus.subscriptionTier === 'none' && !apiKeyStatus.hasKey

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your AI access and model preferences.
        </p>
      </div>

      {showSetupBanner && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <strong>Get started:</strong> Connect your OpenRouter API key or subscribe to start
          generating. You need one of these before creating novels.
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">API Key</h2>
        <ApiKeyForm initialKeyStatus={apiKeyStatus} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Model Preferences</h2>
        <ModelSelector initialPreferences={modelPreferences} />
      </section>

      {/* Billing section — only shown for non-BYOK (hosted tier) users */}
      {billingStatus && !billingStatus.isByok && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Billing &amp; Subscription</h2>
          <BillingSection billingStatus={billingStatus} />
        </section>
      )}
    </div>
  )
}
