import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getModelPreferences } from '@/actions/settings'
import { getBillingStatus } from '@/actions/billing'
import { getPersona } from '@/actions/voice'
import { ModelSelector } from '@/components/settings/model-selector'
import { BillingSection } from '@/components/billing/billing-section'
import { VoiceProfileTab } from '@/components/settings/voice-profile-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

  const [modelPreferences, billingStatusResult, persona] = await Promise.all([
    getModelPreferences(),
    getBillingStatus(),
    getPersona(),
  ])

  const billingStatus = 'error' in billingStatusResult ? null : billingStatusResult

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your model preferences, billing, and author voice.
        </p>
      </div>

      <Tabs defaultValue="model-preferences">
        <TabsList>
          <TabsTrigger value="model-preferences">Model Preferences</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="voice-profile">Voice Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="model-preferences" className="space-y-2 pt-4">
          <h2 className="text-lg font-semibold">Model Preferences</h2>
          <ModelSelector initialPreferences={modelPreferences} />
        </TabsContent>

        <TabsContent value="billing" className="space-y-2 pt-4">
          <h2 className="text-lg font-semibold">Billing &amp; Subscription</h2>
          {billingStatus && !billingStatus.isByok ? (
            <BillingSection billingStatus={billingStatus} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {billingStatus?.isByok
                ? 'You are using your own API key (BYOK). No billing applies.'
                : 'Billing information is not available.'}
            </p>
          )}
        </TabsContent>

        <TabsContent value="voice-profile" className="pt-4">
          <VoiceProfileTab persona={persona} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
