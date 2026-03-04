---
phase: 05-export-and-billing
verified: 2026-03-04T23:45:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Export DOCX file opens in Word/Google Docs with title page, TOC, and chapter headers"
    expected: "Downloaded .docx file has proper document structure: centered title page, chapter list TOC, chapter headings, page breaks between chapters"
    why_human: "Cannot inspect binary DOCX document structure programmatically in this context"
  - test: "Stripe Checkout flow creates subscription and billing period begins"
    expected: "After clicking Subscribe, user is redirected to Stripe Checkout; after payment, subscription_tier, token_budget_total, and token_budget_remaining are updated in user_settings"
    why_human: "Requires live Stripe credentials and a payment event; webhook round-trip cannot be verified statically"
  - test: "80% budget toast fires after chapter generation when X-Budget-Warning header is set"
    expected: "After generation completes with near-limit budget, a Sonner toast appears with 'View Usage' action link"
    why_human: "Requires runtime state (token budget at 80%), an actual SSE stream, and visual verification of the toast"
  - test: "BYOK users see zero billing UI throughout the app"
    expected: "With openrouter_api_key set: no /usage nav link, no BillingSection in settings, /usage URL redirects to /dashboard"
    why_human: "Requires runtime login session with API key set and visual inspection of all affected pages"
---

# Phase 05: Export and Billing Verification Report

**Phase Goal:** Users can export their completed novel and the platform has a functioning billing model — the final requirements for a public launch
**Verified:** 2026-03-04T23:45:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | User can export their novel as a DOCX file with title page, TOC, chapter headers, and page breaks | VERIFIED | `src/lib/export/docx.ts` exports `buildDocx` using `docx` library with title page, manual TOC, and chapter sections; `src/app/api/export/[projectId]/route.ts` serves it as `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| 2 | User can export their novel as plain text with chapter headers | VERIFIED | `src/lib/export/txt.ts` exports `buildTxt`; route handler serves it as `text/plain` |
| 3 | User can export as ePub with metadata and chapter structure | VERIFIED | `src/lib/export/epub.ts` exports `buildEpub` using `epub-gen-memory` with HTML-escaped chapter content |
| 4 | User can export as RTF suitable for Vellum import | VERIFIED | `src/lib/export/rtf.ts` exports `buildRtf` with hand-generated RTF including `escapeRtf` helper |
| 5 | Export assembles approved chapters (or all chapters with draft markers) | VERIFIED | `src/lib/export/assemble.ts` `assembleChapters` queries `chapter_checkpoints`, filters by `approval_status === 'approved'` when `includeMode === 'approved'`, marks others as `isDraft: true` |
| 6 | Export includes pen name on title page | VERIFIED | Route handler reads `penName` query param, passes to `assembleChapters`; all builders use `book.author` on title page |
| 7 | User can open export dialog from chapters page | VERIFIED | `ExportDialog` imported and rendered at line 106 of `src/app/(dashboard)/projects/[id]/chapters/page.tsx` |
| 8 | Hosted tier users can subscribe to a plan via Stripe Checkout | VERIFIED | `src/actions/billing.ts` exports `createCheckoutSession` with get-or-create customer logic and session redirect URL; `src/components/billing/upgrade-modal.tsx` and `src/components/billing/billing-section.tsx` call it |
| 9 | Stripe webhook handler verifies signatures and processes subscription events | VERIFIED | `src/app/api/webhooks/stripe/route.ts` uses `req.text()` for raw body, calls `stripe.webhooks.constructEvent`, handles `checkout.session.completed`, `subscription.updated`, `subscription.deleted`, `invoice.paid` |
| 10 | Webhook processing is idempotent (duplicate events ignored) | VERIFIED | Webhook handler queries `stripe_webhook_events` before processing; inserts event ID before handling; returns 200 on duplicate |
| 11 | Token usage is recorded per generation request with per-chapter granularity | VERIFIED | `src/lib/billing/budget-check.ts` exports `recordTokenUsage` which inserts to `token_usage` table; all 5 generation routes (`chapter`, `compress-chapter`, `direction-options`, `analyze-impact`, `outline`) import `checkTokenBudget` |
| 12 | Budget check blocks at 100% usage and warns at 80% | VERIFIED | `checkTokenBudget` returns `{ allowed: false, reason: 'budget_exhausted' }` when `effectiveRemaining <= 0`; returns `warningThreshold: 'near_limit'` at >= 80%; chapter route returns HTTP 402 on block and adds `X-Budget-Warning` header on warning |
| 13 | BYOK users bypass all billing | VERIFIED | `checkTokenBudget` returns `{ allowed: true, isByok: true }` when `openrouter_api_key` is set; layout.tsx hides `/usage` nav link; settings page hides `BillingSection`; `/usage` page redirects BYOK users to `/dashboard` |
| 14 | Token interception does not block or delay the SSE stream | VERIFIED | `createTokenInterceptStream` calls `controller.enqueue(chunk)` before any parsing — pass-through is always first operation |

**Score:** 14/14 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/00005_billing_and_token_tracking.sql` | token_usage table, user_settings billing columns, webhook events table, RLS policies | VERIFIED | Contains all required elements: `token_usage`, `stripe_webhook_events`, 6 `ALTER TABLE` columns, updated subscription_tier constraint, RLS policies, 2 indexes |
| `src/types/billing.ts` | TokenUsageRow, BillingStatus, BudgetCheckResult types | VERIFIED | Exports all required types plus TierConfig, CreditPackConfig, TIER_CONFIGS, CREDIT_PACK_CONFIGS constants |
| `src/types/database.ts` | Updated SubscriptionTier enum, token_usage in Database type | VERIFIED | `SubscriptionTier = 'none' \| 'hosted' \| 'starter' \| 'writer' \| 'pro'`; `Database.Tables` includes `token_usage` and `stripe_webhook_events` |
| `src/lib/stripe/client.ts` | Stripe singleton instance | VERIFIED | Exports `stripe = Stripe \| null`; null-safe for BYOK deployments; API version `2026-02-25.clover` |
| `src/lib/export/assemble.ts` | Chapter data assembly logic | VERIFIED | Exports `assembleChapters`, `ChapterContent`, `ExportOptions`, `AssembledBook`; queries `chapter_checkpoints` via Supabase |
| `src/lib/export/docx.ts` | DOCX document builder | VERIFIED | Exports `buildDocx`, uses `docx` library, `Packer.toBuffer()`, title page + TOC + chapters |
| `src/lib/export/epub.ts` | ePub document builder | VERIFIED | Exports `buildEpub`, uses `epub-gen-memory`, HTML-escaped content |
| `src/lib/export/rtf.ts` | RTF document builder | VERIFIED | Exports `buildRtf`, hand-generated RTF with `escapeRtf` helper |
| `src/lib/export/txt.ts` | Plain text document builder | VERIFIED | Exports `buildTxt`, TOC + chapter sections |
| `src/app/api/export/[projectId]/route.ts` | GET route handler for all export formats | VERIFIED | Exports `GET`; `force-dynamic`; handles all 4 formats via switch; correct Content-Type and Content-Disposition headers |
| `src/components/export/export-dialog.tsx` | Export dialog with format picker, chapter filter, pen name input | VERIFIED | Exports `ExportDialog`; 4-format toggle buttons; approved/all filter; pen name input; anchor-based download |
| `src/app/(dashboard)/projects/[id]/chapters/page.tsx` | Chapters page with ExportDialog | VERIFIED | Imports and renders `ExportDialog` at line 106 in project-level header |
| `src/actions/billing.ts` | createCheckoutSession, createCreditPackSession, createPortalSession, getBillingStatus | VERIFIED | All 4 server actions exported; null-safe Stripe check; BYOK detection in getBillingStatus |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler | VERIFIED | Exports `POST`; raw body with `req.text()`; signature verification; idempotency; 4 event types handled |
| `src/lib/stripe/tiers.ts` | Tier configuration and price ID mappings | VERIFIED | Exports `TIERS` (3 tiers), `CREDIT_PACKS` (4 packs), `getTierByStripePriceId`, `getCreditPackByStripePriceId`, `getTierById` |
| `src/lib/billing/token-interceptor.ts` | TransformStream that intercepts usage from OpenRouter SSE | VERIFIED | Exports `createTokenInterceptStream`; enqueues chunk before parsing; parses `usage.total_tokens` from SSE |
| `src/lib/billing/budget-check.ts` | Pre-generation budget check function | VERIFIED | Exports `checkTokenBudget`, `deductTokens`, `recordTokenUsage`; BYOK bypass; 80%/100% thresholds |
| `src/actions/token-usage.ts` | Token usage query actions | VERIFIED | Exports `getTokenUsage`, `getProjectTokenUsage`, `getUserTotalUsage` |
| `src/components/billing/usage-bar.tsx` | Budget progress bar component | VERIFIED | Exports `UsageBar` with `formatTokens` helper and color-coded fill |
| `src/components/billing/plan-card.tsx` | Subscription tier card component | VERIFIED | Exports `PlanCard` |
| `src/components/billing/upgrade-modal.tsx` | Hard-block upgrade modal | VERIFIED | Exports `UpgradeModal`; calls `createCheckoutSession` and `createCreditPackSession` |
| `src/components/billing/billing-section.tsx` | Billing management section for settings page | VERIFIED | Exports `BillingSection` |
| `src/hooks/use-budget-warning.ts` | Hook that checks X-Budget-Warning header | VERIFIED | Exports `checkBudgetWarning` and `useBudgetWarning`; uses Sonner toast with action link to /usage |
| `src/hooks/use-chapter-stream.ts` | Chapter streaming hook with budget warning wiring | VERIFIED | Imports `checkBudgetWarning` at line 4; calls `checkBudgetWarning(response)` at line 73 after successful SSE fetch |
| `src/app/(dashboard)/usage/page.tsx` | Token usage dashboard page | VERIFIED | Server component; auth guard; BYOK redirect; calls `getBillingStatus`, `getUserTotalUsage`, `getProjectTokenUsage` in parallel; renders `UsageBar` and per-project breakdown |
| `src/app/(dashboard)/settings/page.tsx` | Settings page with billing section | VERIFIED | Imports `getBillingStatus` and `BillingSection`; renders `BillingSection` conditionally when `!billingStatus.isByok` |
| `src/app/(dashboard)/layout.tsx` | Dashboard layout with conditional /usage nav link | VERIFIED | Queries `openrouter_api_key` directly; hides `/usage` link when `isByok === true` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/export/[projectId]/route.ts` | `src/lib/export/assemble.ts` | `assembleChapters` function call | VERIFIED | Import at line 1, call at line 74 |
| `src/app/api/export/[projectId]/route.ts` | `src/lib/export/docx.ts` | `buildDocx` format switch | VERIFIED | Import at line 2, call in switch at line 81 |
| `src/lib/export/assemble.ts` | `chapter_checkpoints` table | Supabase query | VERIFIED | `.from('chapter_checkpoints')` at line 88 |
| `src/actions/billing.ts` | `src/lib/stripe/client.ts` | imports stripe singleton | VERIFIED | `import { stripe } from '@/lib/stripe/client'` at line 5 |
| `src/app/api/webhooks/stripe/route.ts` | `user_settings` table | updates subscription_tier, token_budget on webhook events | VERIFIED | 6 `.update()` calls across event handlers; queries `user_settings` by user_id or stripe_subscription_id |
| `src/app/api/webhooks/stripe/route.ts` | `stripe_webhook_events` table | idempotency check before processing | VERIFIED | `.from('stripe_webhook_events')` at lines 326 and 338 |
| `src/app/api/generate/chapter/route.ts` | `src/lib/billing/budget-check.ts` | `checkTokenBudget` call before OpenRouter request | VERIFIED | Import confirmed; `checkTokenBudget(user.id)` called at line 88 |
| `src/app/api/generate/chapter/route.ts` | `src/lib/billing/token-interceptor.ts` | pipe response body through TransformStream | VERIFIED | Import at line 8; `pipeThrough(createTokenInterceptStream(...))` at line 191 |
| `src/lib/billing/token-interceptor.ts` | `token_usage` table | fire-and-forget DB write in flush | VERIFIED | `recordTokenUsage` called in `onUsage` callback; inserts to `token_usage` via service-role client |
| `src/app/(dashboard)/usage/page.tsx` | `src/actions/token-usage.ts` | `getUserTotalUsage`, `getProjectTokenUsage` calls | VERIFIED | Imported at line 6; called at lines 63-64 in parallel |
| `src/components/billing/upgrade-modal.tsx` | `src/actions/billing.ts` | `createCheckoutSession`, `createCreditPackSession` | VERIFIED | Imported at line 13; called at line 28 |
| `src/hooks/use-budget-warning.ts` | Sonner toast | shows toast when X-Budget-Warning header present | VERIFIED | `toast.warning(...)` called when `warning === 'near_limit'` |
| `src/hooks/use-chapter-stream.ts` | `src/hooks/use-budget-warning.ts` | calls `checkBudgetWarning(response)` after SSE response | VERIFIED | Import at line 4; call at line 73 |
| `src/app/(dashboard)/layout.tsx` | BYOK check | Conditionally renders /usage nav link based on isByok | VERIFIED | Queries `openrouter_api_key`; `{!isByok && <Link href="/usage">Usage</Link>}` at line 53 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| EXPT-01 | 05-02, 05-03 | User can export their novel to DOCX format | SATISFIED | `buildDocx` in `src/lib/export/docx.ts`; route handler serves DOCX; ExportDialog triggers download |
| EXPT-02 | 05-02, 05-03 | User can export their novel to plain text format | SATISFIED | `buildTxt` in `src/lib/export/txt.ts`; route handler serves TXT; all 4 formats available in ExportDialog |
| EXPT-03 | 05-02 | Export assembles all approved chapters into a single document | SATISFIED | `assembleChapters` in `assemble.ts` filters by `approval_status === 'approved'` when `includeMode === 'approved'`; supports both approved-only and all-with-draft-markers modes |
| BILL-01 | 05-01, 05-04, 05-06 | Hosted tier users subscribe to a plan with token/credit budget | SATISFIED | `createCheckoutSession` creates Stripe subscription; webhook handler sets `token_budget_total` and `subscription_tier`; BillingSection and UpgradeModal provide UI for subscription management |
| BILL-02 | 05-01, 05-05 | Token usage is tracked per user and per project | SATISFIED | `token_usage` table (migration 00005) with `user_id`, `project_id`, `chapter_number`; all 5 generation routes call `recordTokenUsage` via token interceptor or direct call |
| BILL-03 | 05-05, 05-06 | User is warned when approaching their token budget limit | SATISFIED | `checkTokenBudget` returns `warningThreshold: 'near_limit'` at >= 80%; chapter route adds `X-Budget-Warning: near_limit` header; `checkBudgetWarning` in `use-chapter-stream.ts` fires Sonner toast; `/usage` page shows near-limit banner |
| BILL-04 | 05-01, 05-04, 05-05, 05-06 | BYOK users bypass billing (use their own OpenRouter credits) | SATISFIED | `checkTokenBudget` returns `{ allowed: true, isByok: true }` when `openrouter_api_key` set; layout hides /usage link; settings hides BillingSection; /usage page redirects BYOK users |

**No orphaned requirements found.** All 7 Phase 5 requirements (EXPT-01, EXPT-02, EXPT-03, BILL-01, BILL-02, BILL-03, BILL-04) are covered by plans 05-01 through 05-06 and all map to complete implementations.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/types/billing.ts` | 97,104,111 | `stripePriceId: ''` — placeholder empty strings in TIER_CONFIGS | Info | These are expected — actual price IDs come from env vars at runtime via `src/lib/stripe/tiers.ts`. The constants in `billing.ts` are type examples; `tiers.ts` uses `process.env.STRIPE_PRICE_*` with placeholder fallbacks. No functional blocker. |

No blocker or warning-level anti-patterns found. The empty `stripePriceId` values in `billing.ts` TIER_CONFIGS are informational only — `src/lib/stripe/tiers.ts` uses env-var-backed price IDs with explicit placeholder string fallbacks, which is the correct pattern for configuration that requires Stripe dashboard setup.

---

### Human Verification Required

#### 1. DOCX Document Structure

**Test:** Export a project with approved chapters as DOCX; open in Microsoft Word or Google Docs
**Expected:** File has a centered title page (project title + author name), a table of contents listing all chapters, chapter headings at the start of each section, and page breaks between chapters
**Why human:** Binary DOCX format cannot be inspected for visual structure programmatically

#### 2. Stripe Subscription End-to-End

**Test:** Configure Stripe env vars and dashboard (products/prices/webhook endpoint), click Subscribe from the settings billing section, complete a test payment
**Expected:** User is redirected to Stripe Checkout; after payment the `subscription_tier`, `token_budget_total`, and `token_budget_remaining` columns in `user_settings` are updated; the `/usage` page shows the correct budget
**Why human:** Requires live Stripe credentials and webhook round-trip; cannot be verified statically

#### 3. 80% Budget Toast Notification

**Test:** Simulate a user with a token budget near 80% exhausted; trigger a chapter generation; observe browser UI
**Expected:** After the SSE stream completes, a Sonner toast appears in the bottom-right reading "You've used 80% of your monthly token budget..." with a "View Usage" action button
**Why human:** Requires runtime state (specific budget percentage) and visual observation of toast rendering

#### 4. BYOK Invisibility

**Test:** Log in as a user with `openrouter_api_key` set; navigate to all pages including `/usage` directly via URL bar
**Expected:** Nav bar has no "Usage" link; settings page has no billing section; `/usage` URL immediately redirects to `/dashboard`
**Why human:** Requires a live session with API key set and visual inspection of rendered UI

---

### Gaps Summary

No gaps found. All 14 observable truths are verified. All 27 required artifacts exist, are substantive, and are correctly wired. All 14 key links are confirmed present in the code. All 7 requirements (EXPT-01 through BILL-04) are fully satisfied by complete implementations.

The migration `supabase/migrations/00005_billing_and_token_tracking.sql` and Stripe configuration (env vars, dashboard products, webhook endpoint) require manual setup before billing features are live — this is expected and documented in the plan summaries, not a code gap.

---

_Verified: 2026-03-04T23:45:00Z_
_Verifier: Claude (gsd-verifier)_
