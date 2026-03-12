# Project Research Summary

**Project:** StoryWriter v1.1 — Auth & Billing Rework
**Domain:** Password reset flow fix + three-tier Stripe billing migration
**Researched:** 2026-03-11
**Confidence:** HIGH

## Executive Summary

StoryWriter v1.1 is a targeted maintenance and monetization milestone with two independent surfaces: fixing a broken password reset flow and migrating from a token-budget billing model to a project-count billing model. Neither surface requires new npm packages — both are achievable with the existing stack (Next.js App Router, Supabase Auth, Stripe SDK v20, shadcn/ui). The password reset fix is straightforward: the infrastructure already works correctly, the only gap is a missing session guard on the reset-password page that allows users to encounter a broken form when no valid recovery session exists. The billing rework is more involved but follows established patterns already in the codebase — one-time payment checkout via `mode: 'payment'` (already used for credit packs), webhook metadata routing, and additive DB migrations that preserve backward compatibility.

The new billing model replaces token budgets with project-count enforcement. Three tiers replace the old starter/writer/pro structure: a $39 one-time Project purchase (single active project), an Author subscription ($49/mo or $490/yr, unlimited projects), and a Studio subscription ($99/mo, unlimited projects with future team features). The critical architectural decision is where enforcement lives: not on every generation API call, but at project creation time. Once a project row exists, all generation within it proceeds freely — blocking mid-project would violate the implicit contract of a per-project purchase. This design eliminates mid-chapter generation failures and dramatically simplifies the enforcement logic in the seven generation routes.

The most significant risks are operational, not technical: the webhook handler must correctly distinguish one-time Project purchases from subscription events using `metadata.type` (not `session.mode` alone), the DB migration must backfill project entitlements for existing subscribers using old tier names, and the Stripe environment variables must be set before any billing code deploys (a missing price ID is a silent failure that only surfaces when a user clicks "Subscribe"). All these risks are fully mitigated by the pitfalls research and have clear prevention strategies documented.

---

## Key Findings

### From STACK.md — Technology Assessment

No new dependencies are required. All capabilities are achievable with installed packages:

- **Supabase Auth (`@supabase/supabase-js ^2.98.0`, `@supabase/ssr ^0.8.0`):** `getSession()`, `updateUser()`, `createBrowserClient()` all available — the session guard on the reset-password form uses `createBrowserClient` from the already-installed `@supabase/ssr` package
- **Stripe (`stripe ^20.4.0`):** `mode: 'payment'` one-time checkout, coupon application via `discounts: [{ coupon: id }]`, and annual subscription prices are all supported in the installed version
- **DB migration (`00013`):** Additive only — adds `project_purchase_count` column, updates `subscription_tier` check constraint to include new tier values; no destructive column drops
- **New Stripe products to create via CLI:** Project ($39 one-time), Repeat Buyer Coupon ($14 off), Author Monthly ($49/mo), Author Annual ($490/yr), Studio ($99/mo)
- **New env vars:** `STRIPE_PRICE_PROJECT`, `STRIPE_PRICE_AUTHOR_MONTHLY`, `STRIPE_PRICE_AUTHOR_YEARLY`, `STRIPE_PRICE_STUDIO`, `STRIPE_COUPON_REPEAT_PROJECT`
- **Old env vars to remove:** `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_WRITER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PACK_*`

### From FEATURES.md — Feature Scope

**Table stakes (must ship for v1.1):**
- Session guard on `/auth/reset-password` — actual bug fix; without it the reset flow silently fails for users in certain browser states
- Stripe products/prices created via CLI — prerequisite for all billing work; blocks everything else
- Updated `tiers.ts` with Project/Author/Studio structure — replaces Starter/Writer/Pro
- DB migration 00013 — adds `project_purchase_count` counter, updates tier check constraint
- Webhook handler: one-time Project purchase branch — new `metadata.type === 'project_purchase'` branch in existing handler
- `checkProjectAccess` utility — replaces `checkTokenBudget` as the project creation gate
- Completed project read-only access — projects with `status = 'completed'` remain readable regardless of subscription state
- Stripe Customer Portal route — one endpoint, minimal code, high user value

**Differentiators (ship with v1.1):**
- Annual Author option ($490/yr, ~17% savings vs monthly) — reduces churn; single additional Stripe price
- $25 repeat project discount via Stripe coupon — rewards returning buyers; applied programmatically (not via user-entered promo codes)

**Explicitly deferred to v1.2:**
- Annual Author option (adds UI complexity; not a bug fix) — STACK.md defers this, FEATURES.md marks it a differentiator
- Repeat project discount (business logic complexity; not blocking launch)
- Public pricing/marketing page

**Anti-features (explicitly rejected):**
- User-entered promo codes at checkout — opens discount abuse; apply repeat-buyer coupon server-side only
- Token-budget soft warnings/near-limit emails — token model is being removed; dead code
- Trial periods — Project tier at $39 is already low-commitment; trial lifecycle adds webhook surface area
- Prorations on monthly-to-annual upgrade — cancel-at-period-end + new annual subscription is cleaner
- Webhook retries with exponential backoff — Stripe already retries; idempotency table already built

### From ARCHITECTURE.md — Component Boundaries

**Password reset:** No new routes, components, or middleware changes needed. The flow is architecturally complete. The only work is adding a session check to `ResetPasswordForm` (convert to client component, call `supabase.auth.getUser()` on mount, show "link expired" UI if no session). The server action `updatePassword` already verifies the session before calling `updateUser`.

**Billing rework — what changes vs. what stays:**

| Component | Change |
|-----------|--------|
| `src/lib/stripe/tiers.ts` | Rewrite — new three-tier structure with `billingMode: 'one_time' \| 'subscription'` |
| `src/types/billing.ts` | Modify — update `TierConfig` (rename `monthlyTokens` to `projectsAllowed`); remove `CreditPackConfig` |
| `src/types/database.ts` | Modify — extend `SubscriptionTier` union to include new values |
| `src/lib/billing/project-check.ts` | New file — `checkProjectAccess(userId, projectId)` alongside existing `budget-check.ts` |
| `src/actions/projects.ts` | Modify — add project-count gate before insert |
| `src/actions/billing.ts` | Modify — add `createProjectPurchaseSession()` for one-time Project tier |
| `src/app/api/webhooks/stripe/route.ts` | Modify — add `handleProjectPurchase()` branch; keep subscription logic unchanged |
| `src/components/billing/billing-section.tsx` | Rewrite — three-tier pricing cards; project-count status for Project-tier users |
| `supabase/migrations/00013_billing_rework.sql` | New — adds `project_purchase_count`, updates constraint |

**Enforcement placement decision (critical):** The project-count gate belongs in `createProject()` in `src/actions/projects.ts`, NOT in the seven generation API routes. Generation routes retain `checkTokenBudget()` for the `hosted` tier (backward compatibility) but new tiers are never blocked mid-project.

**Build order:**
1. Validate password reset end-to-end (mostly configuration verification)
2. Write and apply migration 00013
3. Update type system (`database.ts`, `billing.ts`)
4. Rewrite `tiers.ts` with new tier config
5. Add `checkProjectAccess()` to new `project-check.ts`
6. Gate project creation in `projects.ts`
7. Add `createProjectPurchaseSession()` to `billing.ts`
8. Add `handleProjectPurchase()` to webhook handler
9. Rewrite `BillingSection` component
10. Update `getBillingStatus()` and usage page

### From PITFALLS.md — Critical Risks

**Critical pitfalls (phase-blocking):**

1. **Email scanner consumes PKCE code before user clicks** — Corporate email scanners prefetch links, burning the single-use recovery code. Prevention: verify the Supabase email template uses `token_hash` + `type=recovery` (not `?code=` directly). The existing `/auth/verify` client page already handles this correctly — confirm the email template is configured to match. Test with a Microsoft 365 or Proofpoint-protected address.

2. **Cookie race on reset-password page** — `exchangeCodeForSession()` may resolve before the session cookies are written to the response; the reset-password page arrives with no session. Prevention: add explicit `getUser()` check on page load; if no session, redirect to "link expired" page rather than showing a broken form. Verify `@supabase/ssr` is on 2.90.1+.

3. **Redirect URL misconfiguration drops recovery code** — If the Supabase dashboard "Redirect URL" is not explicitly set to `[origin]/auth/confirm`, recovery codes can be delivered to `/?code=` and silently dropped by middleware. Prevention: document this as required environment configuration; verify in Supabase dashboard before testing.

4. **Webhook silently ignores one-time Project purchases** — `checkout.session.completed` fires for both subscriptions and one-time payments. If the handler only checks `session.mode === 'subscription'`, Project purchases are silently ignored — user pays but gets nothing. Prevention: use `session.metadata.type === 'project_purchase'` as the routing key; add explicit branch before the subscription branch.

5. **Project-count race condition on concurrent creation** — Two concurrent `createProject()` requests both pass the count check before either insert completes. Prevention: enforce at DB level with `SELECT ... FOR UPDATE` on the `user_settings` row, or use an atomic check-then-insert query pattern. Do not rely on application-layer sequencing.

6. **Existing users blocked after migration** — Users with `subscription_tier = 'starter'` or `'writer'` have no `project_purchase_count` and would look identical to unsubscribed users. Prevention: migration SQL must backfill appropriate defaults for existing subscribers; TypeScript type must include both old and new tier values until all rows are migrated.

**Moderate pitfalls:**

7. **Stripe customer creation race condition** — Concurrent checkouts can create duplicate Stripe customers. Prevention: add `stripe.customers.list({ email })` lookup before creating; add unique constraint on `stripe_customer_id`.

8. **Completed projects counting against project limit** — If `COUNT(*)` is used instead of `COUNT(*) WHERE status != 'complete'`, a Project-tier user who finishes their novel can never start a new one. Prevention: always filter by active status in enforcement queries.

9. **Subscription webhook handlers still reference token budget fields** — After the billing rework, the four webhook handler functions must be updated atomically. Mixed old/new state in the handler creates incoherent billing state. Prevention: treat the webhook handler as a single unit to rewrite.

**Minor pitfalls:**

10. **Open redirect in `/auth/confirm`** — `next` param can be forged to an external URL. Prevention: validate `next` starts with `/` before use. One-line fix.

11. **Token budget enforcement code left wired up** — Old `checkTokenBudget` / `deductTokens` imports in generation routes would block new-tier users. Prevention: grep for all import sites and replace before declaring rework done.

---

## Implications for Roadmap

The two features are independent — no cross-dependencies — but the billing rework has internal sequencing requirements. The following phase structure reflects those dependencies.

### Suggested Phase Structure

**Phase A: Password Reset Fix**

Rationale: Low-risk, self-contained, and a real bug affecting users. Independent of billing work. Likely involves minimal code changes (mostly configuration verification and one client component update). Ship this first to reduce user impact.

Delivers: Working end-to-end password reset flow in all email environments (including corporate email with link scanners). Session-aware reset form that shows a "link expired" state instead of a broken form.

Features from FEATURES.md: Session guard on `/auth/reset-password`; "forgot password" link verification; success redirect.

Pitfalls to avoid: Email scanner PKCE code consumption (Pitfall 1); cookie race on page load (Pitfall 2); Supabase redirect URL misconfiguration (Pitfall 3); open redirect in confirm route (Pitfall 12).

Research flag: No research needed — patterns are well-established and codebase is the authoritative source.

---

**Phase B: Stripe Product Setup and DB Migration**

Rationale: All billing code depends on Stripe price IDs existing and DB columns being present. This is pure infrastructure — no user-facing changes. Must complete before any billing code ships. Doing it as a dedicated phase prevents shipping billing UI that can't actually create checkout sessions (Pitfall 8).

Delivers: Five Stripe objects created in dev and prod (Project product+price, Repeat Buyer Coupon, Author monthly price, Author annual price, Studio price). All env vars set in Vercel. DB migration 00013 applied (new `project_purchase_count` column, updated tier check constraint). Updated TypeScript types (`SubscriptionTier`, `UserSettingsRow`, `TierConfig`).

Features from FEATURES.md: Stripe products/prices via CLI; DB migration 00013.

Pitfalls to avoid: Placeholder price IDs in production (Pitfall 8); existing user tier data mismatch post-migration (Pitfall 6).

Research flag: No research needed — Stripe CLI commands and migration SQL are fully specified in STACK.md.

---

**Phase C: Billing Logic and Enforcement**

Rationale: Core business logic layer. Depends on Phase B (types and schema). Implements the new enforcement model and webhook handler. The enforcement placement decision (project creation, not generation calls) is load-bearing and must be implemented correctly before the UI layer.

Delivers: `checkProjectAccess()` in new `src/lib/billing/project-check.ts`. Project-count gate in `src/actions/projects.ts`. Updated `src/lib/stripe/tiers.ts`. Updated `src/actions/billing.ts` with `createProjectPurchaseSession()`. Webhook handler extended with `handleProjectPurchase()` branch and all four subscription handlers updated to use new tier IDs. Stripe Customer Portal route (`/api/billing/portal-session`).

Features from FEATURES.md: `checkProjectAccess` utility; webhook handler for Project purchases; webhook handlers for Author/Studio subscriptions; completed project read-only access.

Pitfalls to avoid: Webhook one-time purchase silently ignored (Pitfall 4); project-count race condition (Pitfall 5); subscription webhook handlers referencing token budget fields (Pitfall 11); token budget enforcement code left wired up (Pitfall 13).

Research flag: No research needed — patterns are documented in STACK.md and ARCHITECTURE.md with exact code shapes.

---

**Phase D: Billing UI**

Rationale: Final layer, depends on Phase C logic. Replaces the token-budget billing UI with project-count billing UI. Self-contained component work that doesn't affect the backend.

Delivers: Rewritten `BillingSection` component with three-tier pricing cards. Project-count status display for Project-tier users. Updated `getBillingStatus()` returning `projectsAllowed` / `projectsUsed`. Updated usage page (project count for new tiers, token count for `hosted` tier backward compatibility). Subscription management link via Stripe Customer Portal.

Features from FEATURES.md: Settings page billing section; usage page update.

Pitfalls to avoid: Completed projects counting against project limit (Pitfall 10 — filter `status != 'complete'` in all UI queries); customer creation race condition (Pitfall 9).

Research flag: No research needed — component patterns follow existing shadcn/ui usage in the codebase.

---

### Phase Ordering Rationale

- **Password reset first** — it's a live bug, it's independent of billing, and it's low-risk. Shipping it separately eliminates any chance of it being delayed by billing complexity.
- **Stripe setup before billing logic** — you cannot test checkout session creation without real price IDs; you cannot write enforcement code without the DB columns. This ordering prevents a class of "works locally, fails in production" bugs.
- **Logic before UI** — the enforcement model is the load-bearing decision (project creation gate vs. generation gate). Getting that right before building UI means the UI doesn't need to work around a wrong architecture.
- **UI last** — it's the most visible layer but the most changeable. Writing it after the logic is settled means fewer rewrites.

### Research Flags

Needs deeper research during planning: none — all research confidence is HIGH.

Standard patterns (skip additional research): all phases. All capabilities are verified against official Stripe and Supabase documentation. The codebase is the primary reference for Phase A.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All capabilities verified against official Stripe SDK v20 and Supabase JS v2.98.0 docs. No new packages required — confirmed against `package.json`. |
| Features | HIGH | Auth flow verified against live codebase inspection. Stripe patterns verified against official Checkout and Billing docs. Feature scope is narrow and well-defined. |
| Architecture | HIGH | Drawn from direct codebase inspection, not external research. Build order has explicit file-level dependencies. Enforcement placement decision (project creation gate) is backed by clear semantic reasoning. |
| Pitfalls | HIGH (auth) / MEDIUM (billing) | Auth pitfalls verified against official Supabase docs + community GitHub issues. Billing pitfalls (race conditions, migration edge cases) verified against Stripe official docs and PostgreSQL locking docs; race condition scenarios are inherently environment-dependent. |

**Overall confidence: HIGH**

### Gaps to Address

- **Repeat project discount eligibility verification:** STACK.md notes that discount eligibility should be computed client-side in `BillingSection` based on `BillingStatus.projectsCompleted`. The exact field name and query for "has the user completed at least one project" needs to be confirmed against the actual `projects` table schema (specifically, what value `status` uses for completed projects).

- **Hosted tier backward compatibility boundary:** Both STACK.md and ARCHITECTURE.md note that `checkTokenBudget()` should be retained for `hosted` tier users and `token_budget_*` columns should not be dropped. The exact set of generation routes that need to remain on the old path (vs. the new project-count path) should be confirmed during Phase C planning.

- **`invoice.paid` vs `checkout.session.completed` for subscription provisioning:** PITFALLS.md recommends moving subscription access provisioning to `invoice.paid` (more reliable than `checkout.session.completed` for subscriptions). This is a moderate architectural change to the webhook handler that should be explicitly decided before Phase C begins — the current code uses `checkout.session.completed` for subscription provisioning.

---

## Sources

### High Confidence (Official Documentation)
- Supabase auth recovery docs: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- Supabase PKCE flow guide: https://supabase.com/docs/guides/auth/sessions/pkce-flow
- Supabase password-based auth UI docs (Next.js): https://supabase.com/ui/docs/nextjs/password-based-auth
- Supabase auth email templates: https://supabase.com/docs/guides/auth/auth-email-templates
- Stripe Checkout sessions API reference: https://docs.stripe.com/api/checkout/sessions/create
- Stripe add discounts (one-time payments): https://docs.stripe.com/payments/checkout/discounts
- Stripe manage prices: https://docs.stripe.com/products-prices/manage-prices
- Stripe coupons API: https://stripe.com/docs/api/coupons
- Stripe using webhooks with subscriptions: https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe Customer Portal docs: https://docs.stripe.com/customer-management
- Stripe how products and prices work: https://docs.stripe.com/products-prices/how-products-and-prices-work
- PostgreSQL explicit locking — SELECT FOR UPDATE: https://www.postgresql.org/docs/current/explicit-locking.html

### Medium Confidence (Community / GitHub Issues)
- Supabase Discussion #28655: Not able to reset password through PKCE flow in Next.js: https://github.com/orgs/supabase/discussions/28655
- Supabase SSR Issue #107: AuthSessionMissingError in Next.js 14.2+ API Routes: https://github.com/supabase/ssr/issues/107
- Stripe stripe-node Issue #476: Prevent customer creation race conditions: https://github.com/stripe/stripe-node/issues/476

### Primary Source (Codebase)
- `src/app/(auth)/auth/confirm/route.ts` — PKCE code exchange and recovery interception
- `src/app/(auth)/auth/verify/page.tsx` — OTP token_hash client-side verification
- `src/app/(auth)/auth/reset-password/page.tsx` + `src/components/auth/reset-password-form.tsx`
- `src/actions/auth.ts` — `resetPassword()`, `updatePassword()` server actions
- `src/lib/supabase/middleware.ts` — recovery code forwarding, PUBLIC_PATHS
- `src/app/api/webhooks/stripe/route.ts` — existing webhook handler structure
- `src/lib/stripe/tiers.ts` — current tier configuration
- `src/lib/billing/budget-check.ts` — current enforcement utilities

---

*Research completed: 2026-03-11*
*Ready for roadmap: yes*
