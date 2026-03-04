---
phase: 05-export-and-billing
plan: 01
subsystem: database
tags: [stripe, supabase, typescript, billing, token-tracking, migrations]

# Dependency graph
requires:
  - phase: 04-creative-checkpoints
    provides: chapter_checkpoints and project_memory tables used for token tracking context
provides:
  - supabase/migrations/00005_billing_and_token_tracking.sql (token_usage, stripe_webhook_events tables, user_settings billing columns)
  - src/types/billing.ts (TokenUsageRow, BillingStatus, BudgetCheckResult, TierConfig, CreditPackConfig)
  - src/types/database.ts extended with new SubscriptionTier values and billing fields
  - src/lib/stripe/client.ts (Stripe singleton, null-safe for BYOK deployments)
affects: [05-02, 05-03, 05-04, 05-05, 05-06, 05-07]

# Tech tracking
tech-stack:
  added: [stripe@20.4.0]
  patterns:
    - Null-safe Stripe singleton (stripe = null when STRIPE_SECRET_KEY unset; BYOK deployments work without billing)
    - UserSettingsRow extended in-place with nullable billing fields (no breaking changes to existing callers)
    - billing.ts as dedicated billing type module imported by database.ts (unidirectional: billing.ts has no database.ts imports)

key-files:
  created:
    - supabase/migrations/00005_billing_and_token_tracking.sql
    - src/types/billing.ts
    - src/lib/stripe/client.ts
  modified:
    - src/types/database.ts
    - .env.local.example

key-decisions:
  - "Stripe API version pinned to 2026-02-25.clover (installed stripe v20.4.0 requires .clover suffix, not .acacia)"
  - "billing.ts is a standalone types module imported by database.ts — avoids circular imports"
  - "stripe client export is Stripe | null (not Stripe!) — BYOK deployments with no STRIPE_SECRET_KEY still build and run"
  - "Subscription tiers: Starter $9/500K tokens, Writer $19/2M tokens, Pro $39/5M tokens (per research discretion)"
  - "TIER_CONFIGS and CREDIT_PACK_CONFIGS defined in billing.ts with placeholder stripePriceId strings — filled via env vars at runtime"

patterns-established:
  - "Pattern: Null-safe singleton — check `if (stripe)` before any Stripe API call in billing actions"
  - "Pattern: BYOK gate — check openrouter_api_key first; if set, skip all billing logic"
  - "Pattern: Service-role-only inserts — token_usage and stripe_webhook_events have no INSERT policy; route handlers use SUPABASE_SERVICE_ROLE_KEY"

requirements-completed: [BILL-01, BILL-02, BILL-04]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 05 Plan 01: Billing Database Schema, TypeScript Types, and Stripe Client Summary

**Supabase migration for token_usage and stripe_webhook_events tables, billing columns on user_settings, and null-safe Stripe singleton using stripe v20.4.0 with 2026-02-25.clover API version**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-04T05:47:27Z
- **Completed:** 2026-03-04T05:50:31Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Created migration `00005_billing_and_token_tracking.sql` with token_usage table, stripe_webhook_events table, 6 new user_settings billing columns, updated subscription_tier constraint, RLS policies, and 2 indexes
- Created `src/types/billing.ts` with all billing types (TokenUsageRow, BillingStatus, BudgetCheckResult, TierConfig, CreditPackConfig) plus tier/pack constants
- Extended `src/types/database.ts`: SubscriptionTier now includes starter/writer/pro, UserSettingsRow has billing fields, Database type has token_usage and stripe_webhook_events tables
- Created null-safe Stripe singleton at `src/lib/stripe/client.ts` (safe for BYOK deployments without Stripe keys)
- Installed `stripe@20.4.0` Node.js SDK
- Updated `.env.local.example` with all Stripe environment variables

## Task Commits

Each task was committed atomically:

1. **Task 1: Create billing database migration** - `55402f1` (feat)
2. **Task 2: Create billing TypeScript types and update Database type** - `c7a49cc` (feat)
3. **Task 3: Create Stripe client singleton** - `802f311` (feat)

## Files Created/Modified

- `supabase/migrations/00005_billing_and_token_tracking.sql` - Full billing schema migration (must apply manually in Supabase SQL Editor)
- `src/types/billing.ts` - All billing-related TypeScript interfaces and constants
- `src/types/database.ts` - Extended with SubscriptionTier tiers, UserSettingsRow billing fields, Database table entries for token_usage and stripe_webhook_events
- `src/lib/stripe/client.ts` - Server-only Stripe singleton (null-safe)
- `.env.local.example` - Added Stripe env var placeholders

## Decisions Made

- Stripe API version pinned to `2026-02-25.clover` (installed stripe v20.4.0 requires `.clover` suffix, not `.acacia` as specified in plan which was written for an older version)
- `billing.ts` is a standalone types module imported by `database.ts` to avoid circular dependency
- `stripe` export is `Stripe | null` (not `Stripe!`) — allows BYOK deployments to build and run without Stripe keys
- Subscription tier pricing chosen per research discretion: Starter $9/500K, Writer $19/2M, Pro $39/5M

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated Stripe apiVersion from 2024-12-18.acacia to 2026-02-25.clover**
- **Found during:** Task 3 (Create Stripe client singleton)
- **Issue:** Plan specified `apiVersion: '2024-12-18.acacia'` but installed `stripe@20.4.0` only accepts `'2026-02-25.clover'`. TypeScript error: `Type '"2024-12-18.acacia"' is not assignable to type '"2026-02-25.clover"'`
- **Fix:** Updated apiVersion string to `'2026-02-25.clover'` to match the installed package's type constraints
- **Files modified:** `src/lib/stripe/client.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors after fix
- **Committed in:** `802f311` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug fix)
**Impact on plan:** Necessary version bump for the installed stripe package. No scope creep.

## Issues Encountered

None beyond the auto-fixed Stripe API version (Rule 1 fix above).

## User Setup Required

The migration `00005_billing_and_token_tracking.sql` must be applied manually in the Supabase SQL Editor before any billing features can function. This is consistent with all prior phase migrations in this project.

Stripe environment variables must be added to `.env.local` before billing actions will work:
- `STRIPE_SECRET_KEY` — from Stripe Dashboard > Developers > API Keys
- `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard > Developers > Webhooks
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — from Stripe Dashboard > Developers > API Keys
- Price ID env vars — after creating products in Stripe Dashboard

BYOK users (those with `openrouter_api_key` set) do not need Stripe configured.

## Next Phase Readiness

- Billing foundation complete — all subsequent 05-xx plans can import from `@/types/billing` and `@/lib/stripe/client`
- Migration ready to apply in Supabase SQL Editor
- TypeScript compiles cleanly with zero errors
- Stripe client pattern established (null-safe check before all API calls)

## Self-Check: PASSED

All 6 output files verified present on disk. All 3 task commits (55402f1, c7a49cc, 802f311) verified in git log.

---
*Phase: 05-export-and-billing*
*Completed: 2026-03-04*
