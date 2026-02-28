---
phase: 01-foundation
verified: 2026-02-28T00:00:00Z
status: gaps_found
score: 11/13 must-haves verified
re_verification: false
gaps:
  - truth: "API key is stored encrypted via Supabase Vault and never exposed to browser"
    status: failed
    reason: "Supabase Vault was removed — plan 01-05 specified upsert_user_api_key RPC and openrouter_vault_id, but the implementation stores the raw key plaintext in user_settings.openrouter_api_key. The migration explicitly documents this change: 'Vault functions removed — Supabase Vault requires a paid plan.' RLS protects the column from other users, but the key is stored in plaintext in the database rather than in encrypted Vault storage."
    artifacts:
      - path: "supabase/migrations/00001_initial_schema.sql"
        issue: "openrouter_api_key is a plain text column, not a Vault reference. No vault.secrets involvement."
      - path: "src/actions/settings.ts"
        issue: "saveApiKey calls .update({ openrouter_api_key: parsed.data.apiKey }) — stores raw key directly. No upsert_user_api_key RPC call."
      - path: "src/types/database.ts"
        issue: "UserSettingsRow has openrouter_api_key: string | null — no openrouter_vault_id as the plan specified."
    missing:
      - "Decision to use Vault vs plaintext+RLS must be explicitly recorded and accepted. The current approach (plaintext+RLS) has lower security guarantees than the planned Vault approach."
      - "If Vault is not feasible (paid plan required), the security model change should be documented and accepted as a deliberate architectural trade-off."

  - truth: "Project data auto-saves when modified (debounced server action)"
    status: partial
    reason: "updateProject server action exists and is fully implemented, but it is NOT wired to any UI component in Phase 1. The auto-save action is orphaned — no dashboard component calls it. The plan notes it is 'ready for use by future project editor components' but the must-have truth states 'Project data auto-saves when modified' without qualification. PROJ-05 states 'Novel state auto-saves after every generation or user edit' — there is no editor in Phase 1, so this is not testable yet."
    artifacts:
      - path: "src/actions/projects.ts"
        issue: "updateProject is exported but imported nowhere in the UI layer."
    missing:
      - "Clarify whether PROJ-05 is intentionally deferred to Phase 2 (when the editor exists) or whether a basic title/genre edit flow on the dashboard should use auto-save now."
      - "If deferred: update the must-have truth for plan 01-04 to reflect 'updateProject action ready for Phase 2 auto-save' rather than 'Project data auto-saves when modified'."
human_verification:
  - test: "Sign up, verify email, sign in, sign out, reset password"
    expected: "Full auth flow works end-to-end including email delivery"
    why_human: "Cannot verify Supabase email sending or session cookie persistence programmatically"
  - test: "Create a project, verify card appears with all fields, click card to navigate to /projects/[id]"
    expected: "Card shows title, status badge, genre tag, word count (0), progress bar (No chapters yet), last modified time"
    why_human: "Visual rendering and navigation require browser interaction"
  - test: "Enter OpenRouter API key, click Test Connection, save, verify masked display"
    expected: "Key shows as masked (12 dots + last 4 chars). Refresh page — mask persists. DevTools Network tab shows NO raw API key in any response."
    why_human: "Network tab inspection and browser-rendered masking require human observation"
  - test: "Change a model preference dropdown"
    expected: "Saving.../Saved indicator appears per dropdown. Refresh page — new model selection persists."
    why_human: "Auto-save debounce timing and persistence require browser interaction"
  - test: "Delete a project via three-dot menu"
    expected: "Confirmation dialog appears, project disappears from grid after delete"
    why_human: "Dialog interaction and grid update require browser interaction"
---

# Phase 1: Foundation Verification Report

**Phase Goal:** Users can create accounts, manage novel projects, and configure their AI access — with the security perimeter and database schema in place to support everything that follows
**Verified:** 2026-02-28
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Next.js app boots and renders pages | VERIFIED | Full app structure with layouts, pages, and routing in place |
| 2 | Supabase server and browser clients connect to configured project | VERIFIED | `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts` both use `createServerClient`/`createBrowserClient` with env vars |
| 3 | Middleware refreshes auth session and redirects unauthenticated users to /login | VERIFIED | `middleware.ts` imports `updateSession`; `src/lib/supabase/middleware.ts` calls `supabase.auth.getUser()` and redirects to `/login` |
| 4 | Database schema exists with user_settings, user_model_preferences, and projects tables — all with RLS enabled | VERIFIED | `supabase/migrations/00001_initial_schema.sql` creates all 3 tables, calls `enable row level security` on each, and defines full CRUD policies |
| 5 | TypeScript types match database schema | VERIFIED | `src/types/database.ts` defines `UserSettingsRow`, `UserModelPreferenceRow`, `ProjectRow` matching the migration columns exactly |
| 6 | User can create account, sign in, stay logged in, sign out, reset password | VERIFIED | All 5 server actions (`signIn`, `signUp`, `signOut`, `resetPassword`, `updatePassword`) implemented in `src/actions/auth.ts`; `auth-form.tsx` wires to all three modes |
| 7 | User sees card grid of projects (title, status badge, word count, last modified, genre, progress bar) | VERIFIED | `project-card.tsx` renders all required fields; `project-grid.tsx` provides responsive grid; `dashboard/page.tsx` queries and passes data |
| 8 | New users see empty state with example cards and CTA | VERIFIED | `empty-state.tsx` renders 3 example cards (The Last Horizon, Midnight Garden, Echoes of Tomorrow) and a "Start Your Novel" CTA |
| 9 | User can create a new novel project with title and genre from a dialog | VERIFIED | `create-project-dialog.tsx` uses `useActionState(createProject, null)`, wired to `createProject` server action |
| 10 | User can click a project card to navigate to /projects/[id] | VERIFIED | `project-card.tsx` wraps the card in `<Link href={/projects/${project.id}}>` |
| 11 | User can delete a project via confirmation dialog | VERIFIED | `delete-project-dialog.tsx` calls `deleteProject(projectId)` on confirm |
| 12 | API key stored encrypted and never exposed to browser | FAILED | Key stored as **plaintext** in `user_settings.openrouter_api_key`. Vault was removed ("Supabase Vault requires a paid plan"). See gap detail. |
| 13 | Project data auto-saves when modified | PARTIAL | `updateProject` action is fully implemented but orphaned — no UI component calls it in Phase 1. The project editor (Phase 2) will wire this up. |

**Score:** 11/13 truths verified

---

## Required Artifacts

### Plan 01-01: Infrastructure

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `middleware.ts` | Auth session refresh and route protection | VERIFIED | Imports `updateSession`, correct matcher config |
| `src/lib/supabase/server.ts` | Server-side Supabase client with cookie handling | VERIFIED | Exports `createClient`, uses `createServerClient` with full cookie get/set |
| `src/lib/supabase/client.ts` | Browser-side Supabase client | VERIFIED | Exports `createClient`, uses `createBrowserClient` |
| `src/types/database.ts` | TypeScript types for all database tables | VERIFIED | Exports `UserSettingsRow`, `UserModelPreferenceRow`, `ProjectRow`, `Database` generic, and convenience aliases |
| `supabase/migrations/00001_initial_schema.sql` | Full schema with RLS and triggers | VERIFIED | All 3 tables created, RLS enabled on each, CRUD policies defined, triggers for `updated_at` |

### Plan 01-02: Auth

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(auth)/login/page.tsx` | Login/signup page with toggle tabs | VERIFIED | Renders `<AuthForm />`, handles `error` search param |
| `src/components/auth/auth-form.tsx` | Auth form with sign-in, sign-up, forgot-password modes | VERIFIED | 239 lines, handles all 3 modes with proper state, uses `useActionState` |
| `src/actions/auth.ts` | Server Actions: signIn, signUp, signOut, resetPassword, updatePassword | VERIFIED | All 5 actions present, use `'use server'`, validate with Zod, call Supabase auth methods |
| `src/app/(auth)/auth/confirm/route.ts` | Email confirmation and password reset token handler | VERIFIED | Exports `GET`, calls `supabase.auth.verifyOtp`, redirects appropriately |
| `src/lib/validations/auth.ts` | Zod schemas: loginSchema, signUpSchema, resetPasswordSchema | VERIFIED | All 4 schemas present (includes `updatePasswordSchema`), exports match plan |

### Plan 01-03: n8n Client

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/n8n/client.ts` | Server-side n8n webhook client with shared secret auth | VERIFIED | Exports `triggerN8nWorkflow`, `isN8nConfigured`, `N8nError`; 95 lines; no `NEXT_PUBLIC_` references |
| `src/app/api/n8n/test/route.ts` | Test endpoint that calls n8n and returns the response | VERIFIED | Exports `POST`, auth checks, handles `N8nError` gracefully |
| `src/app/api/health/route.ts` | Health check endpoint | VERIFIED | Exports `GET`, returns `{ status: 'ok', timestamp, n8n_configured }` |

### Plan 01-04: Dashboard

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(dashboard)/dashboard/page.tsx` | Dashboard page fetching projects via Server Component | VERIFIED | 44 lines, queries projects, conditionally renders EmptyState or ProjectGrid |
| `src/components/dashboard/project-grid.tsx` | Responsive card grid layout | VERIFIED | 26 lines, responsive grid with `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| `src/components/dashboard/project-card.tsx` | Project card with all fields | VERIFIED | 134 lines, all required fields rendered with `timeAgo()` helper and progress bar |
| `src/components/dashboard/empty-state.tsx` | Welcome message with example cards and CTA | VERIFIED | 101 lines, 3 example cards, "Start Your Novel" CTA, wires to CreateProjectDialog |
| `src/actions/projects.ts` | Server Actions: createProject, deleteProject, updateProject | VERIFIED | All 3 actions present, all authenticate via `getUser()`, `revalidatePath` called |

### Plan 01-05: Settings

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(dashboard)/settings/page.tsx` | Settings page with API key and model sections | VERIFIED | 57 lines, fetches key status and preferences, renders both sections, shows setup banner |
| `src/components/settings/api-key-form.tsx` | BYOK API key form with test, save, masked display | VERIFIED | 241 lines, full editing flow, masked display, test/save/delete/cancel all implemented |
| `src/components/settings/model-selector.tsx` | Per-task LLM model selection UI | VERIFIED | 160 lines, 3 task types, debounced auto-save via `useDebouncedCallback`, saves/saved indicators |
| `src/actions/settings.ts` | Server Actions: saveApiKey, testApiKey, deleteApiKey, getApiKeyStatus, saveModelPreferences, getModelPreferences | VERIFIED | All 6 actions present; NOTE: saveApiKey stores plaintext, not Vault |
| `src/lib/models.ts` | Model constants: DEFAULT_MODELS, RECOMMENDED_MODELS | VERIFIED | Exports `DEFAULT_MODELS`, `RECOMMENDED_MODELS`, `AVAILABLE_MODELS`, `TASK_TYPES` |

---

## Key Link Verification

### Plan 01-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `middleware.ts` | `src/lib/supabase/middleware.ts` | `updateSession` import | VERIFIED | Line 2: `import { updateSession } from '@/lib/supabase/middleware'`; Line 5: `return updateSession(request)` |
| `src/app/(dashboard)/layout.tsx` | `src/lib/supabase/server.ts` | `createClient` for auth check | VERIFIED | Line 3: `import { createClient } from '@/lib/supabase/server'`; Line 11: `const supabase = await createClient()` + `getUser()` |

### Plan 01-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/auth/auth-form.tsx` | `src/actions/auth.ts` | Form action binding | VERIFIED | Line 4: `import { signIn, signUp, resetPassword } from '@/actions/auth'`; used in `useActionState` for all three forms |
| `src/actions/auth.ts` | `src/lib/supabase/server.ts` | `createClient` for auth | VERIFIED | Line 4: import; used in every action via `await createClient()` then `.auth.*` calls |
| `src/app/(auth)/auth/confirm/route.ts` | `supabase.auth.verifyOtp` | token_hash from email link | VERIFIED | Line 17: `await supabase.auth.verifyOtp({ type, token_hash: tokenHash })` |
| `src/app/(dashboard)/layout.tsx` | `src/actions/auth.ts` | signOut action on nav button | VERIFIED | Line 4: `import { signOut } from '@/actions/auth'`; Line 54: `<form action={signOut}>` |

### Plan 01-03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/n8n/test/route.ts` | `src/lib/n8n/client.ts` | `triggerN8nWorkflow` call | VERIFIED | Line 11: `import { triggerN8nWorkflow, isN8nConfigured, N8nError } from '@/lib/n8n/client'`; used in route handler |
| `src/lib/n8n/client.ts` | n8n webhook | fetch with `X-Webhook-Secret` header | VERIFIED | Line 77: `'X-Webhook-Secret': secret` in fetch headers |

### Plan 01-04 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/(dashboard)/dashboard/page.tsx` | `src/lib/supabase/server.ts` | `createClient` to query projects | VERIFIED | Line 3: import; Line 13: `const supabase = await createClient()`; Line 24: `.from('projects').select(...)` |
| `src/components/dashboard/create-project-dialog.tsx` | `src/actions/projects.ts` | `createProject` server action | VERIFIED | Line 23: `import { createProject } from '@/actions/projects'`; used in `useActionState` |
| `src/components/dashboard/delete-project-dialog.tsx` | `src/actions/projects.ts` | `deleteProject` server action | VERIFIED | Line 13: `import { deleteProject } from '@/actions/projects'`; called in `handleDelete` |
| `src/components/dashboard/project-card.tsx` | `/projects/[id]` | Link navigation | VERIFIED | Line 69: `<Link href={/projects/${project.id}}>` wraps the card |

### Plan 01-05 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/settings/api-key-form.tsx` | `src/actions/settings.ts` | `saveApiKey` and `testApiKey` | VERIFIED | Line 8: imports `saveApiKey, testApiKey, deleteApiKey`; all called in component handlers |
| `src/actions/settings.ts` | `user_settings` table | Direct DB update (not Vault) | PARTIAL | Uses `.update({ openrouter_api_key: ... })` — plan specified `upsert_user_api_key` RPC. Functional but architecture changed from Vault to plaintext+RLS. |
| `src/components/settings/model-selector.tsx` | `src/actions/settings.ts` | `saveModelPreferences` | VERIFIED | Line 17: `import { saveModelPreferences } from '@/actions/settings'`; called in `debouncedSave` |
| `src/actions/settings.ts` | OpenRouter models API | fetch to validate key | VERIFIED | Line 70: `fetch('https://openrouter.ai/api/v1/models', ...)` with Bearer token |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-01 | 01-02 | User can create account with email/password | SATISFIED | `signUp` server action creates user via `supabase.auth.signUp()`; `auth-form.tsx` renders sign-up tab |
| AUTH-02 | 01-01, 01-02 | User can log in and stay logged in across browser sessions | SATISFIED | `signIn` action calls `signInWithPassword`; middleware refreshes session cookie on every request |
| AUTH-03 | 01-02 | User can log out from any page | SATISFIED | `signOut` action in `src/actions/auth.ts`; dashboard layout has `<form action={signOut}>` nav button |
| AUTH-04 | 01-02 | User can reset password via email link | SATISFIED | `resetPassword` + `updatePassword` actions; `/auth/confirm` route handles token; reset-password page exists |
| PROJ-01 | 01-04 | User can create a new novel project from dashboard | SATISFIED | `create-project-dialog.tsx` → `createProject` action → inserts into `projects` table |
| PROJ-02 | 01-04 | User can view all their novel projects (title, status, word count, last modified) | SATISFIED | Dashboard page queries all projects; `project-card.tsx` displays all required fields |
| PROJ-03 | 01-04 | User can resume any in-progress project | SATISFIED | Card click links to `/projects/${project.id}`; route placeholder exists at `src/app/(dashboard)/projects/[id]` |
| PROJ-04 | 01-04 | User can delete a novel project | SATISFIED | `delete-project-dialog.tsx` → `deleteProject` action → deletes from `projects` table |
| PROJ-05 | 01-01, 01-04 | Novel state auto-saves after every generation or user edit | PARTIAL | `updateProject` action exists and is correct, but no UI component calls it yet. Auto-save foundation is in place; actual wiring deferred to Phase 2 (project editor). |
| LLM-01 | 01-05 | User can connect their own OpenRouter API key (BYOK) | SATISFIED | `api-key-form.tsx` → `saveApiKey` action → stored in `user_settings.openrouter_api_key` |
| LLM-02 | 01-05 | User can select specific LLMs for different tasks | SATISFIED | `model-selector.tsx` renders 3 task dropdowns; `saveModelPreferences` action persists to `user_model_preferences` |
| LLM-03 | 01-05 | Platform provides hosted API access via subscription | PARTIALLY SATISFIED | `subscription_tier` field exists in schema with `'none' \| 'hosted'` enum; settings page shows subscription status. Actual billing/hosted access is deferred to Phase 5 per REQUIREMENTS.md. Schema foundation in place. |
| LLM-04 | 01-03, 01-05 | User's API key is never exposed to the browser (server-side only) | PARTIAL | The raw key never appears in HTTP responses (`getApiKeyStatus` returns only last 4 chars). However, the key is stored **plaintext** in the database column rather than in encrypted Vault storage. RLS prevents other users from reading it, but the storage security is weaker than the plan specified. |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/actions/projects.ts` | 34, 43 | `as any` casts on Supabase client | Info | Hand-written Database type incompatibility with postgrest-js v12 — documented in code comments, non-blocking |
| `src/actions/settings.ts` | 43, 111, 143 | `as any` casts on Supabase client | Info | Same type compatibility issue as above, documented, non-blocking |
| `src/actions/auth.ts` | 84 | `as any` cast on insert | Info | Same pattern — comment explains it explicitly |
| `supabase/migrations/00001_initial_schema.sql` | 174–177 | Vault removed, plaintext storage used | Warning | Planned encrypted storage replaced with plaintext+RLS. Key is protected from other users via RLS, but is not encrypted at rest in Vault. See gap detail. |
| `src/actions/projects.ts` | 83 | `updateProject` exported but not imported anywhere in UI | Warning | PROJ-05 auto-save action exists but is orphaned. Foundation in place for Phase 2 but not yet active. |

The `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` appearances are expected — this is Supabase's intentionally public anon key, safe to expose in the browser per Supabase documentation and architecture (RLS enforces access control).

---

## Human Verification Required

### 1. Full Auth Flow

**Test:** Run `npm run dev`. Visit http://localhost:3000 — confirm redirect to /login. Click "Create account" tab, register with email/password. Check email for confirmation link. Click link — confirm redirect to /dashboard. Sign out — confirm redirect to /login. Sign back in — confirm redirect to /dashboard. Close browser, reopen, visit /dashboard — confirm still logged in.
**Expected:** Each step completes as described; session persists across browser close
**Why human:** Email delivery, session cookie behavior, and redirect flow require browser and email access

### 2. Auth Error Handling

**Test:** Click "Forgot password?" — enter an email — check for reset email. Click reset link — enter a new password — confirm redirect to /dashboard.
**Expected:** Password reset flow works end-to-end
**Why human:** Email delivery and token verification require live Supabase connection

### 3. Dashboard Project Cards

**Test:** Create a project. Verify card renders with title, status badge (Draft), genre tag, word count (0 words), "No chapters yet" progress indicator, and a relative last-modified time.
**Expected:** All fields visible and correctly formatted
**Why human:** Visual rendering requires browser

### 4. API Key Masking and Security

**Test:** Go to /settings. Enter a real (or dummy `sk-or-test1234`) API key. Click "Test Connection" (may return invalid — that's fine). Click "Save key". Verify masked display shows `••••••••••••{last4}`. Open DevTools Network tab and inspect all XHR responses — confirm no raw API key appears anywhere.
**Expected:** Key masked in UI; absent from all network responses
**Why human:** DevTools network inspection requires browser

### 5. Model Preferences Auto-Save

**Test:** Go to /settings. Change the "Prose Writing" model dropdown. Observe "Saving..." then "Saved" indicator. Refresh the page. Confirm the new model selection persists.
**Expected:** Preference persists across page reload
**Why human:** Debounce timing and persistence verification require browser interaction

---

## Gaps Summary

Two gaps block full goal achievement:

**Gap 1 — API Key Security Architecture (affects LLM-04):**
The plan specified Supabase Vault for encrypted API key storage (`upsert_user_api_key` RPC, `openrouter_vault_id` field). The implementation instead stores the raw key in a plaintext `text` column in `user_settings`, protected only by RLS. The migration documents this as a deliberate trade-off: "Supabase Vault requires a paid plan." This is a security architecture change that was not surfaced as a decision requiring sign-off. The current approach means:
- The key is NOT encrypted at rest in the database
- Database administrators or service role queries can read raw keys
- The API key UI says "stored encrypted" which is now misleading (it says "Your API key is stored encrypted and is never exposed in browser requests" in `api-key-form.tsx`)

The functional behavior — key never leaves the server in HTTP responses — is correct. The storage-level encryption is not in place.

**Gap 2 — PROJ-05 Auto-Save Not Yet Wired (minor):**
The `updateProject` server action is fully implemented and correct, but no UI component calls it yet. The must-have truth "Project data auto-saves when modified" is not fulfilled in Phase 1 because there is no editor in Phase 1 where modifications occur. The project dashboard is read-only from a content perspective. This is arguably intentional deferral to Phase 2 (when the project editor ships), but the must-have truth as written is not verifiable.

---

*Verified: 2026-02-28*
*Verifier: Claude (gsd-verifier)*
