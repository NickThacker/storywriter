'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ModelSelector } from '@/components/settings/model-selector'
import { BillingSection } from '@/components/billing/billing-section'
import { VoiceProfileTab } from '@/components/settings/voice-profile-tab'
import { SpiderToggle } from '@/components/settings/spider-toggle'
import type { BillingStatus } from '@/types/billing'
import type { AuthorPersonaRow } from '@/types/database'

type TabDef = { id: string; label: string }

interface SettingsTabsProps {
  modelPreferences: { taskType: string; modelId: string }[]
  billingStatus: BillingStatus | null
  persona: AuthorPersonaRow | null
  isAdmin?: boolean
}

export function SettingsTabs({ modelPreferences, billingStatus, persona, isAdmin }: SettingsTabsProps) {
  const searchParams = useSearchParams()
  const billingParam = searchParams.get('billing')

  const tabs: TabDef[] = [
    ...(isAdmin ? [{ id: 'models', label: 'Models' }] : []),
    { id: 'billing', label: 'Billing' },
    { id: 'voice', label: 'Voice Profile' },
    { id: 'misc', label: 'Misc' },
  ]

  const defaultTab = billingParam === 'success' || billingParam === 'cancelled'
    ? 'billing'
    : tabs[0].id

  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <div className="space-y-8">
      <div className="flex gap-8 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2.5 text-[0.65rem] uppercase tracking-[0.1em] transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'text-[color:var(--gold)] border-b border-[color:var(--gold)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'models' && (
        <ModelSelector initialPreferences={modelPreferences} />
      )}

      {activeTab === 'billing' && billingStatus && (
        <BillingSection billingStatus={billingStatus} />
      )}

      {activeTab === 'voice' && (
        <VoiceProfileTab persona={persona} />
      )}

      {activeTab === 'misc' && (
        <div className="space-y-6">
          <div>
            <h3
              className="font-[family-name:var(--font-literata)] text-lg mb-1"
              style={{ fontWeight: 400 }}
            >
              Fun stuff
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Completely unnecessary features that spark joy.
            </p>
            <SpiderToggle />
          </div>
        </div>
      )}
    </div>
  )
}
