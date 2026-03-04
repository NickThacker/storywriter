'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlanCard } from '@/components/billing/plan-card'
import { TIERS, CREDIT_PACKS } from '@/lib/stripe/tiers'
import { createCheckoutSession, createCreditPackSession, createPortalSession } from '@/actions/billing'
import type { BillingStatus } from '@/types/billing'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  billingStatus: BillingStatus
}

export function UpgradeModal({ open, onClose, billingStatus }: UpgradeModalProps) {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null)

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

  const isLoading = loadingPriceId !== null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Token Budget Exhausted</DialogTitle>
          <DialogDescription>
            You&apos;ve used all your tokens for this billing period. Upgrade your plan or buy a
            credit pack to continue generating.
          </DialogDescription>
        </DialogHeader>

        {/* Plan upgrade cards */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Upgrade Plan
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TIERS.map((tier) => (
              <div key={tier.id} className={isLoading ? 'opacity-60 pointer-events-none' : ''}>
                <PlanCard
                  tier={tier}
                  isCurrentTier={billingStatus.tier === tier.id}
                  onSelect={handleSelectTier}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Credit packs */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Buy Credit Pack
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                disabled={isLoading}
                onClick={() => handleSelectCreditPack(pack.stripePriceId)}
                className="rounded-lg border p-4 text-left hover:border-primary hover:bg-accent/50 transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                <p className="font-medium text-sm">{pack.name}</p>
                <p className="text-muted-foreground text-xs mt-1">${pack.price} one-time</p>
                {loadingPriceId === pack.stripePriceId && (
                  <p className="text-xs text-primary mt-1">Redirecting...</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Manage subscription / close */}
        <div className="flex items-center justify-between pt-2 border-t">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleManageSubscription}
            className="text-sm text-muted-foreground hover:text-foreground underline disabled:opacity-60"
          >
            {loadingPriceId === 'portal' ? 'Redirecting...' : 'Manage Subscription'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-md px-4 py-2 text-sm border hover:bg-accent transition-colors disabled:opacity-60"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
