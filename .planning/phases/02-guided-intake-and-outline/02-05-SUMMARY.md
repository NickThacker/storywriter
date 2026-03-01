---
phase: 02-guided-intake-and-outline
plan: 05
subsystem: api
tags: [openrouter, sse, streaming, outline, json-schema, server-actions, supabase]

# Dependency graph
requires:
  - phase: 02-01
    provides: outlines table schema, OutlineRow, OutlineChapter types
  - phase: 02-04
    provides: IntakeData type, intake wizard data flow
  - phase: 01-05
    provides: BYOK API key storage in user_settings, user_model_preferences table

provides:
  - SSE streaming route handler at /api/generate/outline calling OpenRouter directly
  - useOutlineStream client hook that accumulates tokens and parses final JSON
  - OUTLINE_SCHEMA JSON schema for OpenRouter structured output
  - saveOutline/getOutline/updateOutlineChapter server actions for outline persistence
  - buildOutlinePrompt / buildRegeneratePrompt prompt builders from IntakeData

affects:
  - 02-06
  - 02-07
  - phase-03

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SSE streaming via Next.js Route Handler: force-dynamic + ReadableStream passthrough from OpenRouter"
    - "useOutlineStream: pipeThrough(TextDecoderStream) + reader.read() loop for client-side SSE"
    - "response_format: json_schema with strict: true for structured OpenRouter output"
    - "previous_chapters snapshot pattern: current chapters preserved on every regeneration"
    - "BYOK enforced in Route Handler: API key retrieved server-side only, never exposed to browser"

key-files:
  created:
    - src/lib/outline/schema.ts
    - src/lib/outline/prompt.ts
    - src/app/api/generate/outline/route.ts
    - src/hooks/use-outline-stream.ts
    - src/actions/outline.ts
  modified: []

key-decisions:
  - "force-dynamic directive on route handler prevents Vercel from caching SSE response"
  - "Model preference for 'outline' task retrieved from user_model_preferences; defaults to anthropic/claude-sonnet-4-5"
  - "previous_chapters snapshot taken on every saveOutline call that finds an existing outline — preserves regeneration history"
  - "Project title and chapter_count updated from generated outline data in saveOutline"
  - "updateOutlineChapter errors logged but saveOutline does not fail if project metadata update fails — outline itself is the source of truth"

patterns-established:
  - "Outline streaming: Route Handler pipes OpenRouter body directly; no buffering server-side"
  - "Client hook accumulates delta.content tokens; final JSON.parse on stream done"
  - "Server actions use verifyProjectOwnership helper for all project-scoped mutations"

requirements-completed: [OUTL-01]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 2 Plan 05: AI Outline Generation Pipeline Summary

**OpenRouter SSE streaming pipeline for outline generation: Route Handler proxies stream with json_schema enforcement, client hook accumulates tokens to parseable JSON, server actions persist with previous-chapter versioning**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-01T19:24:10Z
- **Completed:** 2026-03-01T19:26:30Z
- **Tasks:** 3
- **Files modified:** 5 (all created)

## Accomplishments
- SSE streaming route handler that calls OpenRouter with `stream: true` and `response_format: json_schema` for structured outline output
- `useOutlineStream` React hook that consumes the SSE stream, accumulates content tokens, and parses final JSON into `GeneratedOutline` on completion
- `OUTLINE_SCHEMA` JSON schema and `buildOutlinePrompt`/`buildRegeneratePrompt` prompt builders
- `saveOutline`, `getOutline`, and `updateOutlineChapter` server actions with full auth, ownership verification, and previous-chapter snapshots

## Task Commits

Each task was committed atomically:

1. **Task 1: Create outline JSON schema and prompt builder** - `26d5d01` (feat)
2. **Task 2: Create SSE streaming route handler and client hook** - `73ba5be` (feat)
3. **Task 3: Create outline server actions for CRUD** - `c949bf2` (feat)

## Files Created/Modified
- `src/lib/outline/schema.ts` - OUTLINE_SCHEMA JSON schema + GeneratedOutline TypeScript type
- `src/lib/outline/prompt.ts` - buildOutlinePrompt and buildRegeneratePrompt from IntakeData
- `src/app/api/generate/outline/route.ts` - SSE streaming route handler, force-dynamic, OpenRouter integration
- `src/hooks/use-outline-stream.ts` - Client hook: SSE consumer, token accumulation, final JSON parse
- `src/actions/outline.ts` - saveOutline, getOutline, updateOutlineChapter server actions

## Decisions Made
- `force-dynamic` directive added to route handler — prevents Vercel from caching the streaming response
- Default outline model set to `anthropic/claude-sonnet-4-5` — consistent with existing model preference infrastructure
- `previous_chapters` snapshot captured on every regeneration — preserves outline history per research Open Question 2
- `saveOutline` also updates `projects.title` and `projects.chapter_count` from generated data — keeps project metadata in sync without requiring a separate call
- `maybeSingle()` used in `getOutline` — avoids PostgREST 406 error when no outline row exists (consistent with Phase 02-04 decision)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Complete AI outline generation pipeline is in place and ready for UI integration
- `useOutlineStream` hook ready to wire into outline page component (Plan 06/07)
- `saveOutline` ready to be called after stream completes with parsed GeneratedOutline
- BYOK pattern enforced: API key never leaves server, consistent with Phase 1 settings architecture

---
*Phase: 02-guided-intake-and-outline*
*Completed: 2026-03-01*

## Self-Check: PASSED

All created files verified present:
- FOUND: src/lib/outline/schema.ts
- FOUND: src/lib/outline/prompt.ts
- FOUND: src/app/api/generate/outline/route.ts
- FOUND: src/hooks/use-outline-stream.ts
- FOUND: src/actions/outline.ts

All task commits verified:
- FOUND: 26d5d01 feat(02-05): create outline JSON schema and prompt builder
- FOUND: 73ba5be feat(02-05): create SSE streaming route handler and client hook
- FOUND: c949bf2 feat(02-05): create outline server actions for CRUD
