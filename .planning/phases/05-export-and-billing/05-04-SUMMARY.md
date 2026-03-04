---
phase: 05-export-and-billing
plan: 04
subsystem: billing
tags: [stripe, billing, webhooks, server-actions, checkout, subscriptions, credit-packs]

# Dependency graph
requires:
  - phase: 05-01
    provides: src/lib/stripe/client.ts, src/types/billing.ts, src/types/database.ts billing fields
provides:
  - src/lib/stripe/tiers.ts (TIERS, CREDIT_PACKS, lookup helpers)
  - src/actions/billing.ts (createCheckoutSession, createCreditPackSession, createPortalSession, getBillingStatus)
  - src/app/api/webhooks/stripe/route.ts (POST handler)
affects: [05-05, 05-06, 05-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Null-safe Stripe check: if (!stripe) return { error: 'Stripe not configured' } before all API calls"
    - "Service-role Supabase client in webhook handler (createClient from @supabase/supabase-js directly with SUPABASE_SERVICE_ROLE_KEY)"
    - "Raw body pattern: req.text() NOT req.json() in webhook to preserve body for signature verification"
    - "Idempotency: insert event_id into stripe_webhook_events BEFORE processing; duplicate events return 200 immediately"
    - "BYOK gate in getBillingStatus: openrouter_api_key set → isByok=true, zero budgets"

key-files:
  created:
    - src/lib/stripe/tiers.ts
    - src/actions/billing.ts
    - src/app/api/webhooks/stripe/route.ts
  modified: []

key-decisions:
  - "Stripe 2026-02-25.clover API removes current_period_end from Subscription — billing_period_end left null on checkout, set via invoice.paid event"
  - "Stripe 2026-02-25.clover API moves subscription reference on Invoice to invoice.parent.subscription_details.subscription"
  - "On subscription downgrade, token_budget_remaining is clamped to new tier's monthlyTokens (Math.min) — prevents over-spend"
  - "handleInvoicePaid looks up user by stripe_subscription_id (not userId) since invoice has no userId metadata"
  - "Webhook always returns 200 after inserting idempotency record — prevents Stripe retries on application errors"

# Metrics
duration: ~4min
completed: 2026-03-04
---

# Phase 05 Plan 04: Stripe Billing Pipeline Summary

**Checkout sessions, Stripe webhook handler, subscription management, and credit pack purchases — uses Stripe 2026-02-25.clover API adapted for removed current_period_end and restructured Invoice parent field**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-04T06:06:34Z
- **Completed:** 2026-03-04T06:10:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `src/lib/stripe/tiers.ts` with TIERS (3 subscription tiers) and CREDIT_PACKS (5 packs), all using env-var price IDs with placeholder fallbacks. Added getTierByStripePriceId, getCreditPackByStripePriceId, getTierById helpers.
- Created `src/actions/billing.ts` with four server actions:
  - `createCheckoutSession`: subscription checkout with get-or-create Stripe customer
  - `createCreditPackSession`: one-time payment checkout for credit packs
  - `createPortalSession`: opens Stripe Billing Portal for subscription management
  - `getBillingStatus`: returns full BillingStatus; BYOK users get isByok=true and zero budgets
- Created `src/app/api/webhooks/stripe/route.ts`:
  - Reads raw body with `req.text()` (not `req.json()`) for signature verification
  - Checks `stripe_webhook_events` for idempotency before processing
  - Handles `checkout.session.completed` (subscription + credit_pack modes)
  - Handles `customer.subscription.updated`, `customer.subscription.deleted`
  - Handles `invoice.paid` — resets `token_budget_remaining` to `token_budget_total` each period
  - Uses Supabase service-role admin client (bypasses RLS for webhook DB writes)
  - Always returns 200 to prevent Stripe retry storms

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tier configuration and billing server actions** - `b2426ba` (feat)
2. **Task 2: Create Stripe webhook handler** - `901a50c` (feat)

## Files Created/Modified

- `src/lib/stripe/tiers.ts` - TIERS, CREDIT_PACKS, lookup helpers
- `src/actions/billing.ts` - createCheckoutSession, createCreditPackSession, createPortalSession, getBillingStatus
- `src/app/api/webhooks/stripe/route.ts` - Stripe webhook POST handler with idempotency

## Decisions Made

- Stripe `2026-02-25.clover` API removed `current_period_end` from `Subscription` — `billing_period_end` is left null on initial checkout and set when `invoice.paid` fires (which carries `period_end` on the Invoice object)
- Stripe `2026-02-25.clover` moved Invoice subscription reference: `invoice.subscription` is gone, now at `invoice.parent.subscription_details.subscription`
- On subscription tier downgrade, `token_budget_remaining` is clamped via `Math.min(existing, newTierLimit)` so users don't lose tokens they've already been granted but also can't exceed the new tier's limit
- `handleInvoicePaid` and `handleSubscriptionDeleted` look up users via `stripe_subscription_id` column (not userId metadata) because invoices carry no userId

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stripe 2026-02-25.clover API — Subscription.current_period_end removed**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Plan's webhook handler referenced `subscription.current_period_end` which no longer exists in `stripe@20.4.0` type definitions for the 2026 API version
- **Fix:** Removed `current_period_end` references from `handleSubscriptionCheckout` and `handleSubscriptionUpdate`. `billing_period_end` is now set exclusively by `handleInvoicePaid` (which has `invoice.period_end`). On initial checkout, `billing_period_end` is set to null and filled in when the first invoice arrives.
- **Files modified:** `src/app/api/webhooks/stripe/route.ts`
- **Committed in:** `901a50c` (Task 2 commit)

**2. [Rule 1 - Bug] Stripe 2026-02-25.clover API — Invoice.subscription field removed**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `invoice.subscription` no longer exists on `Stripe.Invoice` in the 2026 API. TypeScript error: `Property 'subscription' does not exist on type 'Invoice'`
- **Fix:** Updated `handleInvoicePaid` to use `invoice.parent?.subscription_details?.subscription` — the new path per the 2026 API's Invoice.Parent nested structure
- **Files modified:** `src/app/api/webhooks/stripe/route.ts`
- **Committed in:** `901a50c` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (Rule 1 — Stripe API version compatibility)
**Impact on plan:** Functionally equivalent — all subscription lifecycle events handled correctly. The API shape for reading subscription period end changed but all business logic is preserved.

## Issues Encountered

Two TypeScript errors caused by Stripe API version `2026-02-25.clover` removing/restructuring fields that the plan assumed would still exist (written for an older API version). Both resolved automatically per Rule 1 (bug fix) — same pattern as the Plan 01 `apiVersion` fix.

## User Setup Required

Stripe must be fully configured before this billing pipeline can be tested end-to-end:

1. **Create Stripe products** (Stripe Dashboard > Product catalog):
   - Starter subscription: $9/mo
   - Writer subscription: $19/mo
   - Pro subscription: $39/mo
   - Credit packs: 250K ($4), 500K ($6), 1M ($8), 2M ($18), 5M ($30)

2. **Set environment variables** in `.env.local`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_WRITER`, `STRIPE_PRICE_PRO`
   - `STRIPE_PRICE_PACK_250K`, `STRIPE_PRICE_PACK_500K`, `STRIPE_PRICE_PACK_1M`, `STRIPE_PRICE_PACK_2M`, `STRIPE_PRICE_PACK_5M`

3. **Create webhook endpoint** (Stripe Dashboard > Developers > Webhooks):
   - Endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`

## Next Phase Readiness

- Billing actions available at `@/actions/billing` for all UI components
- Tier config available at `@/lib/stripe/tiers` for pricing display components
- Webhook handler live at `/api/webhooks/stripe` once deployed and Stripe endpoint configured
- TypeScript compiles cleanly with zero errors

## Self-Check: PASSED

All 3 output files verified present on disk. Both task commits (b2426ba, 901a50c) verified in git log.

---
*Phase: 05-export-and-billing*
*Completed: 2026-03-04*
