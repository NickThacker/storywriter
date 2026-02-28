# StoryWriter

## What This Is

A public web application that guides users through writing full-length novels via AI-powered collaboration. Users interact with a progressive, decision-driven interface inspired by GSD workflows — starting from a premise or guided interview, building a detailed outline, then writing chapter-by-chapter with creative checkpoints between each. The backend is orchestrated by n8n workflows, with all AI calls routed through OpenRouter so users can select the best LLM for each task (prose generation, planning, editing).

## Core Value

Users can go from an idea to a complete, full-length novel through structured AI collaboration — with meaningful creative control at every step.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can start a novel from scratch via guided interview (genre, themes, characters, setting) or by pasting an existing premise/logline
- [ ] AI expands user input into a full novel outline (chapters, plot beats, character arcs) for review
- [ ] User can refine outline — adjust characters, structure, themes, pacing before writing begins
- [ ] User sets target novel length and chapter count
- [ ] AI generates chapters one at a time, streaming prose in real time
- [ ] Between chapters, user makes creative decisions: approve/rewrite, choose plot direction, character choices, style/tone adjustments
- [ ] n8n workflows orchestrate the full pipeline: outline generation, chapter writing, revision, editing
- [ ] Frontend calls n8n webhook endpoints directly; n8n manages workflow state
- [ ] All AI calls go through OpenRouter API
- [ ] Users can select specific LLMs from OpenRouter's catalog for different tasks (prose, planning, editing)
- [ ] Database stores metadata, project state, user data; file storage for prose content
- [ ] User authentication and multi-tenancy for public access
- [ ] BYOK (Bring Your Own Key) option — users provide their own OpenRouter API key
- [ ] Hosted/managed option — users subscribe and use platform-provided API access
- [ ] Progressive disclosure UX — reveals complexity as needed, not all at once
- [ ] Decision-driven flow — presents options to choose from, not open-ended text boxes
- [ ] Structured phases with visible progress — user always knows where they are in the process

### Out of Scope

- Real-time collaborative editing (multiple users on one novel) — complexity too high for v1
- Mobile native app — web-first, responsive design covers mobile
- Offline mode — requires connectivity for AI generation
- Publishing/export to Amazon KDP or other platforms — defer to v2+
- AI-generated illustrations or cover art — separate concern, defer

## Context

- **Frontend**: Next.js (React + SSR, built-in API routes, routing)
- **Backend orchestration**: n8n workflows with webhook triggers
- **AI provider**: OpenRouter (unified API for multiple LLMs — Claude, GPT-4, Llama, Mistral, etc.)
- **Storage**: Hybrid — PostgreSQL for user accounts, project metadata, workflow state; file-based storage for chapter prose and revision history
- **UX inspiration**: GSD workflow in Claude Code — progressive questioning, structured phases, decision-driven interaction with visible progress indicators
- **Streaming**: Real-time text streaming during chapter generation so users watch prose appear
- **Novel structure**: Outline-first approach, then chapter-by-chapter generation with user checkpoints

## Constraints

- **API dependency**: All AI features depend on OpenRouter availability and model access
- **Cost management**: Novel generation is token-intensive; billing model (BYOK vs subscription) must be clear from launch
- **n8n hosting**: n8n instance needs to be accessible to the frontend (self-hosted or n8n Cloud)
- **Streaming**: OpenRouter streaming support varies by model; need fallback handling

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js for frontend | SSR, API routes, strong ecosystem, good for public product | — Pending |
| n8n for backend orchestration | Visual workflow builder, webhook support, no custom backend needed | — Pending |
| OpenRouter over direct API keys | Single integration point, model flexibility, user choice | — Pending |
| Direct n8n webhooks (no middleware) | Simpler architecture, n8n manages state | — Pending |
| Hybrid storage (DB + files) | Structured data in Postgres, prose in files for portability | — Pending |
| BYOK + hosted billing model | Lowers barrier (BYOK), enables revenue (subscription) | — Pending |
| Chapter-by-chapter with checkpoints | Maximizes user creative control, matches GSD-style progressive flow | — Pending |

---
*Last updated: 2026-02-28 after initialization*
