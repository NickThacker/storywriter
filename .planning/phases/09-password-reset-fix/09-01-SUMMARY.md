---
phase: 09-password-reset-fix
plan: 01
subsystem: auth
tags: [supabase, next-app-router, route-groups, server-actions, password-reset]

# Dependency graph
requires: []
provides:
  - Working password reset flow via Supabase recovery email links
  - (reset) route group that bypasses the (auth) layout's redirect-authenticated-users guard
  - Server-side session guard on /auth/reset-password — unauthenticated visitors redirected
  - Success state with CheckCircle icon and 3-second countdown auto-redirect to dashboard
  - Login page session_expired error handling with auto-open forgot-password mode
affects: [auth, future-settings-password-change]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route group isolation: use (reset) group to bypass (auth) layout's redirect for pages that need an authenticated session but are NOT part of the login/signup flow"
    - "Server-side session guard in page.tsx server component — no client-side flash before redirect"
    - "Success state swap: useActionState with success boolean swaps form content in place rather than navigating to new route"

key-files:
  created:
    - src/app/(reset)/layout.tsx
    - src/app/(reset)/auth/reset-password/page.tsx
  modified:
    - src/actions/auth.ts
    - src/components/auth/reset-password-form.tsx
    - src/app/(auth)/login/page.tsx
    - src/components/auth/auth-form.tsx
  deleted:
    - src/app/(auth)/auth/reset-password/page.tsx

key-decisions:
  - "Move reset-password to (reset) route group to bypass (auth) layout's getUser+redirect guard — the layout correctly protects login/signup but incorrectly intercepted recovery users"
  - "updatePassword returns { success: true } instead of calling redirect() so client component can show success state before navigating"
  - "Session guard lives in server component (page.tsx), not client — eliminates flash of form before redirect for unauthenticated users"

patterns-established:
  - "Route group isolation: (reset) group for pages needing authenticated context but bypassing auth flow protection"

requirements-completed: [PRST-01, PRST-02]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 9 Plan 1: Password Reset Fix Summary

**Fixed broken password reset flow by moving /auth/reset-password to a new (reset) route group with server-side session guard, success countdown state, and login-page session_expired error handling**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T15:13:45Z
- **Completed:** 2026-03-12T15:15:35Z
- **Tasks:** 2
- **Files modified:** 6 (4 modified, 2 created, 1 deleted)

## Accomplishments

- Created `(reset)` route group with minimal layout that does NOT redirect authenticated users, resolving the core issue where `(auth)/layout.tsx` was intercepting recovery sessions and redirecting them to `/dashboard` before the form was ever shown
- Server-side session guard in the new page.tsx: unauthenticated visitors are redirected to `/login?error=session_expired` with zero form flash
- `updatePassword` action now returns `{ success: true }` instead of calling `redirect()`, enabling `ResetPasswordForm` to swap to a success state showing CheckCircle icon, "Password updated!" message, and 3-second countdown auto-redirect
- Login page now handles `session_expired` error param with contextual message and auto-opens `forgot-password` mode via new `initialMode` prop on `AuthForm`

## Task Commits

1. **Task 1: Move reset-password to (reset) route group with session guard** - `0377272` (feat)
2. **Task 2: Success state, action fix, and login session_expired handling** - `8ff1c74` (feat)

## Files Created/Modified

- `src/app/(reset)/layout.tsx` — Minimal centering layout, no auth redirect
- `src/app/(reset)/auth/reset-password/page.tsx` — Server component with getUser() session guard
- `src/app/(auth)/auth/reset-password/page.tsx` — DELETED (was in wrong route group)
- `src/actions/auth.ts` — updatePassword returns `{ success: true }` instead of redirect()
- `src/components/auth/reset-password-form.tsx` — Added SuccessState inner component with CheckCircle, countdown, and "Continue now" link
- `src/app/(auth)/login/page.tsx` — Added session_expired error case and initialMode prop pass-through
- `src/components/auth/auth-form.tsx` — Added initialMode?: AuthMode prop, uses it as useState default

## Decisions Made

- Used `(reset)` route group name (not `(public)`) to signal intent: pages for authenticated users that bypass the auth-layout redirect
- `SuccessState` implemented as inner component in the same file — keeps the success/form toggle logic co-located and avoids a new route
- Countdown uses `setInterval` with state decrement (not a setTimeout chain) — simpler cleanup and React state drives the displayed number

## Deviations from Plan

None — plan executed exactly as written. One deviation resolved automatically: `.next/types/validator.ts` had a stale reference to the deleted file causing a TypeScript error; cleared the `.next` cache before the final `tsc --noEmit` run.

## Issues Encountered

Stale `.next` build cache retained a type validator reference to the deleted `(auth)/auth/reset-password/page.tsx`. Clearing the cache with `rm -rf .next` before the TypeScript check resolved this immediately. Not a source code issue.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Password reset flow fully fixed — recovery email links work end-to-end
- Phase 9 complete; ready to proceed to Phase 10 (Stripe billing foundation)

---
*Phase: 09-password-reset-fix*
*Completed: 2026-03-12*

## Self-Check: PASSED

- FOUND: src/app/(reset)/layout.tsx
- FOUND: src/app/(reset)/auth/reset-password/page.tsx
- CONFIRMED DELETED: src/app/(auth)/auth/reset-password/page.tsx
- FOUND commit: 0377272 (Task 1)
- FOUND commit: 8ff1c74 (Task 2)
