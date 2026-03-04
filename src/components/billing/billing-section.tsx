'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UsageBar } from '@/components/billing/usage-bar'
import { PlanCard } from '@/components/billing/plan-card'
import { TIERS, CREDIT_PACKS } from '@/lib/stripe/tiers'
import { createCheckoutSession, createCreditPackSession, createPortalSession } from '@/actions/billing'
import type { BillingStatus } from '@/types/billing'

interface BillingSectionProps {
  billingStatus: BillingStatus
}

function formatDate(iso: string | null): string {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function BillingSection({ billingStatus }: BillingSectionProps) {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null)

  const isLoading = loadingPriceId !== null
  const hasNoSubscription = billingStatus.tier === 'none'

  async function handleSelectTier(priceId: string) {
    setLoadingPriceId(priceId)
    try {
      const result = await createCheckoutSession(priceId)
      if ('url' in result && result.url) {
        window.location.href = result.url
      }
    } finally {
      setLoadingPriceId(null)
    }
  }

  async function handleSelectCreditPack(priceId: string) {
    setLoadingPriceId(priceId)
    try {
      const result = await createCreditPackSession(priceId)
      if ('url' in result && result.url) {
        window.location.href = result.url
      }
    } finally {
      setLoadingPriceId(null)
    }
  }

  async function handleManageSubscription() {
    setLoadingPriceId('portal')
    try {
      const result = await createPortalSession()
      if ('url' in result && result.url) {
        window.location.href = result.url
      }
    } finally {
      setLoadingPriceId(null)
    }
  }

  if (hasNoSubscription) {
    // No subscription — show initial signup tier cards
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose a plan to start generating with StoryWriter&apos;s hosted AI.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div key={tier.id} className={isLoading ? 'opacity-60 pointer-events-none' : ''}>
              <PlanCard
                tier={tier}
                isCurrentTier={false}
                onSelect={handleSelectTier}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Active subscription — show plan details + usage + manage options
  const currentTierConfig = TIERS.find((t) => t.id === billingStatus.tier)

  return (
    <div className="space-y-6">
      {/* Current plan + status */}
      <div className="rounded-lg border p-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {currentTierConfig ? currentTierConfig.name : billingStatus.tier} Plan
          </p>
          {billingStatus.billingPeriodEnd && (
            <p className="text-xs text-muted-foreground">
              Next billing date: {formatDate(billingStatus.billingPeriodEnd)}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={handleManageSubscription}
          className="shrink-0 rounded-md px-4 py-2 text-sm border hover:bg-accent transition-colors disabled:opacity-60"
        >
          {loadingPriceId === 'portal' ? 'Redirecting...' : 'Manage Subscription'}
        </button>
      </div>

      {/* Usage bar */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Token Usage This Period</h3>
        <UsageBar
          used={billingStatus.tokenBudgetTotal - billingStatus.tokenBudgetRemaining}
          total={billingStatus.tokenBudgetTotal}
          creditPack={billingStatus.creditPackTokens}
        />
        <Link
          href="/usage"
          className="text-xs text-primary hover:underline"
        >
          View detailed usage breakdown
        </Link>
      </div>

      {/* Credit packs */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Buy Credit Pack</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleSelectCreditPack(pack.stripePriceId)}
              className="rounded-lg border p-3 text-left hover:border-primary hover:bg-accent/50 transition-colors disabled:opacity-60 disabled:pointer-events-none"
            >
              <p className="font-medium text-sm">{pack.name}</p>
              <p className="text-muted-foreground text-xs mt-0.5">${pack.price}</p>
              {loadingPriceId === pack.stripePriceId && (
                <p className="text-xs text-primary mt-1">Redirecting...</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
