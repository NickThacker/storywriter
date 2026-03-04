import type { TierConfig, CreditPackConfig } from '@/types/billing'
import type { SubscriptionTier } from '@/types/database'

export const TIERS: TierConfig[] = [
  {
    id: 'starter' as SubscriptionTier,
    name: 'Starter',
    price: 9,
    monthlyTokens: 500_000,
    stripePriceId: process.env.STRIPE_PRICE_STARTER || 'price_starter_placeholder',
  },
  {
    id: 'writer' as SubscriptionTier,
    name: 'Writer',
    price: 19,
    monthlyTokens: 2_000_000,
    stripePriceId: process.env.STRIPE_PRICE_WRITER || 'price_writer_placeholder',
  },
  {
    id: 'pro' as SubscriptionTier,
    name: 'Pro',
    price: 39,
    monthlyTokens: 5_000_000,
    stripePriceId: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder',
  },
]

export const CREDIT_PACKS: CreditPackConfig[] = [
  {
    id: 'pack-250k',
    name: '250K Tokens',
    tokens: 250_000,
    price: 4,
    stripePriceId: process.env.STRIPE_PRICE_PACK_250K || 'price_pack_250k_placeholder',
  },
  {
    id: 'pack-500k',
    name: '500K Tokens',
    tokens: 500_000,
    price: 6,
    stripePriceId: process.env.STRIPE_PRICE_PACK_500K || 'price_pack_500k_placeholder',
  },
  {
    id: 'pack-1m',
    name: '1M Tokens',
    tokens: 1_000_000,
    price: 8,
    stripePriceId: process.env.STRIPE_PRICE_PACK_1M || 'price_pack_1m_placeholder',
  },
  {
    id: 'pack-2m',
    name: '2M Tokens',
    tokens: 2_000_000,
    price: 18,
    stripePriceId: process.env.STRIPE_PRICE_PACK_2M || 'price_pack_2m_placeholder',
  },
  {
    id: 'pack-5m',
    name: '5M Tokens',
    tokens: 5_000_000,
    price: 30,
    stripePriceId: process.env.STRIPE_PRICE_PACK_5M || 'price_pack_5m_placeholder',
  },
]

export function getTierByStripePriceId(priceId: string): TierConfig | undefined {
  return TIERS.find((t) => t.stripePriceId === priceId)
}

export function getCreditPackByStripePriceId(priceId: string): CreditPackConfig | undefined {
  return CREDIT_PACKS.find((p) => p.stripePriceId === priceId)
}

export function getTierById(tierId: SubscriptionTier): TierConfig | undefined {
  return TIERS.find((t) => t.id === tierId)
}
