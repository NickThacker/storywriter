import type { TierConfig } from '@/types/billing'
import type { SubscriptionTier } from '@/types/database'

// -----------------------------------------------------------------------
// Tier configurations — project-based billing
// -----------------------------------------------------------------------

export const TIERS: TierConfig[] = [
  {
    id: 'project',
    name: 'Project',
    price: 39,
    interval: 'one_time',
    maxProjects: 1,
    features: [
      'One novel, start to finish',
      'Full 6-stage pipeline',
      'Voice DNA profiling from your own writing',
      'Unlimited generation within the project',
      'Access for 12 months',
      'No subscription required',
    ],
    stripePriceId: process.env.STRIPE_PRICE_PROJECT || 'price_project_placeholder',
    tagline: 'Try the full pipeline. No commitment.',
    cta: 'Start Your Project',
  },
  {
    id: 'author',
    name: 'Author',
    price: 49,
    interval: 'month',
    maxProjects: 3,
    features: [
      'Up to 3 active projects',
      'Full 6-stage pipeline on every generation',
      'Voice DNA + Style Anchor',
      'Chapter continuity and arc tracking',
      'Private — no community, no shared data',
    ],
    stripePriceId: process.env.STRIPE_PRICE_AUTHOR_MONTHLY || 'price_author_monthly_placeholder',
    tagline: 'Early member pricing. Locked for life.',
    cta: 'Start Writing',
    popular: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    price: 99,
    interval: 'month',
    maxProjects: null,
    features: [
      'Unlimited active projects',
      'Multiple voice profiles',
      'Priority processing',
      'Series continuity tools',
      'Early access to new pipeline features',
    ],
    stripePriceId: process.env.STRIPE_PRICE_STUDIO_MONTHLY || 'price_studio_monthly_placeholder',
    tagline: 'For working professionals.',
    cta: 'Get Started',
  },
]

// Yearly price IDs (used for annual toggle)
export const YEARLY_PRICES: Record<string, string> = {
  author: process.env.STRIPE_PRICE_AUTHOR_YEARLY || 'price_author_yearly_placeholder',
  studio: process.env.STRIPE_PRICE_STUDIO_YEARLY || 'price_studio_yearly_placeholder',
}

export const YEARLY_AMOUNTS: Record<string, number> = {
  author: 490,
  studio: 990,
}

// -----------------------------------------------------------------------
// Lookup helpers
// -----------------------------------------------------------------------

const ALL_PRICE_IDS = new Map<string, { tier: SubscriptionTier | 'project'; isYearly: boolean }>()

// Build lookup map at module load
function buildPriceMap() {
  for (const t of TIERS) {
    ALL_PRICE_IDS.set(t.stripePriceId, { tier: t.id, isYearly: false })
  }
  for (const [tier, priceId] of Object.entries(YEARLY_PRICES)) {
    ALL_PRICE_IDS.set(priceId, { tier: tier as SubscriptionTier, isYearly: true })
  }
}
buildPriceMap()

export function getTierByStripePriceId(priceId: string): { tier: SubscriptionTier | 'project'; isYearly: boolean } | undefined {
  return ALL_PRICE_IDS.get(priceId)
}

export function getTierConfigById(id: string): TierConfig | undefined {
  return TIERS.find((t) => t.id === id)
}
