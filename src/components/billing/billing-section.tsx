'use client'

import { useState } from 'react'
import { TIERS, YEARLY_PRICES, YEARLY_AMOUNTS } from '@/lib/stripe/tiers'
import { createCheckoutSession, createProjectCreditSession, createPortalSession } from '@/actions/billing'
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
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')

  const isLoading = loadingPriceId !== null
  const hasSubscription = billingStatus.tier !== 'none'

  async function handleSubscribe(priceId: string) {
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

  async function handleBuyProjectCredit(priceId: string) {
    setLoadingPriceId(priceId)
    try {
      const result = await createProjectCreditSession(priceId)
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

  function getPriceId(tier: typeof TIERS[number]): string {
    if (tier.id === 'project') return tier.stripePriceId
    if (billingInterval === 'year' && (tier.id === 'author' || tier.id === 'studio')) {
      return YEARLY_PRICES[tier.id] ?? tier.stripePriceId
    }
    return tier.stripePriceId
  }

  function getDisplayPrice(tier: typeof TIERS[number]): { amount: number; label: string } {
    if (tier.id === 'project') return { amount: tier.price, label: 'one time' }
    if (billingInterval === 'year' && (tier.id === 'author' || tier.id === 'studio')) {
      return { amount: YEARLY_AMOUNTS[tier.id] ?? tier.price * 12, label: 'per year' }
    }
    return { amount: tier.price, label: 'per month' }
  }

  return (
    <div className="space-y-8">
      {/* Current plan summary (if subscribed) */}
      {hasSubscription && (
        <div
          className="border border-border p-5 flex items-start justify-between gap-4"
          style={{ borderRadius: 0 }}
        >
          <div className="space-y-1">
            <p className="text-sm text-foreground">
              {billingStatus.tier.charAt(0).toUpperCase() + billingStatus.tier.slice(1)} Plan
            </p>
            <p className="text-[0.7rem] text-muted-foreground">
              {billingStatus.maxProjects === null
                ? 'Unlimited projects'
                : `${billingStatus.activeProjects} of ${billingStatus.maxProjects} projects used`}
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
      )}

      {/* Project credits */}
      {billingStatus.projectCredits > 0 && (
        <div className="border border-border p-4" style={{ borderRadius: 0 }}>
          <p className="text-sm text-foreground">
            {billingStatus.projectCredits} project credit{billingStatus.projectCredits !== 1 ? 's' : ''} available
          </p>
          <p className="text-[0.7rem] text-muted-foreground mt-1">
            Each credit lets you start one novel with 12 months of access.
          </p>
        </div>
      )}

      {/* Billing interval toggle */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setBillingInterval('month')}
          className={`text-[0.65rem] uppercase tracking-[0.1em] pb-1 transition-colors cursor-pointer ${
            billingInterval === 'month'
              ? 'text-[color:var(--gold)] border-b border-[color:var(--gold)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBillingInterval('year')}
          className={`text-[0.65rem] uppercase tracking-[0.1em] pb-1 transition-colors cursor-pointer ${
            billingInterval === 'year'
              ? 'text-[color:var(--gold)] border-b border-[color:var(--gold)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Yearly
        </button>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TIERS.map((tier) => {
          const isCurrentTier = billingStatus.tier === tier.id
          const priceId = getPriceId(tier)
          const { amount, label } = getDisplayPrice(tier)
          const isProject = tier.id === 'project'

          return (
            <div
              key={tier.id}
              className={`relative border p-5 flex flex-col ${
                tier.popular
                  ? 'border-[color:var(--gold)]/40 bg-card'
                  : 'border-border bg-card'
              } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
              style={{ borderRadius: 0 }}
            >
              {tier.popular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[0.55rem] uppercase tracking-[0.15em] bg-[color:var(--gold)] text-background font-medium"
                  style={{ borderRadius: 0 }}
                >
                  Most Popular
                </div>
              )}

              {/* Header */}
              <p
                className="text-[0.6rem] uppercase tracking-[0.12em] mb-3"
                style={{ color: 'var(--gold)' }}
              >
                {tier.name}
              </p>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[0.7rem] text-muted-foreground">$</span>
                <span
                  className="text-3xl font-light"
                  style={{ fontFamily: 'var(--font-literata)' }}
                >
                  {amount}
                </span>
              </div>
              <p className="text-[0.7rem] text-muted-foreground mb-2">{label}</p>

              {/* Tagline */}
              <p
                className="text-xs text-muted-foreground mb-5 italic"
                style={{ fontFamily: 'var(--font-literata)' }}
              >
                {tier.tagline}
              </p>

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-muted-foreground">
                    <span style={{ color: 'var(--gold)' }} className="shrink-0">&mdash;</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrentTier ? (
                <div
                  className="w-full text-center py-2.5 text-[0.65rem] uppercase tracking-[0.1em] border border-[color:var(--gold)]/30 text-[color:var(--gold)]"
                  style={{ borderRadius: 0 }}
                >
                  Current Plan
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    isProject
                      ? handleBuyProjectCredit(priceId)
                      : handleSubscribe(priceId)
                  }
                  className={`w-full py-2.5 text-[0.65rem] uppercase tracking-[0.1em] transition-colors cursor-pointer ${
                    tier.popular
                      ? 'bg-[color:var(--gold)] text-background hover:opacity-90'
                      : 'border border-border text-foreground hover:border-foreground'
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  {loadingPriceId === priceId ? 'Redirecting...' : tier.cta}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Yearly footnote for Author */}
      {billingInterval === 'month' && (
        <p className="text-center text-[0.65rem] text-muted-foreground">
          Author is also available at $490/year. Studio at $990/year.{' '}
          <button
            type="button"
            onClick={() => setBillingInterval('year')}
            className="text-[color:var(--gold)] hover:underline cursor-pointer"
          >
            View yearly pricing
          </button>
        </p>
      )}
    </div>
  )
}
