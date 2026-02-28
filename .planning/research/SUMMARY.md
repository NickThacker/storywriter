# Project Research Summary

**Project:** StoryWriter — AI-powered novel writing web application
**Domain:** AI-assisted long-form creative writing SaaS
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH

## Executive Summary

StoryWriter is a guided, AI-powered novel writing application that differentiates itself from competitors (Sudowrite, NovelCrafter, NovelAI, Squibler) through two core mechanisms: a structured intake interview that replaces blank-page paralysis, and explicit between-chapter creative checkpoints that keep the human author in control of the narrative. The recommended approach is a Next.js 15 frontend with n8n handling non-streaming workflow orchestration and OpenRouter providing multi-model LLM access. The critical architectural insight is that n8n must NOT sit in the streaming path for chapter prose — n8n assembles context and manages state, while Next.js calls OpenRouter directly for real-time token streaming to the browser.

The most significant risks are not technical complexity but two compounding problems that can only be solved at design time: context window amnesia (LLMs forget character details across chapters without a mandatory story bible and context injection system) and n8n's streaming architecture mismatch (routing prose generation through n8n webhooks hits hard timeout limits that kill any chapter longer than ~60 seconds of generation). Both issues are unfixable as retrofits — they must be baked into the data model and API routing before any generation feature ships. Additionally, n8n's self-hosted instances have four critical CVEs (CVSS 9.4-10.0) disclosed in early 2026; the instance must be network-isolated from the public internet before any user data or API keys touch the system.

The product is well-scoped for a solo or small team to ship at v1. Every competitor has established that the core workflow (outline → chapter generation → export) is the right UX pattern. StoryWriter's differentiators — the guided interview, per-task LLM selection via OpenRouter, BYOK support, and the structured checkpoint loop — are all buildable with the recommended stack and represent genuine gaps in the competitive landscape. The architecture has clear build-order dependencies (auth and DB schema first, then story bible data model, then n8n outline workflow, then hybrid streaming chapter generation) that should map directly to roadmap phases.

---

## Key Findings

### Recommended Stack

The recommended stack pairs Next.js 15 (App Router) with Drizzle ORM on PostgreSQL, Better Auth for authentication, and Vercel AI SDK 6 for streaming. Use Next.js 15.x — version 16.x was released October 2025 and is still stabilizing. Drizzle is preferred over Prisma because Prisma's binary engine causes cold start failures in serverless Next.js deployments. Better Auth is preferred over Clerk because BYOK key ownership and multi-tenant organization support favor a self-hosted auth solution.

The n8n + OpenRouter integration has one mandatory constraint: use the hybrid streaming pattern. n8n handles context assembly and workflow orchestration (non-streaming, returns JSON). Next.js calls OpenRouter directly via `@openrouter/ai-sdk-provider` for streaming prose delivery. This is not optional — n8n's Respond-to-Webhook streaming sends a single chunk (not incremental tokens), and n8n Cloud has a hard 100-second webhook timeout that will kill any real chapter generation.

**Core technologies:**
- **Next.js 15 + React 19:** Frontend + API Routes (BFF pattern) — App Router is stable; RSC + streaming support; built-in route handlers for n8n proxy and SSE relay
- **TypeScript 5.x:** Required — Drizzle ORM schema inference requires it; complex workflow state needs type safety
- **n8n (self-hosted Community Edition):** Workflow orchestration for outline generation, chapter context assembly, and state management — visual builder; free at volume; do NOT use for streaming
- **OpenRouter + `@openrouter/ai-sdk-provider`:** Unified LLM gateway — 300+ models; supports BYOK; streaming SSE for all models
- **Vercel AI SDK 6:** `streamText()` for SSE streaming; `useChat` hook — handles SSE chunking, error handling, and keepalives correctly
- **PostgreSQL 16 + Drizzle ORM 0.45.x:** Relational metadata, user accounts, workflow state, chapter records — 90% smaller bundle than Prisma; no binary engine
- **Better Auth:** Authentication with Drizzle adapter — multi-tenant org support built-in; self-hosted user data
- **Tailwind CSS 4 + shadcn/ui:** Styling + component system — full source ownership; customizable for novel-writing UX

For full stack details, version compatibility matrix, and installation commands: see `.planning/research/STACK.md`.

### Expected Features

No competitor offers a proper guided intake wizard or structured between-chapter creative checkpoints. These are the two features that define StoryWriter's identity and must ship at v1 to validate the concept. Every other AI writing tool starts from a paste-your-synopsis box; StoryWriter's structured intake is a genuine UX differentiator backed by research showing decision-driven UI reduces blank-page anxiety and produces better generation inputs.

**Must have (table stakes — every competitor has these):**
- User authentication and multi-project dashboard — without this, nothing persists across sessions
- Novel outline generation with user review and edit step — the workflow entry point
- Story bible / world state tracking with context injection — required for character consistency; #1 complaint about AI writing tools when absent
- Character profiles — structured fields feeding the story bible
- Chapter-by-chapter generation with real-time streaming prose — the core generation UX
- Revision / rewrite capability — users need the escape valve for output they don't like
- Export to DOCX and plain text — writers must own their work
- Save / autosave — writing tools must never lose work
- Visible progress tracking (chapter list, word count, % complete)

**Should have (StoryWriter differentiators):**
- Guided intake interview (genre, themes, characters, tone) — replaces blank-page paralysis; no competitor does a proper wizard-style intake
- Between-chapter creative checkpoints (approve / rewrite / redirect direction) — keeps user as author; no competitor has a structured approval + fork flow
- BYOK via OpenRouter — lowers cost barrier for technical early adopters; reduces trust friction
- Per-task LLM selection (different models for outline vs. prose vs. editing) — only NovelCrafter does this; OpenRouter makes it elegant
- Hosted/subscription billing model — enables revenue from non-technical users

**Defer to v1.x (after initial validation):**
- Decision-driven plot branching at checkpoints (present 2-3 direction options) — adds depth once base checkpoint flow is validated
- Style matching / voice calibration (upload sample prose) — high demand but complex
- Version history and chapter diffs — useful once users have multiple drafts

**Defer to v2+ (explicitly out of scope):**
- Multi-user collaboration (CRDT/OT complexity)
- Auto-publish to Amazon KDP (legal, format, metadata complexity)
- AI cover art (separate domain)
- Mobile native app

For full feature dependency graph, MVP checklist, and competitor feature analysis: see `.planning/research/FEATURES.md`.

### Architecture Approach

The recommended architecture uses Next.js as a Backend for Frontend (BFF) layer that proxies all n8n calls — the browser never touches n8n directly. This pattern enforces auth, BYOK key injection, and input validation at a single security perimeter. n8n workflows are separated by concern: one for outline generation, one for chapter context assembly, one for post-generation completion (metadata storage and Wait node activation). The n8n Wait node pattern enables the creative checkpoint loop: after a chapter generates, the workflow pauses and stores a resume URL in Postgres; the user's approval/redirect decision at the checkpoint POSTs through Next.js, which calls the resume URL with the decision payload.

**Major components:**
1. **Next.js App Router (UI + BFF):** React pages, progressive wizard UX, SSE consumption; API route handlers for n8n proxy, streaming relay, BYOK key management, auth middleware
2. **n8n (self-hosted):** Workflow orchestration — outline generation, chapter context assembly, post-generation metadata storage, Wait node for human-in-the-loop checkpoints; does NOT handle prose streaming
3. **OpenRouter via AI SDK:** Direct streaming connection from Next.js route handler for chapter prose — bypasses n8n to avoid timeout constraints; handles 300+ models with per-user BYOK keys
4. **PostgreSQL (Drizzle ORM):** Source of truth for all workflow state — novel status, chapter status (pending → generating → checkpoint → approved), resume URLs, user data, billing; Neon serverless driver for Vercel deployments
5. **File Storage (S3/local):** Chapter prose stored as `.txt` files referenced by path in Postgres — never store prose in Postgres TEXT columns at scale; abstracted behind `lib/storage.ts` for local/prod swap

The data model drives resumability: every page load checks novel/chapter status in Postgres and resumes from the correct state. This handles mid-session returns, network interruptions, and partial generation recovery.

For full architecture diagrams, data flow sequences, anti-patterns, and scaling considerations: see `.planning/research/ARCHITECTURE.md`.

### Critical Pitfalls

1. **Context window amnesia** — Without a mandatory story bible (character profiles, established world facts, chapter summaries) injected into every generation prompt, the model contradicts itself across chapters (60% character consistency rate documented in a 301k-word test). **Prevention:** Design the story bible data model before writing any generation code. It cannot be retrofitted. Every chapter generation call must inject the relevant bible slice.

2. **n8n security vulnerabilities** — Four critical CVEs (CVSS 9.4-10.0) were disclosed December 2025-February 2026, including an unauthenticated RCE with full instance takeover. Self-hosted n8n exposed to the internet is actively exploited. **Prevention:** Never expose n8n to the public internet. Restrict ingress to app server IP only. Pin n8n to 1.121.0+. Do not store user credentials in n8n's credential store — pass BYOK keys at runtime.

3. **Streaming timeout architecture** — Chapter generation takes 60-180 seconds. Routing prose streaming through n8n webhooks fails in production (n8n 64s+ webhook timeout; Vercel 10s/60s function limits; proxy buffering). **Prevention:** Use the hybrid pattern — n8n for context assembly (non-streaming), Next.js calls OpenRouter directly for streaming delivery. Validate with 3,000-word chapters on the actual deployment platform before shipping.

4. **OpenRouter mid-stream silent failures** — When OpenRouter fails after tokens have been emitted, the HTTP status is already 200; errors arrive as SSE events with `finish_reason: "error"`. Naive implementations display truncated chapters with no error feedback. **Prevention:** Use Vercel AI SDK's `streamText()` which handles this correctly; or parse every SSE chunk explicitly for error fields and skip `:` comment lines before JSON parsing.

5. **Story drift and quality degradation over 50k+ words** — LLMs optimize for local coherence; without structural constraints (beat sheets, arc checkpoints, pacing guidance injected per-chapter), narrative focus degrades. **Prevention:** The outline must carry structural metadata (three-act position, character arc state, target emotional beat) that gets injected per generation call. The between-chapter checkpoint is the human safety valve — design it to surface structural guidance, not just raw prose approval.

For full pitfall details including security mistakes, UX pitfalls, performance traps, and a "looks done but isn't" verification checklist: see `.planning/research/PITFALLS.md`.

---

## Implications for Roadmap

Based on the architecture build-order dependencies and pitfall phase mappings from research, the following phase structure is recommended. The ordering is not arbitrary — it reflects hard dependencies in the data model and security requirements that cannot be reordered.

### Phase 1: Foundation (Auth, DB, Infrastructure, Security)

**Rationale:** Everything downstream depends on user identity, the Postgres schema (especially story bible tables), and the n8n security posture. Context amnesia and the BYOK key exposure pitfall both require the data model and security perimeter to exist before any generation code is written. This phase has no external AI dependencies, making it the least risky starting point.

**Delivers:** Working auth, multi-project dashboard, database schema (users, novels, chapters, story bible, checkpoints), n8n instance behind firewall, BYOK key storage (encrypted, server-side only), file storage abstraction (`lib/storage.ts`)

**Addresses features:** User authentication, multi-project dashboard, project persistence, BYOK key management setup

**Avoids pitfalls:** n8n CVE exposure (network isolation established here), BYOK key browser exposure (server-side key pattern established here), context amnesia (story bible schema designed here before any generation)

**No research flag needed:** Auth, database schema, and infrastructure patterns are well-documented.

---

### Phase 2: Guided Intake and Outline Generation

**Rationale:** The outline is load-bearing infrastructure — it populates the story bible, defines chapter structure, and provides the beat data injected into every chapter generation call. This must exist and be validated before chapter generation is built. The guided intake wizard is StoryWriter's primary UX differentiator and should be validated early.

**Delivers:** Multi-step guided interview wizard (genre, themes, characters, setting), n8n outline workflow (non-streaming, returns structured JSON), outline review and edit UI, character profile forms feeding story bible, story bible populated in Postgres after outline approval

**Uses:** n8n outline workflow, Next.js n8n proxy route (`/api/n8n/outline`), Drizzle schema for story bible entities

**Implements:** Outline generation flow from ARCHITECTURE.md; "interview → outline" novel status transition

**Addresses features:** Guided intake interview (key differentiator), novel outline generation, character profiles, story bible foundation

**Avoids pitfalls:** Story drift (beat structure designed into outline here), context amnesia (story bible populated here before chapter generation begins)

**Research flag:** Phase likely benefits from deeper research into structured prompt engineering for outline generation (beat sheet formats, character arc templates) during planning.

---

### Phase 3: Chapter Generation with Hybrid Streaming

**Rationale:** This is the highest-risk phase — it involves the most complex integration (n8n context assembly + direct OpenRouter streaming), the most critical pitfalls (timeout architecture, mid-stream error handling), and the core "magic moment" of the product (watching prose stream). Building it after outline generation means the story bible data exists to validate context injection. Must be tested with full-length chapters (3,000-4,000 words) on the actual deployment platform before shipping.

**Delivers:** Hybrid streaming chapter generation (n8n assembles context → Next.js streams from OpenRouter directly), SSE streaming UI with real-time prose display, chapter completion flow (prose saved to file, metadata to Postgres), mid-stream error handling, keepalive handling, revision / rewrite flow

**Uses:** Vercel AI SDK `streamText()`, `@openrouter/ai-sdk-provider`, n8n chapter-context workflow, Next.js `/api/generate/stream` route, `lib/storage.ts` for prose file writes

**Implements:** Hybrid streaming pattern from ARCHITECTURE.md and STACK.md; chapter status transitions (pending → generating → checkpoint)

**Addresses features:** Chapter-by-chapter generation, real-time streaming prose, revision/rewrite capability, visible progress tracking, per-task LLM selection

**Avoids pitfalls:** Streaming timeout (hybrid pattern bypasses n8n for prose), mid-stream silent failures (Vercel AI SDK handles SSE error events), story context injection (story bible data from Phase 2 injected here)

**Research flag:** This phase needs deeper research during planning on: (1) Vercel Fluid Compute configuration for streaming route duration limits, (2) n8n AI Agent node streaming vs. HTTP Request node behavior differences if considering n8n-native streaming as fallback.

---

### Phase 4: Creative Checkpoints and n8n Wait Node

**Rationale:** The between-chapter checkpoint is StoryWriter's second core differentiator and the human-in-the-loop mechanism that prevents story drift. It depends on working chapter generation (Phase 3) and the n8n Wait node pattern. Building it as a separate phase isolates its complexity (resume URL management, server-side storage, decision payload routing) from the streaming complexity in Phase 3.

**Delivers:** n8n Wait node integration after each chapter completion, resume URL storage in Postgres (never in browser), CheckpointPanel UI (approve / rewrite / redirect direction), `/api/n8n/checkpoint` route relaying decisions to n8n resume URL, novel status progression through checkpoint states

**Implements:** n8n Wait node pattern from ARCHITECTURE.md; checkpoint → resume data flow

**Addresses features:** Between-chapter creative checkpoints (key differentiator), decision-driven creative control

**Avoids pitfalls:** Resume URL browser exposure (server-side storage established here), UX overwhelm at checkpoints (decision-driven options rather than open text boxes)

**No research flag needed:** The n8n Wait node HITL pattern is documented and the implementation approach is clear from architecture research.

---

### Phase 5: Export, Billing, and Launch Readiness

**Rationale:** Export and billing must ship before any public launch — writers need to own their work and the product needs to generate revenue. This phase also includes token budget enforcement, rate limiting on generation endpoints, and the launch verification checklist from PITFALLS.md. These are lower-risk features with well-established patterns, appropriate for a late phase.

**Delivers:** DOCX and plain text export (assembled from prose files in storage), hosted subscription billing (credit/token-based), per-user token budget tracking and enforcement, rate limiting on all generation endpoints, BYOK full end-to-end validation (verify key never appears in browser DevTools), production deployment configuration (Vercel Fluid Compute or self-host, n8n network isolation verified)

**Addresses features:** Export (DOCX, TXT), hosted subscription billing, BYOK end-to-end flow, cost protection

**Avoids pitfalls:** Cost runaway on hosted tier (token budget enforcement), BYOK key exposure (final verification pass), n8n security posture (production network isolation confirmed)

**Research flag:** DOCX generation library selection (docx.js vs. libreoffice headless vs. pandoc) may need brief research during planning to confirm the right approach for the Next.js serverless environment.

---

### Phase Ordering Rationale

- **Auth and DB schema must come first** because the story bible schema is a prerequisite for all generation features and the BYOK key storage pattern is a prerequisite for BYOK. Retrofitting either is high-cost.
- **Outline before chapters** because the outline populates the story bible that chapter generation depends on for context injection. Building chapter generation without it produces the context amnesia pitfall.
- **Chapter generation before checkpoints** because the Wait node pattern depends on a completed chapter generation flow; checkpoints are the post-generation mechanic.
- **Export and billing last** because they are relatively independent and lower-risk; they require the generation pipeline to exist but don't affect it architecturally.
- **This ordering matches the architecture's own stated build-order dependencies** from ARCHITECTURE.md exactly (auth → storage → outline → outline UI → chapter streaming → checkpoint UI → BYOK → billing).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Chapter Generation):** n8n streaming behavior differences between AI Agent node vs. HTTP Request node need verification; Vercel Fluid Compute configuration for long-running streaming routes needs confirmation
- **Phase 2 (Intake + Outline):** Optimal prompt engineering format for structured outline generation (beat sheet schema, character arc templates) is not yet defined and likely warrants a targeted research pass
- **Phase 5 (Export):** DOCX generation approach (docx.js in-process vs. headless conversion) needs brief validation for the serverless deployment context

Phases with well-established patterns (skip deep research):
- **Phase 1 (Foundation):** Auth setup with Better Auth + Drizzle, Postgres schema design, Docker Compose local dev — all standard patterns with excellent documentation
- **Phase 4 (Checkpoints):** n8n Wait node HITL pattern is documented; implementation approach is clear from architecture research

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack (Next.js 15, Drizzle, Better Auth, AI SDK 6, OpenRouter) verified against official docs and release notes. n8n streaming limitations verified via official PR and community issue threads. Version compatibility matrix confirmed. |
| Features | MEDIUM | Competitor feature analysis based on first-party docs (HIGH) and independent reviews (MEDIUM). User pain points corroborated across multiple Reddit threads and review sites. Anti-feature reasoning is well-supported by user complaint patterns. |
| Architecture | MEDIUM | Core patterns (BFF proxy, hybrid streaming, Wait node HITL) are well-documented. n8n streaming behavior confirmed via community issue threads showing inconsistency. Scaling thresholds are estimates, not benchmarks. |
| Pitfalls | MEDIUM-HIGH | Critical CVEs confirmed via Rapid7, The Hacker News, and The Register (HIGH). Context amnesia data point (60% accuracy in 301k-word test) from a documented experiment (HIGH). Timeout numbers corroborated across multiple independent sources (MEDIUM). Story drift finding from practitioner Medium posts (MEDIUM). |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **n8n AI Agent node streaming behavior:** The research confirms that Respond-to-Webhook node does NOT provide token-level streaming. Whether the AI Agent node with streaming enabled provides reliable incremental tokens in practice is documented only in community threads (MEDIUM confidence). The hybrid pattern (bypass n8n for prose streaming) is the safe choice regardless, but understanding this fully may inform whether n8n-native streaming is viable as a fallback.

- **DOCX generation library:** Research did not evaluate specific libraries for DOCX export in a Next.js serverless environment. `docx` npm package (pure JS, no binary dependencies) vs. server-side pandoc conversion need comparison during Phase 5 planning.

- **Token cost model for hosted tier pricing:** The research establishes that token budgets are required and that chapter generation is token-intensive (100K+ tokens per novel), but does not produce specific pricing guidance. Subscription tier pricing requires a real cost analysis against OpenRouter per-token prices for the target model set.

- **Optimal story bible schema for context injection:** The research strongly recommends structured story bible data (character profiles, timeline, world facts) but does not define the optimal schema or injection strategy (full inject vs. retrieval-based relevance filtering). This needs definition during Phase 2 planning — the "full context in every prompt" performance trap becomes real after chapter 10-15.

- **Vercel vs. self-hosted deployment decision:** Research notes both as viable but recommends Vercel + Neon for serverless and Docker/VPS for self-hosted. The streaming duration requirements (60-300 seconds per chapter) push toward Vercel Fluid Compute (paid) or self-hosting. This decision should be made before Phase 3 begins.

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs (version 16.1.6, 2026-02-27): https://nextjs.org/docs/app/guides
- Vercel AI SDK 6 official blog: https://vercel.com/blog/ai-sdk-6
- OpenRouter AI SDK Provider GitHub: https://github.com/OpenRouterTeam/ai-sdk-provider
- OpenRouter Streaming Docs: https://openrouter.ai/docs/api/reference/streaming
- OpenRouter BYOK Docs: https://openrouter.ai/docs/guides/overview/auth/byok
- n8n Webhook Streaming PR: https://github.com/n8n-io/n8n/pull/20499
- n8n Queue Mode Docs: https://docs.n8n.io/hosting/scaling/queue-mode/
- Better Auth PostgreSQL adapter docs: https://www.better-auth.com/docs/adapters/postgresql
- shadcn/ui Tailwind v4 docs: https://ui.shadcn.com/docs/tailwind-v4
- Vercel Functions Limitations: https://vercel.com/docs/functions/limitations
- Critical n8n CVE-2026-21858 "Ni8mare" (Rapid7): https://www.rapid7.com/blog/post/etr-ni8mare-n8scape-flaws-multiple-critical-vulnerabilities-affecting-n8n/
- The Register: n8n security woes (Feb 2026): https://www.theregister.com/2026/02/05/n8n_security_woes_roll_on/
- Claude creative writing 301k-word test: https://docs.bswen.com/blog/2026-02-23-claude-creative-writing-pros-cons/
- Automated continuity checking for AI writing: https://docs.bswen.com/blog/2026-02-23-ai-writing-continuity/
- NovelCrafter features (first-party): https://www.novelcrafter.com/features
- Sudowrite Story Bible docs (first-party): https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/what-is-story-bible/jmWepHcQdJetNrE991fjJC
- How Creative Writers Integrate AI (arxiv, 2025): https://arxiv.org/pdf/2411.03137

### Secondary (MEDIUM confidence)
- n8n Webhook streaming community thread: https://community.n8n.io/t/webhook-streaming/182718
- n8n 64s timeout community thread: https://community.n8n.io/t/respond-to-webhook-didnt-work-when-use-more-than-64-seconds-in-wait-node/80495
- n8n AI Agent streaming vs. Respond-to-Webhook inconsistency: https://community.n8n.io/t/streamin-respond-to-webhook-node-does-not-have-same-behaviour-as-streaming-ai-agent-node/232076
- n8n Wait node HITL pattern: https://rolandsoftwares.com/content/n8n-human-in-the-loop-approval-flows/
- Fixing SSE streaming on Vercel: https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996
- AI novel 50k+ word quality degradation: https://medium.com/@getmynovel.com/were-trying-to-make-ai-write-a-50k-words-novel-it-will-probably-fail-2ef853ae7f94
- Beyond the context window — long-form story generation architecture: https://medium.com/team-pratilipi/beyond-the-context-window-architecting-long-form-story-generation-8f3a3350255f
- BYOK model analysis: https://byoklist.com/
- Reddit writers on AI writing tools: https://resizemyimg.com/blog/writing-a-novel-with-ai-in-2025-what-works-what-fails-and-real-reddit-writers-feedback-on-using-chatgpt-or-similar-models/
- Drizzle ORM npm (version 0.45.1 confirmed): https://www.npmjs.com/package/drizzle-orm

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
