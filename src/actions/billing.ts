'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import type { BillingStatus } from '@/types/billing'
import type { SubscriptionTier } from '@/types/database'

// ──────────────────────────────────────────────────────────────────────────────
// Helper: resolve the origin (scheme + host) for redirect URLs
// ──────────────────────────────────────────────────────────────────────────────

async function getOrigin(): Promise<string> {
  const headerList = await headers()
  // origin header includes the scheme (https://app.meridianwrite.com)
  const origin = headerList.get('origin')
  if (origin) return origin
  // x-forwarded-host and host are hostname only — need to add scheme
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000'
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

  const customer = await stripe.customers.create({
    email: userEmail,
    metadata: { supabase_user_id: userId },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('user_settings')
    .upsert(
      { user_id: userId, stripe_customer_id: customer.id },
      { onConflict: 'user_id' }
    )

  if (updateError) {
    console.error('Failed to save stripe_customer_id:', updateError.message)
  }

  return { customerId: customer.id }
}

// ──────────────────────────────────────────────────────────────────────────────
// createCheckoutSession — start a subscription checkout (Author / Studio)
// ──────────────────────────────────────────────────────────────────────────────

export async function createCheckoutSession(
  priceId: string
): Promise<{ url: string } | { error: string }> {
  try {
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
      allow_promotion_codes: true,
      success_url: `${origin}/settings?billing=success`,
      cancel_url: `${origin}/settings?billing=cancelled`,
      metadata: { userId: user.id },
    })

    if (!session.url) return { error: 'Checkout session URL not returned by Stripe' }
    return { url: session.url }
  } catch (err) {
    console.error('[billing] createCheckoutSession error:', err)
    return { error: err instanceof Error ? err.message : 'Checkout failed' }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// createProjectCreditSession — buy a single-project credit ($39 one-time)
// ──────────────────────────────────────────────────────────────────────────────

export async function createProjectCreditSession(
  priceId: string
): Promise<{ url: string } | { error: string }> {
  try {
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
      allow_promotion_codes: true,
      success_url: `${origin}/settings?billing=success`,
      cancel_url: `${origin}/settings?billing=cancelled`,
      metadata: { userId: user.id, type: 'project_credit' },
    })

    if (!session.url) return { error: 'Checkout session URL not returned by Stripe' }
    return { url: session.url }
  } catch (err) {
    console.error('[billing] createProjectCreditSession error:', err)
    return { error: err instanceof Error ? err.message : 'Checkout failed' }
  }
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
// getBillingStatus — fetch billing state for the settings page
// ──────────────────────────────────────────────────────────────────────────────

export async function getBillingStatus(): Promise<BillingStatus | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'You must be logged in' }

  // Fetch settings + active project count in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settingsResult, projectsResult] = await Promise.all([
    (supabase as any)
      .from('user_settings')
      .select('subscription_tier, project_credits, billing_period_end')
      .eq('user_id', user.id)
      .single(),
    (supabase as any)
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const settings = settingsResult.data as {
    subscription_tier: SubscriptionTier
    project_credits: number
    billing_period_end: string | null
  } | null

  const tier: SubscriptionTier = settings?.subscription_tier ?? 'none'
  const maxProjects = tier === 'studio' ? null : tier === 'author' ? 3 : 0

  return {
    tier,
    projectCredits: settings?.project_credits ?? 0,
    activeProjects: projectsResult.count ?? 0,
    maxProjects,
    billingPeriodEnd: settings?.billing_period_end ?? null,
  }
}
