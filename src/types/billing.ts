import type { SubscriptionTier } from '@/types/database'

// -----------------------------------------------------------------------
// Token usage row type — matches the token_usage table
// -----------------------------------------------------------------------

export interface TokenUsageRow {
  id: string
  user_id: string
  project_id: string
  chapter_number: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  created_at: string
}

export type TokenUsageInsert = Omit<TokenUsageRow, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export type TokenUsageUpdate = Partial<
  Omit<TokenUsageRow, 'id' | 'user_id' | 'project_id' | 'created_at'>
>

// -----------------------------------------------------------------------
// Stripe webhook events row type — matches stripe_webhook_events table
// -----------------------------------------------------------------------

export interface StripeWebhookEventRow {
  event_id: string
  processed_at: string
}

// -----------------------------------------------------------------------
// Budget check result — returned by the budget check utility
// -----------------------------------------------------------------------

export interface BudgetCheckResult {
  allowed: boolean
  isByok: boolean
  budgetRemaining?: number
  budgetTotal?: number
  warningThreshold?: 'near_limit' | null
  reason?: 'budget_exhausted' | 'no_subscription'
}

// -----------------------------------------------------------------------
// Billing status — for UI display on the /usage page
// -----------------------------------------------------------------------

export interface BillingStatus {
  isByok: boolean
  tier: SubscriptionTier
  tokenBudgetTotal: number
  tokenBudgetRemaining: number
  creditPackTokens: number
  billingPeriodEnd: string | null
  usagePercent: number
}

// -----------------------------------------------------------------------
// Subscription tier config — for pricing display
// -----------------------------------------------------------------------

export interface TierConfig {
  id: SubscriptionTier
  name: string
  price: number
  monthlyTokens: number
  stripePriceId: string
}

// -----------------------------------------------------------------------
// Credit pack config — for one-time purchase options
// -----------------------------------------------------------------------

export interface CreditPackConfig {
  id: string
  name: string
  tokens: number
  price: number
  stripePriceId: string
}

// -----------------------------------------------------------------------
// Subscription tier configs (Claude's discretion per 05-RESEARCH.md)
// -----------------------------------------------------------------------

export const TIER_CONFIGS: TierConfig[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 9,
    monthlyTokens: 500_000,
    stripePriceId: '', // Set via NEXT_PUBLIC_STRIPE_PRICE_STARTER env var
  },
  {
    id: 'writer',
    name: 'Writer',
    price: 19,
    monthlyTokens: 2_000_000,
    stripePriceId: '', // Set via NEXT_PUBLIC_STRIPE_PRICE_WRITER env var
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39,
    monthlyTokens: 5_000_000,
    stripePriceId: '', // Set via NEXT_PUBLIC_STRIPE_PRICE_PRO env var
  },
]

// -----------------------------------------------------------------------
// Credit pack configs
// -----------------------------------------------------------------------

export const CREDIT_PACK_CONFIGS: CreditPackConfig[] = [
  {
    id: 'pack-250k',
    name: '250K Tokens',
    tokens: 250_000,
    price: 4,
    stripePriceId: '', // Set via env var
  },
  {
    id: 'pack-1m',
    name: '1M Tokens',
    tokens: 1_000_000,
    price: 12,
    stripePriceId: '', // Set via env var
  },
  {
    id: 'pack-500k',
    name: '500K Tokens',
    tokens: 500_000,
    price: 6,
    stripePriceId: '', // Set via env var
  },
  {
    id: 'pack-2m',
    name: '2M Tokens',
    tokens: 2_000_000,
    price: 18,
    stripePriceId: '', // Set via env var
  },
]

// Budget warning threshold (80%)
export const BUDGET_WARNING_THRESHOLD = 0.8
