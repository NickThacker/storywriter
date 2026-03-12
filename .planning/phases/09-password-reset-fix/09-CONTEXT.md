# Phase 9: Password Reset Fix - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the password reset flow so users who click a Supabase recovery email link land on `/auth/reset-password` with a valid session and can set a new password. Guard against unauthenticated access and provide clear error handling throughout the flow.

</domain>

<decisions>
## Implementation Decisions

### Session guard
- Server-side check in the `page.tsx` server component (not client-side) — no flash of form before redirect
- If no authenticated session, redirect to `/login?error=session_expired` with a message like "Your reset link has expired. Request a new one below."
- Any authenticated user can access the reset password form (not restricted to recovery-only sessions) — useful for future settings-based password change too

### Error experience
- All errors (validation, API, rate-limiting) display as inline red text below form fields — consistent with existing `auth-form.tsx` pattern
- Expired/invalid links redirect to `/login?error=expired_link` — the login page already handles the `error` query param
- Error banners on `/login` should include an action button ("Request new link") that opens/scrolls to the forgot-password form — reduces friction
- "Forgot password?" link already exists in `auth-form.tsx` — no need to add it

### Success confirmation
- After successful password update, the form component swaps to a success state (no new route)
- Success state shows: checkmark icon + "Password updated!" message + "Redirecting to dashboard in 3..." countdown text
- Auto-redirect to `/dashboard` after 3 seconds
- Subtle text countdown (not a progress bar)

### Claude's Discretion
- Exact checkmark icon/animation style
- Countdown implementation details (setInterval vs setTimeout chain)
- Error message copy for edge cases (rate limiting, network errors)
- Whether to add a "Continue now" link alongside the countdown

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/auth/reset-password-form.tsx` — form UI already exists with password + confirm fields, `useActionState` pattern
- `src/components/auth/auth-form.tsx` — has `ForgotPasswordForm` component and `forgot-password` mode, handles `error` query params
- `src/actions/auth.ts` — `updatePassword()` action with Zod validation, session check, and redirect
- `src/app/(auth)/auth/confirm/route.ts` — PKCE code exchange, already routes recovery type to `/auth/reset-password`
- `src/app/(auth)/auth/verify/page.tsx` — OTP/token_hash flow, already routes recovery to `/auth/reset-password`
- `src/components/ui/card.tsx`, `input.tsx`, `button.tsx`, `label.tsx` — UI primitives used by the form

### Established Patterns
- `useActionState` for form actions with `{ error?: string }` return type
- Server actions in `src/actions/auth.ts` with Zod schema validation
- `PUBLIC_PATHS` array in middleware for unauthenticated route access
- Query param-based error passing (`/login?error=expired_link`)

### Integration Points
- `src/lib/supabase/middleware.ts` — `/auth/reset-password` already in `PUBLIC_PATHS`
- `src/app/(auth)/layout.tsx` — shared auth layout wrapping the reset page
- `resetPasswordForEmail` uses `redirectTo: ${siteUrl}/auth/confirm?next=/auth/reset-password` — this is the entry point for the flow
- `updatePassword` action currently does `redirect('/dashboard')` — needs to return success state instead of redirecting

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-password-reset-fix*
*Context gathered: 2026-03-12*
