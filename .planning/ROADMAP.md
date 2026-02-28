# Roadmap: StoryWriter

## Overview

StoryWriter goes from zero to a fully operational AI-powered novel writing platform in five phases. The build order is dictated by hard architectural dependencies: auth and the database schema (including story bible tables) must precede all generation features; the outline and story bible must exist before chapter generation can inject context; the checkpoint loop depends on a working chapter generation pipeline; and export and billing ship last as the final gate before public launch. Each phase delivers a coherent, independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Auth, project dashboard, LLM/BYOK configuration, database schema, n8n security perimeter
- [ ] **Phase 2: Guided Intake and Outline** - Intake wizard, AI outline generation, story bible, character profiles
- [ ] **Phase 3: Chapter Generation** - Hybrid streaming prose generation, chapter management, progress tracking
- [ ] **Phase 4: Creative Checkpoints** - Between-chapter approval loop, plot direction choices, n8n Wait node HITL
- [ ] **Phase 5: Export and Billing** - DOCX/TXT export, subscription billing, token tracking, launch readiness

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
**Plans:** 6 plans in 4 waves
- [ ] 01-01-PLAN.md — Scaffold Next.js, Supabase clients, middleware, DB schema with RLS (Wave 1)
- [ ] 01-02-PLAN.md — Auth flow: sign up, sign in, sign out, password reset, email verification (Wave 2)
- [ ] 01-03-PLAN.md — n8n security perimeter, webhook client, test pipeline endpoint (Wave 2)
- [ ] 01-04-PLAN.md — Project dashboard: card grid, empty state, create/delete/resume CRUD (Wave 3)
- [ ] 01-05-PLAN.md — Settings: BYOK API key with Vault, model selection per task (Wave 3)
- [ ] 01-06-PLAN.md — End-to-end verification checkpoint (Wave 4)

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
**Plans**: TBD

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
**Plans**: TBD

### Phase 4: Creative Checkpoints
**Goal**: Users reach a structured creative decision point after each chapter, maintaining authorial control over narrative direction before the next chapter generates
**Depends on**: Phase 3
**Requirements**: CKPT-01, CKPT-02, CKPT-03, CKPT-04, CKPT-05
**Success Criteria** (what must be TRUE):
  1. After each chapter generates, the workflow pauses and presents the user with a checkpoint screen before proceeding
  2. User can approve the chapter and continue, or request a rewrite with specific direction, from the checkpoint screen
  3. User is presented with 2-3 AI-generated plot direction options for the next chapter at each checkpoint
  4. User can provide their own custom direction instead of selecting a presented option
**Plans**: TBD

### Phase 5: Export and Billing
**Goal**: Users can export their completed novel and the platform has a functioning billing model — the final requirements for a public launch
**Depends on**: Phase 4
**Requirements**: EXPT-01, EXPT-02, EXPT-03, BILL-01, BILL-02, BILL-03, BILL-04
**Success Criteria** (what must be TRUE):
  1. User can export their novel as a DOCX or plain text file; the export assembles all approved chapters into a single document
  2. Hosted tier users can subscribe to a plan and generate prose within their token/credit budget
  3. User is warned when approaching their token budget limit; BYOK users bypass billing entirely
  4. Token usage is tracked per user and per project, visible to the user

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/6 | Not started | - |
| 2. Guided Intake and Outline | 0/TBD | Not started | - |
| 3. Chapter Generation | 0/TBD | Not started | - |
| 4. Creative Checkpoints | 0/TBD | Not started | - |
| 5. Export and Billing | 0/TBD | Not started | - |
