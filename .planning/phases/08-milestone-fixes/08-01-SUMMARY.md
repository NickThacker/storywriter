---
phase: 08-milestone-fixes
plan: 01
subsystem: api, auth, ui
tags: [middleware, api-key, openrouter, stripe-webhooks, settings]

requires:
  - phase: 05-export-and-billing
    provides: "Stripe webhook route, billing section, budget-check BYOK detection"
  - phase: 01-foundation
    provides: "Auth middleware, settings page, API key form"
provides:
  - "Middleware allow-list for Stripe webhooks and auth verification paths"
  - "Centralized API key resolution helper (getOpenRouterApiKey)"
  - "Platform key fallback on all 11 generation routes"
  - "Cleaned-up settings page without API Key tab"
affects: [billing, generation-routes, deployment]

tech-stack:
  added: []
  patterns:
    - "getOpenRouterApiKey(userKey) pattern: user BYOK key > platform env var > null"
    - "PUBLIC_PATHS array-based middleware allow-list"

key-files:
  created:
    - src/lib/api-key.ts
  modified:
    - src/lib/supabase/middleware.ts
    - src/app/(dashboard)/settings/page.tsx
    - src/app/api/generate/chapter/route.ts
    - src/app/api/generate/outline/route.ts
    - src/app/api/generate/compress-chapter/route.ts
    - src/app/api/generate/direction-options/route.ts
    - src/app/api/generate/analyze-impact/route.ts
    - src/app/api/generate/analyze-chapter/route.ts
    - src/app/api/generate/premise-prefill/route.ts
    - src/app/api/generate/character-assist/route.ts
    - src/app/api/voice-analysis/route.ts
    - src/app/api/arc/[projectId]/synthesize/route.ts
    - src/app/api/oracle/[projectId]/query/route.ts

key-decisions:
  - "PUBLIC_PATHS array replaces if-chain for easier future additions"
  - "/api/webhooks prefix covers all webhook providers, not just Stripe"
  - "api-key-form.tsx deleted (not hollowed out) since no imports remain"
  - "Billing tab added as standalone tab in settings (not nested under API Key)"
  - "premise-prefill and character-assist keep mock-data fallback when no key available at all"

patterns-established:
  - "getOpenRouterApiKey(userKey): centralized key resolution for all generation routes"
  - "PUBLIC_PATHS array in middleware for unauthenticated route access"

requirements-completed: [BILL-01, BILL-02, BILL-03, BILL-04, AUTH-01]

duration: 4min
completed: 2026-03-09
---

# Phase 08 Plan 01: Middleware, API Key Fallback, and Settings Cleanup Summary

**Middleware allow-list for Stripe webhooks/auth paths, platform API key fallback on all 11 generation routes, and BYOK UI removal from settings**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T22:39:44Z
- **Completed:** 2026-03-09T22:44:05Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Middleware now allows unauthenticated access to /api/webhooks/*, /auth/verify, and /auth/reset-password
- All 11 generation routes fall back to OPENROUTER_API_KEY env var when no user key exists
- Settings page cleaned up: API Key tab removed, Billing tab standalone, no setup banner

## Task Commits

Each task was committed atomically:

1. **Task 1: Middleware allow-list + API key helper** - `07ff268` (feat)
2. **Task 2: Platform key fallback in all generation routes + settings cleanup** - `db0f54c` (feat)

## Files Created/Modified
- `src/lib/api-key.ts` - Centralized API key resolution helper
- `src/lib/supabase/middleware.ts` - PUBLIC_PATHS array-based allow-list
- `src/app/(dashboard)/settings/page.tsx` - Removed API Key tab, added Billing tab, removed setup banner
- `src/components/settings/api-key-form.tsx` - Deleted
- `src/app/api/generate/chapter/route.ts` - Platform key fallback
- `src/app/api/generate/outline/route.ts` - Platform key fallback
- `src/app/api/generate/compress-chapter/route.ts` - Platform key fallback
- `src/app/api/generate/direction-options/route.ts` - Platform key fallback
- `src/app/api/generate/analyze-impact/route.ts` - Platform key fallback
- `src/app/api/generate/analyze-chapter/route.ts` - Platform key fallback
- `src/app/api/generate/premise-prefill/route.ts` - Platform key fallback
- `src/app/api/generate/character-assist/route.ts` - Platform key fallback
- `src/app/api/voice-analysis/route.ts` - Platform key fallback
- `src/app/api/arc/[projectId]/synthesize/route.ts` - Platform key fallback
- `src/app/api/oracle/[projectId]/query/route.ts` - Platform key fallback

## Decisions Made
- PUBLIC_PATHS array replaces if-chain in middleware for maintainability
- /api/webhooks prefix covers all webhook providers (not just /api/webhooks/stripe)
- api-key-form.tsx deleted entirely since no remaining imports
- Billing tab added as standalone settings tab with graceful BYOK/empty state messaging
- premise-prefill and character-assist keep mock-data fallback when neither user key nor platform key exists

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. The OPENROUTER_API_KEY env var should already be set in the deployment environment for platform-key mode to work.

## Next Phase Readiness
- Stripe webhook POST requests can now reach /api/webhooks/stripe without middleware redirect
- Email verification and password reset flows work for unauthenticated users
- All generation routes work with platform key when no BYOK key is configured
- Budget-check BYOK detection remains correct (reads DB column, not resolved key)

---
*Phase: 08-milestone-fixes*
*Completed: 2026-03-09*
