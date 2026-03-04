// Stripe webhook handler.
// IMPORTANT: reads raw body as text (req.text()) — NOT req.json().
// JSON parsing would destroy the raw body needed for signature verification.
//
// Uses a Supabase service-role client directly (not the user-scoped createClient)
// because webhook requests have no user session.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe/client'
import { getTierByStripePriceId, getCreditPackByStripePriceId } from '@/lib/stripe/tiers'
import type { SupabaseClient } from '@supabase/supabase-js'

// ──────────────────────────────────────────────────────────────────────────────
// Admin (service-role) Supabase client — bypasses RLS for webhook writes
// ──────────────────────────────────────────────────────────────────────────────

function createAdminClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Event handlers
// ──────────────────────────────────────────────────────────────────────────────

async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClient
): Promise<void> {
  const userId = session.metadata?.userId
  if (!userId) {
    console.error('[webhook] checkout.session.completed: missing userId in metadata')
    return
  }

  if (!stripe) return

  // Retrieve the full subscription to get the price ID
  const subscriptionId = session.subscription as string | null
  if (!subscriptionId) {
    console.error('[webhook] checkout.session.completed: no subscription ID on session')
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id
  if (!priceId) {
    console.error('[webhook] checkout.session.completed: no price ID on subscription')
    return
  }

  const tier = getTierByStripePriceId(priceId)
  if (!tier) {
    console.error(`[webhook] checkout.session.completed: unknown priceId ${priceId}`)
    return
  }

  // In API version 2026-02-25.clover, current_period_end was removed from Subscription.
  // The billing period end is derived from invoice.period_end when invoice.paid fires.
  // On initial checkout, we leave billing_period_end null — it will be set when the
  // first invoice.paid event arrives.

  const { error } = await supabase
    .from('user_settings')
    .update({
      subscription_tier: tier.id,
      stripe_subscription_id: subscriptionId,
      token_budget_total: tier.monthlyTokens,
      token_budget_remaining: tier.monthlyTokens,
      billing_period_end: null,
      stripe_customer_id: session.customer as string,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[webhook] handleSubscriptionCheckout DB error:', error.message)
  }
}

async function handleCreditPackPurchase(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClient
): Promise<void> {
  const userId = session.metadata?.userId
  if (!userId) {
    console.error('[webhook] credit_pack purchase: missing userId in metadata')
    return
  }

  if (!stripe) return

  // Retrieve line items to get the price ID
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 })
  const priceId = lineItems.data[0]?.price?.id
  if (!priceId) {
    console.error('[webhook] credit_pack purchase: no price ID in line items')
    return
  }

  const pack = getCreditPackByStripePriceId(priceId)
  if (!pack) {
    console.error(`[webhook] credit_pack purchase: unknown priceId ${priceId}`)
    return
  }

  // Fetch current credit_pack_tokens
  const { data: settings, error: fetchError } = await supabase
    .from('user_settings')
    .select('credit_pack_tokens')
    .eq('user_id', userId)
    .single()

  if (fetchError || !settings) {
    console.error('[webhook] credit_pack purchase: failed to fetch user settings:', fetchError?.message)
    return
  }

  const currentTokens = (settings as { credit_pack_tokens: number }).credit_pack_tokens ?? 0

  const { error } = await supabase
    .from('user_settings')
    .update({ credit_pack_tokens: currentTokens + pack.tokens })
    .eq('user_id', userId)

  if (error) {
    console.error('[webhook] handleCreditPackPurchase DB error:', error.message)
  }
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
): Promise<void> {
  const userId = subscription.metadata?.supabase_user_id
  if (!userId) {
    // Fall back to looking up by stripe_subscription_id
    const subId = subscription.id
    const { data: settings, error: lookupError } = await supabase
      .from('user_settings')
      .select('user_id, token_budget_remaining')
      .eq('stripe_subscription_id', subId)
      .single()

    if (lookupError || !settings) {
      console.error('[webhook] subscription.updated: cannot find user for sub', subId)
      return
    }

    const priceId = subscription.items.data[0]?.price.id
    const tier = priceId ? getTierByStripePriceId(priceId) : undefined

    if (!tier) {
      console.error('[webhook] subscription.updated: unknown priceId', priceId)
      return
    }

    const existingRemaining = (settings as { token_budget_remaining: number }).token_budget_remaining ?? 0
    const newRemaining = Math.min(existingRemaining, tier.monthlyTokens)

    // billing_period_end will be updated when invoice.paid fires
    const { error } = await supabase
      .from('user_settings')
      .update({
        subscription_tier: tier.id,
        token_budget_total: tier.monthlyTokens,
        token_budget_remaining: newRemaining,
      })
      .eq('stripe_subscription_id', subId)

    if (error) {
      console.error('[webhook] handleSubscriptionUpdate DB error:', error.message)
    }
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const tier = priceId ? getTierByStripePriceId(priceId) : undefined

  if (!tier) {
    console.error('[webhook] subscription.updated: unknown priceId', priceId)
    return
  }

  const { data: settings, error: fetchError } = await supabase
    .from('user_settings')
    .select('token_budget_remaining')
    .eq('user_id', userId)
    .single()

  if (fetchError || !settings) {
    console.error('[webhook] subscription.updated: failed to fetch settings for user', userId)
    return
  }

  const existingRemaining = (settings as { token_budget_remaining: number }).token_budget_remaining ?? 0
  const newRemaining = Math.min(existingRemaining, tier.monthlyTokens)

  // billing_period_end will be updated when invoice.paid fires
  const { error } = await supabase
    .from('user_settings')
    .update({
      subscription_tier: tier.id,
      token_budget_total: tier.monthlyTokens,
      token_budget_remaining: newRemaining,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[webhook] handleSubscriptionUpdate DB error:', error.message)
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
): Promise<void> {
  const subId = subscription.id

  const { error } = await supabase
    .from('user_settings')
    .update({
      subscription_tier: 'none',
      stripe_subscription_id: null,
      token_budget_total: 0,
      token_budget_remaining: 0,
      billing_period_end: null,
    })
    .eq('stripe_subscription_id', subId)

  if (error) {
    console.error('[webhook] handleSubscriptionDeleted DB error:', error.message)
  }
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  supabase: SupabaseClient
): Promise<void> {
  // In API version 2026-02-25.clover, subscription info is under invoice.parent.subscription_details.subscription
  const subscriptionParent = invoice.parent?.subscription_details?.subscription
  const subscriptionId = typeof subscriptionParent === 'string'
    ? subscriptionParent
    : (subscriptionParent as Stripe.Subscription | null)?.id ?? null

  if (!subscriptionId) {
    // One-time invoice (credit pack) — no budget reset needed
    return
  }

  // Determine new period end from invoice period_end (still available on Invoice)
  const periodEnd = invoice.period_end
    ? new Date(invoice.period_end * 1000).toISOString()
    : null

  // Fetch current budget total to reset remaining
  const { data: settings, error: fetchError } = await supabase
    .from('user_settings')
    .select('token_budget_total')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (fetchError || !settings) {
    console.error('[webhook] handleInvoicePaid: failed to fetch settings for sub', subscriptionId)
    return
  }

  const budgetTotal = (settings as { token_budget_total: number }).token_budget_total ?? 0

  const { error } = await supabase
    .from('user_settings')
    .update({
      token_budget_remaining: budgetTotal,
      billing_period_end: periodEnd,
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('[webhook] handleInvoicePaid DB error:', error.message)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/stripe
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!stripe) {
    console.error('[webhook] Stripe not configured — STRIPE_SECRET_KEY missing')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  // 1. Read raw body as text — MUST NOT use req.json() (destroys raw body for sig check)
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // 2. Verify signature
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[webhook] Signature verification failed:', message)
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  // 3. Create admin Supabase client (service role — no user session in webhooks)
  const supabase = createAdminClient()

  // 4. Idempotency check — skip events already processed
  const { data: existingEvent } = await supabase
    .from('stripe_webhook_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle()

  if (existingEvent) {
    // Already processed — return 200 immediately
    return NextResponse.json({ received: true, skipped: true })
  }

  // 5. Record the event before processing (prevents double-processing on retry)
  const { error: insertError } = await supabase
    .from('stripe_webhook_events')
    .insert({ event_id: event.id })

  if (insertError) {
    // Race condition: another instance may have inserted concurrently — treat as duplicate
    console.warn('[webhook] Could not insert event record (may be duplicate):', insertError.message)
    return NextResponse.json({ received: true, skipped: true })
  }

  // 6. Handle events — always return 200 so Stripe does not retry endlessly
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription') {
          await handleSubscriptionCheckout(session, supabase)
        } else if (session.metadata?.type === 'credit_pack') {
          await handleCreditPackPurchase(session, supabase)
        }
        break
      }
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, supabase)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, supabase)
        break

      default:
        // Unhandled event types are silently ignored
        break
    }
  } catch (err) {
    // Log processing errors but still return 200 — Stripe should not retry on application errors
    console.error(`[webhook] Error processing event ${event.type}:`, err)
  }

  return NextResponse.json({ received: true })
}
