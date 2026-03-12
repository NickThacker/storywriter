---
phase: 06-author-onboarding-and-voice-analysis
verified: 2026-03-11T00:00:00Z
status: gaps_found
score: 5/7 must-haves verified
re_verification: null
gaps:
  - truth: "Navigating to /onboarding renders a 3-step wizard with WizardNav prev/next controls and a progress bar"
    status: partial
    reason: "Wizard was simplified from 3 steps to 2 steps. style-preferences-step.tsx was intentionally deleted per project memory (2026-03-04). TOTAL_VOICE_STEPS=2. Step 2 (Style Preferences) does not exist. The /onboarding page only renders WritingSamplesStep and AnalysisResultsStep. The PLAN artifact is missing and the Plan 06-06 file existence check would fail for this file."
    artifacts:
      - path: "src/components/onboarding/style-preferences-step.tsx"
        issue: "File deleted — no longer exists in codebase"
      - path: "src/app/(dashboard)/onboarding/page.tsx"
        issue: "Only renders currentStep===1 (WritingSamplesStep) and currentStep===2 (AnalysisResultsStep). No StylePreferencesStep branch."
    missing:
      - "Document the 2-step simplification formally: update REQUIREMENTS.md VOIC-01 to reflect 2-step flow, or confirm deletion of style-preferences-step.tsx is intentional and close the gap"
  - truth: "POST /api/voice-analysis accepts { samples: string[], preferences: StylePreferences }, streams SSE from OpenRouter using the voice analysis prompt with structured JSON schema output"
    status: partial
    reason: "The route accepts { samples } only — preferences field was removed alongside the style-preferences step. The body interface is VoiceAnalysisBody { samples: string[] }. No response_format JSON schema is sent — uses json_object mode instead (per in-code comment: Bedrock rejects large compiled grammars). Both changes are intentional simplifications documented in project memory."
    artifacts:
      - path: "src/app/api/voice-analysis/route.ts"
        issue: "Does not accept or use StylePreferences. Does not use VOICE_ANALYSIS_SCHEMA in response_format. Uses json_object mode (not json_schema)."
    missing:
      - "This is a documented intentional deviation. If the plan must-have should be updated to reflect { samples } only and json_object mode, update the plan. Otherwise confirm the deviation is accepted."
human_verification:
  - test: "Complete the 2-step voice wizard end-to-end"
    expected: "Step 1 collects writing samples (paste + upload), clicking 'Analyze My Writing' triggers analysis on step 2, CompletionModal opens when done with PDF download and dashboard navigation"
    why_human: "SSE streaming behavior and modal display cannot be verified statically"
  - test: "Dashboard nudge appears for new user without persona, dismissed permanently on click"
    expected: "Blue banner appears, clicking X calls dismissOnboardingNudge, refresh does not show banner"
    why_human: "Requires live Supabase DB state and session state to test"
  - test: "Voice Profile tab in Settings shows persona after wizard completion"
    expected: "Voice summary, style descriptors, and editable guidance text textarea appear; save button persists changes"
    why_human: "Requires completed persona in DB to display non-empty state"
  - test: "Persona injected silently into outline and chapter generation"
    expected: "Generating an outline or chapter for a user with a persona completes without error"
    why_human: "Side-by-side behavioral difference requires human judgment; also verifies fail-open for users without persona"
---

# Phase 6: Author Onboarding and Voice Analysis — Verification Report

**Phase Goal:** Author onboarding wizard with voice analysis — writing sample upload, AI voice analysis, PDF style report, persona injection into generation prompts
**Verified:** 2026-03-11
**Status:** gaps_found
**Re-verification:** No — initial GSD verification (previous VERIFICATION.md was a 2026-03-09 code audit without GSD frontmatter)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can upload or paste writing samples | VERIFIED | `writing-samples-step.tsx` — paste textarea + file upload POST to `/api/voice-upload`, both populate store |
| 2 | AI voice analysis produces structured persona | VERIFIED | `voice-analysis/route.ts` streams SSE from OpenRouter; `AnalysisResultsStep` parses JSON and calls `savePersona` with full result including voice_description, style_descriptors, raw_guidance_text |
| 3 | Downloadable PDF voice report | VERIFIED | `voice-report/route.ts` calls `buildVoiceReportPdf(persona)`, returns PDF with `Content-Disposition: attachment` header; UI triggers download via anchor in CompletionModal and VoiceProfileTab |
| 4 | Persona injected into outline + chapter generation | VERIFIED | `buildOutlinePrompt(intakeData, persona)` and `buildChapterPrompt(context, adj, persona)` both inject persona; both routes fetch with `.maybeSingle()` and pass result; fail-open for null persona |
| 5 | Voice Profile tab in Settings | VERIFIED | `settings/page.tsx` has three tabs including "Voice Profile"; `VoiceProfileTab` renders voice_description, style_descriptors grid, editable raw_guidance_text, PDF download, Re-run Analysis link |
| 6 | Dashboard nudge for users without persona | VERIFIED | `layout.tsx` fetches `voice_onboarding_dismissed` + `author_personas.id` in parallel; `showVoiceNudge` computed; `<VoiceOnboardingNudge />` rendered conditionally |
| 7 | 3-step wizard at /onboarding | FAILED | TOTAL_VOICE_STEPS=2; `style-preferences-step.tsx` deleted; page only renders steps 1 and 2 |
| 8 | voice-analysis route accepts { samples, preferences } | FAILED | Route body is `{ samples: string[] }` only; preferences removed with style step; uses json_object not json_schema |

**Score:** 5/7 truths verified (2 partial deviations from plan specification, both intentional and documented in project memory)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/00006_author_personas.sql` | DB schema for author_personas + user_settings extension | VERIFIED | Contains author_personas table, RLS policies, trigger, voice_onboarding_dismissed column |
| `src/types/database.ts` | AuthorPersonaRow, AuthorPersonaInsert, AuthorPersonaUpdate | VERIFIED | All three types exported |
| `next.config.ts` | serverExternalPackages for pdfkit/pdf-parse/mammoth | VERIFIED | Contains serverExternalPackages key |
| `src/lib/stores/voice-wizard-store.ts` | VoiceWizardState, createVoiceWizardStore, TOTAL_VOICE_STEPS | VERIFIED | All exports present; TOTAL_VOICE_STEPS=2 (changed from 3 in plan) |
| `src/components/onboarding/onboarding-store-provider.tsx` | VoiceWizardStoreProvider, useVoiceWizardStore | VERIFIED | Both exported; mirrors intake-store-provider.tsx pattern |
| `src/lib/voice/text-extraction.ts` | extractTextFromFile | VERIFIED | Handles pdf/docx/txt; exports MAX_SAMPLE_CHARS |
| `src/lib/voice/schema.ts` | VOICE_ANALYSIS_SCHEMA, VoiceAnalysisResult | VERIFIED | Both exported; schema substantially expanded beyond original plan with Voice DNA Profile fields |
| `src/lib/voice/prompt.ts` | buildVoiceAnalysisPrompt(samples, preferences) | PARTIAL | Function exists but signature is `(samples: string[])` only — preferences parameter removed along with style step |
| `src/lib/voice/pdf-report.ts` | buildVoiceReportPdf using PDFKit event-listener pattern | VERIFIED | Uses doc.on('data') + doc.on('end') buffer collection; premium design with cover page, warmDark theme |
| `src/actions/voice.ts` | savePersona, getPersona, dismissOnboardingNudge | VERIFIED | All three server actions exported with correct Supabase upsert patterns |
| `src/app/(dashboard)/onboarding/layout.tsx` | Wraps children in VoiceWizardStoreProvider | VERIFIED | Imports and renders VoiceWizardStoreProvider |
| `src/app/(dashboard)/onboarding/page.tsx` | Step router | VERIFIED | Renders WritingSamplesStep (step 1) and AnalysisResultsStep (step 2) conditionally |
| `src/components/onboarding/writing-samples-step.tsx` | Paste + file upload for writing samples | VERIFIED | Full implementation with file type validation, /api/voice-upload fetch, store wiring, sonner toast on error |
| `src/components/onboarding/style-preferences-step.tsx` | Step 2 card-picker preference selections | MISSING | File deleted during Phase 6 simplification (2026-03-04) |
| `src/components/onboarding/analysis-results-step.tsx` | Streaming analysis view + results + PDF download | VERIFIED | Fetches SSE on mount, partial JSON parsing via parsePartialVoiceJSON, CompletionModal with PDF anchor download |
| `src/app/api/voice-upload/route.ts` | File upload to text extraction | VERIFIED | Authenticates, reads formData, calls extractTextFromFile, returns {text} |
| `src/app/api/voice-analysis/route.ts` | SSE streaming voice analysis | VERIFIED | Authenticates, builds prompt (samples only), streams from OpenRouter; json_object mode |
| `src/app/api/voice-report/route.ts` | PDF report download | VERIFIED | Fetches persona with maybeSingle(), calls buildVoiceReportPdf, returns PDF with Content-Disposition header |
| `src/components/dashboard/voice-onboarding-nudge.tsx` | Dismissible nudge banner | VERIFIED | Renders banner, calls dismissOnboardingNudge on dismiss, hides via local useState |
| `src/components/settings/voice-profile-tab.tsx` | Voice Profile settings tab content | VERIFIED | Shows voice_description, style_descriptors grid, editable raw_guidance_text, PDF download, Re-run Analysis link |
| `src/app/(dashboard)/settings/page.tsx` | Settings page with Voice Profile tab | VERIFIED | Three tabs: Model Preferences, Billing, Voice Profile; VoiceProfileTab receives persona prop fetched server-side |
| `src/app/(dashboard)/layout.tsx` | Dashboard layout with nudge injection | VERIFIED | Fetches voice_onboarding_dismissed + author_personas.id in parallel; renders VoiceOnboardingNudge conditionally |
| `src/lib/outline/prompt.ts` | buildOutlinePrompt/buildRegeneratePrompt accepting optional AuthorPersona | VERIFIED | Both functions accept `persona?: AuthorPersona | null`; inject via buildVoiceContextBrief or fallback to voice_description/raw_guidance_text fields |
| `src/lib/memory/chapter-prompt.ts` | buildChapterPrompt accepting optional AuthorPersona | VERIFIED | Accepts `persona?: AuthorPersona | null` as 3rd arg; injects voiceSection at end of systemMessage |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `onboarding-store-provider.tsx` | `voice-wizard-store.ts` | createVoiceWizardStore in provider | WIRED | createVoiceWizardStore called in storeRef.current initialization |
| `pdf-report.ts` | pdfkit | doc.on('data') + doc.on('end') | WIRED | Event-listener buffer pattern present |
| `voice.ts` (actions) | author_personas | supabase upsert onConflict user_id | WIRED | (supabase as any).from('author_personas').upsert({user_id, ...update}, {onConflict:'user_id'}) |
| `voice-upload/route.ts` | `text-extraction.ts` | extractTextFromFile(buffer, ext) | WIRED | Imported and called |
| `voice-analysis/route.ts` | `prompt.ts` | buildVoiceAnalysisPrompt(samples) | WIRED | Imported and called (no preferences argument) |
| `voice-analysis/route.ts` | `schema.ts` | VOICE_ANALYSIS_SCHEMA | NOT WIRED | Route uses json_object mode; VOICE_ANALYSIS_SCHEMA not imported in route |
| `voice-report/route.ts` | `pdf-report.ts` | buildVoiceReportPdf(persona) | WIRED | Imported and called |
| `layout.tsx` | `voice-onboarding-nudge.tsx` | showVoiceNudge conditional | WIRED | {showVoiceNudge && <VoiceOnboardingNudge />} |
| `outline/route.ts` | `outline/prompt.ts` | buildOutlinePrompt(intakeData, persona) | WIRED | buildOutlinePrompt(intakeData, persona) and buildRegeneratePrompt(intakeData, direction, persona) |
| `chapter/route.ts` | `chapter-prompt.ts` | buildChapterPrompt(context, adj, persona) | WIRED | buildChapterPrompt(context, adjustments, personaData, oracleOutput, context.characterArcs ?? null) |
| `analysis-results-step.tsx` | `/api/voice-analysis` | fetch SSE stream on mount | WIRED | POST to /api/voice-analysis with { samples } in runAnalysis() |
| `analysis-results-step.tsx` | `savePersona` | called after analysis completes | WIRED | await savePersona({voice_description, style_descriptors, raw_guidance_text, analysis_complete: true}) |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| VOIC-01 | 06-01, 06-02, 06-03, 06-06 | 3-step voice onboarding wizard | PARTIAL | Wizard works end-to-end but is 2 steps (writing samples + analysis), not 3. Style Preferences step intentionally removed. |
| VOIC-02 | 06-01, 06-02, 06-04 | Writing samples via paste or file upload (PDF/DOCX/TXT) | SATISFIED | writing-samples-step.tsx implements paste + file input; /api/voice-upload handles all 3 file formats |
| VOIC-03 | 06-02, 06-03, 06-04 | AI analyzes samples to produce structured persona | SATISFIED | voice-analysis route streams AI response; analysis-results-step.tsx parses and saves to DB via savePersona |
| VOIC-04 | 06-01, 06-04, 06-05, 06-06 | Downloadable PDF style report | SATISFIED | voice-report route generates premium PDF; download available from CompletionModal and VoiceProfileTab |
| VOIC-05 | 06-03, 06-04, 06-05, 06-06 | Persona silently injected into outline + chapter generation | SATISFIED | Both routes fetch persona with .maybeSingle(), pass to prompt builders; fail-open for null persona |
| VOIC-06 | 06-05 | Settings Voice Profile tab to view/edit persona | SATISFIED | settings/page.tsx has Voice Profile tab; VoiceProfileTab shows persona data and allows guidance text editing |
| VOIC-07 | 06-05 | Dismissible dashboard nudge for first-time users | SATISFIED | VoiceOnboardingNudge in layout.tsx; dismissal persists to voice_onboarding_dismissed via server action |

### Anti-Patterns Found

None detected. TypeScript compiles clean (exit 0). No TODO/FIXME/placeholder/stub patterns found in Phase 6 source files.

### Human Verification Required

#### 1. End-to-End Wizard Flow

**Test:** Navigate to `/onboarding`, paste 2-3 paragraphs, click "Analyze My Writing", wait for analysis
**Expected:** CompletionModal opens with "Your Voice DNA Profile is ready"; PDF download works; "Go to Dashboard" navigates to /dashboard
**Why human:** SSE streaming, partial JSON accumulation, and modal display depend on runtime behavior

#### 2. Dashboard Nudge Behavior

**Test:** Log in as a user with no `author_personas` row and `voice_onboarding_dismissed = false`
**Expected:** Blue banner appears below nav. Clicking X hides it immediately and a page refresh confirms it does not reappear.
**Why human:** Requires live Supabase DB state and session cookies

#### 3. Voice Profile Tab After Completion

**Test:** After completing wizard, navigate to `/settings` and click Voice Profile tab
**Expected:** Voice summary paragraph visible, style descriptor grid visible, editable guidance text pre-filled, "Save guidance text" button works (toast appears), PDF download works
**Why human:** Requires a completed persona row in DB

#### 4. Persona Injection Into Generation

**Test:** With a persona in DB, generate a new outline and a new chapter; also test as a user with no persona
**Expected:** Both generations complete without error for users with and without a persona
**Why human:** Behavioral influence of persona injection requires human review; fail-open behavior needs live testing

### Gaps Summary

Two gaps were found, both representing intentional documented simplifications made during Phase 6 implementation (recorded in project memory 2026-03-04):

**Gap 1 — Missing style-preferences-step.tsx (VOIC-01 partial):** The voice onboarding wizard was simplified from 3 steps to 2 steps. The `style-preferences-step.tsx` component was deleted, `TOTAL_VOICE_STEPS` was changed from 3 to 2, and the page router no longer renders a style preferences step. The plan documents list this file as a required artifact. The core goal — users can submit samples and receive AI voice analysis — is achieved. The simplification removes a manual configuration step the AI analysis now handles automatically.

**Gap 2 — voice-analysis route changed interface (plan specification divergence):** The route no longer accepts `StylePreferences` (removed with the preferences step) and does not use `VOICE_ANALYSIS_SCHEMA` in `response_format`. Instead it uses `json_object` mode with a detailed system prompt (to avoid Amazon Bedrock rejecting large JSON schema grammars). The core VOIC-03 requirement — AI produces a structured persona — is satisfied. The divergence is from the plan specification, not the requirement.

**Recommended action:** These are confirmed intentional deviations. No code changes are needed. To formally close the gaps: update VOIC-01 description in REQUIREMENTS.md to reflect the 2-step flow, and annotate the plan 06-03 artifact for `style-preferences-step.tsx` as intentionally superseded.

---

_Verified: 2026-03-11_
_Verifier: Claude (gsd-verifier)_
