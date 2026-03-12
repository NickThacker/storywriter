import type { SubscriptionTier } from '@/types/database'

// -----------------------------------------------------------------------
// Token usage row type — matches the token_usage table (kept for history)
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
// Access check result — returned before project creation
// -----------------------------------------------------------------------

export interface AccessCheckResult {
  allowed: boolean
  reason?: 'no_subscription' | 'project_limit_reached'
  tier: SubscriptionTier
  projectCredits: number
  activeProjects: number
  maxProjects: number | null // null = unlimited
}

// -----------------------------------------------------------------------
// Billing status — for UI display on settings page
// -----------------------------------------------------------------------

export interface BillingStatus {
  tier: SubscriptionTier
  projectCredits: number
  activeProjects: number
  maxProjects: number | null // null = unlimited (studio)
  billingPeriodEnd: string | null
}

// -----------------------------------------------------------------------
// Tier configs — project-based billing
// -----------------------------------------------------------------------

export interface TierConfig {
  id: SubscriptionTier | 'project'
  name: string
  price: number
  interval: 'one_time' | 'month' | 'year'
  maxProjects: number | null // null = unlimited
  features: string[]
  stripePriceId: string
  tagline: string
  cta: string
  popular?: boolean
}
