# Phase 9: Password Reset Fix - Research

**Researched:** 2026-03-12
**Domain:** Supabase Auth recovery flow, Next.js App Router server components, React useActionState
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Session guard
- Server-side check in the `page.tsx` server component (not client-side) — no flash of form before redirect
- If no authenticated session, redirect to `/login?error=session_expired` with a message like "Your reset link has expired. Request a new one below."
- Any authenticated user can access the reset password form (not restricted to recovery-only sessions) — useful for future settings-based password change too

#### Error experience
- All errors (validation, API, rate-limiting) display as inline red text below form fields — consistent with existing `auth-form.tsx` pattern
- Expired/invalid links redirect to `/login?error=expired_link` — the login page already handles the `error` query param
- Error banners on `/login` should include an action button ("Request new link") that opens/scrolls to the forgot-password form — reduces friction
- "Forgot password?" link already exists in `auth-form.tsx` — no need to add it

#### Success confirmation
- After successful password update, the form component swaps to a success state (no new route)
- Success state shows: checkmark icon + "Password updated!" message + "Redirecting to dashboard in 3..." countdown text
- Auto-redirect to `/dashboard` after 3 seconds
- Subtle text countdown (not a progress bar)

### Claude's Discretion
- Exact checkmark icon/animation style
- Countdown implementation details (setInterval vs setTimeout chain)
- Error message copy for edge cases (rate limiting, network errors)
- Whether to add a "Continue now" link alongside the countdown

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRST-01 | Recovery link from Supabase email lands on `/auth/reset-password` with an active session (server-side guard redirects to login with error if no session) | Auth layout bug identified; server component guard pattern documented below |
| PRST-02 | User can enter and confirm a new password on the reset page, then is redirected to dashboard on success | `updatePassword` action already exists; needs return-success-state instead of redirect; success UI pattern documented below |
</phase_requirements>

---

## Summary

The password reset flow is mostly wired but has two blockers preventing it from working. The first and most critical is that `src/app/(auth)/layout.tsx` redirects any authenticated user to `/dashboard` — but users arriving via a Supabase recovery link ARE authenticated (the session was established by `/auth/confirm`), so they are bounced away before ever seeing the reset form. The second blocker is that `updatePassword` in `src/actions/auth.ts` calls `redirect('/dashboard')` on success instead of returning a success state that the form component can render.

The fix is surgical: move `/auth/reset-password` out of the `(auth)` route group into its own layout (or a new route group) so the auth-layout redirect no longer applies; add a server-side session guard directly in the page instead; and update `updatePassword` to return `{ success: true }` so the client component can show the countdown state before redirecting.

Three files drive the entire user-facing flow: the page (`page.tsx`), the form component (`reset-password-form.tsx`), and the server action (`updatePassword` in `auth.ts`). The login page (`login/page.tsx`) needs a minor addition to handle the `session_expired` error param and render an action button pointing to the forgot-password form.

**Primary recommendation:** Extract `/auth/reset-password` out of the `(auth)` route group to break the auth-layout redirect loop, add a server-component session guard in the page, and update the action + form to support a success state with countdown.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | already installed | Server-side session access via `createClient()` | Project standard for all auth checks |
| `next/navigation` | Next.js 15 | `redirect()` in server components | App Router pattern; already used everywhere |
| React `useActionState` | React 19 | Form action state management | Already the pattern in `reset-password-form.tsx` and `auth-form.tsx` |
| `lucide-react` | already installed | Checkmark icon for success state | Project standard for icons (used throughout the codebase) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `setTimeout` / `setInterval` | browser built-in | Countdown timer in success state | Countdown implementation; `useEffect` + `setInterval` is the idiomatic React approach |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Moving page to new route group | Adding exception logic to `(auth)/layout.tsx` | Exception logic couples layout to specific child paths — fragile; separate route group is cleaner |
| `setInterval` countdown | `setTimeout` chain | Both work; `setInterval` is simpler for a decrement counter |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

The reset-password page must be moved out of `(auth)/` to avoid the auth-layout redirect. The cleanest approach is a new minimal route group:

```
src/app/
├── (auth)/
│   ├── layout.tsx          # UNCHANGED — still redirects authenticated users
│   ├── login/page.tsx      # Minor update: handle session_expired error param
│   └── auth/
│       ├── confirm/route.ts # UNCHANGED
│       └── verify/page.tsx  # UNCHANGED
├── (reset)/                # NEW — minimal layout, no auth redirect
│   ├── layout.tsx          # Thin layout: just centering wrapper
│   └── auth/
│       └── reset-password/
│           └── page.tsx    # Server component with session guard
└── src/components/auth/
    └── reset-password-form.tsx  # Updated: success state + countdown
```

### Pattern 1: Server Component Session Guard

**What:** Page server component checks for an authenticated user. If none, redirects before rendering. No flash of form.

**When to use:** Any page that requires authentication but is in a public route (outside the `(auth)` layout's redirect logic).

```typescript
// src/app/(reset)/auth/reset-password/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata = { title: 'Reset Password — Meridian' }

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=session_expired')
  }

  return <ResetPasswordForm />
}
```

### Pattern 2: Server Action Returning Success State

**What:** `updatePassword` currently calls `redirect('/dashboard')` on success, which prevents the client component from showing a success state. The action needs to return `{ success: true }` instead; the client component handles the redirect after the countdown.

**When to use:** Any server action where the UI needs to react to success (show confirmation, countdown, etc.) before navigating.

```typescript
// In src/actions/auth.ts — updatePassword
export async function updatePassword(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error: string } | { success: boolean }> {
  // ... validation and supabase.auth.updateUser() unchanged ...

  if (error) {
    return { error: error.message }
  }

  return { success: true }  // Client handles redirect after countdown
}
```

### Pattern 3: Success State with Countdown in Client Component

**What:** The form component uses `useActionState`. When `state.success` is truthy, it renders a success panel and starts a `useEffect` countdown that calls `router.push('/dashboard')` after 3 seconds.

```typescript
// In reset-password-form.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

// When state.success is true:
function SuccessState() {
  const router = useRouter()
  const [seconds, setSeconds] = useState(3)

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval)
          router.push('/dashboard')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [router])

  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <CheckCircle className="h-10 w-10 text-green-500" />
      <p className="font-semibold">Password updated!</p>
      <p className="text-sm text-muted-foreground">
        Redirecting to dashboard in {seconds}...
      </p>
    </div>
  )
}
```

### Pattern 4: Login Page Error Param Expansion

**What:** `login/page.tsx` already handles `invalid_token` and `expired_link` error params. Adding `session_expired` with an action button that switches `AuthForm` to `forgot-password` mode.

**Constraint from CONTEXT.md:** The error banner should include an action button ("Request new link") that opens/scrolls to the forgot-password form.

Implementation: Pass a `initialMode` or `autoOpenForgotPassword` prop to `AuthForm` when `error === 'session_expired'`, which starts the component in `forgot-password` mode.

```typescript
// login/page.tsx addition
const error =
  params.error === 'session_expired'
    ? 'Your reset link has expired. Request a new one below.'
    : // ... existing cases

// AuthForm gets initialMode prop
<AuthForm initialError={error} initialMode={params.error === 'session_expired' ? 'forgot-password' : 'sign-in'} />
```

### Anti-Patterns to Avoid

- **Checking session in `(auth)/layout.tsx` with an exception list:** Adding `if pathname === /auth/reset-password, skip redirect` to the layout couples the layout to specific child routes. Moving to a separate route group is cleaner.
- **Client-side session check in reset-password:** Produces a flash where the form renders briefly before redirect. The server component guard eliminates this.
- **Calling `redirect()` from `updatePassword` action on success:** Prevents the client from accessing the success state to show the countdown. Return `{ success: true }` and let the client redirect.
- **Using `getSession()` instead of `getUser()` for the session guard:** Supabase docs and existing project code both use `getUser()` for server-side auth checks. `getSession()` trusts the client JWT without verification (see comment in `middleware.ts`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Countdown timer | Custom animation or complex timer | `setInterval` in `useEffect` | 3 lines; handles cleanup on unmount |
| Session verification | Manual JWT parsing | `supabase.auth.getUser()` | Already the project standard; handles refresh tokens correctly |
| Routing after countdown | `window.location.href` | `useRouter().push()` | App Router standard; preserves client-side navigation |

---

## Common Pitfalls

### Pitfall 1: Auth Layout Redirect Traps Authenticated Recovery Users
**What goes wrong:** User clicks recovery link, `/auth/confirm` exchanges the code and establishes a session, then redirects to `/auth/reset-password`. But that page is inside `(auth)/layout.tsx` which immediately redirects authenticated users to `/dashboard`. The user never sees the reset form.
**Why it happens:** The `(auth)` layout is designed to keep logged-in users out of auth pages — correct for login/signup, but wrong for the reset-password page which needs an authenticated session.
**How to avoid:** Move `/auth/reset-password` to a separate route group `(reset)` with its own minimal layout.
**Warning signs:** After clicking the recovery link, the browser ends up at `/dashboard` without ever showing a password form.

### Pitfall 2: `updatePassword` Action Redirect Blocks Success UI
**What goes wrong:** `updatePassword` currently ends with `redirect('/dashboard')`. Server actions that call `redirect()` throw a special Next.js error that bypasses the `useActionState` return value. The form component never sees a success response — it just navigates.
**Why it happens:** `redirect()` in a server action is implemented as a thrown error caught by Next.js routing. It works for simple form submissions but prevents any post-success client rendering.
**How to avoid:** Return `{ success: true }` from the action; client component calls `router.push('/dashboard')` after countdown.
**Warning signs:** The countdown state never appears; user is immediately sent to dashboard on form submit.

### Pitfall 3: `(reset)` Layout Must Wrap the Centering UI
**What goes wrong:** Moving the page to `(reset)/auth/reset-password/page.tsx` without a layout means the page loses the `min-h-screen flex items-center justify-center` centering that `(auth)/layout.tsx` provided.
**Why it happens:** The centering is in the layout, not the page component.
**How to avoid:** Create `(reset)/layout.tsx` with the same centering wrapper as `(auth)/layout.tsx` but without the auth redirect.

### Pitfall 4: `session_expired` Error Param Not Handled on Login Page
**What goes wrong:** The guard redirects to `/login?error=session_expired` but `login/page.tsx` only handles `invalid_token` and `expired_link`. The `session_expired` param is silently ignored; no error message shown.
**Why it happens:** The new error param code was not added to the existing switch/conditional in `login/page.tsx`.
**How to avoid:** Add `session_expired` case to `login/page.tsx` and optionally set `initialMode='forgot-password'` on `AuthForm`.

### Pitfall 5: `PUBLIC_PATHS` in middleware still includes `/auth/reset-password`
**What goes wrong:** The middleware already has `/auth/reset-password` in `PUBLIC_PATHS` (confirmed in `middleware.ts`). This is correct — the middleware should NOT redirect unauthenticated users away from that path (the page's own server guard handles it). Do NOT remove it from `PUBLIC_PATHS`.
**Why it happens:** Confusion between the middleware (network-level) guard and the page-level server component guard.
**How to avoid:** Leave middleware `PUBLIC_PATHS` unchanged; add the server-component guard in the page itself.

---

## Code Examples

Verified patterns from the existing codebase:

### Existing: Session check in a server component
```typescript
// Pattern already used in src/app/(auth)/layout.tsx
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (user) { redirect('/dashboard') }
```

### Existing: useActionState with error rendering
```typescript
// Pattern from reset-password-form.tsx (already correct)
const [state, formAction, isPending] = useActionState<ActionState, FormData>(
  updatePassword,
  null
)
// ... render state.error inline
```

### Existing: Error param handling in login page
```typescript
// From src/app/(auth)/login/page.tsx
const error =
  params.error === 'invalid_token'
    ? 'The verification link is invalid. Please try again.'
    : params.error === 'expired_link'
    ? 'This link has already been used or has expired. Please request a new one.'
    : undefined
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `getSession()` for server auth checks | `getUser()` with server verification | Already updated in this project; don't revert |
| `redirect()` at end of form action | Return state; client navigates | Needed for success-state UI pattern |

---

## Open Questions

1. **`initialMode` prop for `AuthForm`**
   - What we know: `AuthForm` starts in `sign-in` mode via `useState`. `initialError` prop already exists.
   - What's unclear: Whether to add `initialMode` prop to auto-open forgot-password mode when `session_expired`, or just show the error message and let users click "Forgot password?" themselves.
   - Recommendation: Add `initialMode?: AuthMode` prop — it's a one-liner addition and reduces friction as specified in CONTEXT.md ("include an action button"). Starting in `forgot-password` mode IS the action.

2. **Route group naming**
   - What we know: Next.js route groups with parentheses in name don't affect the URL path.
   - What's unclear: Whether to call it `(reset)` or `(password-reset)` or just `(standalone)`.
   - Recommendation: Use `(reset)` — short, clear intent.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all findings are from reading the actual source files
  - `src/app/(auth)/layout.tsx` — confirmed auth redirect bug
  - `src/actions/auth.ts` — confirmed `redirect('/dashboard')` after `updatePassword`
  - `src/lib/supabase/middleware.ts` — confirmed `/auth/reset-password` already in `PUBLIC_PATHS`
  - `src/app/(auth)/auth/confirm/route.ts` — confirmed recovery flow routes to `/auth/reset-password`
  - `src/app/(auth)/auth/reset-password/page.tsx` — confirmed page exists but has no session guard
  - `src/components/auth/reset-password-form.tsx` — confirmed form exists with correct fields
  - `src/app/(auth)/login/page.tsx` — confirmed error param handling, `session_expired` not yet handled

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all findings from existing code
- Architecture: HIGH — root cause confirmed by reading actual source; fix pattern matches existing project conventions
- Pitfalls: HIGH — all pitfalls derived from direct code inspection, not speculation

**Research date:** 2026-03-12
**Valid until:** Stable (auth flow changes infrequently) — valid for 60+ days
