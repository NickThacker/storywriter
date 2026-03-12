# Requirements: StoryWriter

**Defined:** 2026-02-28
**Core Value:** Users can go from an idea to a complete, full-length novel through structured AI collaboration — with meaningful creative control at every step.

## v1.0 Requirements (Complete)

All 53 requirements shipped and verified. See MILESTONES.md for details.

### Authentication & Accounts

- [x] **AUTH-01**: User can create an account with email and password
- [x] **AUTH-02**: User can log in and stay logged in across browser sessions
- [x] **AUTH-03**: User can log out from any page
- [x] **AUTH-04**: User can reset password via email link

### Project Management

- [x] **PROJ-01**: User can create a new novel project from the dashboard
- [x] **PROJ-02**: User can view all their novel projects in a dashboard (title, status, word count, last modified)
- [x] **PROJ-03**: User can resume any in-progress novel project
- [x] **PROJ-04**: User can delete a novel project
- [x] **PROJ-05**: Novel state auto-saves after every generation or user edit

### Guided Intake

- [x] **INTK-01**: User is guided through a multi-step interview (genre, themes, characters, setting, tone) when starting a new novel
- [x] **INTK-02**: User can paste an existing premise/logline instead of using the interview
- [x] **INTK-03**: User can review and adjust interview answers before outline generation begins
- [x] **INTK-04**: Interview uses decision-driven UI (structured options, not open-ended text boxes)

### Outline Generation

- [x] **OUTL-01**: AI generates a full novel outline (chapters, plot beats, character arcs) from intake data
- [x] **OUTL-02**: User can review the generated outline before writing begins
- [x] **OUTL-03**: User can edit the outline — adjust chapter structure, plot beats, and pacing
- [x] **OUTL-04**: User sets target novel length and chapter count
- [x] **OUTL-05**: Approved outline populates the story bible with characters, locations, and plot beats

### Characters & Story Bible

- [x] **CHAR-01**: User can create character profiles with structured fields (name, appearance, backstory, voice, role)
- [x] **CHAR-02**: User can edit character profiles at any time during the writing process
- [x] **CHAR-03**: Story bible tracks characters, locations, timeline, and established world facts
- [x] **CHAR-04**: Story bible context is automatically injected into every chapter generation prompt

### Chapter Generation

- [x] **CHAP-01**: AI generates chapters one at a time, streaming prose in real time
- [x] **CHAP-02**: User can watch prose appear via real-time streaming (SSE)
- [x] **CHAP-03**: Generated chapter prose is saved to file storage and metadata to database
- [x] **CHAP-04**: User can request a rewrite of any chapter with style/tone adjustments
- [x] **CHAP-05**: User can manually edit generated prose inline

### Creative Checkpoints

- [x] **CKPT-01**: After each chapter generates, user reaches a checkpoint before proceeding
- [x] **CKPT-02**: At each checkpoint, user can approve the chapter and continue
- [x] **CKPT-03**: At each checkpoint, user can request a rewrite with specific direction
- [x] **CKPT-04**: At each checkpoint, user is presented with 2-3 plot direction options for the next chapter
- [x] **CKPT-05**: User can provide custom direction instead of choosing a presented option

### Progress & Navigation

- [x] **PROG-01**: User can see a chapter list with status indicators (pending, generating, checkpoint, approved)
- [x] **PROG-02**: User can see total word count and percentage complete
- [x] **PROG-03**: User always knows where they are in the novel-writing process (current phase, progress bar)

### LLM Configuration

- [x] **LLM-01**: User can connect their own OpenRouter API key (BYOK)
- [x] **LLM-02**: User can select specific LLMs for different tasks (outline generation, prose writing, editing)
- [x] **LLM-03**: Platform provides hosted API access via subscription for users without their own key
- [x] **LLM-04**: User's API key is never exposed to the browser (server-side only)

### Export

- [x] **EXPT-01**: User can export their novel to DOCX format
- [x] **EXPT-02**: User can export their novel to plain text format
- [x] **EXPT-03**: Export assembles all approved chapters into a single document

### Billing (v1.0 — token-based)

- [x] **BILL-01**: Hosted tier users subscribe to a plan with token/credit budget
- [x] **BILL-02**: Token usage is tracked per user and per project
- [x] **BILL-03**: User is warned when approaching their token budget limit
- [x] **BILL-04**: BYOK users bypass billing (use their own OpenRouter credits)

### Author Voice & Onboarding

- [x] **VOIC-01**: User can complete the voice onboarding wizard (writing samples → AI analysis with streaming results)
- [x] **VOIC-02**: User can provide writing samples by pasting text or uploading PDF, DOCX, or TXT files
- [x] **VOIC-03**: AI analyzes writing samples and style preferences to produce a structured author voice persona (style descriptors, thematic preferences, voice description, guidance text)
- [x] **VOIC-04**: User receives a downloadable PDF style report after analysis completes
- [x] **VOIC-05**: Author voice persona is stored per user and automatically injected into all generation prompts (outline and chapter) without requiring any action per generation
- [x] **VOIC-06**: User can revisit and edit their voice profile from the Settings page (Voice Profile tab)
- [x] **VOIC-07**: First-time users are softly nudged to set up their voice profile via a dismissible dashboard banner

## v1.1 Requirements

Requirements for Auth & Billing milestone. Each maps to roadmap phases.

### Password Reset

- [ ] **PRST-01**: Recovery link from Supabase email lands on `/auth/reset-password` with an active session (server-side guard redirects to login with error if no session)
- [ ] **PRST-02**: User can enter and confirm a new password on the reset page, then is redirected to dashboard on success

### Billing Infrastructure

- [ ] **BILL-05**: Three Stripe products with prices created via CLI: Project ($39 one-time), Author ($49/mo + $490/yr), Studio ($99/mo)
- [ ] **BILL-06**: DB migration updates subscription tier enum to `project`/`author`/`studio` and adds project purchase tracking
- [ ] **BILL-07**: `tiers.ts` updated with new tier definitions, price IDs, and project limits (Project: 1, Author: 3, Studio: unlimited)
- [ ] **BILL-08**: Stripe coupon for repeat project discount ($25) created via CLI and applied programmatically (never user-facing)

### Billing Enforcement

- [ ] **BILL-09**: Generation routes enforce project access (active subscription OR individual project purchase) instead of token budgets
- [ ] **BILL-10**: Project creation enforced by active project count per tier (1 for Project, 3 for Author, unlimited for Studio)
- [ ] **BILL-11**: Completed projects remain readable regardless of subscription status — generation locked, reading always allowed

### Billing Checkout & Webhooks

- [ ] **BILL-12**: User can purchase a Project tier via Stripe Checkout from settings billing tab
- [ ] **BILL-13**: User can subscribe to Author (monthly or annual) or Studio via Stripe Checkout from settings billing tab
- [ ] **BILL-14**: Webhook handler processes one-time project purchases (new branch) and subscription events (updated tier names)
- [ ] **BILL-15**: Returning project buyers automatically get $25 discount applied at checkout (server-side coupon, no promo code input)

### Billing UI & Portal

- [ ] **BILL-16**: Settings billing section shows current plan, active projects vs limit, and upgrade/purchase options
- [ ] **BILL-17**: Stripe Customer Portal accessible from settings for subscription management (cancel, upgrade)
- [ ] **BILL-18**: Token usage recording kept for analytics; token budget enforcement and warnings removed from UI

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Creative Control

- **ECRT-01**: Detailed revision history with chapter version diffs
- **ECRT-02**: Series management (link multiple novels with shared codex)

### Platform Expansion

- **PLAT-01**: OAuth login (Google, GitHub)
- **PLAT-02**: Export to ePub and MOBI formats
- **PLAT-03**: Mobile native app
- **PLAT-04**: Public pricing/marketing page with plan comparison

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time multi-user collaboration | CRDT/OT complexity too high; solo authorship only |
| Auto-publish to Amazon KDP | Legal, formatting, metadata complexity; separate concern |
| AI-generated cover art / illustrations | Separate domain (image generation); dilutes focus |
| Offline mode | Requires service worker, local LLM, sync; high complexity for niche use case |
| Full document word processor | Enormous scope; inline editing of generated prose sufficient |
| "Write whole novel" one-click mode | Produces generic prose; loses creative collaboration core value |
| User-entered promo/coupon codes | Opens discount abuse; repeat discount applied programmatically instead |
| Trial periods | $39 Project tier is already low-commitment entry point |
| Token-based billing enforcement | Replaced by project-count model in v1.1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01..04 | Phase 1, 8 | Complete |
| PROJ-01..05 | Phase 1 | Complete |
| INTK-01..04 | Phase 2 | Complete |
| OUTL-01..05 | Phase 2 | Complete |
| CHAR-01..04 | Phase 2 | Complete |
| CHAP-01..05 | Phase 3 | Complete |
| CKPT-01..05 | Phase 4 | Complete |
| PROG-01..03 | Phase 3 | Complete |
| LLM-01..04 | Phase 1 | Complete |
| EXPT-01..03 | Phase 5 | Complete |
| BILL-01..04 | Phase 5, 8 | Complete |
| VOIC-01..07 | Phase 6, 8 | Complete |
| PRST-01..02 | Phase 9 | Pending |
| BILL-05..08 | Phase 10 | Pending |
| BILL-09..11 | Phase 11 | Pending |
| BILL-12..15 | Phase 12 | Pending |
| BILL-16..18 | Phase 13 | Pending |

**Coverage:**
- v1.0 requirements: 53 total — all Complete
- v1.1 requirements: 16 total — all Pending
- Unmapped: 0 (all requirements mapped)

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-03-12 after v1.1 roadmap creation*
