---
phase: 06-author-onboarding-and-voice-analysis
plan: 04
subsystem: voice-api-routes
tags: [api-routes, sse-streaming, file-upload, pdf-download, openrouter, supabase-auth]

# Dependency graph
requires:
  - phase: 06-02
    provides: extractTextFromFile, VOICE_ANALYSIS_SCHEMA, buildVoiceAnalysisPrompt, buildVoiceReportPdf
  - phase: 06-03
    provides: wizard UI that calls these routes

provides:
  - POST /api/voice-upload — multipart file upload → text extraction endpoint
  - POST /api/voice-analysis — SSE streaming AI voice analysis endpoint
  - GET /api/voice-report — PDF report download endpoint

affects:
  - 06-05 (phase verification — all three routes will be verified end-to-end)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Route handler file upload via request.formData() (no 1MB server action size limit)
    - SSE streaming pattern mirrors src/app/api/generate/outline/route.ts exactly
    - Buffer cast to BodyInit for PDF response in strict TypeScript mode
    - maybeSingle() for optional single-row fetch (returns null instead of error when no row)

key-files:
  created:
    - src/app/api/voice-upload/route.ts
    - src/app/api/voice-analysis/route.ts
    - src/app/api/voice-report/route.ts
  modified: []

key-decisions:
  - "voice-analysis uses 'editing' task_type for model preference lookup — closest semantic fit for voice analysis (no 'voice' task_type exists)"
  - "voice-upload is a route handler (not server action) to bypass the 1MB server action body size limit for file uploads"
  - "voice-report uses maybeSingle() instead of single() — returns null gracefully when user has no persona yet"

patterns-established:
  - "All three routes follow identical auth gate pattern: createClient() → getUser() → 401 if no user"
  - "PDF buffer returned as Buffer cast to BodyInit — same pattern as export routes in Phase 5"

requirements-completed: [VOIC-02, VOIC-03, VOIC-05]

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 06 Plan 04: Voice API Routes Summary

**Three Next.js App Router API routes implementing the server-side backbone of the voice onboarding pipeline: multipart file upload with text extraction, SSE streaming AI analysis, and PDF report download**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-05T00:54:50Z
- **Completed:** 2026-03-05T00:56:03Z
- **Tasks:** 2
- **Files modified:** 3 created, 0 modified

## Accomplishments

- `/api/voice-upload` POST route: auth gate, multipart formData parsing, Buffer conversion, extension extraction, delegates to `extractTextFromFile()`, returns `{ text }` or `{ error }`
- `/api/voice-analysis` POST route: mirrors outline/route.ts pattern exactly — auth, API key, editing model preference, `buildVoiceAnalysisPrompt()`, OpenRouter fetch with `VOICE_ANALYSIS_SCHEMA` in `response_format`, SSE stream passthrough
- `/api/voice-report` GET route: auth gate, `maybeSingle()` persona fetch, `buildVoiceReportPdf()`, PDF buffer response with `Content-Disposition: attachment` header

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /api/voice-upload route** - `de1bfd5` (feat)
2. **Task 2: Create /api/voice-analysis and /api/voice-report routes** - `8dd8852` (feat)

## Files Created/Modified

- `src/app/api/voice-upload/route.ts` - POST handler for multipart file upload → text extraction
- `src/app/api/voice-analysis/route.ts` - POST handler for SSE streaming AI voice analysis
- `src/app/api/voice-report/route.ts` - GET handler for PDF report download with Content-Disposition

## Decisions Made

- `voice-analysis` uses the `'editing'` task_type for model preference lookup — there is no `'voice'` task_type in the schema; `'editing'` is the closest semantic match for a careful analytical task.
- `voice-upload` is implemented as a route handler rather than a server action specifically to bypass Next.js server action body size limits (1MB). Route handlers accept arbitrarily large payloads.
- `voice-report` uses `.maybeSingle()` (returns null) instead of `.single()` (throws error) — the user may not have completed onboarding yet, and a clean 404 is more user-friendly than an uncaught Supabase error.

## Deviations from Plan

None — plan executed exactly as written. All three routes follow the exact code provided in the plan. TypeScript passed with zero errors on first attempt.

## Issues Encountered

- None.

## User Setup Required

None — these are pure code routes. The DB migration from 06-01 (`00006_author_personas.sql`) must still be applied before voice-report can find persona rows in the `author_personas` table.

## Next Phase Readiness

All three API routes are production-ready for:
- 06-05 (phase verification): can test all three routes end-to-end against the wizard UI from 06-03

---
*Phase: 06-author-onboarding-and-voice-analysis*
*Completed: 2026-03-05*
