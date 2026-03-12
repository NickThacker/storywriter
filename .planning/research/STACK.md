# Technology Stack

**Project:** StoryWriter v1.1 — Auth & Billing Rework
**Researched:** 2026-03-11
**Scope:** New capabilities only. Existing stack (Next.js 16, React 19, Supabase, Stripe SDK, Zustand, Zod, shadcn/ui) is validated and unchanged.

---

## What This Milestone Adds

Two distinct technical surfaces:

1. **Password reset page** — Supabase recovery flow interception
2. **Three-tier Stripe billing** — Project ($39 one-time), Author ($49/mo or $490/yr), Studio ($99/mo) with project-count enforcement and repeat-project discount

Neither surface requires new npm packages. Both are achievable by modifying existing files and adding a Supabase migration.

---

## No New Dependencies Required

| Capability | How | Why No New Package |
|-----------|-----|-------------------|
| Password reset page | `supabase.auth.updateUser()` already available via `@supabase/supabase-js ^2.98.0` | The server action `updatePassword` and the `/auth/reset-password` page already exist; the gap is a client-side session guard |
| Recovery session guard | `supabase.auth.getSession()` + `onAuthStateChange` on the client component | Already using `@supabase/supabase-js`; no additional auth library needed |
| Stripe one-time payment | `stripe.checkout.sessions.create({ mode: 'payment' })` in existing `stripe ^20.4.0` | Same pattern as `createCreditPackSession`; already in codebase |
| Stripe annual subscription price | New price object on existing product in Stripe; same code path | `priceId` is just a string env var; no SDK changes |
| Project-count enforcement | DB query against `projects` table counting active rows | Pure Supabase query; no new library |
| Repeat-project discount | Stripe Coupon object applied conditionally at checkout session creation | `stripe.coupons.create` + `discounts` array on session; already in `stripe` package |
| DB schema changes | Supabase migration SQL | Supabase already in use |

---

## Surface 1: Password Reset Flow

### Current State

The infrastructure already exists and is mostly correct:

- `resetPassword` server action calls `supabase.auth.resetPasswordForEmail` with `redirectTo: .../auth/confirm?next=/auth/reset-password` — CORRECT
- `/auth/confirm` route exchanges the PKCE code and redirects to `/auth/reset-password` when `type === 'recovery'` — CORRECT
- `updatePassword` server action calls `supabase.auth.updateUser({ password })` — CORRECT
- `/auth/reset-password/page.tsx` renders `<ResetPasswordForm>` which wires `updatePassword` — CORRECT in shape

### The Gap

`<ResetPasswordForm>` is a server-action form that calls `updatePassword` directly. The problem: `updatePassword` calls `supabase.auth.updateUser()`, which **requires an active authenticated session**. The PKCE exchange in `/auth/confirm` establishes that session server-side via cookie, but a client component rendering immediately after redirect may not have the session hydrated yet — particularly if the user arrives from an email client that strips cookies on redirect.

More critically: the form currently has **no guard**. If a user navigates to `/auth/reset-password` without going through the recovery flow, `updatePassword` will attempt to update the logged-in user's password (if any session exists) or silently fail.

### Required Fix

Add a client-side session check in `<ResetPasswordForm>`:

```typescript
// In reset-password-form.tsx (client component)
const supabase = createBrowserClient(...)
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  // Show "Link expired — request a new password reset" message
  // Do NOT render the form
}
```

This check uses the browser Supabase client, which reads the cookie set by `/auth/confirm`. If the session is missing, the recovery link has expired or was not followed — show a graceful error with a link back to `/login`.

**The server action `updatePassword` does not need to change.** It already calls `supabase.auth.getUser()` to verify the session before calling `updateUser`.

### Integration Point

- File to modify: `src/components/auth/reset-password-form.tsx`
- Convert from pure server-action form to a client component that gates on session state
- Add `createBrowserClient` from `@supabase/ssr` (already installed at `^0.8.0`)
- No new packages

### Supabase Recovery Event (optional, not required)

`onAuthStateChange` emits a `PASSWORD_RECOVERY` event when a recovery link is clicked. This is an SPA pattern. The app uses SSR with cookie-based sessions, so the PKCE exchange in `/auth/confirm` is the canonical interception point — already implemented correctly. The `PASSWORD_RECOVERY` event is not needed here.

**Confidence: HIGH** — the existing confirm route, server action, and page structure are correct. The only gap is the missing session guard in the form component.

---

## Surface 2: Three-Tier Stripe Billing

### Architecture Decision: Project-Count vs Token-Count

The new model tracks **project count** (active non-expired projects) instead of token budget. The existing token infrastructure (`token_budget_total`, `token_budget_remaining`, `credit_pack_tokens`, `deductTokens`, `checkTokenBudget`) becomes **vestigial** — do not delete it (it may be referenced in existing routes), but the new enforcement path bypasses it entirely.

New enforcement function: `checkProjectAllowance(userId)` → `{ allowed: boolean, reason?: string }`

This function queries the `projects` table, counts rows where `user_id = userId` AND `status != 'complete'` (or whatever the active-project definition is), compares to the user's tier limit, and returns allowed/denied.

### New Tier Structure

| Tier | Type | Price | Project Limit | Stripe Mode |
|------|------|-------|--------------|-------------|
| `project` | One-time per purchase | $39 | +1 active project per purchase | `mode: 'payment'` |
| `author_monthly` | Subscription | $49/mo | Unlimited concurrent projects | `mode: 'subscription'` |
| `author_yearly` | Subscription | $490/yr | Unlimited concurrent projects | `mode: 'subscription'` |
| `studio` | Subscription | $99/mo | Unlimited concurrent projects + team features (future) | `mode: 'subscription'` |

**Repeat project discount:** $25 (not $39) for a Project purchase after the user's first. Implemented via a Stripe Coupon applied conditionally at checkout session creation when `purchaseCount > 0`.

### SubscriptionTier Enum Changes

The current `SubscriptionTier` type in `src/types/database.ts` is:
```typescript
'none' | 'hosted' | 'starter' | 'writer' | 'pro'
```

Replace with:
```typescript
'none' | 'project' | 'author_monthly' | 'author_yearly' | 'studio'
```

Update the check constraint in the new migration accordingly.

**Note:** `'hosted'` was a legacy BYOK bypass tier. BYOK detection now uses `openrouter_api_key IS NOT NULL` (already how `checkTokenBudget` works). Drop `'hosted'` from the enum.

### New DB Columns Required (Migration 00013)

```sql
-- Replace old tier values in the check constraint
-- Add project_purchase_count to track repeat buyers for discount logic
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS project_purchase_count integer NOT NULL DEFAULT 0;

-- New tier check constraint
ALTER TABLE user_settings
  DROP CONSTRAINT IF EXISTS user_settings_subscription_tier_check;
ALTER TABLE user_settings
  ADD CONSTRAINT user_settings_subscription_tier_check
    CHECK (subscription_tier IN ('none', 'project', 'author_monthly', 'author_yearly', 'studio'));
```

No new tables needed. The existing `stripe_webhook_events` idempotency table remains unchanged.

### Stripe Products to Create via CLI

Five Stripe objects are needed:

```bash
# 1. Project — one-time, $39
stripe products create --name="StoryWriter Project"
stripe prices create \
  --product=<product_id> \
  --unit-amount=3900 \
  --currency=usd

# 2. Repeat Project Discount Coupon — $14 off (brings $39 → $25)
stripe coupons create \
  --amount-off=1400 \
  --currency=usd \
  --duration=once \
  --name="Returning Writer Discount"

# 3. Author — monthly subscription, $49/mo
stripe products create --name="StoryWriter Author"
stripe prices create \
  --product=<product_id> \
  --unit-amount=4900 \
  --currency=usd \
  --recurring[interval]=month

# 4. Author — annual subscription, $490/yr
stripe prices create \
  --product=<author_product_id> \
  --unit-amount=49000 \
  --currency=usd \
  --recurring[interval]=year

# 5. Studio — monthly subscription, $99/mo
stripe products create --name="StoryWriter Studio"
stripe prices create \
  --product=<product_id> \
  --unit-amount=9900 \
  --currency=usd \
  --recurring[interval]=month
```

The coupon ID goes into a new env var `STRIPE_COUPON_REPEAT_PROJECT`.

### Env Vars to Add

```bash
# Stripe price IDs (replace placeholders with output from CLI commands above)
STRIPE_PRICE_PROJECT=price_xxx
STRIPE_PRICE_AUTHOR_MONTHLY=price_xxx
STRIPE_PRICE_AUTHOR_YEARLY=price_xxx
STRIPE_PRICE_STUDIO=price_xxx
STRIPE_COUPON_REPEAT_PROJECT=cpon_xxx
```

Remove the old unused vars: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_WRITER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PACK_*`.

### Files to Replace / Rewrite

| File | Change |
|------|--------|
| `src/lib/stripe/tiers.ts` | Replace `TIERS` and `CREDIT_PACKS` exports with new tier config; add `REPEAT_PROJECT_COUPON_ID` |
| `src/lib/billing/budget-check.ts` | Add `checkProjectAllowance(userId)` function; keep existing functions for backward compat |
| `src/types/billing.ts` | Update `TierConfig` interface (remove `monthlyTokens`, add `projectsAllowed: number \| 'unlimited'`); remove `CreditPackConfig` |
| `src/types/database.ts` | Update `SubscriptionTier` union type |
| `src/actions/billing.ts` | Add `createProjectCheckoutSession(hasExistingProjects: boolean)` which applies coupon conditionally; update `createCheckoutSession` to handle new tier IDs |
| `src/app/api/webhooks/stripe/route.ts` | Update `handleSubscriptionCheckout` and `handleCreditPackPurchase` handlers — the `checkout.session.completed` handler for `mode: 'payment'` becomes the project-purchase handler (increment `project_purchase_count`, set `subscription_tier = 'project'` if not already subscribed); remove credit-pack logic |

### Webhook Logic for Project Purchase

```
checkout.session.completed (mode=payment, metadata.type='project_purchase'):
  1. increment user_settings.project_purchase_count
  2. if subscription_tier is 'none': set subscription_tier = 'project'
     (if already 'author_*' or 'studio': no tier change — they already have access)
  3. No token budget changes
```

For subscription tiers (`author_monthly`, `author_yearly`, `studio`), the existing `handleSubscriptionCheckout` pattern is reused but must set the new tier IDs and must NOT set `token_budget_*` columns (they are irrelevant in the new model — set them to 0).

### Project-Count Enforcement Integration

The new `checkProjectAllowance` function replaces `checkTokenBudget` as the gate in all 7 generation routes. The call signature and return shape should mirror `checkTokenBudget` for minimal diff:

```typescript
// src/lib/billing/project-check.ts  (new file, keeps budget-check.ts intact)
export async function checkProjectAllowance(userId: string): Promise<AllowanceCheckResult>

interface AllowanceCheckResult {
  allowed: boolean
  isByok: boolean
  reason?: 'no_subscription' | 'project_limit_reached'
}
```

Project limit by tier:
- `none`: 0 concurrent active projects
- `project`: 1 concurrent active project per purchase (tracked by `project_purchase_count` vs active project count)
- `author_monthly` / `author_yearly` / `studio`: unlimited
- BYOK (`openrouter_api_key` present): unlimited (unchanged behavior)

**Note on "Project" tier complexity:** A user who buys 3 Project licenses (total) can have up to 3 active projects at once. Track this as: `project_purchase_count - completed_project_count >= active_project_count`. Completed projects always remain readable (generation locked).

**Confidence: HIGH** — Stripe Checkout `mode: 'payment'` with `metadata` is the same pattern already in `createCreditPackSession`. The coupon conditional application (`discounts: [{ coupon: couponId }]`) is supported in Stripe SDK v20 and documented officially.

---

## Current Package Versions (Confirmed from package.json)

| Package | Installed Version | New Capability |
|---------|------------------|---------------|
| `stripe` | `^20.4.0` | One-time payment sessions, coupon application — no upgrade needed |
| `@supabase/supabase-js` | `^2.98.0` | `updateUser`, `getSession`, `onAuthStateChange` — no upgrade needed |
| `@supabase/ssr` | `^0.8.0` | `createBrowserClient` for session check in client component — already installed |
| `zod` | `^4.3.6` | Schema validation for new billing types — already installed |

**No new packages to install.**

---

## What NOT to Add

| Avoid | Why |
|-------|-----|
| `stripe-js` (frontend Stripe.js) | Not needed — using Stripe Checkout redirect, not Elements embedded in the page |
| Any auth library upgrade | `@supabase/supabase-js ^2.98.0` handles all recovery flow needs |
| Separate billing microservice | All billing logic stays in Next.js route handlers and server actions; complexity is not justified |
| Webhook retry queue (Redis, SQS) | The existing `stripe_webhook_events` idempotency table + Stripe's built-in 3-day retry is sufficient for this scale |
| Token metering after this migration | The project-count model replaces token enforcement entirely; remove token gates from generation routes |

---

## Migration Checklist

1. Run Stripe CLI commands to create products/prices/coupon (dev env first, then prod)
2. Copy price IDs + coupon ID into `.env.local` (dev) and Vercel env vars (prod)
3. Apply DB migration `00013_billing_rework.sql` in Supabase SQL Editor
4. Update `src/lib/stripe/tiers.ts` — new tier config
5. Add `src/lib/billing/project-check.ts` — new allowance check
6. Update `src/types/billing.ts` and `src/types/database.ts`
7. Update `src/actions/billing.ts` — new checkout session creator
8. Update `src/app/api/webhooks/stripe/route.ts` — new event handlers
9. Update all 7 generation routes to call `checkProjectAllowance` instead of `checkTokenBudget`
10. Fix `src/components/auth/reset-password-form.tsx` — add session guard

---

## Sources

- Supabase auth recovery docs: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail — PKCE recovery flow confirmed; `exchangeCodeForSession` + `updateUser` pattern verified
- Supabase PKCE flow guide: https://supabase.com/docs/guides/auth/sessions/pkce-flow — code exchange sets session cookie; confirmed pattern used in `/auth/confirm` route
- Stripe Checkout sessions (one-time): https://docs.stripe.com/api/checkout/sessions/create — `mode: 'payment'` with `metadata` confirmed; `customer` param accepted
- Stripe add discounts: https://docs.stripe.com/payments/checkout/discounts — `discounts: [{ coupon: id }]` array confirmed for Checkout Sessions
- Stripe manage prices: https://docs.stripe.com/products-prices/manage-prices — CLI price creation syntax confirmed
- Stripe coupons: https://stripe.com/docs/api/coupons — `amount_off`, `duration: 'once'` confirmed
- Supabase password-based auth UI docs: https://supabase.com/ui/docs/nextjs/password-based-auth — Next.js App Router SSR pattern with cookie-based session confirmed

---
*Stack research for: StoryWriter v1.1 — Auth & Billing Rework*
*Researched: 2026-03-11*
*Confidence: HIGH (all capabilities verified against official Stripe and Supabase docs; no speculative library choices)*
