---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-01T19:46:17.031Z"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 16
  completed_plans: 15
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Users can go from an idea to a complete, full-length novel through structured AI collaboration — with meaningful creative control at every step.
**Current focus:** Phase 2 - Guided Intake and Outline

## Current Position

Phase: 02-guided-intake-and-outline (active)
Plan: 7 of 9 complete in current phase
Status: In progress — Plan 07 (Outline regeneration dialog, approval flow, story bible seeding) complete
Last activity: 2026-03-01 — Completed 02-07 (regeneration dialog, approveOutline action, seedStoryBibleFromOutline)

Progress: [█████████████] 87%

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: 4 min
- Total execution time: ~0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 5 | 23 min | 5 min |
| 01.1-remove-n8n | 1 | 2 min | 2 min |
| 02-guided-intake-and-outline | 6 | ~58 min | ~6 min |

**Recent Trend:**
- Last 5 plans: 2 min, 8 min, 6 min, 7 min, 8 min
- Trend: Stable (fast)
| Phase 02-guided-intake-and-outline P05 | 2 | 3 tasks | 5 files |
| Phase 02-guided-intake-and-outline P06 | 8 | 3 tasks | 8 files |
| Phase 02-guided-intake-and-outline P07 | 5 | 3 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Hybrid streaming pattern is mandatory — n8n assembles context, Next.js calls OpenRouter directly for prose streaming (n8n timeout constraint)
- [Roadmap]: Story bible schema must be designed in Phase 1 DB schema before any generation code ships (context amnesia pitfall)
- [Roadmap]: n8n instance must be network-isolated (never public internet) before any user data or API keys touch it (4 critical CVEs, CVSS 9.4-10.0)
- [Roadmap]: BYOK key storage pattern (server-side only, never in browser) established in Phase 1 before generation features exist
- [01-01]: sonner used instead of deprecated shadcn toast component — all notifications via sonner going forward
- [01-01]: Placeholder dashboard and login pages added in Phase 1 — full UI ships in Plan 02 (auth)
- [01-01]: story_bible seeded as jsonb column in projects table — Phase 2 planning decides whether to normalize into relational tables
- [01-01]: signOut server action is placeholder in src/actions/auth.ts — full implementation in Plan 02
- [01-03]: X-Webhook-Secret header pattern established for n8n — all future n8n calls go through triggerN8nWorkflow
- [01-03]: isN8nConfigured() guard enables graceful degradation when n8n not running in local dev
- [Phase 01-02]: user_settings row created in signUp server action (not DB trigger) for debuggability and simplicity
- [Phase 01-02]: redirect() placed outside try/catch blocks in server actions — Next.js redirect throws NEXT_REDIRECT internally
- [Phase 01-02]: as any cast for Supabase insert in signUp — postgrest-js v12 resolves hand-written Insert type to never; pragmatic workaround
- [Phase 01-04]: supabase as any cast used in dashboard page and projects actions — PostgREST v12 type incompatibility with hand-written Database type (consistent with Plan 02 pattern)
- [Phase 01-04]: Delete menu uses three-dot button inside card Link — stopPropagation() prevents card navigation when opening delete dialog
- [Phase 01-04]: updateProject server action exported for auto-save use by future project editor components (debounced client callers)
- [Phase 01-05]: deleteApiKey clears vault reference in user_settings only — vault.secrets is a separate Postgres schema not in Database type; orphaned secrets handled by cleanup job in production
- [Phase 01-05]: testApiKey validates OpenRouter /api/v1/models server-side only — raw API key never enters browser network tab; BYOK pattern enforced across all settings server actions
- [Phase 01-05]: Model selector auto-saves via useDebouncedCallback (600ms) per task — aligns with PROJ-05 auto-save pattern, eliminates explicit Save Preferences button
- [Phase 01.1]: n8n removed from codebase — all AI orchestration goes through Next.js Route Handlers + Server Actions calling OpenRouter directly
- [Phase 02-01]: Normalized tables (characters, locations, world_facts, outlines) chosen over JSONB for story bible — enables selective context injection in Phase 3
- [Phase 02-01]: characters.source ('ai'|'manual') tracks edit origin — prevents outline regeneration from overwriting manual user edits
- [Phase 02-01]: One outline per project enforced via unique constraint on outlines.project_id — simplifies all outline queries
- [Phase 02-01]: intake_data added to projects table (not separate table) — wizard answers naturally scoped to project, no join needed
- [Phase 02-02]: Zustand vanilla createStore (not create shorthand) used for App Router SSR safety — avoids global singleton hydration mismatch
- [Phase 02-02]: No Zustand persist middleware — wizard state is ephemeral per session, committed to DB on submit
- [Phase 02-02]: TOTAL_STEPS = 7 (path, genre, themes, characters, setting, tone+beatSheet+length, review)
- [Phase 02-02]: Icon rendering via static ICON_MAP lookup (not dynamic imports) — keeps bundle predictable and tree-shakeable
- [Phase 02-03]: WizardNav hidden on step 0 — PathSelect self-navigates (wizard via nextStep, premise via PremiseInput continue)
- [Phase 02-03]: ProgressBar maps steps 1-6 to 6 labeled indicators; step 0 path selection excluded
- [Phase 02-03]: CharactersStep uses local selectedRoles Set + nameInputs state synced to Zustand on toggle/remove
- [Phase 02-03]: ReviewSection internal component pattern encapsulates title + edit button + missing-field warning
- [Phase 02-04]: Mock prefill returns fixed stub when no API key is configured — intake wizard is fully testable in local dev without OpenRouter credentials
- [Phase 02-04]: saveIntakeData syncs genre to both intake_data JSONB and projects.genre column — keeps top-level genre in sync for dashboard display
- [Phase 02-04]: Project page is a pure redirect router with no rendered content — users always land on contextually correct view
- [Phase 02-04]: maybeSingle() used for outline existence check — avoids PostgREST 406 on missing row
- [Phase 02-08]: Dialog (not AlertDialog/Sheet) used for all confirmations — Sheet/AlertDialog not installed in this project
- [Phase 02-08]: CharacterCard expands inline within card grid — Sheet component unavailable, keeps editing in-context
- [Phase 02-08]: Auto-save via useDebouncedCallback (600ms) for character and location editors — consistent with model-selector.tsx pattern established in Phase 1
- [Phase 02-05]: force-dynamic directive on outline route handler prevents Vercel from caching SSE response
- [Phase 02-05]: Default outline model set to anthropic/claude-sonnet-4-5 from user_model_preferences
- [Phase 02-05]: previous_chapters snapshot captured on every saveOutline regeneration to preserve outline history
- [Phase 02-06]: Optimistic chapter edits: setOutline locally then server action — no revalidatePath per research pitfall 6 (avoids selection state reset)
- [Phase 02-06]: InlineEditable uses reveal-on-click input (not contentEditable) — avoids React cursor/paste/re-render conflicts per research recommendation
- [Phase 02-06]: BeatSheetOverlay beat sheet switching is comparison-only (view-only) — does not regenerate outline
- [Phase 02-guided-intake-and-outline]: Approve button is session-gated — enabled only after stream completes in current session (parsedOutline available)
- [Phase 02-guided-intake-and-outline]: Location seeding is delete-all-then-insert — locations table has no source column so AI/manual distinction is not possible
- [Phase 02-guided-intake-and-outline]: seedStoryBibleFromOutline: source-aware character merge (manual=fill-nulls-only, ai=full-update, new=insert-with-source-ai)

### Pending Todos

- User must set up Supabase project, enable Vault extension, and populate .env.local before running app against real DB
- Run supabase/migrations/00001_initial_schema.sql in Supabase SQL editor to create initial tables
- Run supabase/migrations/00002_story_bible_tables.sql in Supabase SQL editor to create story bible tables (characters, locations, world_facts, outlines)

### Roadmap Evolution

- Phase 01.1 inserted after Phase 1: Remove n8n (URGENT) — n8n adds complexity the project systematically works around. 30s webhook timeout blocks all heavy AI tasks (outline 60-120s, chapters 60-300s). Streaming can't relay through webhooks. All generation already routes directly through Next.js → OpenRouter. Removing n8n simplifies to Next.js + Supabase + OpenRouter only.

### Blockers/Concerns

- [Pre-Phase 3]: Vercel Fluid Compute vs. self-host deployment decision must be made before Phase 3 begins (streaming chapters take 60-300s; hits Vercel 60s function limit on standard plans)
- [Phase 2 planning]: Optimal story bible schema for context injection — RESOLVED in 02-01: normalized tables with project_id indexes enable selective injection per chapter
- [Phase 5 planning]: DOCX generation library not yet selected (docx.js pure-JS vs. pandoc headless); needs brief research during Phase 5 planning for serverless compatibility

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 02-07-PLAN.md — Outline regeneration controls (three levels), approval flow, seedStoryBibleFromOutline (OUTL-05)
Resume file: None
