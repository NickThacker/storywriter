# Phase 8: Milestone Fixes - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Close all blocking gaps from the v1.0 milestone audit: fix middleware allow-list so Stripe webhooks and auth verification paths work, remove BYOK UI and switch to platform API key, run formal verification on Phase 6 (VOIC-01..07), and update tracking artifacts.

</domain>

<decisions>
## Implementation Decisions

### Middleware allow-list
- Add `/api/webhooks/*` (pattern, not just Stripe — future-proofs for other providers)
- Add `/auth/verify` and `/auth/reset-password` to public paths
- Drop the "/ renders for unauthenticated visitors" criterion — there is no public landing page on the app
- Unauthenticated users hitting the app are redirected to `/login` (current behavior, keep it)
- App will be hosted at `app.meridianwrite.com` on Vercel; marketing site at `www.meridianwrite.com` is separate

### BYOK removal (hide UI)
- Remove the API key form from settings UI entirely (delete or hide the component)
- Do NOT remove backend plumbing — keep `openrouter_api_key` column in `user_settings`
- Add a platform-level `OPENROUTER_API_KEY` env var
- All generation routes should fall back to the platform key when no user key is set
- The user's own OpenRouter API key goes into `.env.local` as `OPENROUTER_API_KEY` for local dev
- No "stored encrypted" or "stored securely" copy needed — the form is gone

### Phase 6 verification
- Code audit + smoke test for each VOIC requirement (VOIC-01 through VOIC-07)
- Grep codebase to verify implementation exists, then run the app to confirm features work end-to-end
- Write VERIFICATION.md in the Phase 6 directory with findings

### REQUIREMENTS.md traceability
- Update all VOIC-01..07 status to "Complete" in the traceability table
- Update any BILL requirements that are now fully verified

### Claude's Discretion
- Exact middleware code structure (if-chain vs array of patterns)
- How to handle the API key fallback in generation routes (env var read pattern)
- VERIFICATION.md format and level of detail

</decisions>

<specifics>
## Specific Ideas

- Platform API key: user wants their own OpenRouter key in `.env.local` so everything keeps working during local dev
- The BYOK feature will not come back — this is a permanent removal of the UI, not a temporary hide

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase/middleware.ts` — the `updateSession()` function with the allow-list (lines 36-45)
- `src/components/settings/api-key-form.tsx` — the BYOK form to remove/hide
- `src/app/api/webhooks/stripe/route.ts` — already fully implemented, just blocked by middleware

### Established Patterns
- Middleware uses an if-chain with `startsWith()` checks for public paths
- Generation routes read API key from user settings via `getModelForRole()` in `src/lib/models/registry.ts`

### Integration Points
- Settings page renders `api-key-form.tsx` — need to remove it from the settings layout
- All 7+ generation API routes use the model registry — fallback logic goes there
- Phase 6 directory: `.planning/phases/06-author-onboarding-and-voice-analysis/`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-milestone-fixes*
*Context gathered: 2026-03-09*
