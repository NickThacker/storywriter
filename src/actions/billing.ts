'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import type { BillingStatus } from '@/types/billing'

// ──────────────────────────────────────────────────────────────────────────────
// Helper: resolve the origin (scheme + host) for redirect URLs
// ──────────────────────────────────────────────────────────────────────────────

async function getOrigin(): Promise<string> {
  const headerList = await headers()
  const origin = headerList.get('origin') ?? headerList.get('x-forwarded-host')
  if (origin) return origin
  // Fallback for direct server invocations (e.g. tests, seed scripts)
  const host = headerList.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: get or create a Stripe customer for the authenticated user
// ──────────────────────────────────────────────────────────────────────────────

async function getOrCreateStripeCustomer(
  userId: string,
  userEmail: string
): Promise<{ customerId: string } | { error: string }> {
  if (!stripe) return { error: 'Stripe not configured' }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings, error: settingsError } = await (supabase as any)
    .from('user_settings')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  if (settingsError && settingsError.code !== 'PGRST116') {
    return { error: `Failed to fetch user settings: ${settingsError.message}` }
  }

  const existingCustomerId = settings?.stripe_customer_id as string | null

  if (existingCustomerId) {
    return { customerId: existingCustomerId }
  }

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email: userEmail,
    metadata: { supabase_user_id: userId },
  })

  // Persist the customer ID back to user_settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('user_settings')
    .upsert(
      { user_id: userId, stripe_customer_id: customer.id },
      { onConflict: 'user_id' }
    )

  if (updateError) {
    // Non-fatal: customer exists in Stripe, DB write failed — log and continue
    console.error('Failed to save stripe_customer_id:', updateError.message)
  }

  return { customerId: customer.id }
}

// ──────────────────────────────────────────────────────────────────────────────
// createCheckoutSession — start a subscription checkout
// ──────────────────────────────────────────────────────────────────────────────

export async function createCheckoutSession(
  priceId: string
): Promise<{ url: string } | { error: string }> {
  if (!stripe) return { error: 'Stripe not configured' }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'You must be logged in' }

  const customerResult = await getOrCreateStripeCustomer(user.id, user.email ?? '')
  if ('error' in customerResult) return customerResult

  const origin = await getOrigin()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerResult.customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings?billing=success`,
    cancel_url: `${origin}/settings?billing=cancelled`,
    metadata: { userId: user.id },
  })

  if (!session.url) return { error: 'Checkout session URL not returned by Stripe' }
  return { url: session.url }
}

// ──────────────────────────────────────────────────────────────────────────────
// createCreditPackSession — start a one-time credit pack checkout
// ──────────────────────────────────────────────────────────────────────────────

export async function createCreditPackSession(
  priceId: string
): Promise<{ url: string } | { error: string }> {
  if (!stripe) return { error: 'Stripe not configured' }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'You must be logged in' }

  const customerResult = await getOrCreateStripeCustomer(user.id, user.email ?? '')
  if ('error' in customerResult) return customerResult

  const origin = await getOrigin()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerResult.customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings?billing=success`,
    cancel_url: `${origin}/settings?billing=cancelled`,
    metadata: { userId: user.id, type: 'credit_pack' },
  })

  if (!session.url) return { error: 'Checkout session URL not returned by Stripe' }
  return { url: session.url }
}

// ──────────────────────────────────────────────────────────────────────────────
// createPortalSession — open the Stripe Billing Portal for subscription mgmt
// ──────────────────────────────────────────────────────────────────────────────

export async function createPortalSession(): Promise<
  { url: string } | { error: string }
> {
  if (!stripe) return { error: 'Stripe not configured' }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'You must be logged in' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings, error: settingsError } = await (supabase as any)
    .from('user_settings')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (settingsError || !settings?.stripe_customer_id) {
    return { error: 'No active subscription' }
  }

  const origin = await getOrigin()

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: settings.stripe_customer_id as string,
    return_url: `${origin}/settings`,
  })

  return { url: portalSession.url }
}

// ──────────────────────────────────────────────────────────────────────────────
// getBillingStatus — fetch billing state for the /usage or /settings page
// ──────────────────────────────────────────────────────────────────────────────

export async function getBillingStatus(): Promise<BillingStatus | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'You must be logged in' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings, error: settingsError } = await (supabase as any)
    .from('user_settings')
    .select(
      'openrouter_api_key, subscription_tier, token_budget_total, token_budget_remaining, credit_pack_tokens, billing_period_end'
    )
    .eq('user_id', user.id)
    .single()

  if (settingsError || !settings) {
    // No settings row yet — return sensible defaults
    return {
      isByok: false,
      tier: 'none',
      tokenBudgetTotal: 0,
      tokenBudgetRemaining: 0,
      creditPackTokens: 0,
      billingPeriodEnd: null,
      usagePercent: 0,
    }
  }

  // BYOK users bypass all billing
  if (settings.openrouter_api_key) {
    return {
      isByok: true,
      tier: (settings.subscription_tier as string) as BillingStatus['tier'],
      tokenBudgetTotal: 0,
      tokenBudgetRemaining: 0,
      creditPackTokens: 0,
      billingPeriodEnd: null,
      usagePercent: 0,
    }
  }

  const budgetTotal = (settings.token_budget_total as number) ?? 0
  const budgetRemaining = (settings.token_budget_remaining as number) ?? 0
  const usagePercent =
    budgetTotal > 0 ? ((budgetTotal - budgetRemaining) / budgetTotal) * 100 : 0

  return {
    isByok: false,
    tier: (settings.subscription_tier as string) as BillingStatus['tier'],
    tokenBudgetTotal: budgetTotal,
    tokenBudgetRemaining: budgetRemaining,
    creditPackTokens: (settings.credit_pack_tokens as number) ?? 0,
    billingPeriodEnd: (settings.billing_period_end as string | null) ?? null,
    usagePercent,
  }
}
