---
phase: 06-author-onboarding-and-voice-analysis
plan: 05
subsystem: voice-integration
tags: [voice, settings, dashboard, prompt-injection, onboarding]
dependency_graph:
  requires: [06-02, 06-03, 06-04]
  provides: [voice-nudge, voice-settings-tab, persona-injected-prompts]
  affects: [dashboard-layout, settings-page, outline-generation, chapter-generation]
tech_stack:
  added: []
  patterns: [server-component-data-fetch, client-component-dismiss, radix-tabs, parallel-db-fetch, fail-open-persona]
key_files:
  created:
    - src/components/dashboard/voice-onboarding-nudge.tsx
    - src/components/settings/voice-profile-tab.tsx
  modified:
    - src/app/(dashboard)/layout.tsx
    - src/app/(dashboard)/settings/page.tsx
    - src/lib/outline/prompt.ts
    - src/lib/memory/chapter-prompt.ts
    - src/app/api/generate/outline/route.ts
    - src/app/api/generate/chapter/route.ts
decisions:
  - Partial persona select (voice_description, raw_guidance_text only) cast as any to avoid requiring full AuthorPersonaRow shape in routes that only need two fields
  - Tabs component (Radix) already existed in component library — no new install needed
  - Persona fetch in chapter route is parallelized with context assembly to avoid latency increase
metrics:
  duration: "153 seconds"
  completed_date: "2026-03-05"
  tasks_completed: 2
  files_changed: 8
---

# Phase 06 Plan 05: Voice Integration (Nudge, Settings Tab, Prompt Injection) Summary

Wired the author voice profile into the live application: first-login nudge in the dashboard, Voice Profile tab in Settings, and silent persona injection into outline and chapter generation prompts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | First-login nudge (dashboard layout + nudge component) | 6d34d6c | voice-onboarding-nudge.tsx, layout.tsx |
| 2 | Voice Profile settings tab + persona injection into generation prompts | 10ee65d | voice-profile-tab.tsx, settings/page.tsx, prompt.ts, chapter-prompt.ts, outline/route.ts, chapter/route.ts |

## What Was Built

### VoiceOnboardingNudge (Task 1)
A dismissible banner shown at the top of the dashboard content area for users who have not set up their voice profile and have not dismissed the nudge. On dismiss, calls `dismissOnboardingNudge()` server action to persist the flag to `user_settings.voice_onboarding_dismissed`. The dashboard layout fetches both `voice_onboarding_dismissed` and `author_personas.id` in parallel, computing `showVoiceNudge` with fail-open logic.

### VoiceProfileTab (Task 2)
Client component rendered in the new Settings Voice Profile tab. Shows:
- Voice summary paragraph
- Style descriptors in a 2-column grid
- Editable `raw_guidance_text` textarea with save button (calls `savePersona`)
- Re-run analysis link (to /onboarding)
- Download PDF report anchor (to /api/voice-report)

When no profile exists, renders an empty-state with a "Set up voice profile" button.

### Settings Page Tabs Refactor (Task 2)
Settings page wrapped in Radix Tabs with three tabs: "API Key" (existing ApiKeyForm + BillingSection), "Model Preferences" (existing ModelSelector), and "Voice Profile" (new VoiceProfileTab). Persona fetched server-side via `getPersona()` in parallel with existing data fetches and passed as prop to VoiceProfileTab.

### Persona Injection into Prompt Builders (Task 2)
- `buildOutlinePrompt(intakeData, persona?)` — appends "Author Voice" and "Author Guidance" sections to system message when persona fields present
- `buildRegeneratePrompt(intakeData, direction?, persona?)` — passes persona through to base buildOutlinePrompt
- `buildChapterPrompt(context, adjustments?, persona?)` — appends same voice sections to system message

### Generation Route Updates (Task 2)
- Outline route: fetches `voice_description, raw_guidance_text` from `author_personas` using `maybeSingle()` in parallel with model preferences fetch; passes to prompt builders
- Chapter route: fetches persona in parallel with `assembleChapterContext`; passes to `buildChapterPrompt`
- Both routes use `maybeSingle()` — null persona silently proceeds without error (fail-open)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Type Error] Partial persona select requires any cast**
- **Found during:** Task 2 TypeScript check
- **Issue:** Routes only select `voice_description` and `raw_guidance_text`, but `buildOutlinePrompt` and `buildChapterPrompt` type the parameter as `AuthorPersona | null`. TypeScript rejected the partial object.
- **Fix:** Cast fetched persona data as `any` in routes (with eslint-disable comment). The prompt builders only access `voice_description` and `raw_guidance_text` at runtime — the cast is safe.
- **Files modified:** `src/app/api/generate/outline/route.ts`, `src/app/api/generate/chapter/route.ts`
- **Commit:** included in 10ee65d

## Self-Check

### Files Exist
- FOUND: src/components/dashboard/voice-onboarding-nudge.tsx
- FOUND: src/components/settings/voice-profile-tab.tsx
- FOUND: src/app/(dashboard)/settings/page.tsx
- FOUND: src/app/(dashboard)/layout.tsx
- FOUND: src/lib/outline/prompt.ts
- FOUND: src/lib/memory/chapter-prompt.ts

### Commits Exist
- FOUND: 6d34d6c (Task 1)
- FOUND: 10ee65d (Task 2)

### TypeScript
- npx tsc --noEmit: PASSED (zero errors)

## Self-Check: PASSED
