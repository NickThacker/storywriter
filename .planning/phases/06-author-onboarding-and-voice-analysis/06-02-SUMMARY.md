---
phase: 06-author-onboarding-and-voice-analysis
plan: 02
subsystem: voice-analysis
tags: [zustand, pdfkit, pdf-parse, mammoth, server-actions, supabase, author-persona]

# Dependency graph
requires:
  - phase: 06-01
    provides: AuthorPersonaRow types, mammoth/pdf-parse/pdfkit packages installed and configured

provides:
  - VoiceWizardState Zustand vanilla store and factory (voice-wizard-store.ts)
  - VoiceWizardStoreProvider and useVoiceWizardStore React context hook (onboarding-store-provider.tsx)
  - extractTextFromFile utility for pdf/docx/txt buffers (text-extraction.ts)
  - VOICE_ANALYSIS_SCHEMA JSON schema and VoiceAnalysisResult TypeScript type (schema.ts)
  - buildVoiceAnalysisPrompt prompt builder for AI analysis call (prompt.ts)
  - buildVoiceReportPdf PDFKit-based PDF report generator (pdf-report.ts)
  - getPersona, savePersona, dismissOnboardingNudge server actions (voice.ts)

affects:
  - 06-03 (voice wizard UI consumes store + provider)
  - 06-04 (voice analysis API route uses text-extraction, schema, prompt)
  - 06-05 (PDF download route uses buildVoiceReportPdf)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Zustand vanilla store with createStore (App Router safe, not a hook singleton)
    - React context provider pattern for Zustand stores (mirrors intake-store-provider.tsx)
    - PDFKit event-listener buffer collection: doc.on('data') + doc.on('end') + Promise
    - Supabase server actions with (supabase as any) cast for unlisted tables
    - pdf-parse v2 named class API: new PDFParse({ data: buffer }).getText()

key-files:
  created:
    - src/lib/stores/voice-wizard-store.ts
    - src/components/onboarding/onboarding-store-provider.tsx
    - src/lib/voice/text-extraction.ts
    - src/lib/voice/schema.ts
    - src/lib/voice/prompt.ts
    - src/lib/voice/pdf-report.ts
    - src/actions/voice.ts
  modified: []

key-decisions:
  - "pdf-parse v2 exports named PDFParse class (not a default function) — import as { PDFParse }, construct with new PDFParse({ data: buffer }), call .getText()"
  - "VoiceWizardStoreProvider does not support initialState prop (voice wizard has no server-side prefill unlike intake wizard)"
  - "savePersona accepts AuthorPersonaUpdate & { wizard_step?, analysis_complete? } — allows step tracking on every save without requiring full type"

patterns-established:
  - "Voice module boundary: all AI analysis logic lives in src/lib/voice/ — zero UI code"
  - "Persona CRUD server actions use (supabase as any) cast + upsert onConflict user_id — same pattern as all other single-row-per-user tables"

requirements-completed: [VOIC-01, VOIC-02, VOIC-03, VOIC-07]

# Metrics
duration: 4min
completed: 2026-03-05
---

# Phase 06 Plan 02: Voice Library Layer Summary

**Zustand wizard store, PDFKit report generator, pdf-parse v2 text extraction, JSON schema, prompt builder, and Supabase persona CRUD server actions — complete service layer for author voice analysis**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-05T00:42:00Z
- **Completed:** 2026-03-05T00:44:57Z
- **Tasks:** 3
- **Files modified:** 7 created, 0 modified

## Accomplishments
- Voice wizard Zustand vanilla store with full 3-step state (samples, preferences, analysis results) and all actions
- Complete `src/lib/voice/` module: text extraction (pdf/docx/txt), JSON schema, AI prompt builder, PDF report
- Persona server actions following established settings.ts pattern with auth gate and upsert-on-conflict

## Task Commits

Each task was committed atomically:

1. **Task 1: Create voice wizard Zustand store and provider** - `0fd0bf8` (feat)
2. **Task 2: Create voice analysis utilities (text extraction, schema, prompt, PDF report)** - `856ba9a` (feat)
3. **Task 3: Create voice server actions** - `ebece44` (feat)

## Files Created/Modified

- `src/lib/stores/voice-wizard-store.ts` - VoiceWizardState interface + createVoiceWizardStore vanilla Zustand factory
- `src/components/onboarding/onboarding-store-provider.tsx` - VoiceWizardStoreProvider and useVoiceWizardStore hook
- `src/lib/voice/text-extraction.ts` - extractTextFromFile supporting pdf/docx/txt; MAX_SAMPLE_CHARS constant
- `src/lib/voice/schema.ts` - VoiceAnalysisResult TypeScript interface and VOICE_ANALYSIS_SCHEMA JSON schema
- `src/lib/voice/prompt.ts` - buildVoiceAnalysisPrompt building system+user messages from samples and preferences
- `src/lib/voice/pdf-report.ts` - buildVoiceReportPdf using PDFKit event-listener pattern
- `src/actions/voice.ts` - getPersona, savePersona, dismissOnboardingNudge server actions

## Decisions Made

- pdf-parse v2 exports a named `PDFParse` class, not a default export. Import as `{ PDFParse }` and construct with `new PDFParse({ data: buffer })`. Method is `.getText()` which returns `TextResult` with `.text` string property.
- `VoiceWizardStoreProvider` does not support an `initialState` prop. Unlike the intake wizard, the voice wizard has no server-side prefill on initial load — resume behavior is handled by loading from the DB in the wizard layout.
- `savePersona` accepts `AuthorPersonaUpdate & { wizard_step?, analysis_complete? }` — allows saving step tracking on partial updates without needing a separate type.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pdf-parse v2 API is class-based, not a default function export**
- **Found during:** Task 2 (text-extraction.ts)
- **Issue:** Plan specified `import pdfParse from 'pdf-parse'` and `pdfParse(buffer)` — this fails in pdf-parse v2.4.5 which exports `PDFParse` as a named class. TypeScript error: `Module has no default export`
- **Fix:** Changed import to `{ PDFParse }` from `'pdf-parse'`, constructed instance with `new PDFParse({ data: buffer })`, called `.getText()` to get `TextResult`, accessed `.text` property
- **Files modified:** `src/lib/voice/text-extraction.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `856ba9a` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — library API mismatch)
**Impact on plan:** Auto-fix necessary for functional text extraction. No scope creep.

## Issues Encountered

- None beyond the pdf-parse API deviation documented above.

## User Setup Required

None — all artifacts are pure code. The DB migration from 06-01 (00006_author_personas.sql) must still be applied before any server actions can reach the author_personas table.

## Next Phase Readiness

All service and data layer artifacts are ready for consumption:
- 06-03 (wizard UI): can import VoiceWizardStoreProvider and useVoiceWizardStore
- 06-04 (API route): can import extractTextFromFile, VOICE_ANALYSIS_SCHEMA, buildVoiceAnalysisPrompt, savePersona
- 06-05 (PDF download): can import buildVoiceReportPdf and getPersona

---
*Phase: 06-author-onboarding-and-voice-analysis*
*Completed: 2026-03-05*
