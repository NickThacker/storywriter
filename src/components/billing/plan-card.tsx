'use client'

import type { TierConfig } from '@/types/billing'

interface PlanCardProps {
  tier: TierConfig
  isCurrentTier: boolean
  onSelect: (priceId: string) => void
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
  }
  if (n >= 1_000) {
    const k = n / 1_000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  return String(n)
}

function estimateNovels(tokens: number): string {
  const novels = tokens / 500_000
  if (novels < 1) return '< 1 novel'
  return novels % 1 === 0 ? `~${novels} novels` : `~${novels.toFixed(1)} novels`
}

export function PlanCard({ tier, isCurrentTier, onSelect }: PlanCardProps) {
  return (
    <div className="relative rounded-lg border p-6 shadow-sm flex flex-col gap-4">
      {isCurrentTier && (
        <span className="absolute top-4 right-4 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Current Plan
        </span>
      )}

      <div>
        <h3 className="text-lg font-semibold">{tier.name}</h3>
        <p className="text-2xl font-bold mt-1">
          ${tier.price}
          <span className="text-sm font-normal text-muted-foreground">/mo</span>
        </p>
      </div>

      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>{formatTokens(tier.monthlyTokens)} tokens/month</li>
        <li>{estimateNovels(tier.monthlyTokens)} per month</li>
      </ul>

      {!isCurrentTier && (
        <button
          type="button"
          onClick={() => onSelect(tier.stripePriceId)}
          className="mt-auto w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Subscribe
        </button>
      )}
    </div>
  )
}
