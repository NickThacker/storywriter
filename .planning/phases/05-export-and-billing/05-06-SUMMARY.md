---
phase: 05-export-and-billing
plan: "06"
subsystem: ui
tags: [billing, stripe, sonner, next.js, sse, tokens, usage]

# Dependency graph
requires:
  - phase: 05-export-and-billing/05-04
    provides: getBillingStatus, createCheckoutSession, createCreditPackSession, createPortalSession actions and BillingStatus type
  - phase: 05-export-and-billing/05-05
    provides: getUserTotalUsage, getProjectTokenUsage token usage actions, X-Budget-Warning SSE response header

provides:
  - /usage page with budget bar, period summary, per-project token breakdown
  - UsageBar component (progress bar with color-coded fill and formatTokens helper)
  - PlanCard component (tier display card with subscribe button)
  - UpgradeModal component (hard-block dialog at 100% usage with tier cards and credit packs)
  - BillingSection component (settings page integration with plan details, usage bar, credit pack buttons)
  - useBudgetWarning hook and checkBudgetWarning standalone function (Sonner toast at 80% limit)
  - checkBudgetWarning wired into use-chapter-stream.ts after SSE fetch
  - Settings page billing section (hidden for BYOK users)
  - Dashboard layout /usage nav link (hidden for BYOK users)

affects: [06-author-onboarding-and-voice-analysis, future UI work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BYOK check in layout via direct openrouter_api_key query (avoids full getBillingStatus fetch)"
    - "checkBudgetWarning is a standalone function (no hook deps) — callable from any context"
    - "Sonner toast with action button for usage warnings"
    - "Server component /usage page with parallel data fetching"

key-files:
  created:
    - src/components/billing/usage-bar.tsx
    - src/components/billing/plan-card.tsx
    - src/components/billing/upgrade-modal.tsx
    - src/components/billing/billing-section.tsx
    - src/hooks/use-budget-warning.ts
    - src/app/(dashboard)/usage/page.tsx
  modified:
    - src/hooks/use-chapter-stream.ts
    - src/app/(dashboard)/settings/page.tsx
    - src/app/(dashboard)/layout.tsx

key-decisions:
  - "BYOK check in dashboard layout queries openrouter_api_key directly (not getBillingStatus) to avoid heavy auth fetch on every layout render"
  - "checkBudgetWarning exported as standalone function (not hook-only) so it can be called from useCallback inside use-chapter-stream.ts without violating rules of hooks"
  - "UsageBar color scheme: green < 50%, yellow 50-80%, red 80%+ — matches intuitive traffic-light UX"
  - "BillingSection shows tier cards for tier=none users and plan details + credit packs for active subscribers"

patterns-established:
  - "BYOK gating: check isByok before rendering any billing UI — applies to page, settings section, and nav link"
  - "Sonner toast with action link to /usage for budget warnings"

requirements-completed: [BILL-01, BILL-02, BILL-03, BILL-04]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 05 Plan 06: Billing UI Summary

**Token usage dashboard (/usage), budget warning toast (80% SSE hook wiring), UpgradeModal hard-block (100%), and BYOK-invisible billing section in settings using Sonner + Radix Dialog**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-04T06:19:05Z
- **Completed:** 2026-03-04T06:22:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Built 4 billing components: UsageBar, PlanCard, UpgradeModal, BillingSection — all client components with correct props matching BillingStatus, TierConfig, and CreditPackConfig interfaces
- Created /usage server page with budget bar, period summary, per-project usage sorted descending, BYOK redirect to /dashboard
- Wired checkBudgetWarning(response) into use-chapter-stream.ts after SSE fetch to fire BILL-03 80% toast
- BYOK users see zero billing UI: no /usage nav link, no BillingSection in settings, immediate redirect if /usage URL visited directly

## Task Commits

1. **Task 1: Create billing UI components** - `ab00618` (feat)
2. **Task 2: Usage page, budget warning hook, chapter stream wiring, settings and layout integration** - `0a9386f` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/components/billing/usage-bar.tsx` - Progress bar with color-coded fill (green/yellow/red), formatTokens helper, credit pack label, warning messages
- `src/components/billing/plan-card.tsx` - Tier display card with price, token count, novels/month estimate, subscribe button
- `src/components/billing/upgrade-modal.tsx` - Hard-block Radix Dialog at 100% usage with TIERS and CREDIT_PACKS, loading state during Stripe redirect
- `src/components/billing/billing-section.tsx` - Settings page integration: tier cards for new users, plan details + usage bar + credit packs for active subscribers
- `src/hooks/use-budget-warning.ts` - checkBudgetWarning standalone function + useBudgetWarning hook wrapper
- `src/app/(dashboard)/usage/page.tsx` - Server component: auth guard, BYOK redirect, parallel data fetch, budget bar, period summary, per-project breakdown, near-limit banner
- `src/hooks/use-chapter-stream.ts` - Added import + single checkBudgetWarning(response) call after successful SSE fetch
- `src/app/(dashboard)/settings/page.tsx` - Added getBillingStatus fetch, BillingSection conditional render for non-BYOK users
- `src/app/(dashboard)/layout.tsx` - Added openrouter_api_key BYOK check, conditional /usage nav link

## Decisions Made

- BYOK check in dashboard layout queries `openrouter_api_key` directly rather than calling `getBillingStatus()` — avoids a heavier server action on every layout render while still correctly gating the nav link
- `checkBudgetWarning` is exported as a standalone function (not tied to hook lifecycle) so it can be safely called inside `useCallback` in `use-chapter-stream.ts` without violating rules of hooks
- UsageBar color-coding: green below 50%, yellow 50-80%, red at 80%+ — intuitive traffic-light progression matching the warning thresholds
- `BillingSection` shows initial signup flow (tier cards) when `tier === 'none'`, and subscription management flow when tier is active

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no new external service configuration required. Existing STRIPE env vars and billing database schema (from plans 01 and 04) are sufficient.

## Next Phase Readiness

- All BILL-01 through BILL-04 requirements implemented
- Phase 05 plan 07 (if any) can build on billing UI components
- UpgradeModal is available for use in chapter generation flow if needed (import from @/components/billing/upgrade-modal)

---
*Phase: 05-export-and-billing*
*Completed: 2026-03-04*

## Self-Check: PASSED

All created files found on disk. All task commits verified in git log.
