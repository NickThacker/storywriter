---
phase: 05-export-and-billing
plan: 05
subsystem: api
tags: [token-tracking, billing, openrouter, sse, transform-stream, supabase]

# Dependency graph
requires:
  - phase: 05-01
    provides: billing TypeScript types (BudgetCheckResult, TokenUsageRow), token_usage table schema
  - phase: 05-04
    provides: Stripe billing pipeline, user_settings billing columns (token_budget_remaining, credit_pack_tokens, subscription_tier)

provides:
  - Token interception TransformStream that extracts usage from OpenRouter SSE without blocking stream
  - Pre-generation budget check function (BYOK bypass, 402 on exhausted, 80% warning)
  - Post-generation token deduction with subscription budget + credit pack overflow logic
  - Token usage DB insert via service-role client (bypasses RLS)
  - All 4 generation route handlers instrumented with budget enforcement and token tracking
  - Server actions for querying token usage (per-project, aggregated, billing-period total)

affects: [06-author-onboarding-and-voice-analysis, usage-page, settings-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TransformStream passthrough interceptor: enqueue first, parse second — stream never blocked"
    - "Fire-and-forget DB writes in SSE stream: .catch(console.error) only, never await in transform callback"
    - "BYOK early return: checkTokenBudget returns isByok=true before any budget logic executes"
    - "Non-streaming routes: capture orJson before parsing content, read usage from same parsed object"

key-files:
  created:
    - src/lib/billing/token-interceptor.ts
    - src/lib/billing/budget-check.ts
    - src/actions/token-usage.ts
  modified:
    - src/app/api/generate/chapter/route.ts
    - src/app/api/generate/compress-chapter/route.ts
    - src/app/api/generate/direction-options/route.ts
    - src/app/api/generate/analyze-impact/route.ts

key-decisions:
  - "Token interceptor always enqueues chunk before parsing — SSE stream latency is strictly zero-overhead"
  - "Non-streaming routes (compress-chapter, direction-options, analyze-impact) capture usage from already-parsed orJson object rather than re-cloning response body"
  - "deductTokens uses subscription budget first, then overflows into credit_pack_tokens using Math.max(0) guard"
  - "checkTokenBudget returns isByok=true on settings read failure — avoids blocking BYOK users if DB is degraded"
  - "direction-options and analyze-impact use chapterNumber: 0 in token_usage inserts (not chapter-specific requests)"

patterns-established:
  - "Budget gate pattern: checkTokenBudget before any OpenRouter call, return 402 with code field on failure"
  - "Token intercept pattern: pipeThrough(createTokenInterceptStream(callback)) with fire-and-forget record+deduct in callback"
  - "Hosted-tier header: X-Budget-Warning: near_limit added to SSE response when usagePercent >= 80%"

requirements-completed: [BILL-02, BILL-03, BILL-04]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 5 Plan 05: Token Tracking and Budget Enforcement Summary

**OpenRouter SSE token interception via passthrough TransformStream, pre-generation budget gates on all 4 generation routes, and fire-and-forget hosted-tier token accounting with BYOK bypass**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T06:12:34Z
- **Completed:** 2026-03-04T06:16:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Token interceptor TransformStream passes every SSE chunk through immediately, then parses usage data from the final OpenRouter chunk without any stream blocking
- All four generation routes (chapter, compress-chapter, direction-options, analyze-impact) have budget checks that return 402 before calling OpenRouter when tokens are exhausted
- BYOK users are completely unaffected — checkTokenBudget returns early with `{ allowed: true, isByok: true }` the moment an openrouter_api_key is found

## Task Commits

Each task was committed atomically:

1. **Task 1: Create token interceptor and budget check utilities** - `d47eede` (feat)
2. **Task 2: Instrument generation route handlers with token tracking** - `2411238` (feat)
3. **Task 3: Create token usage query actions** - `71c96c2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/billing/token-interceptor.ts` - createTokenInterceptStream: passthrough TransformStream that extracts usage.total_tokens from SSE chunks
- `src/lib/billing/budget-check.ts` - checkTokenBudget, deductTokens, recordTokenUsage utility functions
- `src/actions/token-usage.ts` - getTokenUsage, getProjectTokenUsage, getUserTotalUsage server actions
- `src/app/api/generate/chapter/route.ts` - Budget check + TransformStream interceptor for hosted tier, X-Budget-Warning header
- `src/app/api/generate/compress-chapter/route.ts` - Budget check + JSON usage extraction for fire-and-forget accounting
- `src/app/api/generate/direction-options/route.ts` - Budget check + fire-and-forget token record+deduct
- `src/app/api/generate/analyze-impact/route.ts` - Budget check + fire-and-forget token record+deduct

## Decisions Made
- Token interceptor always enqueues chunk before parsing — SSE stream latency is strictly zero-overhead
- Non-streaming routes (compress-chapter, direction-options, analyze-impact) capture usage from the already-parsed orJson variable instead of cloning the response body (body is already consumed by the time token recording runs)
- deductTokens deducts from subscription budget first, then overflows into credit_pack_tokens with Math.max(0) guard to prevent negative values
- checkTokenBudget returns isByok=true on settings read failure to avoid blocking generation if DB is degraded (fail-open for BYOK, since those users have their own API key anyway)
- direction-options and analyze-impact use chapterNumber: 0 in token_usage inserts (these are not chapter-specific generation requests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed response body already-consumed issue in non-streaming routes**
- **Found during:** Task 2 (compress-chapter instrumentation)
- **Issue:** Initial implementation used `orResponse.clone().json()` after the body was already consumed by the earlier `orResponse.json()` parse call — would have thrown at runtime
- **Fix:** Changed non-streaming routes to read usage from the already-parsed `orJson` object captured during the parse step instead of attempting a second read
- **Files modified:** src/app/api/generate/compress-chapter/route.ts, src/app/api/generate/direction-options/route.ts, src/app/api/generate/analyze-impact/route.ts
- **Verification:** TypeScript check passed, build succeeded
- **Committed in:** 2411238 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: response body double-consumption)
**Impact on plan:** Essential correctness fix. No scope creep.

## Issues Encountered
None beyond the auto-fixed body-consumption bug above.

## User Setup Required
None - no external service configuration required. Token tracking uses existing token_usage table (migration 00005_billing_and_token_tracking.sql, applied in Plan 05-01).

## Next Phase Readiness
- Token tracking infrastructure complete — all generation calls record usage to token_usage table
- Budget enforcement active — 402 response codes handled by generation hooks in UI
- Usage query actions ready for the /usage page (Plan 05-06)
- X-Budget-Warning header available for frontend budget warning UI

## Self-Check: PASSED

All created files exist on disk. All task commits confirmed in git history.

---
*Phase: 05-export-and-billing*
*Completed: 2026-03-04*
