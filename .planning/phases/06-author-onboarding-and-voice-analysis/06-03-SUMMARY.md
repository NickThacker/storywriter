---
phase: 06-author-onboarding-and-voice-analysis
plan: 03
subsystem: voice-wizard-ui
tags: [zustand, card-picker, sse, streaming, pdf-download, onboarding-wizard]

# Dependency graph
requires:
  - phase: 06-01
    provides: AuthorPersonaRow types, author_personas migration
  - phase: 06-02
    provides: VoiceWizardStoreProvider, useVoiceWizardStore, savePersona, voice schema, store actions

provides:
  - Onboarding wizard route at /onboarding with VoiceWizardStoreProvider layout
  - WritingSamplesStep (paste + file upload via /api/voice-upload)
  - StylePreferencesStep (6 CardPicker groups for style preferences)
  - AnalysisResultsStep (SSE stream from /api/voice-analysis + results display + PDF download)

affects:
  - 06-04 (voice-analysis API route is now wired to AnalysisResultsStep)
  - 06-05 (voice-report API route is now wired to PDF download button)

# Tech tracking
tech-stack:
  added: [textarea ui component]
  patterns:
    - Inline VoiceProgressBar (step-circle + connector) avoids coupling to intake progress bar
    - parsePartialVoiceJSON mirrors outline streaming-view parsePartialJSON pattern
    - useRef(false) guard prevents double-firing of on-mount SSE fetch in React StrictMode
    - as unknown as StyleDescriptors cast for flexible mapping from AI partial result
    - Anchor-based PDF download (create anchor, click, remove) same as ExportDialog pattern

key-files:
  created:
    - src/app/(dashboard)/onboarding/layout.tsx
    - src/app/(dashboard)/onboarding/page.tsx
    - src/components/onboarding/writing-samples-step.tsx
    - src/components/onboarding/style-preferences-step.tsx
    - src/components/onboarding/analysis-results-step.tsx
    - src/components/ui/textarea.tsx
  modified: []

key-decisions:
  - "Inline VoiceProgressBar in page.tsx — existing ProgressBar is tightly coupled to useIntakeStore and cannot be reused"
  - "textarea.tsx added as new shadcn-style UI component — was missing from the component library"
  - "useRef(false) guard (hasFiredRef) prevents double SSE fetch in React StrictMode strict mount/unmount cycle"
  - "as unknown as StyleDescriptors cast — savePersona expects strict typed interfaces but AI returns partial Record<string, string>; cast is safe because AI schema guarantees correct keys at runtime"

patterns-established:
  - "Voice wizard pages import from onboarding-store-provider.tsx (not from store directly) — consistent with intake pattern"
  - "SSE streaming components track hasFiredRef to be safe with React StrictMode double-effect"

requirements-completed: [VOIC-01, VOIC-02, VOIC-03, VOIC-05]

# Metrics
duration: 4min
completed: 2026-03-05
---

# Phase 06 Plan 03: Voice Wizard UI Summary

**3-step onboarding wizard at /onboarding — writing samples (paste + file upload), style preferences (6 card-picker groups), and SSE streaming analysis display with PDF download button**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-05T00:47:50Z
- **Completed:** 2026-03-05T00:51:44Z
- **Tasks:** 2
- **Files modified:** 6 created, 0 modified

## Accomplishments

- Onboarding layout server component wraps all steps in `VoiceWizardStoreProvider`
- Page component renders inline `VoiceProgressBar` (step circles + connectors + labels) and routes by `currentStep`
- Step 1 (WritingSamplesStep): paste textarea with Add Sample, pasted sample cards with remove, file upload input with `/api/voice-upload` POST, total sample count, Next button gated on `pastedSamples.length > 0 || uploadedFileTexts.length > 0`
- Step 2 (StylePreferencesStep): 6 CardPicker groups (tone, pacing, dialogue ratio, thematic tone, POV, diction level); all optional; saves `wizard_step=3` to DB on advance
- Step 3 (AnalysisResultsStep): SSE fetch on mount with StrictMode guard, progressive `voice_description` reveal during streaming, error state with retry, full results display (DescriptorGrid for style + thematic), anchor-based PDF download, Go to Dashboard button

## Task Commits

Each task was committed atomically:

1. **Task 1: Create onboarding layout, page router, and writing samples step** - `fcdf2ea` (feat)
2. **Task 2: Create style preferences step and analysis results step** - `c9cee35` (feat)

## Files Created/Modified

- `src/app/(dashboard)/onboarding/layout.tsx` - Server component wrapping children in VoiceWizardStoreProvider
- `src/app/(dashboard)/onboarding/page.tsx` - Client page with inline VoiceProgressBar, step title, and conditional step renders
- `src/components/onboarding/writing-samples-step.tsx` - Step 1: paste + add sample, file upload to /api/voice-upload, remove buttons, Next nav
- `src/components/onboarding/style-preferences-step.tsx` - Step 2: 6 PreferenceGroup/CardPicker combinations, DB save on advance, Back + Next nav
- `src/components/onboarding/analysis-results-step.tsx` - Step 3: SSE streaming with partial JSON reveal, DescriptorGrid results display, PDF download, dashboard navigation
- `src/components/ui/textarea.tsx` - Standard shadcn-style textarea (missing from component library — auto-added)

## Decisions Made

- Inline `VoiceProgressBar` in page.tsx — the existing `ProgressBar` component is tightly coupled to `useIntakeStore` via hardcoded `STEP_LABELS` and cannot be reused for the voice wizard without modification.
- `textarea.tsx` added as new shadcn-style UI component — was missing from the project's component library. Required for the writing sample paste area.
- `hasFiredRef` guard (`useRef(false)`) prevents double SSE fetch on React StrictMode double-mount. The guard resets on retry.
- `as unknown as StyleDescriptors` cast in `savePersona` call — the AI returns a partial JSON object with the correct keys at runtime, but TypeScript cannot verify this at compile time. The cast is safe given the `VOICE_ANALYSIS_SCHEMA` enforces the shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Missing `textarea.tsx` UI component**
- **Found during:** Task 1 (writing-samples-step.tsx)
- **Issue:** `src/components/ui/textarea.tsx` does not exist in the project. The import `@/components/ui/textarea` caused TypeScript error TS2307.
- **Fix:** Created standard shadcn-style `Textarea` component using `React.forwardRef` pattern, matching the project's `Input` component style.
- **Files modified:** `src/components/ui/textarea.tsx` (created)
- **Committed in:** `fcdf2ea` (Task 1 commit)

**2. [Rule 1 - Bug] ProgressBar coupled to intake store — cannot reuse for voice wizard**
- **Found during:** Task 1 (page.tsx)
- **Issue:** The existing `ProgressBar` component imports `useIntakeStore` directly and uses intake-specific step labels. It cannot be imported and used in the onboarding page without errors.
- **Fix:** Created an inline `VoiceProgressBar` component directly in `page.tsx` with the correct 3-step labels and voice wizard step logic.
- **Files modified:** `src/app/(dashboard)/onboarding/page.tsx`
- **Committed in:** `fcdf2ea` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 missing component, 1 tightly-coupled dependency)
**Impact on plan:** Both fixes are non-additive — they implement the same intent from the plan using available patterns.

## Issues Encountered

- None beyond the deviations documented above.

## User Setup Required

- The `/api/voice-upload`, `/api/voice-analysis`, and `/api/voice-report` API routes must exist for Steps 1 and 3 to function. These are being built in plans 06-04 and 06-05.

## Next Phase Readiness

- 06-04 (voice-analysis API route): AnalysisResultsStep POSTs to `/api/voice-analysis` expecting SSE stream
- 06-05 (PDF report route): AnalysisResultsStep uses anchor download to `/api/voice-report`
- Both API routes are consumed but not yet implemented — wizard UI is complete and waiting on them.

---
*Phase: 06-author-onboarding-and-voice-analysis*
*Completed: 2026-03-05*

## Self-Check: PASSED

- FOUND: src/app/(dashboard)/onboarding/layout.tsx
- FOUND: src/app/(dashboard)/onboarding/page.tsx
- FOUND: src/components/onboarding/writing-samples-step.tsx
- FOUND: src/components/onboarding/style-preferences-step.tsx
- FOUND: src/components/onboarding/analysis-results-step.tsx
- FOUND: src/components/ui/textarea.tsx
- FOUND: commit fcdf2ea (Task 1)
- FOUND: commit c9cee35 (Task 2)
