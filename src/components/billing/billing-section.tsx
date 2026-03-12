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
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose a plan to start generating with Meridian&apos;s hosted AI.
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

  const currentTierConfig = TIERS.find((t) => t.id === billingStatus.tier)

  return (
    <div className="space-y-8">
      {/* Current plan */}
      <div
        className="border border-border p-5 flex items-start justify-between gap-4"
        style={{ borderRadius: 0 }}
      >
        <div className="space-y-1">
          <p className="text-sm text-foreground">
            {currentTierConfig ? currentTierConfig.name : billingStatus.tier} Plan
          </p>
          {billingStatus.billingPeriodEnd && (
            <p className="text-[0.7rem] text-muted-foreground">
              Next billing date: {formatDate(billingStatus.billingPeriodEnd)}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={handleManageSubscription}
          className="shrink-0 px-4 py-2 text-[0.68rem] uppercase tracking-[0.1em] border border-border hover:border-foreground transition-colors disabled:opacity-60 cursor-pointer"
          style={{ borderRadius: 0 }}
        >
          {loadingPriceId === 'portal' ? 'Redirecting...' : 'Manage'}
        </button>
      </div>

      {/* Usage */}
      <div className="space-y-3">
        <p
          className="text-[0.65rem] uppercase tracking-[0.1em]"
          style={{ color: 'var(--gold)' }}
        >
          Token Usage
        </p>
        <UsageBar
          used={billingStatus.tokenBudgetTotal - billingStatus.tokenBudgetRemaining}
          total={billingStatus.tokenBudgetTotal}
          creditPack={billingStatus.creditPackTokens}
        />
        <Link
          href="/usage"
          className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors"
        >
          View detailed breakdown
        </Link>
      </div>

      {/* Credit packs */}
      <div className="space-y-3">
        <p
          className="text-[0.65rem] uppercase tracking-[0.1em]"
          style={{ color: 'var(--gold)' }}
        >
          Credit Packs
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleSelectCreditPack(pack.stripePriceId)}
              className="border border-border p-3 text-left hover:border-[color:var(--gold)]/40 transition-colors disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
              style={{ borderRadius: 0 }}
            >
              <p className="text-sm text-foreground">{pack.name}</p>
              <p className="text-muted-foreground text-[0.7rem] mt-0.5">${pack.price}</p>
              {loadingPriceId === pack.stripePriceId && (
                <p className="text-[0.65rem] mt-1" style={{ color: 'var(--gold)' }}>Redirecting...</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
