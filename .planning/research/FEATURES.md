# Feature Research

**Domain:** AI-powered novel writing web application
**Researched:** 2026-02-28
**Confidence:** MEDIUM — Market research via WebSearch and WebFetch across multiple sources. Competitor feature sets are well-documented. User pain points corroborated across multiple independent reviews and Reddit analysis.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that every serious AI writing tool provides. Missing any of these will cause users to immediately reach for a competitor.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Project persistence | Users return to novels across days/weeks; losing work is fatal | LOW | Store project state in DB; prose in files as per PROJECT.md architecture |
| User authentication | Multi-session, multi-device access; public product requires accounts | LOW | Standard auth (NextAuth, Clerk, or Supabase Auth) |
| Multi-project dashboard | Writers work on more than one book; need a home screen to manage projects | LOW | List view with status, word count, last-modified |
| Novel outline generation | Every competitor generates an outline from a premise; it's the entry point of the workflow | MEDIUM | Sudowrite, NovelCrafter, Squibler all do this; our guided-interview intake is a differentiator on top of this |
| Chapter-by-chapter prose generation | Writing one chapter at a time is the standard pattern across all tools | MEDIUM | Sudowrite's "Draft" and "Story Engine," Squibler's book generator, NovelCrafter's scene drafting all work chapter by chapter |
| Story bible / world state tracking | AI must remember characters, locations, and lore across the whole novel; users expect this | HIGH | Context injection per-generation. Sudowrite's Story Bible, NovelCrafter's Codex are the benchmark. Crucial for character/plot consistency |
| Character profiles | Writers need to define characters before writing; AI must reference them | LOW | Structured fields: name, appearance, backstory, voice. Feeds story bible |
| Revision / rewrite capability | Users will always want to regenerate or adjust output they don't like | MEDIUM | "Rewrite this chapter" flow, tone/style adjustment controls |
| Export to standard formats | Writers need to get their work out (DOCX, PDF, plain text at minimum) | LOW | Squibler, NovelCrafter, and all competitors export DOCX/PDF. No ePub/KDP at v1 (per PROJECT.md) |
| Real-time streaming prose | Watching prose appear letter-by-letter is now the standard UX expectation from ChatGPT and Sudowrite | MEDIUM | OpenRouter streaming; handle per-model fallback |
| Visible progress indicator | Writers need to know where they are in the novel (chapter X of Y, word count, % done) | LOW | Progress bar, chapter list with statuses |
| Save/autosave | Writing tools must never lose work | LOW | Auto-persist after each generation or user edit |
| Basic text editing | Users will want to manually edit AI output inline | LOW | Rich text editor or at minimum a clean textarea; not a full document editor |

### Differentiators (Competitive Advantage)

Features that set StoryWriter apart. These align directly with the core value proposition: guided, decision-driven collaboration that maximizes creative control.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Guided intake interview | Removes blank-page paralysis by eliciting genre, themes, characters, tone through structured questions — not an open text box | MEDIUM | This is the primary UX differentiator; no competitor does a proper wizard-style intake. Sudowrite and NovelCrafter start from a synopsis paste. Decision-driven UI (from PROJECT.md) makes this unique |
| Between-chapter creative checkpoints | After each chapter, user makes explicit creative decisions (approve, rewrite, adjust direction) rather than just clicking "next" — keeps them in the driver's seat | HIGH | No competitor has a structured approval + fork flow between chapters. This is the core UX loop. Pairs with structured phases and visible progress |
| Per-task LLM selection via OpenRouter | Users choose the best model for outline (reasoning-heavy), prose (creative), and editing (critique) separately | MEDIUM | NovelAI uses proprietary Kayra model; Sudowrite uses proprietary Muse; NovelCrafter supports custom AI connections but complex setup. OpenRouter as the unified gateway is cleaner and more powerful |
| BYOK (Bring Your Own Key) | Power users and writers with existing OpenRouter accounts can connect their own key; eliminates cost concerns and trust issues | LOW | Well-validated pattern (JetBrains, WritingMate, CodeGPT all implement it). Reduces barrier to trial |
| Premise-to-novel structured pipeline | Full workflow from idea through outline through chapters in one coherent, stateful session — not ad-hoc prompting | HIGH | Sudowrite does this via Story Engine but the UX is complex. Squibler does bulk generation (too hands-off). StoryWriter's GSD-style phased flow is the differentiator |
| Decision-driven plot branching | At chapter checkpoints, present 2-3 plot direction options to choose from — keeps user engaged and creative | HIGH | Research shows branching narrative structures with defined choice points improve ownership. No tool does this cleanly in a guided UI |
| Narrative consistency enforcement | Automatically inject relevant story bible context (character details, prior events) into every generation prompt | HIGH | Sudowrite Story Bible and NovelCrafter Codex do this well. Must match or exceed their approach |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem appealing but will hurt the product if built at v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full-document word processor | Writers want "everything in one place" like Scrivener | Enormous scope; Scrivener took years to build; distract from the AI pipeline that is the actual value | Inline editing of generated prose is sufficient at v1; keep scope tight |
| Real-time multi-user collaboration | "Google Docs for novels" sounds great | Operational transforms / CRDTs are complex infrastructure; adds authentication surface; PROJECT.md already ruled this out | Solo authorship at v1; note in roadmap for v2 |
| AI-generated cover art | "One-stop-shop" appeal | Separate domain (image generation), different models, different UX entirely; dilutes focus | Out of scope per PROJECT.md; if added, external Midjourney/DALL-E link is sufficient |
| Auto-publish to Amazon KDP | Completes the "write to publish" loop | KDP publishing has legal, formatting, metadata, and account complexity; not the core value proposition | Export DOCX for user to self-upload; explicit v2+ per PROJECT.md |
| Offline mode | Writers work on planes | Requires service worker, local LLM or queuing, sync-on-reconnect; high complexity for niche use case | Explicit constraint in PROJECT.md; document it clearly so users know upfront |
| Unlimited free tier | Low barrier to adoption | Novel generation is massively token-intensive; free-tier economics break at scale with 100K+ token chapters | BYOK lowers cost concerns for power users; hosted tier must have clear credit/token limits |
| Fully open-ended text input for every decision | Maximum creative freedom | Open boxes paralyze most users and produce worse outputs than structured choices; research confirms hybrid works better | Decision-driven UI with structured options plus an "other/custom" escape hatch |
| "Write the whole novel for me" one-click mode | Speed and convenience | Produces generic, flat prose; loses the creative collaboration that is the product's core value; users end up with AI slop they're embarrassed by | Chapter-by-chapter with human checkpoints is the deliberate design |

---

## Feature Dependencies

```
User Authentication
    └──requires──> Multi-Project Dashboard
                       └──requires──> Project Persistence (DB + file storage)
                                          └──requires──> Novel Outline Generation
                                                             └──requires──> Story Bible / World State
                                                                                └──requires──> Chapter Generation
                                                                                                   └──requires──> Real-Time Streaming
                                                                                                   └──requires──> Creative Checkpoints
                                                                                                   └──requires──> Revision / Rewrite
                                                                                                   └──requires──> Export

Guided Intake Interview ──feeds──> Novel Outline Generation

Per-Task LLM Selection ──enhances──> Outline Generation
Per-Task LLM Selection ──enhances──> Chapter Generation

BYOK ──enhances──> Per-Task LLM Selection (user controls cost)

Character Profiles ──feeds──> Story Bible / World State

Decision-Driven Plot Branching ──requires──> Creative Checkpoints (branching is the checkpoint mechanic)
```

### Dependency Notes

- **User Auth requires Project Dashboard:** There is no meaningful use without account-scoped project state; auth is the gateway to everything.
- **Story Bible requires Outline:** The outline is the first artifact that populates story bible entries (characters, plot beats); bible cannot be built before the outline pass.
- **Chapter Generation requires Story Bible:** Every generation prompt must inject relevant context or the prose will contradict prior chapters. This is the #1 complaint about AI writing tools (losing track of characters).
- **Creative Checkpoints require Chapter Generation:** Checkpoints are the post-chapter review step; chapter generation must exist first.
- **Decision-Driven Plot Branching requires Checkpoints:** Branching is a checkpoint mechanic — the user picks the direction at each checkpoint. These are the same feature at different fidelity levels.
- **Streaming requires OpenRouter integration:** Streaming depends on the AI pipeline being wired up; cannot be developed independently.
- **BYOK and Hosted Billing conflict:** These are mutually exclusive per-project modes; must design the billing model so they coexist without confusion.

---

## MVP Definition

### Launch With (v1)

Minimum viable product to validate the guided-collaborative pipeline concept.

- [ ] User authentication and multi-project dashboard — without this, nothing persists
- [ ] Guided intake interview (genre, themes, characters, setting) — the primary UX differentiator; must ship to validate it
- [ ] AI outline generation with user review and edit — core of the workflow
- [ ] Character profiles feeding story bible — table stakes for consistency
- [ ] Story bible / context injection — table stakes; missing it means broken prose
- [ ] Chapter-by-chapter generation with real-time streaming — the core generation experience
- [ ] Between-chapter creative checkpoints (approve / rewrite / adjust direction) — the second key differentiator
- [ ] Revision / rewrite for any chapter — users need the escape valve
- [ ] Visible progress (chapter list, word count, % complete) — writers need orientation
- [ ] Export to DOCX and plain text — writers need to own their work
- [ ] BYOK via OpenRouter — lowers cost barrier for technical early adopters
- [ ] Hosted/subscription billing — enables revenue from non-technical users
- [ ] Per-task LLM selection (at minimum: one model for outline, one for prose) — core differentiator from OpenRouter integration

### Add After Validation (v1.x)

- [ ] Decision-driven plot branching at checkpoints (present 2-3 direction options) — adds depth to checkpoint UX once base flow is validated
- [ ] Style matching / voice calibration (upload sample prose for AI to mimic) — high user demand; complexity warrants deferring until v1 is stable
- [ ] Detailed revision history and version control (compare chapter versions) — writers will want this once they have multiple drafts
- [ ] Series management (link multiple novels with shared codex) — relevant once users finish a first novel

### Future Consideration (v2+)

- [ ] Multi-user collaboration — high complexity, explicitly out of scope for v1 per PROJECT.md
- [ ] Auto-publish to Amazon KDP — needs separate legal and format work
- [ ] AI-generated cover art — separate domain, defer
- [ ] Mobile native app — web-responsive covers mobile; native app is a separate product investment
- [ ] Audiobook / text-to-speech export — interesting but niche at launch

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| User authentication | HIGH | LOW | P1 |
| Multi-project dashboard | HIGH | LOW | P1 |
| Project persistence | HIGH | LOW | P1 |
| Guided intake interview | HIGH | MEDIUM | P1 |
| Novel outline generation | HIGH | MEDIUM | P1 |
| Character profiles | HIGH | LOW | P1 |
| Story bible / context injection | HIGH | HIGH | P1 |
| Chapter generation + streaming | HIGH | HIGH | P1 |
| Between-chapter checkpoints | HIGH | MEDIUM | P1 |
| Revision / rewrite | HIGH | MEDIUM | P1 |
| Visible progress tracking | MEDIUM | LOW | P1 |
| Export (DOCX, TXT) | HIGH | LOW | P1 |
| BYOK support | HIGH | LOW | P1 |
| Hosted billing model | HIGH | MEDIUM | P1 |
| Per-task LLM selection | MEDIUM | MEDIUM | P1 |
| Decision-driven plot branching | HIGH | HIGH | P2 |
| Style matching / voice calibration | MEDIUM | HIGH | P2 |
| Version history / chapter diffs | MEDIUM | MEDIUM | P2 |
| Series management | LOW | HIGH | P3 |
| Multi-user collaboration | MEDIUM | HIGH | P3 |
| Export to ePub/MOBI | LOW | LOW | P3 |
| AI cover art | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Sudowrite | NovelCrafter | Squibler | NovelAI | StoryWriter Approach |
|---------|-----------|--------------|---------|---------|---------------------|
| Guided intake / interview UX | No (paste synopsis) | No (paste synopsis) | Partial (genre + tone form) | No | YES — full guided interview (key differentiator) |
| Outline generation | Yes (Story Bible) | Yes (scene-based) | Yes (bulk or outline mode) | Yes | Yes — with user review step |
| Story Bible / Codex | Yes (Story Bible) | Yes (Codex — best in class) | Folder-based | Yes (Lorebook, keyword-triggered) | Yes — auto-inject on every generation |
| Character profiles | Yes | Yes (rich with relations, progressions) | Basic | Yes | Yes — feeds into story bible |
| Chapter generation | Yes (3K-5K words per draft) | Yes (scene-based) | Yes (250-page bulk option) | Yes | Yes — chapter at a time with streaming |
| Real-time streaming | Yes | Not prominently featured | No (batch) | No (batch) | Yes — core UX |
| Between-chapter checkpoints | No | No | No | No | YES (key differentiator) |
| Decision-driven plot options | No | No | No | No | Yes (v1.x) |
| Per-task LLM selection | No (proprietary Muse) | Yes (BYOK + multiple providers) | No (proprietary) | No (proprietary Kayra) | YES via OpenRouter |
| BYOK model | No | Yes (BYOK plan) | No | No | YES |
| Hosted subscription | Yes ($19-29/mo) | Yes | Yes ($192/yr) | Yes ($10/mo) | Yes |
| Export | Yes (Story Bible exports) | Yes (DOCX, Markdown, HTML) | Yes (DOCX, PDF, MOBI, ePub) | Yes | Yes (DOCX, TXT at v1) |
| Revision / rewrite tools | Yes (strong — Show Don't Tell, Tone Shift) | Yes (custom prompts) | Limited | Limited | Yes |
| Style matching | Yes (Style Examples — Muse adapts) | No | No | No | v1.x |
| Version history | No | Yes | No | No | v1.x |
| Series management | No | Yes | No | No | v2+ |
| Distraction-free editor | Basic | Yes (Focus Mode) | Basic | Basic | Progressive disclosure replaces this |

---

## Sources

- [Sudowrite official site and documentation](https://sudowrite.com/) — HIGH confidence; first-party
- [Sudowrite Story Bible docs](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/what-is-story-bible/jmWepHcQdJetNrE991fjJC) — HIGH confidence; first-party
- [Sudowrite Review: Kindlepreneur 2026](https://kindlepreneur.com/sudowrite-review/) — MEDIUM confidence; independent review
- [NovelCrafter features page](https://www.novelcrafter.com/features) — HIGH confidence; first-party
- [NovelCrafter Codex documentation](https://docs.novelcrafter.com/en/articles/8675743-the-codex) — HIGH confidence; first-party
- [NovelAI review 2026 (toolsforhumans.ai)](https://www.toolsforhumans.ai/ai-tools/novelai) — MEDIUM confidence; third-party review
- [11 Best AI Fiction Writing Tools 2026 (mylifenote.ai)](https://blog.mylifenote.ai/the-11-best-ai-tools-for-writing-fiction-in-2026/) — MEDIUM confidence; multi-tool comparison
- [5 Best AI Novel Writing Software (eesel.ai)](https://www.eesel.ai/blog/ai-novel-writing-software) — MEDIUM confidence; includes user complaint analysis
- [Reddit Writers: What Works and Fails with AI (resizemyimg.com)](https://resizemyimg.com/blog/writing-a-novel-with-ai-in-2025-what-works-what-fails-and-real-reddit-writers-feedback-on-using-chatgpt-or-similar-models/) — MEDIUM confidence; aggregated Reddit feedback
- [BYOK model analysis (byoklist.com, Medium)](https://byoklist.com/) — MEDIUM confidence; corroborated by multiple sources
- [How Creative Writers Integrate AI into their Writing Practice (arxiv.org, 2025)](https://arxiv.org/pdf/2411.03137) — HIGH confidence; peer-reviewed research

---

*Feature research for: AI-powered novel writing web application*
*Researched: 2026-02-28*
