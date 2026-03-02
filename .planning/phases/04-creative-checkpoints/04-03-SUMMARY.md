---
phase: 04-creative-checkpoints
plan: 03
subsystem: ui
tags: [openrouter, json-schema, react, checkpoint, direction, next-chapter]

# Dependency graph
requires:
  - phase: 04-01
    provides: chapter_checkpoints schema, saveDirection/saveDirectionOptions server actions, DirectionOption/SelectedDirection types
  - phase: 04-02
    provides: CheckpointPanel shell with step='direction' placeholder, outline-grounded constraint decisions
provides:
  - Direction options API endpoint (/api/generate/direction-options) with caching
  - buildDirectionPrompt() with DIRECTION_OPTIONS_SCHEMA for structured JSON generation
  - DirectionOptionCard selectable card component
  - CheckpointStepDirection — full Step 2 UI (options + custom direction + advanced toggle)
  - CheckpointPanel wired with real CheckpointStepDirection replacing placeholder
affects:
  - 04-04 (impact analysis — uses direction_for_next from this plan)
  - chapter generation (direction_for_next injected into next chapter prompt)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "direction-options route follows compress-chapter pattern: auth → parse → verify → fetch checkpoint → fetch outline → get API key → get model pref → build prompt → call OpenRouter with json_schema → save → return"
    - "Caching check in both route handler (returns cached options immediately) and CheckpointStepDirection useEffect (skips fetch if options non-empty)"
    - "selectionMode toggle: 'option' (AI card) vs 'custom' (guided fields + advanced free-text) — same pattern as RewriteDialog"

key-files:
  created:
    - src/lib/checkpoint/direction-prompt.ts
    - src/app/api/generate/direction-options/route.ts
    - src/components/chapters/direction-option-card.tsx
    - src/components/chapters/checkpoint-step-direction.tsx
  modified:
    - src/components/chapters/checkpoint-panel.tsx

key-decisions:
  - "Direction options API caches on both route handler (early return if direction_options non-null) and client (useEffect skips fetch if options.length > 0) — double defense against Pitfall 2"
  - "direction_for_next assembled client-side before saveDirection call: option uses title+body concat, custom assembles from Tone/Pacing/Character Focus/Advanced free-text fields"
  - "onBack prop in CheckpointStepDirection is optional — allows CheckpointPanel to pass handleBackToApprove without breaking composability"

patterns-established:
  - "Direction option cards use ring-2 ring-primary/30 for selection state, consistent with intake wizard card design language"
  - "Custom direction form mirrors RewriteDialog guided mode (same three fields: tone, pacing, characterFocus) for UX consistency"

requirements-completed:
  - CKPT-04
  - CKPT-05

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 4 Plan 03: Direction Options UI Summary

**AI-generated 2-4 direction cards with custom direction fallback wired into checkpoint Step 2 via json_schema OpenRouter call with double-layer caching**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T22:39:48Z
- **Completed:** 2026-03-02T22:42:48Z
- **Tasks:** 2
- **Files modified:** 5 (2 created in task 1, 3 in task 2)

## Accomplishments
- Direction options route handler generates 2-4 AI options grounded strictly in outline beats (execution-level only: tone, pacing, emphasis — not plot changes)
- CheckpointStepDirection component fetches options lazily, caches via checkpoint.direction_options, displays selectable cards, and falls back to custom direction with guided + advanced free-text
- CheckpointPanel Step 2 placeholder replaced with real CheckpointStepDirection; back-to-review navigation added

## Task Commits

Each task was committed atomically:

1. **Task 1: Direction options route handler and prompt builder** - `549d7e1` (feat)
2. **Task 2: DirectionOptionCard, CheckpointStepDirection, CheckpointPanel wired** - `48d4961` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/checkpoint/direction-prompt.ts` - DIRECTION_OPTIONS_SCHEMA + buildDirectionPrompt() with outline-grounded system message
- `src/app/api/generate/direction-options/route.ts` - Non-streaming structured JSON endpoint; caches on first call, returns cached on re-entry
- `src/components/chapters/direction-option-card.tsx` - Selectable card with bold title, body text, primary ring on selection
- `src/components/chapters/checkpoint-step-direction.tsx` - Step 2 UI: lazy-fetch options, AI Suggestions/Custom toggle, tone/pacing/characterFocus fields, advanced free-text, saves via saveDirection
- `src/components/chapters/checkpoint-panel.tsx` - Replaced placeholder with CheckpointStepDirection import; added handleBackToApprove

## Decisions Made
- Direction options cached at both route handler (early return if non-null) and client useEffect (skips fetch if options.length > 0) — double defense against redundant API calls on re-entry
- direction_for_next assembled client-side from option.title + option.body or from custom field concatenation — single source of truth before persisting
- onBack prop on CheckpointStepDirection is optional, passed by CheckpointPanel to enable back-to-review navigation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required beyond existing OpenRouter API key.

## Next Phase Readiness
- Step 2 of checkpoint flow is complete and functional
- direction_for_next is persisted to chapter_checkpoints.direction_for_next — ready for Plan 04 impact analysis to consume
- Plan 04: Impact analysis and novel completion summary

---
*Phase: 04-creative-checkpoints*
*Completed: 2026-03-02*
