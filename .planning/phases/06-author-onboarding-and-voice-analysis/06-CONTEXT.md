# Phase 6: Author Onboarding & Voice Analysis - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users provide writing samples (paste or file upload) and style preferences. AI analyzes these to produce an author voice persona — stored in the DB and silently injected into all generation prompts. A hybrid PDF style report (narrative summary + data breakdowns) is downloadable. One persona per user, revisitable from Settings.

Creating/managing projects, chapter generation, and outline generation are NOT in scope — only the voice capture and injection pipeline.

</domain>

<decisions>
## Implementation Decisions

### Onboarding flow
- 3-step wizard: Step 1 (Writing Samples) → Step 2 (Style Preferences) → Step 3 (Analysis Results)
- Reuses the existing intake wizard pattern (`WizardNav`, `progress-bar`, step components)
- On first login: soft nudge — a dismissible modal or banner prompts the user to complete voice setup. They can skip and go straight to the dashboard.
- After initial setup: revisitable via a new "Voice Profile" tab in Settings (alongside API Key and Model tabs)

### Writing sample input (Step 1)
- Both options available: paste text directly into a textarea OR upload a file (PDF, DOCX, TXT)
- Multiple samples can be provided to give the AI more signal

### Style preferences (Step 2)
- Claude's discretion on exact UI (card pickers, sliders, or free text fields)
- Should capture: tone preferences, pacing, dialogue ratio, dark/light themes, POV preference, diction level

### Voice analysis (Step 3 / Results)
- Blocking — user stays on screen while analysis runs (similar to outline streaming today)
- Streaming or progressive reveal preferred over a hard loading spinner
- After analysis completes: user sees results and can download the PDF report

### Author persona data stored
All four fields are stored per user:
1. Style descriptors (sentence length, rhythm, diction level, POV preference)
2. Thematic preferences (tone, pacing, dialogue ratio, dark/light themes)
3. Voice description paragraph (AI-generated prose summary of the author's voice)
4. Raw guidance text (free-form AI instruction text — editable by user in settings)

One persona per user — no multi-persona management in this phase.

### Persona injection
- Silent system prompt injection — voice description is automatically prepended to generation prompts for outline and chapter generation
- User does not see or toggle the injection; it just works once their profile is set up

### PDF style report
- Hybrid format: narrative editorial summary at the top, followed by data breakdowns for each style dimension (e.g., sentence length distribution, vocabulary richness, dialogue %, POV consistency)
- Downloadable from the Results step (Step 3) and from the Voice Profile settings tab

</decisions>

<specifics>
## Specific Ideas

- The blocking analysis UX should feel like the outline streaming view — progressive content appearing, not just a spinner
- "Voice Profile" tab in Settings shows the stored persona fields and lets users re-run analysis or download the PDF again

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/intake/wizard-nav.tsx` — WizardNav with prev/next buttons, step validation; directly reusable for onboarding wizard
- `src/components/intake/progress-bar.tsx` — step progress bar for wizard header
- `src/components/intake/steps/` — step wrapper pattern to follow
- `src/components/ui/tabs.tsx` — Tabs primitive for new Voice Profile tab in Settings
- `src/components/ui/card.tsx`, `button.tsx`, `dialog.tsx` — all available for UI composition
- `src/lib/export/` — existing DOCX builder to reference for PDF generation approach
- SSE streaming pattern — outline generation route uses SSE; voice analysis can follow same pattern

### Established Patterns
- Server actions with `upsert` into `user_settings` — pattern for saving persona data
- Supabase RLS row-per-user pattern — one row per user, upsert on conflict
- OpenRouter API calls through server actions — voice analysis AI call follows same pattern
- Zustand store for wizard state — `intake-store.ts` is the model to follow

### Integration Points
- `src/app/(dashboard)/settings/` — add "Voice Profile" tab here
- `src/app/(dashboard)/layout.tsx` — add first-login check to trigger onboarding nudge modal
- All generation routes (`/api/outline/`, `/api/chapters/`) — inject voice description into system prompt
- New route needed: `/api/voice-analysis` — SSE streaming analysis endpoint
- New DB table needed: `author_personas` (or extend `user_settings`) — stores all four persona fields

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-author-onboarding-and-voice-analysis*
*Context gathered: 2026-03-04*
