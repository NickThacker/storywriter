---
phase: 01-foundation
plan: 03
subsystem: n8n-integration
tags: [n8n, webhook, shared-secret, api-routes, health-check, typescript, supabase]

# Dependency graph
requires:
  - 01-01 (Next.js scaffold, Supabase clients, route group layouts)
provides:
  - Server-side n8n webhook client with shared secret authentication (triggerN8nWorkflow)
  - isN8nConfigured() guard for graceful degradation when n8n not running
  - N8nError custom error class with status and body properties
  - Auth-guarded POST /api/n8n/test endpoint proving the Next.js->n8n pipeline
  - GET /api/health unauthenticated status endpoint with n8n_configured field
  - Server-side-only communication pattern: N8N_BASE_URL and N8N_WEBHOOK_SECRET never exposed to browser
affects: [04-generation, 05-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "n8n shared-secret: X-Webhook-Secret header (not query params, not body)"
    - "n8n IF node validation: {{ $request.headers['x-webhook-secret'] === $env.WEBHOOK_SECRET }}"
    - "AbortSignal.timeout(30000) for 30-second webhook call timeout"
    - "isN8nConfigured() guard pattern before any n8n call"
    - "Server-only env vars: N8N_BASE_URL and N8N_WEBHOOK_SECRET have no NEXT_PUBLIC_ prefix"

key-files:
  created:
    - src/lib/n8n/client.ts — n8n webhook client: triggerN8nWorkflow, isN8nConfigured, N8nError
    - src/app/api/n8n/test/route.ts — auth-guarded test endpoint with n8n pipeline call
    - src/app/api/health/route.ts — unauthenticated health check with n8n_configured status
  modified:
    - src/types/database.ts — fixed Database generic type for supabase-js v2.98 / PostgREST v12 compatibility

key-decisions:
  - "X-Webhook-Secret header pattern (not query params or body) — header is not logged by most reverse proxies, keeping secret out of access logs"
  - "30-second AbortSignal.timeout for n8n calls — n8n workflow timeout is a documented constraint; 30s covers LLM calls without blocking Node.js event loop indefinitely"
  - "isN8nConfigured() checked before triggerN8nWorkflow — avoids TypeError from missing env vars and returns 503 for ops-friendly diagnostics"
  - "Test endpoint requires auth via getUser() — only authenticated users can probe the pipeline; prevents unauthenticated n8n invocations"

patterns-established:
  - "Pattern: n8n client — all n8n webhook calls go through src/lib/n8n/client.ts; never fetch n8n directly from API routes"
  - "Pattern: n8n auth — X-Webhook-Secret header on every request; n8n IF node validates before executing workflow logic"
  - "Pattern: n8n env — N8N_BASE_URL and N8N_WEBHOOK_SECRET are server-only; NEXT_PUBLIC_ prefix is explicitly forbidden"
  - "Pattern: graceful degradation — isN8nConfigured() returns false when env vars absent; downstream features return 503 not 500"

requirements-completed: [LLM-04]

# Metrics
duration: 6min
completed: 2026-02-28
---

# Phase 1 Plan 03: n8n Webhook Client and Pipeline Verification Summary

**Server-side n8n webhook client with X-Webhook-Secret header authentication, 30-second timeout, graceful degradation guard, and auth-gated test endpoint proving the Next.js->n8n->LLM->response pipeline architecture**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-28T20:41:56Z
- **Completed:** 2026-02-28T20:47:23Z
- **Tasks:** 2 of 2
- **Files modified:** 4

## Accomplishments

- n8n webhook client library created at `src/lib/n8n/client.ts` — the single server-side integration point for all future n8n calls, enforcing the shared-secret pattern with `X-Webhook-Secret` header and a 30-second timeout via `AbortSignal.timeout`
- Auth-guarded POST `/api/n8n/test` endpoint created — verifies the full Next.js->n8n pipeline, returns 401 without auth, 503 if n8n is not configured, and proxies n8n response on success
- GET `/api/health` endpoint created — zero-auth status check returning `{ status, timestamp, n8n_configured }` for ops/monitoring

## Task Commits

Each task was committed atomically:

1. **Task 1: Create n8n webhook client library** - `1b7b91e` (feat)
2. **Task 2: Create test endpoint and health check** - `6ae840b` (feat)

## Files Created/Modified

- `src/lib/n8n/client.ts` — N8nError class, triggerN8nWorkflow() with X-Webhook-Secret + AbortSignal.timeout(30000), isN8nConfigured() guard
- `src/app/api/n8n/test/route.ts` — POST handler: getUser() auth check, isN8nConfigured() guard, triggerN8nWorkflow('test', {...}), N8nError catch with status passthrough
- `src/app/api/health/route.ts` — GET handler: returns { status: 'ok', timestamp, n8n_configured }
- `src/types/database.ts` — Fixed Database generic for supabase-js v2.98 (see Deviations)

## Decisions Made

- **X-Webhook-Secret header:** Header-based secret delivery is preferred over query params (which appear in server logs) and body (which would require n8n to parse before validating). Header secrets are not logged by most reverse proxies.
- **30-second timeout:** n8n workflows invoking LLMs can take 15-25 seconds. The 30s timeout gives headroom without blocking indefinitely. AbortSignal.timeout is Node.js native — no external dependency needed.
- **isN8nConfigured() guard:** Returns false when env vars are absent. API routes return 503 (service unavailable) not 500 (server error), making it ops-friendly to run without n8n in local dev.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Database generic type incompatibility with supabase-js v2.98 / PostgREST v12**
- **Found during:** Task 2 (build verification)
- **Issue:** `npm run build` failed with "No overload matches this call" in `src/actions/auth.ts` when calling `.from('user_settings').insert(...)`. Root cause: the `Database` type shape used in Plan 01 was written for an older supabase-js version. supabase-js v2.98 uses PostgREST v12 which requires `Relationships: GenericRelationship[]` (not bare `[]` empty tuple), `Views: { [_ in never]: never }` (not `Record<string, never>`), and `CompositeTypes: { [_ in never]: never }`
- **Fix:** Updated `src/types/database.ts` — added `GenericRelationship` export type, changed all table `Relationships: []` to `Relationships: GenericRelationship[]`, changed `Views`/`Enums` to mapped never type, added `CompositeTypes`
- **Files modified:** `src/types/database.ts`
- **Commit:** `6ae840b` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The type fix was necessary for build to succeed. It touched the database types from Plan 01, not any n8n code. Output matches plan spec exactly.

## Security Properties Established

The following security invariants are now enforced and documented in code:

1. `N8N_BASE_URL` — server-only env var, no `NEXT_PUBLIC_` prefix, never returned in any response body
2. `N8N_WEBHOOK_SECRET` — server-only env var, passed as `X-Webhook-Secret` header, never returned in any response body
3. n8n webhook URL is never constructed client-side — all calls go through `triggerN8nWorkflow` which runs only on the server
4. Test endpoint requires Supabase `getUser()` authentication — unauthenticated requests get 401 before any n8n call is made

## n8n Workflow Setup Required

To fully exercise the test pipeline, create an n8n test workflow:
1. Webhook trigger: POST `/webhook/test`
2. IF node: validate `{{ $request.headers['x-webhook-secret'] === $env.WEBHOOK_SECRET }}`
   - False branch: Respond with 401
3. (Optional) LLM call to OpenRouter — tests full pipeline
4. Respond to Webhook: `{ success: true, message: "Pipeline working", echo: $json.message }`

Environment variables to set in `.env.local`:
- `N8N_BASE_URL=http://localhost:5678` (local) or `http://n8n.railway.internal:5678` (Railway)
- `N8N_WEBHOOK_SECRET=<random-secret>` (must match `WEBHOOK_SECRET` env var in n8n)

## Next Phase Readiness

- n8n client is the established integration point — Plans 04-05 import `triggerN8nWorkflow` from `@/lib/n8n/client`, never using raw fetch to n8n
- Security pattern is documented in JSDoc at the top of `client.ts` — future engineers understand why the module is server-only
- `isN8nConfigured()` enables feature flags — generation features in Plan 04 can conditionally render based on n8n availability
- Health check at `/api/health` is ready for uptime monitoring and Railway health checks
- Database type is compatible with supabase-js v2.98 — Plan 02 auth work (already on disk) will build cleanly

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `src/lib/n8n/client.ts` | FOUND |
| `src/app/api/n8n/test/route.ts` | FOUND |
| `src/app/api/health/route.ts` | FOUND |
| `01-03-SUMMARY.md` | FOUND |
| Commit `1b7b91e` (Task 1) | FOUND |
| Commit `6ae840b` (Task 2) | FOUND |
| TypeScript: `npx tsc --noEmit` | PASS |
| Build: `npm run build` | PASS |
| No `NEXT_PUBLIC_N8N_*` env vars | PASS |

---
*Phase: 01-foundation*
*Completed: 2026-02-28*
