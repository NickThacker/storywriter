// Stripe webhook handler for project-based billing.
// Handles subscription checkout (Author/Studio), one-time project purchases,
// subscription updates, deletions, and invoice.paid for period resets.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe/client'
import { getTierByStripePriceId } from '@/lib/stripe/tiers'
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
  if (!userId || !stripe) return

  const subscriptionId = session.subscription as string | null
  if (!subscriptionId) {
    console.error('[webhook] checkout.session.completed: no subscription ID on session')
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id
  if (!priceId) return

  const tierInfo = getTierByStripePriceId(priceId)
  if (!tierInfo || tierInfo.tier === 'project') {
    console.error(`[webhook] checkout.session.completed: unexpected priceId ${priceId}`)
    return
  }

  const { error } = await supabase
    .from('user_settings')
    .update({
      subscription_tier: tierInfo.tier,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
      billing_period_end: null, // Set when invoice.paid fires
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[webhook] handleSubscriptionCheckout DB error:', error.message)
  }
}

async function handleProjectPurchase(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClient
): Promise<void> {
  const userId = session.metadata?.userId
  if (!userId || !stripe) return

  // Increment project_credits by 1
  const { data: settings, error: fetchError } = await supabase
    .from('user_settings')
    .select('project_credits')
    .eq('user_id', userId)
    .single()

  if (fetchError || !settings) {
    console.error('[webhook] project purchase: failed to fetch settings:', fetchError?.message)
    return
  }

  const current = (settings as { project_credits: number }).project_credits ?? 0

  const { error } = await supabase
    .from('user_settings')
    .update({
      project_credits: current + 1,
      stripe_customer_id: session.customer as string,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[webhook] handleProjectPurchase DB error:', error.message)
  }
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id
  const tierInfo = priceId ? getTierByStripePriceId(priceId) : undefined

  if (!tierInfo || tierInfo.tier === 'project') {
    console.error('[webhook] subscription.updated: unknown or project priceId', priceId)
    return
  }

  // Try metadata first, fall back to subscription ID lookup
  const userId = subscription.metadata?.supabase_user_id
  const filter = userId
    ? { column: 'user_id', value: userId }
    : { column: 'stripe_subscription_id', value: subscription.id }

  const { error } = await supabase
    .from('user_settings')
    .update({ subscription_tier: tierInfo.tier })
    .eq(filter.column, filter.value)

  if (error) {
    console.error('[webhook] handleSubscriptionUpdate DB error:', error.message)
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .update({
      subscription_tier: 'none',
      stripe_subscription_id: null,
      billing_period_end: null,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('[webhook] handleSubscriptionDeleted DB error:', error.message)
  }
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  supabase: SupabaseClient
): Promise<void> {
  const subscriptionParent = invoice.parent?.subscription_details?.subscription
  const subscriptionId = typeof subscriptionParent === 'string'
    ? subscriptionParent
    : (subscriptionParent as Stripe.Subscription | null)?.id ?? null

  if (!subscriptionId) return // One-time invoice, no period to track

  const periodEnd = invoice.period_end
    ? new Date(invoice.period_end * 1000).toISOString()
    : null

  const { error } = await supabase
    .from('user_settings')
    .update({ billing_period_end: periodEnd })
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

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET.trim())
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[webhook] Signature verification failed:', message)
    console.error('[webhook] sig header (first 20):', sig.substring(0, 20))
    console.error('[webhook] secret prefix:', process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10))
    console.error('[webhook] body length:', body.length)
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Idempotency check
  const { data: existingEvent } = await supabase
    .from('stripe_webhook_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle()

  if (existingEvent) {
    return NextResponse.json({ received: true, skipped: true })
  }

  const { error: insertError } = await supabase
    .from('stripe_webhook_events')
    .insert({ event_id: event.id })

  if (insertError) {
    console.warn('[webhook] Could not insert event record (may be duplicate):', insertError.message)
    return NextResponse.json({ received: true, skipped: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription') {
          await handleSubscriptionCheckout(session, supabase)
        } else if (session.metadata?.type === 'project_credit') {
          await handleProjectPurchase(session, supabase)
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
        break
    }
  } catch (err) {
    console.error(`[webhook] Error processing event ${event.type}:`, err)
  }

  return NextResponse.json({ received: true })
}
