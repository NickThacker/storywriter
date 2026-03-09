# Phase 8: Milestone Fixes - Research

**Researched:** 2026-03-09
**Domain:** Next.js middleware, API key architecture, verification audit
**Confidence:** HIGH

## Summary

Phase 8 closes the gaps identified in v1.0-MILESTONE-AUDIT.md. There are four distinct workstreams: (1) middleware allow-list fixes for Stripe webhooks and auth verification paths, (2) BYOK UI removal and platform API key fallback, (3) Phase 6 formal verification producing VERIFICATION.md, and (4) REQUIREMENTS.md traceability updates.

All workstreams are well-scoped with clear code targets. The middleware fix is a 3-line addition. The BYOK removal is a UI deletion plus a fallback pattern in generation routes. Phase 6 verification is a code audit + smoke test producing a document. Traceability is a documentation update.

**Primary recommendation:** Execute as 3-4 small plans -- middleware fix, BYOK removal + platform key fallback, Phase 6 verification, and traceability update. All are independent and could run in parallel.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Middleware allow-list: Add `/api/webhooks/*` pattern (not just Stripe), add `/auth/verify` and `/auth/reset-password` to public paths
- Drop "/ renders for unauthenticated visitors" criterion -- no public landing page on the app; unauthenticated users redirect to `/login` (keep current behavior)
- App hosted at `app.meridianwrite.com`; marketing site at `www.meridianwrite.com` is separate
- BYOK removal: Remove API key form from settings UI entirely (permanent removal, not temporary hide)
- Do NOT remove backend plumbing -- keep `openrouter_api_key` column in `user_settings`
- Add platform-level `OPENROUTER_API_KEY` env var
- All generation routes fall back to platform key when no user key is set
- User's own OpenRouter API key goes into `.env.local` as `OPENROUTER_API_KEY` for local dev
- No "stored encrypted" or "stored securely" copy needed -- the form is gone
- Phase 6 verification: code audit + smoke test for each VOIC requirement, write VERIFICATION.md

### Claude's Discretion
- Exact middleware code structure (if-chain vs array of patterns)
- How to handle the API key fallback in generation routes (env var read pattern)
- VERIFICATION.md format and level of detail

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-01 | Hosted tier users subscribe to a plan with token/credit budget | Middleware fix unblocks Stripe webhook so subscription lifecycle events reach the handler |
| BILL-02 | Token usage is tracked per user and per project | Middleware fix enables invoice.paid event to reset billing period |
| BILL-03 | User is warned when approaching their token budget limit | Requires working subscription state, which depends on webhook |
| BILL-04 | BYOK users bypass billing (use their own OpenRouter credits) | Platform key fallback changes BYOK detection logic -- budget-check.ts checks `openrouter_api_key` column |
| AUTH-01 | User can create an account with email and password | Middleware fix adds `/auth/verify` and `/auth/reset-password` to allow-list, unblocking OTP email verification |
| VOIC-01 | User can complete voice onboarding wizard | Phase 6 verification confirms this works |
| VOIC-02 | User can provide writing samples | Phase 6 verification confirms this works |
| VOIC-03 | AI analyzes writing samples to produce voice persona | Phase 6 verification confirms this works |
| VOIC-04 | User receives downloadable PDF style report | Phase 6 verification confirms this works |
| VOIC-05 | Author voice persona injected into generation prompts | Phase 6 verification confirms this works |
| VOIC-06 | User can revisit and edit voice profile from Settings | Phase 6 verification confirms this works |
| VOIC-07 | First-time users nudged to set up voice profile | Phase 6 verification confirms this works |
</phase_requirements>

## Architecture Patterns

### Workstream 1: Middleware Allow-List Fix

**Current state:** `src/lib/supabase/middleware.ts` lines 36-44 use an if-chain with `!request.nextUrl.pathname.startsWith(...)` checks. Only `/login`, `/auth/confirm`, and `/api/health` are allowed.

**Root `middleware.ts`** delegates entirely to `updateSession()`. The matcher config already runs on all non-static paths.

**What to add:**
- `/api/webhooks` -- covers `/api/webhooks/stripe` and any future webhook endpoints
- `/auth/verify` -- OTP email verification callback
- `/auth/reset-password` -- password reset flow

**Recommended pattern:** Convert the if-chain to an array-based approach for readability:

```typescript
const PUBLIC_PATHS = [
  '/login',
  '/auth/confirm',
  '/auth/verify',
  '/auth/reset-password',
  '/api/health',
  '/api/webhooks',
]

const isPublic = PUBLIC_PATHS.some(p => request.nextUrl.pathname.startsWith(p))

if (!user && !isPublic) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}
```

**Confidence:** HIGH -- direct code inspection confirms the exact lines to change.

### Workstream 2: BYOK UI Removal + Platform Key Fallback

**Current state of API key usage in generation routes:**

All 9 generation routes follow the same pattern:
1. Query `user_settings.openrouter_api_key` for the authenticated user
2. If null, return 400 "No OpenRouter API key configured"
3. Use the key in the `Authorization: Bearer ${apiKey}` header to OpenRouter

**Files that read `openrouter_api_key` from user_settings:**
- `src/app/api/generate/chapter/route.ts`
- `src/app/api/generate/outline/route.ts`
- `src/app/api/generate/compress-chapter/route.ts`
- `src/app/api/generate/direction-options/route.ts`
- `src/app/api/generate/analyze-impact/route.ts`
- `src/app/api/generate/analyze-chapter/route.ts`
- `src/app/api/generate/premise-prefill/route.ts`
- `src/app/api/generate/character-assist/route.ts`
- `src/app/api/voice-analysis/route.ts`
- `src/app/api/arc/[projectId]/synthesize/route.ts`
- `src/app/api/oracle/[projectId]/query/route.ts`

**Also reads `openrouter_api_key`:**
- `src/lib/billing/budget-check.ts` -- uses it to determine BYOK status
- `src/actions/billing.ts` -- uses it for `isByok` flag
- `src/app/(dashboard)/layout.tsx` -- uses it to show/hide "Usage" nav link

**Recommended fallback pattern:** Create a helper function to centralize API key resolution:

```typescript
// src/lib/api-key.ts
export function getOpenRouterApiKey(userKey: string | null): string | null {
  return userKey || process.env.OPENROUTER_API_KEY || null
}
```

Then in each route, replace the null check:
```typescript
// Before:
if (!apiKey) { return 400 }

// After:
const resolvedKey = getOpenRouterApiKey(apiKey)
if (!resolvedKey) { return 400 }
```

**BYOK detection impact:** When all users get a platform key fallback, the BYOK detection in `budget-check.ts` and `layout.tsx` needs adjustment. Currently `isByok = Boolean(settings.openrouter_api_key)`. With platform key, the distinction becomes: does the user have a *personal* key in `user_settings`? This stays the same -- the DB column still only stores personal keys.

**UI removal:**
- Delete or empty `src/components/settings/api-key-form.tsx`
- Remove the import and `<ApiKeyForm>` from `src/app/(dashboard)/settings/page.tsx`
- Remove the "API Key" tab entirely (rename remaining tab or restructure)
- Remove the "Get started: Connect your OpenRouter API key" banner from settings page
- Clean up `src/actions/settings.ts` -- `saveApiKey`, `testApiKey`, `deleteApiKey` can stay (backend plumbing kept per user decision) but are no longer called from UI
- The `getApiKeyStatus` action is still used by settings page -- may need to keep or simplify

**Confidence:** HIGH -- all file paths and patterns verified by direct code inspection.

### Workstream 3: Phase 6 Verification

**What exists:** 5 completed plans (06-01 through 06-05) with SUMMARYs. Plan 06-06 was a verification plan but was never executed (no 06-06-SUMMARY.md exists).

**Files to verify for each VOIC requirement:**

| VOIC | What to check | Key files |
|------|---------------|-----------|
| VOIC-01 | Wizard exists at /onboarding with steps | `src/app/(dashboard)/onboarding/page.tsx`, `src/lib/stores/voice-wizard-store.ts` |
| VOIC-02 | Text paste + file upload (PDF/DOCX/TXT) | `src/components/onboarding/writing-samples-step.tsx`, `src/app/api/voice-upload/route.ts`, `src/lib/voice/text-extraction.ts` |
| VOIC-03 | AI analysis produces structured persona | `src/app/api/voice-analysis/route.ts`, `src/lib/voice/prompt.ts`, `src/lib/voice/schema.ts` |
| VOIC-04 | PDF report downloadable | `src/app/api/voice-report/route.ts`, `src/lib/voice/pdf-report.ts` |
| VOIC-05 | Persona injected into outline + chapter prompts | `src/lib/outline/prompt.ts`, `src/lib/memory/chapter-prompt.ts`, generation route persona fetches |
| VOIC-06 | Voice Profile tab in Settings | `src/components/settings/voice-profile-tab.tsx`, `src/app/(dashboard)/settings/page.tsx` |
| VOIC-07 | Dashboard nudge banner | `src/components/dashboard/voice-onboarding-nudge.tsx`, `src/app/(dashboard)/layout.tsx` |

**Note on wizard steps:** CONTEXT.md says "3-step wizard" but MEMORY.md records the style preferences step was removed, making it a 2-step wizard. VOIC-01 says "3-step" in REQUIREMENTS.md. The verification should note this discrepancy -- the implementation simplified to 2 steps (upload + analysis results) but still satisfies the spirit of the requirement.

**VERIFICATION.md format:** Follow the pattern established by other phases (e.g., 07-VERIFICATION.md). Include: automated checks (file existence, grep verification, TSC), per-requirement status table, and overall verdict.

**Confidence:** HIGH -- all file paths known, verification is a documentation exercise.

### Workstream 4: Traceability Update

**Current state in REQUIREMENTS.md:**
- Lines 180-186: VOIC-01..07 show `Phase 6, Phase 8 | Pending`
- Lines 176-179: BILL-01..04 show `Phase 5 | Complete`

**Required changes:**
- VOIC-01..07: Change status to `Complete` and update phase to include Phase 8
- BILL-01..04: Already show Complete -- update phase column to `Phase 5, Phase 8` to reflect the middleware fix
- AUTH-01: Update to note Phase 8 fixed the OTP path

**Confidence:** HIGH -- direct file inspection.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API key resolution | Inline fallback logic in each route | Centralized `getOpenRouterApiKey()` helper | 11 routes need the same change; DRY |
| Middleware path matching | Complex regex | Array of path prefixes with `startsWith` | Readable, maintainable, matches existing pattern |

## Common Pitfalls

### Pitfall 1: Forgetting a Generation Route
**What goes wrong:** One of the 11 routes still returns 400 when no user key is set, breaking generation for platform users.
**How to avoid:** Grep for `openrouter_api_key` across all `src/app/api/` routes and update every occurrence. Use the centralized helper.

### Pitfall 2: BYOK Detection After Platform Key
**What goes wrong:** After adding platform key fallback, `budget-check.ts` might incorrectly classify platform-key users as BYOK (bypassing billing).
**How to avoid:** The BYOK check reads from `user_settings.openrouter_api_key` (the user's personal key column), NOT from the resolved key. Platform key is in env var only -- it never gets written to user_settings. So the existing check is already correct.

### Pitfall 3: Settings Page After API Key Tab Removal
**What goes wrong:** Removing the "API Key" tab leaves the Tabs component with a `defaultValue="api-key"` pointing to a deleted tab.
**How to avoid:** Update `defaultValue` to the first remaining tab (e.g., `"model-preferences"`).

### Pitfall 4: Dashboard Layout BYOK Check
**What goes wrong:** `layout.tsx` queries `openrouter_api_key` to decide whether to show "Usage" nav link. With BYOK removal, all platform users have no personal key, so `isByok` is false -- this is actually correct behavior (platform users should see Usage).
**How to avoid:** No change needed here, but verify the logic still makes sense.

### Pitfall 5: Settings Page Setup Banner
**What goes wrong:** The blue "Get started" banner in settings checks `apiKeyStatus.subscriptionTier === 'none' && !apiKeyStatus.hasKey`. With BYOK removed, this banner would show for all new users who haven't subscribed yet. Since platform key handles generation, this banner is misleading.
**How to avoid:** Remove or update the setup banner when removing the API key tab.

## Code Examples

### Middleware allow-list (recommended pattern)
```typescript
// src/lib/supabase/middleware.ts
// Replace lines 36-44 with:
const PUBLIC_PATHS = [
  '/login',
  '/auth/confirm',
  '/auth/verify',
  '/auth/reset-password',
  '/api/health',
  '/api/webhooks',
]

const isPublic = PUBLIC_PATHS.some(p => request.nextUrl.pathname.startsWith(p))

if (!user && !isPublic) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}
```

### API key resolution helper
```typescript
// src/lib/api-key.ts
/**
 * Resolve the OpenRouter API key: user's personal key takes priority,
 * falls back to platform key from environment.
 */
export function getOpenRouterApiKey(userKey: string | null): string | null {
  return userKey || process.env.OPENROUTER_API_KEY || null
}
```

### Route update pattern (apply to all 11 routes)
```typescript
// In each generation route, after reading userKey from user_settings:
import { getOpenRouterApiKey } from '@/lib/api-key'

const resolvedKey = getOpenRouterApiKey(apiKey)
if (!resolvedKey) {
  return new Response(
    JSON.stringify({ error: 'No API key available. Contact support.' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  )
}

// Then use resolvedKey in the Authorization header
```

## Open Questions

1. **Settings tab restructuring after API Key tab removal**
   - What we know: Three tabs exist (API Key, Model Preferences, Voice Profile). Removing API Key leaves two.
   - What's unclear: Should Billing section (currently nested under API Key tab) move to its own tab or stay hidden?
   - Recommendation: Move Billing section to a standalone "Billing" tab if the user has a subscription, otherwise just show Model Preferences and Voice Profile. This is in Claude's discretion area.

2. **`saveApiKey` / `deleteApiKey` / `testApiKey` server actions**
   - What we know: User said keep backend plumbing (DB column). These actions are backend plumbing.
   - What's unclear: Should we keep or remove these server actions since they're no longer called from UI?
   - Recommendation: Keep them -- they're harmless dead code and could be useful for admin tools later. Removing them risks breaking imports if anything references them.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `src/lib/supabase/middleware.ts` (lines 36-44)
- Direct code inspection of `middleware.ts` (root, matcher config)
- Direct code inspection of all 11 generation routes (API key pattern)
- Direct code inspection of `src/components/settings/api-key-form.tsx`
- Direct code inspection of `src/app/(dashboard)/settings/page.tsx`
- Direct code inspection of `src/lib/models/registry.ts`
- Direct code inspection of `src/lib/billing/budget-check.ts`
- `.planning/v1.0-MILESTONE-AUDIT.md` (gap definitions)
- `.planning/phases/08-milestone-fixes/08-CONTEXT.md` (user decisions)

## Metadata

**Confidence breakdown:**
- Middleware fix: HIGH -- exact code known, 3-line change
- BYOK removal: HIGH -- all files and patterns identified
- Platform key fallback: HIGH -- clear pattern, 11 files to update
- Phase 6 verification: HIGH -- file inventory complete, requirements mapped
- Traceability: HIGH -- simple documentation update

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- project-specific fixes, not library-dependent)
