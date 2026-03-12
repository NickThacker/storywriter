# Domain Pitfalls

**Domain:** AI-powered novel writing app — v1.1 Auth & Billing (password reset + Stripe billing rework)
**Researched:** 2026-03-11
**Confidence:** HIGH for auth flow pitfalls (verified with official Supabase docs + community discussions); HIGH for Stripe webhook disambiguation (official Stripe docs); MEDIUM for migration and race condition pitfalls (multiple sources, no single authoritative reference)

---

## Critical Pitfalls

### Pitfall 1: Email Security Scanners Consume the PKCE Recovery Code Before the User Clicks

**What goes wrong:**
Corporate email security products (Microsoft Defender for Office 365 Safe Links, Proofpoint, Barracuda) prefetch all URLs in incoming emails to scan for malware. When Supabase sends a password reset email with a `?code=` PKCE link, the scanner GETs the link before the user sees the email. Because a PKCE code can only be exchanged once and expires in 5 minutes, the user clicks a dead link and gets an "expired or invalid" error immediately. This is a documented Supabase issue affecting a significant percentage of corporate and enterprise email users.

**Why it happens:**
The `?code=` parameter in PKCE flow is a single-use exchange token. The Supabase auth confirm route handler (`/auth/confirm`) calls `exchangeCodeForSession(code)` when the route is hit. Email scanners fetch the URL to inspect it, triggering the exchange. When the user clicks the same URL, the code has already been consumed — Supabase returns an error.

**What this means for this app:**
The existing `/auth/confirm` route already handles `?code=` by calling `exchangeCodeForSession()` directly. If the email scanner hits `/auth/confirm?code=xxx`, the code is burned. The route then redirects to `/auth/reset-password` but with no valid session — the reset-password page has no session to call `updateUser()` against.

**Prevention:**
Use the `token_hash` + `type=recovery` email template format instead of (or in addition to) the `?code=` format. With `token_hash`, the confirm route forwards to a client-side verify page (`/auth/verify`) where the browser calls `verifyOtp({ token_hash, type: 'recovery' })` after the user lands. Email scanners cannot trigger a server-side OTP verification because there is no server-side HTTP handler at the client-side verify URL that calls verifyOtp — only client-side JavaScript does. The existing `/auth/confirm` route already has the `token_hash` branch for this reason. The Supabase email template for password reset must be configured to send `token_hash` links (using `{{ .TokenHash }}`) rather than the default confirmation URL.

**Detection:**
- Users report "link expired" immediately upon clicking reset email
- Affects corporate/enterprise email domains more than Gmail/personal accounts
- Reset emails from a Gmail test account work; the same flow fails for a Microsoft 365 address

**Phase:** Password reset implementation. Verify the Supabase email template is configured for `token_hash` + `type=recovery` before shipping. Test with a Microsoft 365 address or any address behind Proofpoint.

---

### Pitfall 2: The Reset-Password Page Runs Before the Session Is Established (Cookie Race)

**What goes wrong:**
After `exchangeCodeForSession(code)` is called in the `/auth/confirm` route handler, Supabase issues auth cookies. In some versions of `@supabase/ssr`, `exchangeCodeForSession` resolves its promise before the `setAll` callback fires to persist the session cookies. The redirect response is returned immediately after the exchange, before cookies are written to the response. When the browser arrives at `/auth/reset-password`, `createClient()` finds no session and any call to `supabase.auth.updateUser({ password })` fails with `AuthSessionMissingError`.

**Why it happens:**
Next.js route handlers complete and send a response as soon as the async function returns. If the session cookie write happens asynchronously after the `await exchangeCodeForSession()` call resolves, the redirect response is sent with no Set-Cookie header. The reset password page, loaded in a separate request, has no session.

**Consequences:**
User successfully follows the reset link, arrives at the reset-password page, enters a new password, and gets an error. The password is not changed. The user is stuck.

**Prevention:**
Ensure `@supabase/ssr` is on a version where cookie writes are synchronous within the exchange (2.90.1+ fixed this). Verify that the reset-password page also calls `supabase.auth.getUser()` before rendering the form — if no user is returned, redirect to a "link expired, request a new one" page rather than showing a broken form. Do not rely on the session being present; always check it explicitly on the reset-password page.

**Detection:**
- `/auth/reset-password` page renders but calling `updateUser()` returns `AuthSessionMissingError`
- Browser DevTools shows no auth cookie headers on the redirect response from `/auth/confirm`

**Phase:** Password reset implementation. Test the full reset flow end-to-end in a deployed environment (not local dev), since cookie behavior differs.

---

### Pitfall 3: Middleware Redirects the Root URL with a Recovery Code Before It Reaches the Confirm Route

**What goes wrong:**
Supabase sometimes delivers password recovery codes to the root URL (`/`) rather than directly to `/auth/confirm`, depending on the "Redirect URL" configured in the Supabase Auth dashboard. If middleware does not correctly forward `?code=...` query params when redirecting from `/` to `/auth/confirm`, the code is silently dropped and the user is bounced to `/login` with no explanation.

**What this means for this app:**
The existing middleware in `src/lib/supabase/middleware.ts` does handle this case: when the root URL has `?code=`, it redirects to `/auth/confirm?code=...&next=/auth/reset-password`. However, if the Supabase dashboard "Redirect URL" setting is changed or if a new auth email template is introduced, the code delivery path can change without the middleware being updated.

**Prevention:**
Keep the Supabase dashboard "Redirect URL" explicitly set to `[origin]/auth/confirm`. Do not use the site root as the redirect target. Document this as a required environment configuration step — it cannot be inferred from code alone. When testing, verify the full URL in the password reset email and confirm it ends with `/auth/confirm`, not `/`.

**Detection:**
- User clicks reset link, lands on the login page with no error message
- Checking the reset email: the link URL goes to `[origin]/?code=xxx` instead of `[origin]/auth/confirm?code=xxx`

**Phase:** Password reset implementation. This is a deployment/configuration pitfall, not a code one. Must be verified in the Supabase dashboard before testing.

---

### Pitfall 4: Webhook Distinguishing One-Time Project Purchases from Subscription Events

**What goes wrong:**
The new billing model mixes two purchase modes: a Project tier ($39 one-time, `mode: 'payment'`) and subscription tiers (Author $49/mo, Studio $99/mo, `mode: 'subscription'`). Both land in `checkout.session.completed`. If the webhook handler uses only `session.mode === 'subscription'` to route, one-time Project purchases are silently ignored — no project entitlement is granted, no DB row is updated, and the user paid but gets nothing. The existing webhook handler already does this correctly for `credit_pack` purchases via `session.metadata.type === 'credit_pack'`, but this pattern must be extended for `project_purchase`.

**Why it happens:**
`checkout.session.completed` fires for both modes. `session.subscription` is null for one-time payments. A handler that only checks `session.mode === 'subscription'` and falls through to a default no-op will silently skip all one-time purchases.

**What the existing code does:**
The current `handleSubscriptionCheckout` function checks `session.mode === 'subscription'`. The `credit_pack` branch checks `session.metadata?.type === 'credit_pack'`. The new Project purchase needs its own branch keyed on `session.metadata?.type === 'project_purchase'` (or similar) with a completely different fulfillment path: increment `active_project_count`, record the purchase, set the access grant — not update `subscription_tier` or `token_budget_*`.

**Prevention:**
Use Stripe Checkout `metadata` as the authoritative routing key. Set `metadata: { type: 'project_purchase', userId }` when creating a Project checkout session. In the webhook, add an explicit branch for `type === 'project_purchase'` before the subscription branch. Never rely on `session.mode` alone — metadata is more explicit and less likely to be accidentally satisfied.

**Detection:**
- User completes a $39 checkout, Stripe shows payment succeeded, but no project entitlement appears in the app
- Webhook logs show `checkout.session.completed` fired but no DB update for the payment mode

**Phase:** Stripe billing rework, Phase A. Write the webhook branch and fulfillment handler for one-time purchases before wiring up the checkout session creation.

---

### Pitfall 5: Project-Count Race Condition on Concurrent Creation Requests

**What goes wrong:**
When enforcement checks whether a user can create a new project, the flow is: read current count → check against limit → if allowed, create project. Under concurrent requests (e.g., the user double-clicks the "Create Project" button, or opens two browser tabs), two requests can both read the count before either insert completes. Both see "count = 0, limit = 1, allowed", both insert, and the user ends up with two projects when they should have been blocked at one.

**Why it happens:**
Read-modify-check-write is not atomic in PostgreSQL without explicit locking. The default `READ COMMITTED` isolation level in Postgres allows concurrent transactions to observe a consistent snapshot of the table state at the moment of their read, but two concurrent reads both see the same pre-insert count.

**What this means for this app:**
The current `createProject` action in `src/actions/projects.ts` has no project-count check at all — it will need one added. If the check is added as a plain `SELECT COUNT` followed by `INSERT`, the race condition exists from day one.

**Prevention:**
Use a Postgres function with `SELECT ... FOR UPDATE` on the `user_settings` row (or a dedicated `project_entitlements` row) combined with the count check and the insert in a single transaction. Alternatively, use a Postgres `CHECK CONSTRAINT` or trigger that enforces the count limit at the database level — these are enforced atomically regardless of application-layer concurrency. A simpler approach: use an `INSERT ... WHERE NOT EXISTS (SELECT 1 FROM projects WHERE user_id = $1 AND status != 'complete' HAVING COUNT(*) >= $2)` pattern, which makes the guard atomic. At minimum, add a unique constraint or conditional index to prevent structural violations.

**Detection:**
- Duplicate project creation under load testing
- A user with a single-project entitlement successfully creates two projects by rapid double-click or concurrent requests

**Phase:** Project-count enforcement. The race condition must be designed out at the schema/query level, not just application level. This is Phase B of the billing rework.

---

### Pitfall 6: Migrating Existing Users from Token-Based to Project-Count Billing Without a Clear State Mapping

**What goes wrong:**
Users who subscribed under the old token-based model (starter/writer/pro tiers with `token_budget_total` and `token_budget_remaining`) have no `active_project_count` or `project_limit` in their DB row. A migration that simply adds a new column without backfilling defaults will cause the new enforcement logic to misread their entitlement. A user with an active `writer` subscription and zero `project_limit` looks the same as a user with no subscription at all.

**Why it happens:**
Schema migrations add columns but don't encode business logic about what those columns mean for existing rows. If `project_limit IS NULL` is the initial state and the enforcement code checks `project_limit > 0`, existing subscribers fail enforcement until their row is manually fixed.

**What this means for this app:**
The `SubscriptionTier` enum in `database.ts` currently has `'none' | 'hosted' | 'starter' | 'writer' | 'pro'`. The new model has `'none' | 'project' | 'author' | 'studio'`. Existing users may have `subscription_tier = 'writer'` in their DB row. The new enforcement code will not know what `'writer'` means for project limits unless the migration includes a translation.

**Prevention:**
The migration SQL must: (1) add the new columns (`project_limit`, `active_project_count`, `project_purchase_id`) with non-nullable defaults, (2) backfill `project_limit` for existing subscribers based on their current `subscription_tier` value (e.g., `UPDATE user_settings SET project_limit = 999 WHERE subscription_tier IN ('starter', 'writer', 'pro')`), (3) either leave old tier names in place (with new enforcement logic that treats them as unlimited), or rename them with a data migration. The TypeScript `SubscriptionTier` type must be updated to include both old and new values, or a migration script must rewrite existing DB rows to the new values before the new code deploys.

**Detection:**
- Existing paying users are blocked from creating projects after the billing rework ships
- Users with active subscriptions see "upgrade required" prompts they should not see

**Phase:** Billing rework, database migration step. Must be tested against a seed of rows with old tier values before shipping.

---

### Pitfall 7: checkout.session.completed Fires Before the Subscription Object Is Fully Populated

**What goes wrong:**
The existing `handleSubscriptionCheckout` function retrieves the full subscription via `stripe.subscriptions.retrieve(subscriptionId)` to get the price ID. This is correct, but there is a window where `checkout.session.completed` fires and `session.subscription` contains a subscription ID, but the subscription object is still in `incomplete` or `trialing` status and the `items.data[0]?.price.id` may not be set yet in some edge cases (particularly with free trial periods or payment method verification delays).

**Why it happens:**
Stripe's webhook delivery is asynchronous. The checkout session completes (payment intent succeeds), but the subscription provisioning can have a brief lag. This is rare in simple flows but can occur with 3D Secure challenges, PayPal payment methods, or promotional codes that require server-side validation.

**Prevention:**
The correct fulfillment event for subscriptions is `invoice.paid`, not `checkout.session.completed`. Use `checkout.session.completed` to record the session and create the customer linkage only; use `invoice.paid` as the canonical signal to provision access. The existing code already uses `handleInvoicePaid` to reset the token budget on renewal, which is the right pattern. For the new billing model, provision project access on `invoice.paid` for subscriptions and on `checkout.session.completed` (with `mode === 'payment'`) for one-time purchases.

**Detection:**
- Users complete checkout but have no subscription access in the app for several minutes
- Webhook logs show `checkout.session.completed` processed but the subscription retrieve call returned an incomplete subscription

**Phase:** Stripe billing rework. Review and potentially restructure the webhook handler to move subscription provisioning from `checkout.session.completed` to `invoice.paid`.

---

### Pitfall 8: Stripe Price IDs Use Placeholder Values in Production if Env Vars Are Unset

**What goes wrong:**
The current `src/lib/stripe/tiers.ts` uses `process.env.STRIPE_PRICE_STARTER || 'price_starter_placeholder'` as the fallback. If a required environment variable is not set in Vercel (or is set incorrectly), the app silently uses a placeholder string as the Stripe Price ID. Stripe will reject any checkout session creation attempt with this value (`No such price: 'price_starter_placeholder'`), but the error happens at runtime when a user clicks "Subscribe", not at startup. The product appears to work until a user attempts to buy.

**Why it happens:**
JavaScript's `||` fallback makes the code defensive at initialization but hides misconfiguration from developer awareness. No startup validation fails, no warning is logged, and the pricing display page may even show prices and features correctly (since UI display doesn't require a valid Stripe Price ID).

**Prevention:**
Add a startup check (or a dedicated admin health route) that validates all required Stripe Price ID env vars are set and non-placeholder before accepting user traffic. At minimum, validate at checkout session creation time and return a clear error message ("Checkout unavailable — configuration error") rather than a cryptic Stripe API error. For the new billing model, create the Stripe products and prices via `stripe fixtures push` or CLI before deploying the code, and verify all new env vars are set in Vercel.

**Detection:**
- Checkout flow fails with `Stripe API error: No such price` in production logs
- Env var is set to `''` or the literal placeholder string

**Phase:** Stripe billing rework, environment setup step. Verify all price IDs before deploying billing changes.

---

## Moderate Pitfalls

### Pitfall 9: The Stripe Customer Creation Race Condition

**What goes wrong:**
`getOrCreateStripeCustomer` in `src/actions/billing.ts` reads `stripe_customer_id` from `user_settings`, and if null, calls `stripe.customers.create()`. If a user initiates two checkouts in rapid succession (e.g., opens two tabs, or clicks Subscribe twice before the first request completes), two Stripe customers can be created for the same user. The second checkout session is created against a different customer object than what was saved to the DB.

**Prevention:**
Use a Postgres upsert with a unique constraint on `stripe_customer_id` and handle the case where customer creation happens concurrently. Alternatively, use Stripe's `customer_email` lookup before creating: `stripe.customers.list({ email, limit: 1 })` to check for an existing customer. Stripe themselves document this race condition as a known issue.

**Phase:** Billing rework. Audit the `getOrCreateStripeCustomer` function when adding new product types.

---

### Pitfall 10: Completed Projects Lock Out Generation But Still Count Against Project Limit

**What goes wrong:**
The requirement states "completed projects always readable, generation locked after expiry." If the project-count limit counts all projects regardless of status (including completed ones), a Project-tier user who completes their one novel can never start a new one — their slot is permanently occupied by the completed project. The limit must count only active (non-complete) projects, or completed projects must explicitly be excluded from the count.

**Prevention:**
Define "active project count" precisely in the schema: `projects WHERE status != 'complete' AND user_id = $1`. Add a comment to the enforcement query making this explicit. Ensure that the `createProject` action's enforcement check uses this filtered count, not `COUNT(*)` over all projects.

**Phase:** Project-count enforcement. Clarify this in the DB migration comment and the enforcement query before writing the check.

---

### Pitfall 11: The `subscription.updated` Webhook Handler Still References Token Budget Fields

**What goes wrong:**
The existing `handleSubscriptionUpdate` function in the webhook route updates `token_budget_total` and `token_budget_remaining`. After the billing rework, these fields are not the authoritative entitlement signal — project limits are. If the webhook handler is not updated alongside the billing model change, a subscription change event (downgrade, cancellation) will try to set token budget fields that are no longer relevant, while leaving project limit fields unchanged.

**Prevention:**
When reworking the billing model, update all four webhook handler functions (`handleSubscriptionCheckout`, `handleSubscriptionUpdate`, `handleSubscriptionDeleted`, `handleInvoicePaid`) in a single, atomic change. Do not mix the old token-budget updates with new project-limit updates in the same handler; this creates an inconsistent hybrid state that is hard to reason about.

**Phase:** Billing rework. Treat the webhook handler as a single unit to rewrite, not a set of individual functions to patch.

---

## Minor Pitfalls

### Pitfall 12: The `next` Query Param on the Confirm Route Can Be Forged

**What goes wrong:**
The `/auth/confirm` route uses `next` from the query string to determine where to redirect after successful code exchange: `return NextResponse.redirect(\`${origin}${next ?? defaultNext}\`)`. A crafted URL like `/auth/confirm?code=xxx&next=https://evil.com` would redirect the user to an arbitrary external URL after a successful auth exchange — an open redirect.

**Prevention:**
Validate that `next` begins with `/` (i.e., it is a relative path, not an absolute URL) before using it in the redirect. If `next` contains `://` or doesn't start with `/`, ignore it and use the default. The fix is one line: `const safeNext = next?.startsWith('/') ? next : defaultNext`.

**Phase:** Password reset implementation. Low severity for an auth-only app (the attacker would need to know a valid recovery code), but is a hygiene issue.

---

### Pitfall 13: `token-interceptor.ts` and `budget-check.ts` Are Not Removed When Token Budget Is Retired

**What goes wrong:**
If the billing rework removes token-based enforcement but the old files remain and are imported anywhere, ghost behavior persists. A generation route that still imports `checkTokenBudget` from `budget-check.ts` will block users based on a `token_budget_remaining` column that is no longer being maintained, effectively locking all platform-key users out of generation.

**Prevention:**
When replacing token-budget enforcement with project-count enforcement, explicitly delete or deprecate `src/lib/billing/token-interceptor.ts` and `src/lib/billing/budget-check.ts`. Search for all import sites and replace them. Do not leave the old enforcement code in place "just in case" — a dead enforcement gate that's still wired up is worse than a deleted one.

**Phase:** Billing rework. Make this a checklist item: grep for `checkTokenBudget` and `deductTokens` imports before declaring the rework done.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Password reset email template | Scanner consumes PKCE code before user clicks | Use `token_hash` + `type=recovery` template; test with Microsoft 365 or Proofpoint email address |
| Reset-password page session | No session available when user lands on the page | Explicit `getUser()` check on page load; redirect to "request new link" if session is missing |
| Supabase redirect URL config | Recovery code delivered to `/?code=` not `/auth/confirm?code=` | Set Supabase dashboard "Redirect URL" explicitly to `[origin]/auth/confirm`; document as required config |
| Open redirect in confirm route | `next` param forged to external URL | Validate `next` starts with `/` before using in redirect |
| Webhook mode disambiguation | One-time Project purchase silently ignored | Use `metadata.type` as the routing key; add explicit `project_purchase` branch |
| Project-count enforcement | Concurrent requests both pass the limit check | Enforce at DB level with `SELECT FOR UPDATE` or an atomic check-then-insert query |
| Existing user migration | Old `starter/writer/pro` tier users blocked after rework | Backfill `project_limit` for existing subscribers in the migration SQL |
| Stripe env var config | Placeholder price IDs in production | Validate all Stripe Price ID env vars at checkout session creation; create products via CLI before deploy |
| Token budget removal | Old enforcement code still wired up after removal | Grep and remove all `checkTokenBudget` / `deductTokens` import sites |
| Completed project counting | Completed projects consuming the project-count limit | Filter by `status != 'complete'` in all enforcement queries |

---

## Sources

- [Supabase PKCE Flow Documentation](https://supabase.com/docs/guides/auth/sessions/pkce-flow) — HIGH confidence (official docs)
- [Supabase Auth Email Templates — TokenHash](https://supabase.com/docs/guides/auth/auth-email-templates) — HIGH confidence (official docs)
- [Supabase resetPasswordForEmail API Reference](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) — HIGH confidence (official docs)
- [Supabase Discussion #28655: Not able to reset password through PKCE flow in NextJS](https://github.com/orgs/supabase/discussions/28655) — MEDIUM confidence (community reports)
- [Supabase SSR Issue #107: AuthSessionMissingError in Next.js 14.2+ API Routes](https://github.com/supabase/ssr/issues/107) — MEDIUM confidence (GitHub issue)
- [Stripe: Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks) — HIGH confidence (official docs)
- [Stripe: How Checkout works — mode parameter](https://docs.stripe.com/payments/checkout/how-checkout-works) — HIGH confidence (official docs)
- [Stripe: Metadata documentation](https://docs.stripe.com/metadata) — HIGH confidence (official docs)
- [PostgreSQL: Explicit Locking — SELECT FOR UPDATE](https://www.postgresql.org/docs/current/explicit-locking.html) — HIGH confidence (official docs)
- [Stripe stripe-node Issue #476: Prevent customer creation race conditions](https://github.com/stripe/stripe-node/issues/476) — MEDIUM confidence (GitHub issue, Stripe team response)

---
*Pitfalls research for: StoryWriter v1.1 — password reset interception + Stripe billing rework*
*Researched: 2026-03-11*
*Supersedes: prior PITFALLS.md (v1.0, 2026-02-28) for this milestone's specific concerns*
