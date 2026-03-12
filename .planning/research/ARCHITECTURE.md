# Architecture Patterns

**Domain:** StoryWriter v1.1 — Password Reset + Three-Tier Billing Integration
**Researched:** 2026-03-11
**Confidence:** HIGH — all findings drawn from direct codebase inspection, not from external research

---

## Context: What Already Exists

This is a subsequent-milestone document. The v1.0 stack is fully built and running:

- **Auth flow:** Supabase Auth with PKCE. `/auth/confirm` route handler exchanges auth codes for sessions. `/auth/verify` client page verifies OTP token hashes. `/auth/reset-password` page + `ResetPasswordForm` component + `updatePassword` server action already exist.
- **Middleware:** `src/lib/supabase/middleware.ts` — `updateSession()` runs on every request. `PUBLIC_PATHS` array gates unauthenticated access. Recovery flow already forwarded: root `?code=` param is redirected to `/auth/confirm?next=/auth/reset-password`.
- **Billing layer (token model):** `src/lib/billing/budget-check.ts` — `checkTokenBudget()` / `deductTokens()` / `recordTokenUsage()`. Called in 5 generate routes. `src/lib/stripe/tiers.ts` — three Stripe tiers (starter/writer/pro) with `monthlyTokens`. Webhook handler at `/api/webhooks/stripe` handles subscription + credit-pack purchase + subscription update + invoice.paid.
- **UI:** `BillingSection` component renders tier cards (no-subscription state) or usage bar + credit packs (subscribed state). All checkout/portal flows go through server actions in `src/actions/billing.ts`.

---

## Feature 1: Password Reset Page

### Current State

The password reset flow is **already architecturally complete**. The existing code correctly implements the full Supabase PKCE recovery flow:

```
User clicks "Forgot password" → resetPassword() server action
    → supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/confirm?next=/auth/reset-password`
      })
    → Supabase sends email with recovery link

User clicks email link → lands on /auth/confirm?code=...&type=recovery
    → /auth/confirm route handler
    → supabase.auth.exchangeCodeForSession(code)  ← establishes session
    → detects type=recovery OR next=/auth/reset-password
    → redirects to /auth/reset-password  ← user is now authenticated

/auth/reset-password page renders ResetPasswordForm
    → updatePassword() server action
    → supabase.auth.getUser()  ← verifies session is active
    → supabase.auth.updateUser({ password })
    → redirect('/dashboard')
```

**The interception is already in place.** The middleware's root-URL handler forwards `?code=` params to `/auth/confirm` with `next=/auth/reset-password`. The `/auth/confirm` route handler's recovery detection on line 20 (`isRecovery = type === 'recovery' || next === '/auth/reset-password'`) catches both the PKCE code flow and the OTP token_hash flow.

### What Is Missing

The `ResetPasswordForm` component at `/src/components/auth/reset-password-form.tsx` exists and is wired to `updatePassword`. The page file at `src/app/(auth)/auth/reset-password/page.tsx` exists. The `updatePassword` server action exists in `src/actions/auth.ts`.

The gap is not architectural — it is that the form may need **session state verification on mount** (confirming the user landed here via a valid recovery session, not directly navigated). Currently `updatePassword` calls `supabase.auth.getUser()` server-side to verify the session, which is the correct approach. If the user navigates to `/auth/reset-password` without a valid recovery session, `getUser()` will return no user and the action returns an error. That error is surfaced in the form.

No new routes, components, or middleware changes are needed for password reset. The work is validation and testing the full flow end-to-end.

### Component Boundary

| Component | File | Status | Action Needed |
|-----------|------|--------|---------------|
| Recovery email trigger | `src/actions/auth.ts` `resetPassword()` | Exists | Verify `redirectTo` URL matches Supabase config |
| Token exchange | `src/app/(auth)/auth/confirm/route.ts` | Exists | No changes |
| OTP verification | `src/app/(auth)/auth/verify/page.tsx` | Exists | No changes |
| Reset password page | `src/app/(auth)/auth/reset-password/page.tsx` | Exists | No changes |
| Reset password form | `src/components/auth/reset-password-form.tsx` | Exists | Consider adding session-expired state |
| Password update action | `src/actions/auth.ts` `updatePassword()` | Exists | No changes |
| Middleware public path | `src/lib/supabase/middleware.ts` `PUBLIC_PATHS` | Exists, correct | Confirm `/auth/reset-password` is in the array |

### One Gap to Watch

`/auth/reset-password` is in `PUBLIC_PATHS` (line 42 of middleware). This means unauthenticated users can reach the page. The page renders the form regardless of session state. The server action correctly blocks updates with no session. But the UX is broken if someone navigates there directly with no session — they fill in the form and get "You must be logged in" rather than a redirect to login. Consider checking for a valid session client-side on mount and redirecting to `/login?error=no_session` if none exists.

---

## Feature 2: Three-Tier Stripe Billing

### The Transition

The v1.0 model: subscription tiers grant monthly token budgets. `checkTokenBudget()` blocks generation when budget is exhausted.

The v1.1 model: three tiers (Project / Author / Studio) with **project-count limits** instead of token budgets. One-time purchase (Project tier at $39) + subscriptions (Author $49/mo or $490/yr, Studio $99/mo). Repeat project discount ($25 for non-subscribed users who have completed a project).

### New Stripe Product Structure

The existing `TIERS` array in `src/lib/stripe/tiers.ts` maps to subscription price IDs. It needs to become a mixed model:

```
Project tier:  Stripe one-time payment product, price ~$39
               Repeat purchase price: ~$25 (separate Stripe price ID)
Author tier:   Stripe subscription product, monthly price + annual price
Studio tier:   Stripe subscription product, monthly price only
```

This requires **two checkout modes** — `mode: 'payment'` for Project tier (one-time), `mode: 'subscription'` for Author and Studio. The existing `createCheckoutSession()` only handles subscriptions and `createCreditPackSession()` handles one-time. The Project tier checkout will need to use `createCreditPackSession()`-style logic (mode: payment) rather than subscription mode.

### Database Schema Changes (Migration 00013)

The `user_settings` table currently stores:
- `subscription_tier` — enum: none/hosted/starter/writer/pro
- `token_budget_total` / `token_budget_remaining` / `credit_pack_tokens`

The v1.1 model needs:
- New enum values: `project` / `author` / `studio` (replacing starter/writer/pro)
- Project-count tracking rather than token tracking
- `projects_purchased` — total one-time project slots bought (for Project tier users)
- `projects_used` — count of non-expired, non-free projects started against purchased slots

The token budget columns can remain for now (no destructive migration needed) — the new enforcement layer simply ignores them and checks project counts instead.

The `subscription_tier` check constraint in migration `00005` must be updated to add the new values. Update it to include all values: `none`, `hosted`, `starter`, `writer`, `pro`, `project`, `author`, `studio`.

### New Enforcement Layer: Project-Count Check

Replace `checkTokenBudget()` calls with a new `checkProjectAccess()` function. It needs to answer: "Can this user run generation on this project?"

```
Rules:
- BYOK users: always allowed (no change from v1.0)
- author/studio subscribers: unlimited projects, always allowed
- project tier (one-time): allowed if project was started within a purchased slot
  OR if this project was created before the check (i.e., already active)
- none tier: blocked — must purchase
```

The check must be **per-project**, not per-generation-call. Once a project is "unlocked" (created under an active purchased slot or subscription), all generation within it proceeds freely. The lock is on starting a new project, not on individual API calls.

**Where to call it:** The `createProject()` server action in `src/actions/projects.ts` is the correct enforcement gate — not the generation routes. If a project was created legitimately, generation should never be blocked mid-project.

The generation routes can retain the `checkTokenBudget()` calls for the hosted tier (users with `subscription_tier: 'hosted'`) as a compatibility path. For new tiers, the gate is at project creation.

### Component Boundaries: What Changes vs. What Stays

| Component | File | Change Type | What Changes |
|-----------|------|-------------|--------------|
| Tier definitions | `src/lib/stripe/tiers.ts` | Rewrite | Replace TIERS array with new three-tier structure; add `billingMode: 'one_time' | 'subscription'`; add `projectLimit` property |
| Tier types | `src/types/billing.ts` | Modify | Update `TierConfig` interface; rename `monthlyTokens` to `projectLimit` or add new field |
| Database types | `src/types/database.ts` | Modify | Extend `SubscriptionTier` union; add `projects_purchased`/`projects_used` to `UserSettingsRow` |
| Budget check | `src/lib/billing/budget-check.ts` | Add new export | Add `checkProjectAccess(userId, projectId)` alongside existing `checkTokenBudget`; existing function retained for `hosted` tier compatibility |
| Project creation | `src/actions/projects.ts` | Modify | Add project-count gate before insert |
| Billing actions | `src/actions/billing.ts` | Modify | Add `createProjectPurchaseSession()` for one-time Project tier; update `createCheckoutSession()` to handle both subscription and one-time modes |
| Webhook handler | `src/app/api/webhooks/stripe/route.ts` | Modify | Handle one-time checkout for Project tier (increment `projects_purchased`); keep subscription logic unchanged |
| Billing section UI | `src/components/billing/billing-section.tsx` | Rewrite | Show three-tier cards (Project one-time + Author/Studio subscriptions); show project count status for Project-tier users |
| Billing types | `src/types/billing.ts` | Modify | Update `BillingStatus` to include `projectsAllowed`, `projectsUsed` |
| Settings page | `src/app/(dashboard)/settings/page.tsx` | No change | `BillingSection` component handles display; page just passes `billingStatus` |
| Usage page | `src/app/(dashboard)/usage/page.tsx` | Modify | Replace token usage display with project count display for new-tier users; keep token display for `hosted` tier users |
| Migration | `supabase/migrations/00013_billing_v2.sql` | New file | Update tier constraint; add `projects_purchased`/`projects_used` columns |

### Pricing Page Placement

The current billing UI lives inside `/settings` under the "Billing" tab as `BillingSection`. This is acceptable for existing users managing subscriptions. For new users who have no subscription and are sent a pricing link, consider a **dedicated `/pricing` page** under the `(auth)` route group (public, no auth required) or `(dashboard)` (authenticated, personalized).

Recommendation: keep `/settings?tab=billing` as the primary checkout entry point for authenticated users. Add `/pricing` as a public marketing page that redirects to `/settings?tab=billing` on CTA click (or directly to Stripe checkout if user is already authenticated via the shared session).

`/pricing` should be added to `PUBLIC_PATHS` in middleware.

### Checkout Flow Data Flow

```
Project tier purchase (one-time):
User clicks "Buy Project" → createProjectPurchaseSession(priceId)
    → stripe.checkout.sessions.create({ mode: 'payment', metadata: { userId, type: 'project_purchase' } })
    → redirect to Stripe
    → on success → /settings?billing=success
    → Stripe fires checkout.session.completed
    → webhook handler: type === 'project_purchase'
    → supabase: increment user_settings.projects_purchased

Author/Studio subscription:
User clicks "Subscribe" → createCheckoutSession(priceId) [existing, mode: 'subscription']
    → existing subscription webhook path
    → sets subscription_tier to 'author' or 'studio'
    → unlimited project creation from that point

Repeat project discount:
At project creation, if user is on project tier AND has purchased projects remaining:
    decrement projects_purchased OR show "buy another at $25"
```

### Where the Repeat Discount Fits

The $25 repeat discount is a **second Stripe price ID** on the same Project one-time product. The `createProjectPurchaseSession()` action receives either the full-price ID ($39 first-time) or the discount price ID ($25 repeat). The caller (UI) determines which price to use based on whether the user has already completed at least one project.

The decision logic: `user_settings.projects_purchased > 0 AND projects_completed >= 1` → show $25 price. This is checked client-side in `BillingSection` and passed to the server action — the server action itself is price-ID agnostic (it does not enforce the discount eligibility, it just processes the given price ID).

---

## System Diagram: v1.1 State

```
BROWSER
  │
  │ form submit (Server Action)
  ▼
(auth) routes                      (dashboard) routes
  ├── /login                         ├── /dashboard
  ├── /auth/confirm (route handler)  ├── /settings
  ├── /auth/verify                   │     └── BillingSection
  └── /auth/reset-password           │           ├── createProjectPurchaseSession()
        └── ResetPasswordForm        │           ├── createCheckoutSession()
              └── updatePassword()   │           └── createPortalSession()
                                     ├── /usage
                                     └── /projects/[id]/...

MIDDLEWARE (updateSession)
  ├── PUBLIC_PATHS gate
  ├── Recovery code forwarding (root ?code= → /auth/confirm)
  └── Session refresh on every request

SERVER ACTIONS
  ├── src/actions/auth.ts
  │     ├── signIn / signUp / signOut
  │     ├── resetPassword()         ← triggers recovery email
  │     └── updatePassword()        ← final step of recovery flow
  ├── src/actions/billing.ts
  │     ├── createProjectPurchaseSession()  ← NEW (one-time Project tier)
  │     ├── createCheckoutSession()         ← EXISTING (Author/Studio subscription)
  │     ├── createCreditPackSession()       ← KEEP or repurpose
  │     ├── createPortalSession()           ← EXISTING (subscription management)
  │     └── getBillingStatus()             ← MODIFY (add project counts)
  └── src/actions/projects.ts
        └── createProject()                ← ADD project-count gate here

API ROUTES
  ├── /api/webhooks/stripe (route handler)
  │     ├── checkout.session.completed
  │     │     ├── mode: subscription → handleSubscriptionCheckout()
  │     │     ├── metadata.type: project_purchase → handleProjectPurchase()  ← NEW
  │     │     └── metadata.type: credit_pack → handleCreditPackPurchase()
  │     ├── customer.subscription.updated → handleSubscriptionUpdate()
  │     ├── customer.subscription.deleted → handleSubscriptionDeleted()
  │     └── invoice.paid → handleInvoicePaid()
  └── /api/generate/* (5 routes)
        └── checkTokenBudget() called at top of each → KEEP for 'hosted' tier;
            new tiers are gated at project creation, not generation time

DATABASE (Supabase)
  └── user_settings
        ├── subscription_tier: 'none'|'hosted'|'project'|'author'|'studio'
        ├── stripe_customer_id
        ├── stripe_subscription_id (null for one-time project-tier users)
        ├── token_budget_total / token_budget_remaining  ← retain for hosted
        ├── projects_purchased      ← NEW: Project-tier slots bought
        └── projects_used           ← NEW: active projects against slots
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Gating Generation Calls Instead of Project Creation

**What:** Checking tier/count on every `/api/generate/*` call for the new tiers.

**Why bad:** A user mid-way through chapter 14 should never be blocked. The semantic contract is "you bought access to complete this project." Blocking mid-project is a billing model mismatch.

**Instead:** Gate at `createProject()`. Once a project row exists, all generation within it is always allowed.

### Anti-Pattern 2: Hardcoding Discount Eligibility Server-Side in the Checkout Action

**What:** Having `createProjectPurchaseSession()` decide whether to apply the $25 or $39 price.

**Why bad:** The server action is simpler and more testable if it is price-ID agnostic. Eligibility logic belongs in the UI layer where user context (completed project count) is easily accessible.

**Instead:** Compute the correct `priceId` client-side in `BillingSection` based on `BillingStatus.projectsCompleted`. Pass the resolved `priceId` to the server action.

### Anti-Pattern 3: Destroying the Token Budget Columns

**What:** Running a destructive migration that drops `token_budget_total`, `token_budget_remaining`, `credit_pack_tokens`.

**Why bad:** The `hosted` tier users and any legacy subscribers rely on these. Removal breaks the existing budget-check code for them.

**Instead:** Retain the columns. New tiers simply do not use them. The `checkTokenBudget()` function remains for `hosted` tier compatibility. Add new columns (`projects_purchased`, `projects_used`) alongside.

### Anti-Pattern 4: Using the Recovery Token in the OTP Flow

**What:** Attempting to call `supabase.auth.verifyOtp()` in the server-side `/auth/confirm` route handler.

**Why bad:** Email security scanners follow links, consuming OTP tokens before the user can. The codebase already correctly separates the two flows: PKCE code → exchange server-side; OTP token_hash → forward to client `/auth/verify` page where JS is required to execute.

**Instead:** The existing two-path logic in `/auth/confirm` is correct. Do not merge the paths.

---

## Build Order

The two features are independent — no cross-dependencies. Suggested order based on risk and foundation:

```
1. Validate + test password reset end-to-end
   (No code changes likely needed — mostly configuration verification)
   - Confirm NEXT_PUBLIC_SITE_URL env var matches Supabase redirect URL config
   - Confirm /auth/reset-password is in PUBLIC_PATHS (already true)
   - Test recovery email → link → form → dashboard flow in staging

2. Write migration 00013
   - Add projects_purchased, projects_used columns to user_settings
   - Update subscription_tier check constraint to include project/author/studio
   - Deploy migration before any code that reads the new columns

3. Update type system
   - src/types/database.ts: extend SubscriptionTier, add new fields to UserSettingsRow
   - src/types/billing.ts: update BillingStatus, TierConfig interfaces

4. Rewrite src/lib/stripe/tiers.ts
   - Three new tiers with billingMode field
   - Remove old starter/writer/pro unless needed for legacy compatibility

5. Add checkProjectAccess() to src/lib/billing/budget-check.ts
   - New function alongside existing checkTokenBudget()
   - No removal of existing function

6. Gate project creation in src/actions/projects.ts
   - Import and call checkProjectAccess()

7. Add createProjectPurchaseSession() to src/actions/billing.ts
   - mode: payment, metadata: { userId, type: 'project_purchase' }

8. Add handleProjectPurchase() to webhook handler
   - Increments projects_purchased on checkout.session.completed

9. Rewrite BillingSection component
   - Three-tier pricing cards
   - Project-count status for project-tier users
   - Correct price ID selection (first vs. repeat)

10. Update getBillingStatus() and usage page
    - Add projectsAllowed/projectsUsed to BillingStatus
    - Usage page shows project count for new tiers, token count for hosted tier

11. Optional: Add /pricing public page
    - Add to PUBLIC_PATHS in middleware
    - Static pricing display with CTA to /settings?tab=billing
```

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Password reset flow | HIGH | Direct code inspection — all pieces exist, flow is correct |
| Middleware intercept | HIGH | Direct code inspection — recovery forwarding already implemented |
| Stripe one-time + subscription mixed model | HIGH | Existing code already uses mode:payment for credit packs; pattern is established |
| Project-count enforcement placement | HIGH | createProject() is the correct semantic gate; confirmed by reviewing all project creation paths |
| Database migration scope | HIGH | Additive-only changes needed; no destructive column drops required |
| Webhook handler extension | HIGH | Existing handleCreditPackPurchase() is the exact pattern to follow for project purchase |

---

*Architecture research for: StoryWriter v1.1 — Password Reset + Three-Tier Billing*
*Researched: 2026-03-11*
*Source: Direct codebase inspection (no external research needed — existing implementation is the authoritative source)*
