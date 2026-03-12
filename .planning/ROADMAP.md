# Roadmap: StoryWriter

## Milestones

- ✅ **v1.0 Core Platform** - Phases 1-8 (shipped 2026-03-09)
- 🚧 **v1.1 Auth & Billing** - Phases 9-13 (in progress)

## Phases

<details>
<summary>✅ v1.0 Core Platform (Phases 1-8) — SHIPPED 2026-03-09</summary>

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Auth, project dashboard, LLM/BYOK configuration, database schema, n8n security perimeter
- [x] **Phase 2: Guided Intake and Outline** - Intake wizard, AI outline generation, story bible, character profiles (completed 2026-03-03)
- [x] **Phase 3: Chapter Generation** - Hybrid streaming prose generation, chapter management, progress tracking (completed 2026-03-03)
- [x] **Phase 4: Creative Checkpoints** - Between-chapter approval loop, plot direction choices, human-in-the-loop checkpoints (completed 2026-03-03)
- [x] **Phase 5: Export and Billing** - DOCX/TXT export, subscription billing, token tracking, launch readiness (completed 2026-03-04)
- [x] **Phase 6: Author Onboarding & Voice Analysis** - Writing sample upload, AI style analysis, PDF voice report, author persona system for generation context (completed 2026-03-12)
- [x] **Phase 7: Character Creator** - Pre-outline character definition with AI name suggestions, detail expansion, and strict enforcement through outline and chapter generation (completed 2026-03-09)
- [x] **Phase 8: Milestone Fixes** - Middleware allow-list fixes, BYOK removal + platform key, Phase 6 verification, traceability update (completed 2026-03-09)

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
**Plans:** 7/7 plans complete
- [x] 05-01-PLAN.md — DB migration, billing types, Stripe client singleton (Wave 1)
- [x] 05-02-PLAN.md — Export engine: DOCX/ePub/RTF/TXT builders + API route (Wave 1)
- [x] 05-03-PLAN.md — Export dialog UI, chapters page integration (Wave 2)
- [x] 05-04-PLAN.md — Stripe billing: checkout sessions, webhooks, subscription management (Wave 2)
- [x] 05-05-PLAN.md — Token tracking: TransformStream interception, budget checks, usage recording (Wave 3)
- [x] 05-06-PLAN.md — Usage page, billing UI, budget warnings, settings integration (Wave 4)
- [x] 05-07-PLAN.md — End-to-end verification checkpoint (Wave 5)

### Phase 6: Author Onboarding and Voice Analysis

**Goal:** Onboarding sequence (accessible before dashboard, revisitable) where users provide style/voice preferences and upload writing samples. AI analyzes their writing style to produce: 1) a downloadable PDF style report, and 2) an "author voice" persona loaded into generation context. Users can provide general AI guidance and revisit their profile from Settings.
**Requirements**: VOIC-01, VOIC-02, VOIC-03, VOIC-04, VOIC-05, VOIC-06, VOIC-07
**Depends on:** Phase 1 (auth required, but independent of writing pipeline)
**Plans:** 6/6 plans complete

Plans:
- [ ] 06-01-PLAN.md — DB migration (author_personas table), TypeScript types, npm install (mammoth/pdf-parse/pdfkit), next.config.ts serverExternalPackages (Wave 1)
- [ ] 06-02-PLAN.md — Voice wizard Zustand store, provider, lib/voice utilities (text-extraction, schema, prompt, pdf-report), server actions (Wave 2)
- [ ] 06-03-PLAN.md — 3-step onboarding wizard UI at /onboarding (writing samples, style preferences, streaming analysis + PDF download) (Wave 2)
- [ ] 06-04-PLAN.md — Three API routes: /api/voice-upload, /api/voice-analysis (SSE), /api/voice-report (PDF) (Wave 3)
- [ ] 06-05-PLAN.md — First-login nudge, Voice Profile settings tab, persona injection into outline + chapter generation prompts (Wave 3)
- [ ] 06-06-PLAN.md — End-to-end verification checkpoint (Wave 4)

### Phase 7: Character Creator

**Goal:** Replace intake Step 3 (role/archetype placeholders) with a full character creator where users define named characters with optional details before outline generation. AI assists with name suggestions and character expansion. Characters become canonical — locked after outline approval, strictly enforced during chapter generation.
**Requirements**: None (enhancement to existing intake flow)
**Depends on:** Phase 2 (intake wizard must exist)
**Plans:** 3 plans

Plans:
- [ ] 07-01-PLAN.md — Intake store type upgrade (IntakeCharacter), validation schema, character-assist API route (Wave 1)
- [ ] 07-02-PLAN.md — Card-based character creator UI with AI assistance (suggest names, flesh out, suggest cast) (Wave 2)
- [ ] 07-03-PLAN.md — Premise prefill upgrade, review screen update, outline/chapter prompt enforcement, story bible pre-seeding (Wave 2)

**Success Criteria** (what must be TRUE):
  1. User can create named characters with optional detail fields (appearance, personality, backstory, arc) via card-based UI in intake Step 3
  2. AI can suggest genre-appropriate names and flesh out character details on demand; bulk "Suggest cast" generates multiple characters at once
  3. Premise-path users see AI-extracted characters pre-filled from their premise text
  4. Outline generation uses all user-defined characters (can add minor ones); user fields are canonical and never overwritten by AI
  5. Chapter generation strictly enforces story bible characters — no invented named characters in prose

### Phase 8: Milestone Fixes

**Goal:** Close all blocking gaps from v1.0 milestone audit — fix middleware allow-list so Stripe webhooks and auth verification paths work in production, remove BYOK UI and add platform API key fallback, run formal verification on Phase 6, and update tracking artifacts.
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, AUTH-01, VOIC-01, VOIC-02, VOIC-03, VOIC-04, VOIC-05, VOIC-06, VOIC-07
**Gap Closure:** Closes gaps from v1.0-MILESTONE-AUDIT.md
**Depends on:** All prior phases
**Plans:** 2/2 plans complete

Plans:
- [ ] 08-01-PLAN.md — Middleware allow-list fix, BYOK UI removal, platform API key fallback in all generation routes (Wave 1)
- [ ] 08-02-PLAN.md — Phase 6 formal verification (VOIC-01..07 code audit) and REQUIREMENTS.md traceability update (Wave 1)

**Success Criteria** (what must be TRUE):
  1. Stripe webhook at /api/webhooks/stripe is reachable by unauthenticated POST requests (not blocked by middleware)
  2. /auth/verify and /auth/reset-password paths are accessible to unauthenticated users
  3. All generation routes fall back to platform OPENROUTER_API_KEY when no user key is set
  4. Settings page no longer shows API Key tab or BYOK setup banner
  5. Phase 6 has a VERIFICATION.md confirming all VOIC-01..07 requirements
  6. REQUIREMENTS.md traceability table shows all VOIC requirements as "Complete"

</details>

---

### 🚧 v1.1 Auth & Billing (In Progress)

**Milestone Goal:** Fix the password reset flow so recovery links land on a proper "set new password" page, and rework Stripe billing from token-based to the three-tier pricing model (Project / Author / Studio).

- [ ] **Phase 9: Password Reset Fix** - Recovery link lands on `/auth/reset-password` with working set-new-password form
- [ ] **Phase 10: Billing Infrastructure** - Stripe products/prices/coupon created via CLI, DB migration, tier definitions updated
- [ ] **Phase 11: Billing Enforcement** - Project-count gates replace token-budget gates; completed projects stay readable
- [ ] **Phase 12: Checkout and Webhooks** - Self-serve Stripe Checkout for all tiers, webhook handler for purchases and subscriptions, repeat discount
- [ ] **Phase 13: Billing UI and Cleanup** - Settings billing section shows plan/limits/options; customer portal access; token enforcement removed

## Phase Details

### Phase 9: Password Reset Fix
**Goal**: Users who follow a Supabase recovery email link land on a dedicated page that lets them set a new password, rather than being redirected silently to the dashboard
**Depends on**: Phase 8 (auth infrastructure exists)
**Requirements**: PRST-01, PRST-02
**Success Criteria** (what must be TRUE):
  1. Clicking the recovery link from the Supabase password reset email opens `/auth/reset-password` with an active session established
  2. If no valid recovery session is present when visiting `/auth/reset-password`, the page redirects to `/login` with an error message
  3. User can enter and confirm a new password on the reset page and submit successfully
  4. After a successful password reset, the user is redirected to the dashboard and is logged in
**Plans**: TBD

### Phase 10: Billing Infrastructure
**Goal**: The three-tier pricing model exists in Stripe and the database — products, prices, and coupon created via CLI; schema updated; tier definitions reflect new model
**Depends on**: Phase 9
**Requirements**: BILL-05, BILL-06, BILL-07, BILL-08
**Success Criteria** (what must be TRUE):
  1. Three Stripe products with correct prices exist in Stripe (Project $39 one-time, Author $49/mo + $490/yr, Studio $99/mo) — verifiable via Stripe dashboard or CLI
  2. A $25 repeat-project coupon exists in Stripe — verifiable via CLI
  3. DB migration has run: subscription tier enum includes `project`/`author`/`studio`; project purchase tracking table exists
  4. `tiers.ts` returns correct tier definitions with price IDs and project limits (Project: 1, Author: 3, Studio: unlimited)
**Plans**: TBD

### Phase 11: Billing Enforcement
**Goal**: The application enforces access by project count and active subscription rather than token budgets — generation is gated correctly and completed projects remain readable forever
**Depends on**: Phase 10
**Requirements**: BILL-09, BILL-10, BILL-11
**Success Criteria** (what must be TRUE):
  1. Generation routes reject requests from users who have no active subscription and no individual project purchase for that project
  2. Project creation is blocked when the user has reached their tier's active project limit (1 for Project, 3 for Author, unlimited for Studio)
  3. A completed project can be fully read (all chapters, all export formats) even if the user's subscription has lapsed
  4. Generation on a completed or expired project is blocked with a clear error message pointing to upgrade options
**Plans**: TBD

### Phase 12: Checkout and Webhooks
**Goal**: Users can purchase any tier via Stripe Checkout from the settings page; returning project buyers get the $25 discount automatically; webhook handler correctly updates the database for all purchase and subscription events
**Depends on**: Phase 10
**Requirements**: BILL-12, BILL-13, BILL-14, BILL-15
**Success Criteria** (what must be TRUE):
  1. User can initiate a Project tier one-time purchase from settings and complete payment via Stripe Checkout
  2. User can subscribe to Author (monthly or annual) or Studio tier from settings and complete checkout
  3. A user purchasing a second Project tier receives the $25 discount at checkout without entering any promo code
  4. Webhook handler updates the database correctly for one-time project purchases (project record created) and subscription events (tier updated)
**Plans**: TBD

### Phase 13: Billing UI and Cleanup
**Goal**: The settings billing section accurately reflects the user's plan, active project count against their limit, and available upgrade/purchase actions; token budget enforcement and warnings are removed
**Depends on**: Phase 12
**Requirements**: BILL-16, BILL-17, BILL-18
**Success Criteria** (what must be TRUE):
  1. Settings billing tab shows current plan name, active project count vs tier limit, and upgrade/purchase call-to-action buttons
  2. User can open the Stripe Customer Portal from settings to manage or cancel their subscription
  3. No token budget warnings or token usage meters appear anywhere in the application
  4. Token usage is still recorded in the database (analytics preserved) but is not surfaced in any user-facing UI
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 01.1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 5/6 | In Progress | - |
| 01.1 Remove n8n | v1.0 | 1/1 | Complete | 2026-03-01 |
| 2. Guided Intake and Outline | v1.0 | 9/9 | Complete | 2026-03-03 |
| 3. Chapter Generation | v1.0 | 5/5 | Complete | 2026-03-03 |
| 4. Creative Checkpoints | v1.0 | 5/5 | Complete | 2026-03-03 |
| 5. Export and Billing | v1.0 | 7/7 | Complete | 2026-03-04 |
| 6. Author Onboarding & Voice Analysis | v1.0 | 6/6 | Complete | 2026-03-12 |
| 7. Character Creator | v1.0 | 3/3 | Complete | 2026-03-09 |
| 8. Milestone Fixes | v1.0 | 2/2 | Complete | 2026-03-09 |
| 9. Password Reset Fix | v1.1 | 0/TBD | Not started | - |
| 10. Billing Infrastructure | v1.1 | 0/TBD | Not started | - |
| 11. Billing Enforcement | v1.1 | 0/TBD | Not started | - |
| 12. Checkout and Webhooks | v1.1 | 0/TBD | Not started | - |
| 13. Billing UI and Cleanup | v1.1 | 0/TBD | Not started | - |
