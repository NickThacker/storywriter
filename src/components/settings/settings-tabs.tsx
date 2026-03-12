'use client'

import { useState } from 'react'
import { ModelSelector } from '@/components/settings/model-selector'
import { BillingSection } from '@/components/billing/billing-section'
import { VoiceProfileTab } from '@/components/settings/voice-profile-tab'
import type { BillingStatus } from '@/types/billing'
import type { AuthorPersonaRow } from '@/types/database'

const TABS = [
  { id: 'models', label: 'Models' },
  { id: 'billing', label: 'Billing' },
  { id: 'voice', label: 'Voice Profile' },
] as const

type TabId = (typeof TABS)[number]['id']

interface SettingsTabsProps {
  modelPreferences: { taskType: string; modelId: string }[]
  billingStatus: BillingStatus | null
  persona: AuthorPersonaRow | null
}

export function SettingsTabs({ modelPreferences, billingStatus, persona }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('models')

  return (
    <div className="space-y-8">
      <div className="flex gap-8 border-b border-border">
        {TABS.map((tab) => (
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
    </div>
  )
}
