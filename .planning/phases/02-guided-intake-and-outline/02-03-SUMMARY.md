---
phase: 02-guided-intake-and-outline
plan: 03
subsystem: ui
tags: [react, zustand, next-app-router, intake-wizard, card-picker, shadcn]

dependency_graph:
  requires:
    - phase: 02-02
      provides: Zustand intake store, CardPicker component, all static data files (GENRES, THEMES, TONES, SETTINGS, LENGTH_PRESETS, BEAT_SHEETS)
  provides:
    - src/app/(dashboard)/projects/[id]/intake/layout.tsx
    - src/app/(dashboard)/projects/[id]/intake/page.tsx
    - src/components/intake/progress-bar.tsx
    - src/components/intake/wizard-nav.tsx
    - src/components/intake/premise-input.tsx
    - src/components/intake/steps/path-select.tsx
    - src/components/intake/steps/genre-step.tsx
    - src/components/intake/steps/themes-step.tsx
    - src/components/intake/steps/characters-step.tsx
    - src/components/intake/steps/setting-step.tsx
    - src/components/intake/steps/tone-step.tsx
    - src/components/intake/steps/review-screen.tsx
  affects:
    - Phase 02 Plan 04 (premise-prefill API connects to PremiseInput continue button)
    - Phase 02 Plan 05 (outline generation wires to WizardNav Generate Outline button on step 6)

tech-stack:
  added: []
  patterns:
    - Server Component layout fetches project data + hydrates IntakeStoreProvider (handles both auth redirect and resume)
    - Client page switches on currentStep from Zustand store to render correct step component
    - ProgressBar and WizardNav are separate client components reading from same Zustand store context
    - Combined step (ToneStep) groups logically related selections into one screen with labeled sections
    - Characters step uses local React state for selected roles + name inputs, syncs to Zustand on toggle

key-files:
  created:
    - src/app/(dashboard)/projects/[id]/intake/layout.tsx
    - src/app/(dashboard)/projects/[id]/intake/page.tsx
    - src/components/intake/progress-bar.tsx
    - src/components/intake/wizard-nav.tsx
    - src/components/intake/premise-input.tsx
    - src/components/intake/steps/path-select.tsx
    - src/components/intake/steps/genre-step.tsx
    - src/components/intake/steps/themes-step.tsx
    - src/components/intake/steps/characters-step.tsx
    - src/components/intake/steps/setting-step.tsx
    - src/components/intake/steps/tone-step.tsx
    - src/components/intake/steps/review-screen.tsx
  modified: []

key-decisions:
  - "WizardNav hidden on step 0 — PathSelect handles its own navigation (wizard calls nextStep directly; premise path shows PremiseInput inline and advances on continue)"
  - "ProgressBar shows steps 1-6 only (6 labeled indicators) — step 0 path selection is excluded as UI setup, not a content step"
  - "CharactersStep uses local selectedRoles Set + nameInputs state synced to Zustand — avoids roundtrip complexity of reading back from store for UI state"
  - "ReviewSection is an internal component encapsulating title, edit button, and missing-field warning — clean section rendering pattern"

patterns-established:
  - "Intake route layout (server) + page (client) split: layout owns auth/DB, page owns step rendering"
  - "useNextDisabled hook pattern: per-step validation to gate Next button"
  - "ReviewSection: reusable review row with edit navigation and missing-field warning"

requirements-completed:
  - INTK-01
  - INTK-02
  - INTK-03
  - INTK-04

duration: ~8min
completed: 2026-03-01
---

# Phase 02 Plan 03: Intake Wizard UI Summary

**Full 7-step intake wizard at `/projects/[id]/intake` — path selection, 5 card-based creative steps, premise paste path, and review screen with per-section edit navigation.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-01T19:15:00Z
- **Completed:** 2026-03-01T19:23:00Z
- **Tasks:** 3
- **Files modified:** 12 created, 0 modified

## Accomplishments

- Complete navigable wizard from path selection through review — all 7 steps wired via Zustand currentStep
- All step components use CardPicker with appropriate options (single-select for genre/setting/tone, multi-select for themes)
- Review screen shows all intake data grouped by section with edit navigation and missing-field warnings

## Task Commits

Each task was committed atomically:

1. **Task 1: Intake layout, page router, progress bar, and navigation** - `d226dd2` (feat)
2. **Task 2: All 5 wizard step components and premise input** - `c0b00e9` (feat)
3. **Task 3: Review screen** - `50e969c` (feat)

## Files Created/Modified

- `src/app/(dashboard)/projects/[id]/intake/layout.tsx` - Server Component; fetches project + hydrates IntakeStoreProvider; redirects on auth failure or missing project
- `src/app/(dashboard)/projects/[id]/intake/page.tsx` - Client page; switch on currentStep renders correct step; composes ProgressBar + step content + WizardNav
- `src/components/intake/progress-bar.tsx` - 6-step visual indicator (steps 1-6); hidden on step 0; completed steps show checkmark
- `src/components/intake/wizard-nav.tsx` - Back/Next bottom bar; Next text changes to "Review" on step 5, "Generate Outline" on step 6; disabled when step has no selection
- `src/components/intake/premise-input.tsx` - Textarea + continue button; calls setPremise + setPath + nextStep; placeholder for Plan 04 AI prefill
- `src/components/intake/steps/path-select.tsx` - Two large cards (Build Step-by-Step vs. I Have an Idea); PremiseInput shown inline on premise selection
- `src/components/intake/steps/genre-step.tsx` - CardPicker with GENRES, single-select
- `src/components/intake/steps/themes-step.tsx` - Multi-select CardPicker with THEMES; 3-slot count indicator; max 3 enforced
- `src/components/intake/steps/characters-step.tsx` - Role toggle cards with optional name inputs; character summary list with remove buttons
- `src/components/intake/steps/setting-step.tsx` - CardPicker with SETTINGS, single-select
- `src/components/intake/steps/tone-step.tsx` - Combined step: tone (CardPicker), beat sheet (CardPicker), target length (CardPicker) + chapter count numeric input
- `src/components/intake/steps/review-screen.tsx` - All sections with edit navigation; missing-field warnings with destructive styling; premise blockquote for premise path

## Decisions Made

- WizardNav hidden on step 0 — PathSelect self-navigates (wizard via nextStep, premise via PremiseInput continue)
- ProgressBar maps steps 1-6 to 6 labeled indicators (Genre through Review); step 0 excluded
- CharactersStep maintains local `selectedRoles` Set and `nameInputs` state to drive UI; syncs to Zustand on toggle/remove
- ReviewSection internal component pattern encapsulates title + edit button + missing warning — clean, reusable across 6+ sections

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `src/components/story-bible/bible-tabs.tsx` (missing imports for `world-facts-list` and `add-entity-dialog`) — unrelated to this plan, out of scope per deviation rules, logged here for awareness.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Intake wizard UI fully navigable — all 7 steps render and connect via Zustand store
- Plan 04 (premise prefill): PremiseInput has a clear TODO comment and `setPremise`/`setPath` already called; just needs the API POST + `hydrateFromPrefill` call
- Plan 05 (outline generation): WizardNav "Generate Outline" button on step 6 is wired with a `console.log` placeholder; replace with API call

---
*Phase: 02-guided-intake-and-outline*
*Completed: 2026-03-01*

## Self-Check: PASSED

- [x] src/app/(dashboard)/projects/[id]/intake/layout.tsx
- [x] src/app/(dashboard)/projects/[id]/intake/page.tsx
- [x] src/components/intake/progress-bar.tsx
- [x] src/components/intake/wizard-nav.tsx
- [x] src/components/intake/premise-input.tsx
- [x] src/components/intake/steps/path-select.tsx
- [x] src/components/intake/steps/genre-step.tsx
- [x] src/components/intake/steps/themes-step.tsx
- [x] src/components/intake/steps/characters-step.tsx
- [x] src/components/intake/steps/setting-step.tsx
- [x] src/components/intake/steps/tone-step.tsx
- [x] src/components/intake/steps/review-screen.tsx
- [x] d226dd2 — feat(02-03): intake layout, page router, progress bar, navigation
- [x] c0b00e9 — feat(02-03): all 5 wizard step components and premise input
- [x] 50e969c — feat(02-03): review screen with edit navigation
