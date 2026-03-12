# Feature Landscape

**Domain:** Password reset flow fix + three-tier Stripe billing rework (v1.1 milestone)
**Researched:** 2026-03-11
**Confidence:** HIGH — Auth flow verified against live codebase; Stripe patterns verified against official docs.

---

## Context: What Already Exists

This is a subsequent milestone. The following are **already built and must be preserved**:

| Existing Component | Location | Status |
|-------------------|----------|--------|
| `/auth/confirm` route handler | `src/app/(auth)/auth/confirm/route.ts` | Working — handles PKCE code exchange and OTP token_hash forward |
| `/auth/verify` client page | `src/app/(auth)/auth/verify/page.tsx` | Working — runs `verifyOtp` in browser to defeat link scanners, routes `recovery` type to `/auth/reset-password` |
| `/auth/reset-password` page | `src/app/(auth)/auth/reset-password/page.tsx` | Page exists, renders `ResetPasswordForm` |
| `ResetPasswordForm` component | `src/components/auth/reset-password-form.tsx` | Form exists — new/confirm password fields, calls `updatePassword` server action |
| `updatePassword` server action | `src/actions/auth.ts` | Logic exists — calls `supabase.auth.updateUser`, but **missing session guard** |
| `resetPassword` server action | `src/actions/auth.ts` | Working — sends recovery email with `redirectTo` pointing to `/auth/confirm?next=/auth/reset-password` |
| Stripe webhook handler | `src/app/api/webhooks/stripe/route.ts` | Working — handles subscription + credit-pack events; uses token-budget model |
| Stripe tiers config | `src/lib/stripe/tiers.ts` | Exists — currently: Starter/Writer/Pro token-based tiers + credit packs |
| `user_settings` billing columns | migration `00005` | `token_budget_total`, `token_budget_remaining`, `credit_pack_tokens`, `billing_period_end` |
| Settings page | `src/app/(dashboard)/settings/page.tsx` | Exists — needs billing section update |

---

## Table Stakes

Features that must work correctly for the milestone to ship. Missing any = broken product.

| Feature | Why Required | Complexity | Dependency on Existing |
|---------|-------------|------------|----------------------|
| Recovery link lands on password form with active session | Without session, `updateUser` call returns 401 and password cannot be changed — the core bug | LOW | `auth/confirm` route already exchanges the code; problem is the reset-password page does not verify a session exists before rendering the form |
| Session guard on `/auth/reset-password` | Redirect to login with error if no auth session — prevents dangling form with no ability to save | LOW | Reads `supabase.auth.getUser()` server-side; already done in `updatePassword` action but needs to also guard the page render |
| "Forgot password" link visible on login page | Users cannot initiate reset if entry point is missing or broken | LOW | `auth-form.tsx` — needs to verify this link exists and points to a reset request page |
| Password confirmation field mismatch error | Standard form UX — both fields must match before submitting | LOW | `updatePasswordSchema` in `src/lib/validations/auth.ts` already validates this |
| Success redirect to dashboard after reset | Flow must complete cleanly — no stuck page | LOW | `updatePassword` action already calls `redirect('/dashboard')` on success |
| Three Stripe products created via CLI | No product IDs = no checkout sessions can be created | LOW | Replaces existing Starter/Writer/Pro token-tier product IDs with new Project/Author/Studio ones |
| `checkout.session.completed` webhook handles Project (one-time, `mode: 'payment'`) | Webhook currently only branches on `mode: 'subscription'` or `metadata.type === 'credit_pack'` — Project purchase has no handler | MEDIUM | Modify `route.ts` webhook handler; new branch for one-time project purchase |
| `checkout.session.completed` webhook handles Author/Studio (subscriptions) | Existing subscription branch must update to new tier IDs | LOW | Update `tiers.ts` with new price IDs and tier names; webhook logic structure stays the same |
| Project-count enforcement replaces token-budget enforcement | Generation gates must check active project count, not token budget | MEDIUM | All 7 generation routes use `checkBudget` utility — must be replaced with `checkProjectAccess` utility; `user_settings` schema needs `projects_purchased` counter or check against projects table |
| Completed projects remain readable after subscription expires | "Completed" status = read-only access regardless of subscription state | MEDIUM | Projects table has status field; generation routes need to check `project.status !== 'completed'` before enforcing tier gate |
| Generation locked on non-purchased projects when subscription inactive | Active subscription (Author/Studio) OR a paid Project record required to generate | MEDIUM | New enforcement logic; must distinguish "project paid one-time" vs "subscriber can generate on any project up to limit" |

---

## Differentiators

Features that go beyond baseline and create user value within this milestone scope.

| Feature | Value Proposition | Complexity | Dependency |
|---------|-------------------|------------|------------|
| Annual Author option ($490/yr) saves ~17% | Reduces churn; common SaaS conversion lever | LOW | One additional price on the Author product in Stripe; `tiers.ts` adds `author_annual` entry; UI pricing page shows both with "Save 17%" badge |
| $25 repeat project discount via Stripe coupon | Rewards returning buyers; nudges toward Author upgrade | MEDIUM | Stripe coupon (`amount_off: 2500`, `max_redemptions: null`); server must check if user has prior Project purchase before surfacing checkout; apply coupon programmatically on checkout session creation — do NOT use user-input promo codes (avoids abuse) |
| Self-serve subscription portal (Stripe Customer Portal) | Users can cancel/upgrade without emailing support | LOW | Stripe Customer Portal pre-built UI; backend needs one route to create a portal session; `stripe_customer_id` already stored in `user_settings` |
| Clear pricing page with plan comparison | Reduces friction; users need to understand Project vs Author vs Studio | LOW | Static marketing/pricing page; not gated |

---

## Anti-Features

Features that seem sensible but should be explicitly deferred or rejected for this milestone.

| Anti-Feature | Why It Looks Attractive | Why Not | Alternative |
|-------------|------------------------|---------|-------------|
| User-entered promo/coupon codes at checkout | Flexible discounting | Opens discount abuse; requires customer-facing code management; enables code sharing | Apply repeat-buyer discount programmatically on the server before creating the checkout session |
| Token-budget soft warnings / near-limit emails | "Nice to have" billing UX | Token model is being removed; these components become dead code | Remove token UI from settings/usage pages; replace with project-count display |
| Trial periods | Lower barrier to entry | Complex lifecycle: trial → convert → cancel → re-trial edge cases; Stripe trial webhooks add webhook surface area | Project tier at $39 one-time is already a low-commitment entry point; no free trial needed |
| Prorations on upgrade from Author monthly to Author annual | Feels like fair billing | Proration on interval switch requires Stripe `proration_behavior` handling, partial credits, and period reset logic | Set subscription to cancel at period end and create a new annual subscription on renewal; cleaner state |
| Multiple active subscriptions | Studio + credit packs simultaneously | `user_settings` assumes one active subscription ID; multiple subscriptions require table restructure | Studio tier is the top tier; credit packs are modeled as one-time purchases in `payment` mode, not subscriptions |
| Webhook retries with exponential backoff | Stripe retries on non-200 | Stripe already handles retries; adding app-level retry logic introduces double-processing risk | Idempotency table (`stripe_webhook_events`) already built — use it; always return 200 |

---

## Feature Dependencies

```
Password Reset Feature
  └──requires──> /auth/confirm route (already built — no changes needed)
  └──requires──> /auth/verify client page (already built — no changes needed)
  └──requires──> Session guard on /auth/reset-password page (NEW — server component check)
  └──requires──> updatePassword action (already built — no changes needed)
  └──requires──> "Forgot password" link on login (verify exists in auth-form.tsx)

Three-Tier Stripe Billing
  └──requires──> Stripe products/prices created via CLI (NEW — prerequisite, blocks everything else)
  └──requires──> tiers.ts updated with new tier IDs + price IDs (NEW — replaces Starter/Writer/Pro)
  └──requires──> DB schema migration for project-count model (NEW — migration 00013)
  └──requires──> Webhook handler: one-time Project purchase branch (NEW — modify webhook route.ts)
  └──requires──> Webhook handler: subscription branches updated to new tier names (MODIFY)
  └──requires──> checkProjectAccess utility (NEW — replaces checkBudget)
  └──requires──> Project-count enforcement wired into all 7 generation routes (MODIFY)
  └──requires──> Completed project read-only gate (NEW — check status before enforcement)

Repeat Purchase Discount
  └──requires──> Three-Tier Billing (Stripe products must exist)
  └──requires──> Prior-purchase check (query projects table or purchase_history for user)
  └──requires──> Checkout session creation applies coupon programmatically (server-side)

Annual Author Option
  └──requires──> Three-Tier Billing (Author product must exist first)
  └──requires──> Second price on Author product (annual interval, $490)
  └──requires──> UI to present both monthly and annual at checkout

Stripe Customer Portal
  └──requires──> stripe_customer_id stored (already stored in user_settings)
  └──requires──> POST /api/billing/portal-session route (NEW)
  └──requires──> Link in settings page (MODIFY)
```

---

## MVP for This Milestone

### Ship With

1. **Password reset page session guard** — actual bug fix; without it the reset flow silently fails for users in certain browser states
2. **Stripe products/prices via CLI** — prerequisite for all billing work; must be done first
3. **tiers.ts rework to Project/Author/Studio** — replaces token-tier configuration
4. **DB migration 00013** — adds `projects_purchased` counter (or equivalent project-count tracking) to `user_settings`; updates subscription tier check constraint
5. **Webhook handler: one-time Project purchase** — new branch in existing webhook handler
6. **`checkProjectAccess` utility** — replaces `checkBudget`; wired into all generation routes
7. **Completed project read-only access** — projects with `status = 'completed'` remain readable regardless of subscription state
8. **Stripe Customer Portal route** — one endpoint, minimal code; high user value

### Defer to v1.2

- Annual Author option — valid differentiator but adds Stripe price + UI complexity; not a bug fix
- Repeat project discount — business logic complexity (detecting prior purchase, programmatic coupon application); not blocking launch
- Pricing/marketing page — useful but not required for the billing system to function

---

## Technical Notes by Feature

### Password Reset: What Is Actually Broken

The infrastructure is complete. The session guard is the only gap:
- `auth/confirm` exchanges the code for a session correctly
- `auth/verify` calls `verifyOtp` and routes `recovery` type to `/auth/reset-password`
- The reset-password **page** renders the form without verifying the session exists server-side
- `updatePassword` checks `getUser()` inside the server action, but by the time it fails, the user has already seen a form they cannot submit successfully
- Fix: `ResetPasswordPage` should be a server component that calls `getUser()`, and redirects to `/login?error=session_expired` if no user

### Stripe: One-Time vs Subscription Webhook Events

The existing webhook handler handles two checkout modes: `subscription` and one-time (detected by `metadata.type === 'credit_pack'`). The new Project tier is also a one-time purchase but uses a different fulfillment path:

- **Credit pack** (existing): adds tokens to `credit_pack_tokens` counter
- **Project purchase** (new): increments `projects_purchased` counter (or creates a `project_purchases` row); grants the user one additional project generation slot
- Detection: use `metadata.type === 'project_purchase'` on the checkout session; keep `credit_pack` path for backward compatibility

### Stripe: Project-Count Enforcement Model

Replace the token-budget check with:

```
User can generate IF:
  (subscription is 'author' or 'studio' AND subscription is active)
  OR
  (project was individually purchased — project has a paid record)
```

The simplest implementation: add `purchased_project_ids uuid[]` to `user_settings` or create a separate `project_purchases` table. Generation routes check: "is this project's ID in the user's purchased list, OR does the user have an active Author/Studio subscription?"

### Stripe: Annual vs Monthly Same Product

One Stripe Product for Author; two Prices on that product:
- `price_author_monthly`: `recurring.interval = 'month'`, `unit_amount = 4900`
- `price_author_annual`: `recurring.interval = 'year'`, `unit_amount = 49000`

Both map to `subscription_tier = 'author'` in `tiers.ts`. Webhook logic is unchanged — it only reads the tier mapping, not the interval.

### Stripe: Repeat Purchase Discount

Server-side flow:
1. User initiates "Buy another project" checkout
2. Server checks: does this user have any prior project purchase records?
3. If yes, create checkout session with `discounts: [{ coupon: 'repeat_buyer_coupon_id' }]`
4. Coupon created once via CLI: `stripe coupons create --amount-off=2500 --currency=usd --duration=once`
5. Never expose coupon code to user — applied programmatically only

---

## Sources

- [Supabase Password-based Auth Docs](https://supabase.com/docs/guides/auth/passwords) — HIGH confidence; official
- [Supabase Auth PKCE Flow Docs](https://supabase.com/docs/guides/auth/sessions/pkce-flow) — HIGH confidence; official
- [Supabase `resetPasswordForEmail` JS Reference](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) — HIGH confidence; official
- [Supabase Password-based Auth UI Docs (Next.js)](https://supabase.com/ui/docs/nextjs/password-based-auth) — HIGH confidence; official
- [Stripe How Products and Prices Work](https://docs.stripe.com/products-prices/how-products-and-prices-work) — HIGH confidence; official
- [Stripe Build a Subscriptions Integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions) — HIGH confidence; official
- [Stripe Coupons and Promotion Codes](https://docs.stripe.com/billing/subscriptions/coupons) — HIGH confidence; official
- [Stripe Add Discounts for One-Time Payments](https://docs.stripe.com/payments/checkout/discounts) — HIGH confidence; official
- [Stripe Customer Portal Docs](https://docs.stripe.com/customer-management) — HIGH confidence; official
- [Stripe Using Webhooks with Subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks) — HIGH confidence; official
- [Stripe Prorations Docs](https://docs.stripe.com/billing/subscriptions/prorations) — HIGH confidence; official
- [Stripe Checkout Session API Reference](https://docs.stripe.com/api/checkout/sessions/create) — HIGH confidence; official
- Codebase review: `src/app/(auth)/`, `src/actions/auth.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/lib/stripe/tiers.ts` — HIGH confidence; primary source

---

*Feature research for: StoryWriter v1.1 — Password Reset + Three-Tier Billing*
*Researched: 2026-03-11*
