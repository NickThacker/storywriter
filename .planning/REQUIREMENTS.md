# Requirements: StoryWriter

**Defined:** 2026-02-28
**Core Value:** Users can go from an idea to a complete, full-length novel through structured AI collaboration — with meaningful creative control at every step.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

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

- [ ] **INTK-01**: User is guided through a multi-step interview (genre, themes, characters, setting, tone) when starting a new novel
- [ ] **INTK-02**: User can paste an existing premise/logline instead of using the interview
- [ ] **INTK-03**: User can review and adjust interview answers before outline generation begins
- [ ] **INTK-04**: Interview uses decision-driven UI (structured options, not open-ended text boxes)

### Outline Generation

- [ ] **OUTL-01**: AI generates a full novel outline (chapters, plot beats, character arcs) from intake data
- [ ] **OUTL-02**: User can review the generated outline before writing begins
- [ ] **OUTL-03**: User can edit the outline — adjust chapter structure, plot beats, and pacing
- [ ] **OUTL-04**: User sets target novel length and chapter count
- [ ] **OUTL-05**: Approved outline populates the story bible with characters, locations, and plot beats

### Characters & Story Bible

- [ ] **CHAR-01**: User can create character profiles with structured fields (name, appearance, backstory, voice, role)
- [ ] **CHAR-02**: User can edit character profiles at any time during the writing process
- [ ] **CHAR-03**: Story bible tracks characters, locations, timeline, and established world facts
- [ ] **CHAR-04**: Story bible context is automatically injected into every chapter generation prompt

### Chapter Generation

- [ ] **CHAP-01**: AI generates chapters one at a time, streaming prose in real time
- [ ] **CHAP-02**: User can watch prose appear via real-time streaming (SSE)
- [ ] **CHAP-03**: Generated chapter prose is saved to file storage and metadata to database
- [ ] **CHAP-04**: User can request a rewrite of any chapter with style/tone adjustments
- [ ] **CHAP-05**: User can manually edit generated prose inline

### Creative Checkpoints

- [ ] **CKPT-01**: After each chapter generates, user reaches a checkpoint before proceeding
- [ ] **CKPT-02**: At each checkpoint, user can approve the chapter and continue
- [ ] **CKPT-03**: At each checkpoint, user can request a rewrite with specific direction
- [ ] **CKPT-04**: At each checkpoint, user is presented with 2-3 plot direction options for the next chapter
- [ ] **CKPT-05**: User can provide custom direction instead of choosing a presented option

### Progress & Navigation

- [ ] **PROG-01**: User can see a chapter list with status indicators (pending, generating, checkpoint, approved)
- [ ] **PROG-02**: User can see total word count and percentage complete
- [ ] **PROG-03**: User always knows where they are in the novel-writing process (current phase, progress bar)

### LLM Configuration

- [ ] **LLM-01**: User can connect their own OpenRouter API key (BYOK)
- [ ] **LLM-02**: User can select specific LLMs for different tasks (outline generation, prose writing, editing)
- [ ] **LLM-03**: Platform provides hosted API access via subscription for users without their own key
- [x] **LLM-04**: User's API key is never exposed to the browser (server-side only)

### Export

- [ ] **EXPT-01**: User can export their novel to DOCX format
- [ ] **EXPT-02**: User can export their novel to plain text format
- [ ] **EXPT-03**: Export assembles all approved chapters into a single document

### Billing

- [ ] **BILL-01**: Hosted tier users subscribe to a plan with token/credit budget
- [ ] **BILL-02**: Token usage is tracked per user and per project
- [ ] **BILL-03**: User is warned when approaching their token budget limit
- [ ] **BILL-04**: BYOK users bypass billing (use their own OpenRouter credits)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Creative Control

- **ECRT-01**: Style matching / voice calibration (upload sample prose for AI to mimic)
- **ECRT-02**: Detailed revision history with chapter version diffs
- **ECRT-03**: Series management (link multiple novels with shared codex)

### Platform Expansion

- **PLAT-01**: OAuth login (Google, GitHub)
- **PLAT-02**: Export to ePub and MOBI formats
- **PLAT-03**: Mobile native app

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time multi-user collaboration | CRDT/OT complexity too high for v1; solo authorship only |
| Auto-publish to Amazon KDP | Legal, formatting, metadata complexity; separate concern |
| AI-generated cover art / illustrations | Separate domain (image generation); dilutes focus |
| Offline mode | Requires service worker, local LLM, sync; high complexity for niche use case |
| Full document word processor | Enormous scope; inline editing of generated prose sufficient at v1 |
| "Write whole novel" one-click mode | Produces generic prose; loses creative collaboration core value |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| PROJ-01 | Phase 1 | Complete |
| PROJ-02 | Phase 1 | Complete |
| PROJ-03 | Phase 1 | Complete |
| PROJ-04 | Phase 1 | Complete |
| PROJ-05 | Phase 1 | Complete |
| LLM-01 | Phase 1 | Pending |
| LLM-02 | Phase 1 | Pending |
| LLM-03 | Phase 1 | Pending |
| LLM-04 | Phase 1 | Complete |
| INTK-01 | Phase 2 | Pending |
| INTK-02 | Phase 2 | Pending |
| INTK-03 | Phase 2 | Pending |
| INTK-04 | Phase 2 | Pending |
| OUTL-01 | Phase 2 | Pending |
| OUTL-02 | Phase 2 | Pending |
| OUTL-03 | Phase 2 | Pending |
| OUTL-04 | Phase 2 | Pending |
| OUTL-05 | Phase 2 | Pending |
| CHAR-01 | Phase 2 | Pending |
| CHAR-02 | Phase 2 | Pending |
| CHAR-03 | Phase 2 | Pending |
| CHAR-04 | Phase 2 | Pending |
| CHAP-01 | Phase 3 | Pending |
| CHAP-02 | Phase 3 | Pending |
| CHAP-03 | Phase 3 | Pending |
| CHAP-04 | Phase 3 | Pending |
| CHAP-05 | Phase 3 | Pending |
| PROG-01 | Phase 3 | Pending |
| PROG-02 | Phase 3 | Pending |
| PROG-03 | Phase 3 | Pending |
| CKPT-01 | Phase 4 | Pending |
| CKPT-02 | Phase 4 | Pending |
| CKPT-03 | Phase 4 | Pending |
| CKPT-04 | Phase 4 | Pending |
| CKPT-05 | Phase 4 | Pending |
| EXPT-01 | Phase 5 | Pending |
| EXPT-02 | Phase 5 | Pending |
| EXPT-03 | Phase 5 | Pending |
| BILL-01 | Phase 5 | Pending |
| BILL-02 | Phase 5 | Pending |
| BILL-03 | Phase 5 | Pending |
| BILL-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 46 total
- Mapped to phases: 46
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after roadmap creation*
