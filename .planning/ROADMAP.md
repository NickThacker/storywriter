# Roadmap: StoryWriter

## Overview

StoryWriter goes from zero to a fully operational AI-powered novel writing platform in five phases. The build order is dictated by hard architectural dependencies: auth and the database schema (including story bible tables) must precede all generation features; the outline and story bible must exist before chapter generation can inject context; the checkpoint loop depends on a working chapter generation pipeline; and export and billing ship last as the final gate before public launch. Each phase delivers a coherent, independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Auth, project dashboard, LLM/BYOK configuration, database schema, n8n security perimeter
- [x] **Phase 2: Guided Intake and Outline** - Intake wizard, AI outline generation, story bible, character profiles (completed 2026-03-03)
- [x] **Phase 3: Chapter Generation** - Hybrid streaming prose generation, chapter management, progress tracking (completed 2026-03-03)
- [ ] **Phase 4: Creative Checkpoints** - Between-chapter approval loop, plot direction choices, human-in-the-loop checkpoints
- [ ] **Phase 5: Export and Billing** - DOCX/TXT export, subscription billing, token tracking, launch readiness
- [ ] **Phase 6: Author Onboarding & Voice Analysis** - Writing sample upload, AI style analysis, PDF voice report, author persona system for generation context

## Phase Details

### Phase 1: Foundation
**Goal**: Users can create accounts, manage novel projects, and configure their AI access — with the security perimeter and database schema in place to support everything that follows
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, LLM-01, LLM-02, LLM-03, LLM-04
**Success Criteria** (what must be TRUE):
  1. User can create an account, log in, stay logged in across browser sessions, log out from any page, and reset their password via email
  2. User can view a dashboard listing all their novel projects with title, status, word count, and last modified date
  3. User can create, resume, and delete novel projects; novel state auto-saves after every generation or edit
  4. User can connect their own OpenRouter API key (BYOK) and select LLMs per task; key is never visible in the browser
  5. Users without an API key can access generation via a hosted subscription option
**Plans:** 5/6 plans executed
- [ ] 01-01-PLAN.md — Scaffold Next.js, Supabase clients, middleware, DB schema with RLS (Wave 1)
- [ ] 01-02-PLAN.md — Auth flow: sign up, sign in, sign out, password reset, email verification (Wave 2)
- [ ] 01-03-PLAN.md — n8n security perimeter, webhook client, test pipeline endpoint (Wave 2)
- [ ] 01-04-PLAN.md — Project dashboard: card grid, empty state, create/delete/resume CRUD (Wave 3)
- [ ] 01-05-PLAN.md — Settings: BYOK API key with Vault, model selection per task (Wave 3)
- [ ] 01-06-PLAN.md — End-to-end verification checkpoint (Wave 4)

### Phase 01.1: Remove n8n (INSERTED)

**Goal:** Strip n8n from the codebase — remove webhook client, test endpoint, env vars, and security perimeter code. All AI orchestration will go through Next.js Route Handlers + Server Actions directly.
**Requirements**: None (cleanup/removal)
**Depends on:** Phase 1
**Plans:** 1/1 plans complete

Plans:
- [ ] 01.1-01-PLAN.md — Delete n8n source files, simplify health route, clean env/config, update downstream planning docs (Wave 1)

### Phase 2: Guided Intake and Outline
**Goal**: Users can go from a blank idea to an approved novel outline with a populated story bible, ready for chapter generation
**Depends on**: Phase 1
**Requirements**: INTK-01, INTK-02, INTK-03, INTK-04, OUTL-01, OUTL-02, OUTL-03, OUTL-04, OUTL-05, CHAR-01, CHAR-02, CHAR-03, CHAR-04
**Success Criteria** (what must be TRUE):
  1. User can complete a multi-step decision-driven interview (genre, themes, characters, setting, tone) or paste a premise/logline to start a new novel
  2. User can review and adjust their interview answers before any AI generation begins
  3. AI generates a full novel outline (chapters, plot beats, character arcs) from the intake data for user review; user can set target length and chapter count
  4. User can edit the generated outline — adjusting chapter structure, plot beats, and pacing — before approving it
  5. After approving the outline, user sees a populated story bible with characters, locations, and plot beats stored and ready to inject into chapter generation
**Plans:** 9/9 plans complete
- [ ] 02-01-PLAN.md — Story bible DB schema, TypeScript types, Zustand install (Wave 1)
- [ ] 02-02-PLAN.md — Static data files, Zustand intake store, CardPicker component (Wave 1)
- [ ] 02-03-PLAN.md — Intake wizard UI: 5 creative steps, premise input, review screen (Wave 2)
- [ ] 02-04-PLAN.md — Intake server actions, premise prefill API, project page router (Wave 2)
- [ ] 02-08-PLAN.md — Story bible page: tabbed view, character/location CRUD, world facts (Wave 2)
- [ ] 02-05-PLAN.md — Outline generation SSE route, streaming hook, outline CRUD actions (Wave 3)
- [ ] 02-06-PLAN.md — Outline viewer/editor: two-panel layout, inline edit, beat sheet overlay (Wave 4)
- [ ] 02-07-PLAN.md — Outline regeneration, approval flow, story bible seeding (Wave 5)
- [ ] 02-09-PLAN.md — End-to-end verification checkpoint (Wave 6)

### Phase 3: Chapter Generation
**Goal**: Users can generate chapters one at a time and watch prose stream in real time, with full chapter management and visible progress through the novel
**Depends on**: Phase 2
**Requirements**: CHAP-01, CHAP-02, CHAP-03, CHAP-04, CHAP-05, PROG-01, PROG-02, PROG-03
**Success Criteria** (what must be TRUE):
  1. User can trigger chapter generation and watch prose stream in real time as tokens appear on screen
  2. Generated chapter prose is saved; user can read the completed chapter and request a rewrite with style/tone adjustments
  3. User can manually edit generated prose inline within the application
  4. User sees a chapter list with status indicators (pending, generating, checkpoint, approved) and total word count with percentage complete
  5. User always knows which phase of the novel-writing process they are in via a visible progress indicator
**Plans:** 5/5 plans complete
- [ ] 03-01-PLAN.md — Chapter stream hook, server actions, route handler adjustments (Wave 1)
- [ ] 03-02-PLAN.md — Tiptap editor with scene breaks, author notes, auto-save (Wave 1)
- [ ] 03-03-PLAN.md — Chapters page, chapter list with status badges, streaming view (Wave 2)
- [ ] 03-04-PLAN.md — Chapter panel orchestrator, rewrite dialog, phase nav, progress bar (Wave 3)
- [ ] 03-05-PLAN.md — Project router update, dashboard progress, end-to-end verification (Wave 4)

### Phase 4: Creative Checkpoints
**Goal**: Users reach a structured creative decision point after each chapter, maintaining authorial control over narrative direction before the next chapter generates
**Depends on**: Phase 3
**Requirements**: CKPT-01, CKPT-02, CKPT-03, CKPT-04, CKPT-05
**Success Criteria** (what must be TRUE):
  1. After each chapter generates, the workflow pauses and presents the user with a checkpoint screen before proceeding
  2. User can approve the chapter and continue, or request a rewrite with specific direction, from the checkpoint screen
  3. User is presented with 2-3 AI-generated plot direction options for the next chapter at each checkpoint
  4. User can provide their own custom direction instead of selecting a presented option
**Plans:** 5 plans
- [ ] 04-01-PLAN.md — DB migration, TypeScript types, server actions (Wave 1)
- [ ] 04-02-PLAN.md — ChapterPanel integration, CheckpointPanel, approve/rewrite UI (Wave 2)
- [ ] 04-03-PLAN.md — Direction options route, DirectionOptionCard, custom direction UI (Wave 3)
- [ ] 04-04-PLAN.md — Impact analysis route, affected badges, novel complete summary (Wave 4)
- [ ] 04-05-PLAN.md — End-to-end verification checkpoint (Wave 5)

### Phase 5: Export and Billing
**Goal**: Users can export their completed novel and the platform has a functioning billing model — the final requirements for a public launch
**Depends on**: Phase 4
**Requirements**: EXPT-01, EXPT-02, EXPT-03, BILL-01, BILL-02, BILL-03, BILL-04
**Success Criteria** (what must be TRUE):
  1. User can export their novel as a DOCX or plain text file; the export assembles all approved chapters into a single document
  2. Hosted tier users can subscribe to a plan and generate prose within their token/credit budget
  3. User is warned when approaching their token budget limit; BYOK users bypass billing entirely
  4. Token usage is tracked per user and per project, visible to the user
**Plans:** 1/7 plans executed
- [ ] 05-01-PLAN.md — DB migration, billing types, Stripe client singleton (Wave 1)
- [ ] 05-02-PLAN.md — Export engine: DOCX/ePub/RTF/TXT builders + API route (Wave 1)
- [ ] 05-03-PLAN.md — Export dialog UI, chapters page integration (Wave 2)
- [ ] 05-04-PLAN.md — Stripe billing: checkout sessions, webhooks, subscription management (Wave 2)
- [ ] 05-05-PLAN.md — Token tracking: TransformStream interception, budget checks, usage recording (Wave 3)
- [ ] 05-06-PLAN.md — Usage page, billing UI, budget warnings, settings integration (Wave 4)
- [ ] 05-07-PLAN.md — End-to-end verification checkpoint (Wave 5)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 01.1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 5/6 | In Progress|  |
| 01.1 Remove n8n | 1/1 | Complete    | 2026-03-01 |
| 2. Guided Intake and Outline | 9/9 | Complete   | 2026-03-03 |
| 3. Chapter Generation | 5/5 | Complete   | 2026-03-03 |
| 4. Creative Checkpoints | 0/5 | Not started | - |
| 5. Export and Billing | 1/7 | In Progress|  |
| 6. Author Onboarding & Voice Analysis | 0/TBD | Not started | - |

### Phase 6: Author Onboarding and Voice Analysis

**Goal:** Onboarding sequence (accessible before dashboard, revisitable) where users provide style/voice preferences and upload writing samples. AI analyzes their writing style to produce: 1) a downloadable PDF style report, and 2) an "author voice" persona loaded into generation context. Users can manage multiple personas and provide general AI guidance.
**Requirements**: TBD
**Depends on:** Phase 1 (auth required, but independent of writing pipeline)
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 6 to break down)
