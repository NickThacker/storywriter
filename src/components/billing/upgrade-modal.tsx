'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TIERS } from '@/lib/stripe/tiers'
import { createCheckoutSession, createProjectCreditSession, createPortalSession } from '@/actions/billing'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  reason?: 'no_subscription' | 'project_limit_reached' | 'project_expired' | string
}

export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null)
  const isLoading = loadingPriceId !== null

  const title = reason === 'project_expired'
    ? 'Project Access Expired'
    : reason === 'project_limit_reached'
    ? 'Project Limit Reached'
    : 'Subscription Required'

  const description = reason === 'project_expired'
    ? 'Your 12-month access for this project has expired. Purchase a new project credit or subscribe to continue.'
    : reason === 'project_limit_reached'
    ? 'You\'ve reached your active project limit. Upgrade your plan or buy a single project credit.'
    : 'Choose a plan to start writing with Meridian.'

  async function handleSubscribe(priceId: string) {
    setLoadingPriceId(priceId)
    try {
      const result = await createCheckoutSession(priceId)
      if ('url' in result && result.url) window.location.href = result.url
    } finally {
      setLoadingPriceId(null)
    }
  }

  async function handleBuyCredit(priceId: string) {
    setLoadingPriceId(priceId)
    try {
      const result = await createProjectCreditSession(priceId)
      if ('url' in result && result.url) window.location.href = result.url
    } finally {
      setLoadingPriceId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ borderRadius: 0 }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
          {TIERS.map((tier) => {
            const isProject = tier.id === 'project'
            return (
              <button
                key={tier.id}
                type="button"
                disabled={isLoading}
                onClick={() =>
                  isProject
                    ? handleBuyCredit(tier.stripePriceId)
                    : handleSubscribe(tier.stripePriceId)
                }
                className={`border p-4 text-left transition-colors disabled:opacity-60 cursor-pointer ${
                  tier.popular
                    ? 'border-[color:var(--gold)]/40 hover:border-[color:var(--gold)]'
                    : 'border-border hover:border-foreground'
                }`}
                style={{ borderRadius: 0 }}
              >
                <p className="text-[0.6rem] uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--gold)' }}>
                  {tier.name}
                </p>
                <p className="text-lg font-light" style={{ fontFamily: 'var(--font-literata)' }}>
                  ${tier.price}
                  <span className="text-xs text-muted-foreground ml-1">
                    {tier.interval === 'one_time' ? 'one time' : '/mo'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">{tier.tagline}</p>
                {loadingPriceId === tier.stripePriceId && (
                  <p className="text-[0.65rem] mt-1" style={{ color: 'var(--gold)' }}>Redirecting...</p>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-border mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-[0.68rem] uppercase tracking-[0.1em] border border-border hover:border-foreground transition-colors disabled:opacity-60 cursor-pointer"
            style={{ borderRadius: 0 }}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
