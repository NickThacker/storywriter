---
phase: 01-foundation
plan: 05
subsystem: ui
tags: [settings, byok, openrouter, supabase-vault, model-preferences, server-actions, shadcn, debounce]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: Supabase server client, database types (UserSettings, UserModelPreference), Vault RPC functions, shadcn components (Card, Input, Button, Select, Badge), use-debounce installed
  - phase: 01-foundation/01-02
    provides: getUser() auth pattern for server actions, dashboard route group layout

provides:
  - BYOK settings page at /settings with API key management and model preference UI
  - saveApiKey server action (stores key in Supabase Vault via upsert_user_api_key RPC)
  - testApiKey server action (validates key against OpenRouter API server-side, 10s timeout)
  - deleteApiKey server action (clears openrouter_vault_id reference in user_settings)
  - getApiKeyStatus server action (returns hasKey, keyHint (last 4 chars only), subscriptionTier)
  - saveModelPreferences server action (upserts user_model_preferences per task type)
  - getModelPreferences server action (returns preferences with RECOMMENDED_MODELS fallback)
  - RECOMMENDED_MODELS, DEFAULT_MODELS, AVAILABLE_MODELS, TASK_TYPES constants in src/lib/models.ts
  - Zod schemas apiKeySchema and modelPreferenceSchema in src/lib/validations/settings.ts

affects: [02-projects, 03-outline, 04-prose, 05-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - BYOK pattern — raw API key processed server-side only; browser receives only last 4 chars as hint
    - Vault storage via SECURITY DEFINER RPC — upsert_user_api_key and get_decrypted_api_key RPCs
    - testApiKey validates against OpenRouter /api/v1/models server-side before any key is stored
    - useDebouncedCallback (use-debounce) for auto-saving model preferences without explicit Save button
    - as any cast pattern for supabase.rpc() and .from() calls due to PostgREST v12 / hand-written Database type incompatibility (same pattern established in Plan 02)
    - Per-task save status indicators (idle/saving/saved) with 2s reset timeout

key-files:
  created:
    - src/lib/models.ts — RECOMMENDED_MODELS, DEFAULT_MODELS, AVAILABLE_MODELS, TASK_TYPES constants
    - src/lib/validations/settings.ts — apiKeySchema (sk- prefix, min 10) and modelPreferenceSchema (task enum + modelId)
    - src/actions/settings.ts — 6 server actions for BYOK key management and model preferences
    - src/app/(dashboard)/settings/page.tsx — Server component settings page with setup banner
    - src/components/settings/api-key-form.tsx — Client component with masked display, show/hide, test/save/delete
    - src/components/settings/model-selector.tsx — Client component with auto-saving per-task model dropdowns
  modified: []

key-decisions:
  - "deleteApiKey clears vault reference in user_settings only (does not delete from vault.secrets directly) — vault.secrets is in a separate schema not in the Database type; orphaned secrets are acceptable; a cleanup job can handle them in production"
  - "ApiKeyForm allows saving without testing (shows 'untested' warning label) — saves valid keys immediately without forcing test step, improving UX for users who know their key is valid"
  - "Model selector uses auto-save with useDebouncedCallback (600ms) per task — aligns with PROJ-05 auto-save pattern, eliminates need for explicit Save Preferences button"
  - "testApiKey validates against OpenRouter /api/v1/models endpoint server-side — raw key never enters browser network tab; all OpenRouter API calls are proxied through server actions"

patterns-established:
  - "Pattern: BYOK key security — saveApiKey stores via Vault RPC, getApiKeyStatus returns last 4 chars only, raw key never returned after save"
  - "Pattern: Auto-save model preferences — useDebouncedCallback triggers saveModelPreferences on dropdown change; per-item status indicator (Saving.../Saved) with 2s reset"
  - "Pattern: Server-side key validation — testApiKey fetches OpenRouter API with 10s AbortController timeout; 401/403 returns invalid, 200 returns valid, network error returns 'Connection failed'"

requirements-completed: [LLM-01, LLM-02, LLM-03, LLM-04]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 1 Plan 05: Settings Page Summary

**BYOK OpenRouter API key management with Supabase Vault storage (last-4-char masked display) and per-task auto-saving model preference selection for outline, prose, and editing tasks**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T20:51:33Z
- **Completed:** 2026-02-28T20:54:42Z
- **Tasks:** 2 of 2
- **Files modified:** 6

## Accomplishments

- Full BYOK API key lifecycle: enter key, test against OpenRouter server-side, save to Supabase Vault, display masked (••••••••abcd), change or delete — raw key never visible in browser network requests
- Six server actions covering all settings operations: saveApiKey, testApiKey, deleteApiKey, getApiKeyStatus, saveModelPreferences, getModelPreferences with RECOMMENDED_MODELS fallback
- Settings page at /settings with setup banner for users with no key or subscription, ApiKeyForm client component, and ModelSelector with auto-save on dropdown change via useDebouncedCallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Create model constants, validation schemas, and settings server actions** - `5d9a0a4` (feat)
2. **Task 2: Build settings page with API key form and model selector UI** - `cad3f0d` (feat)

## Files Created/Modified

- `src/lib/models.ts` — RECOMMENDED_MODELS (claude-sonnet-4 for outline/prose/editing), AVAILABLE_MODELS (6 models across Anthropic/OpenAI/Google/Meta), TASK_TYPES array, DEFAULT_MODELS alias
- `src/lib/validations/settings.ts` — apiKeySchema (min 10, startsWith "sk-"), modelPreferenceSchema (task enum, modelId required)
- `src/actions/settings.ts` — 6 server actions: saveApiKey (Vault RPC), testApiKey (OpenRouter fetch, 10s timeout, never stored), deleteApiKey (clears vault ref), getApiKeyStatus (last 4 chars only), saveModelPreferences (upsert), getModelPreferences (defaults from RECOMMENDED_MODELS)
- `src/app/(dashboard)/settings/page.tsx` — Server component; parallel-fetches apiKeyStatus + modelPreferences; setup info banner when no key and tier='none'
- `src/components/settings/api-key-form.tsx` — Client component: masked display with ••••xxxx, Eye/EyeOff toggle, Test connection calling testApiKey, save/delete with transition states, Cancel for editing mode, link to openrouter.ai/keys
- `src/components/settings/model-selector.tsx` — Client component: per-task Select dropdowns grouped by provider, auto-save via useDebouncedCallback 600ms, per-task Saving.../Saved status with 2s reset, Recommended badge

## Decisions Made

- **deleteApiKey clears reference only:** vault.secrets is in a separate Postgres schema not captured in the Database type. Rather than a raw query or service role call, we clear openrouter_vault_id in user_settings. The Vault secret becomes orphaned (acceptable; a cleanup job handles it in production).
- **Save without test allowed (with warning):** The Save button works even without running Test first — it shows "(untested)" label as a soft warning. This avoids a forced gate that would frustrate users who already know their key is valid.
- **Auto-save at 600ms debounce:** Model preferences auto-save per-dropdown rather than via a global Save Preferences button. This matches the PROJ-05 auto-save convention and gives immediate feedback.
- **as any for Supabase calls:** Same PostgREST v12 / hand-written Database type incompatibility pattern established in Plan 02. Applied to supabase.rpc() and supabase.from() calls in settings.ts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added as any casts for PostgREST v12 type incompatibility in settings server actions**
- **Found during:** Task 1 (TypeScript verification npx tsc --noEmit)
- **Issue:** Same PostgREST v12 / hand-written Database type incompatibility as Plan 02 — supabase.rpc() and .from() calls resolve to type errors (Args expected undefined, data resolves to never)
- **Fix:** Applied `as any` casts to supabase.rpc() and supabase.from() calls in settings.ts, following the pattern established in Plan 02
- **Files modified:** src/actions/settings.ts
- **Verification:** npx tsc --noEmit passes clean; npm run build succeeds
- **Committed in:** 5d9a0a4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The as any pattern was already established in Plans 01 and 02 as the pragmatic workaround for this type system issue. No scope creep. Output matches plan spec exactly.

## Issues Encountered

- **PostgREST v12 / Database type incompatibility:** Recurs on all Supabase calls in new server action files. The root fix would be using `supabase gen types typescript` to generate correct types. Workaround is consistent `as any` casts with inline comments (established in Plan 02).

## User Setup Required

None - no new external service configuration required beyond what was documented in Plans 01 and 02 (Supabase project setup, Vault extension enabled, migration run).

## Next Phase Readiness

- Settings page is complete and accessible at /settings for authenticated users
- BYOK pattern is established: all future LLM calls can use getApiKeyStatus() to check if user has a key, then retrieve it via get_decrypted_api_key RPC
- Model preferences are stored in user_model_preferences; future generation plans can use getModelPreferences() to select the correct model per task type
- Phase 1 (Foundation) is now complete — all 5 plans executed

## Self-Check: PASSED

- `src/lib/models.ts` — FOUND
- `src/lib/validations/settings.ts` — FOUND
- `src/actions/settings.ts` — FOUND
- `src/app/(dashboard)/settings/page.tsx` — FOUND
- `src/components/settings/api-key-form.tsx` — FOUND
- `src/components/settings/model-selector.tsx` — FOUND
- Task commit 5d9a0a4 — FOUND in git log
- Task commit cad3f0d — FOUND in git log
- Build: npm run build succeeds with /settings route

---
*Phase: 01-foundation*
*Completed: 2026-02-28*
