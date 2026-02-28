# Phase 1: Foundation - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create accounts, manage novel projects, and configure their AI access — with the security perimeter, database schema, and n8n foundation in place to support everything that follows. This phase delivers auth, project dashboard, LLM/BYOK configuration, and a working n8n pipeline skeleton.

</domain>

<decisions>
## Implementation Decisions

### Tech Stack
- **Framework:** Next.js (App Router)
- **Database/Auth/Storage:** Supabase (Postgres + built-in auth + storage)
- **AI Orchestration:** n8n handles all LLM calls, prompt chaining, and workflow logic; Next.js calls n8n via webhooks
- **Hosting:** Vercel for Next.js, self-hosted n8n (hosting provider at Claude's discretion), Supabase managed
- **Styling:** Tailwind CSS + shadcn/ui component library
- **State Management:** React Server Components first, minimal client state only where needed (forms, modals)

### Dashboard Experience
- Card grid layout (2-3 columns on desktop) for project listing
- Each card shows: title, status badge, word count, last modified date, genre tag, and progress bar (chapters complete / total)
- Empty state: guided welcome message with 2-3 example project cards showing what a project looks like, plus "Start your novel" CTA

### API Key Management
- Dedicated settings page for BYOK OpenRouter key entry
- "Test connection" button validates key before saving
- Key stored server-side only, displayed as masked with last 4 characters (e.g., ••••••••abcd)
- Pre-selected recommended models per task (outline, prose, editing), user can open each and change the model
- No free tier — users must either connect their own OpenRouter key (BYOK) or subscribe to a hosted plan before any generation

### Auth Flow
- Single page with "Sign in" / "Create account" toggle tabs
- Email + password authentication via Supabase Auth
- Email verification required before accessing the app
- Standard email link for password reset (Supabase native)
- After login, always land on the project dashboard

### AI Architecture Pattern
- n8n workflows structured as conversation-style chains — each step feeds context into the next (intake -> outline -> chapter -> checkpoint)
- **GSD-style pattern:** The AI writing pipeline follows the same architectural pattern as the GSD workflow skill:
  - Structured Q&A sessions with the writer (intake interviews, direction choices)
  - Accumulating context documents (story bible as a living, growing file)
  - Context tracking and compression across the chain (managing prompt windows across 20+ chapters)
  - Checkpoint loops where the human approves/redirects before the next step
- Human-in-the-loop via n8n Wait node — workflow pauses at checkpoints, resumes when user acts in UI via webhook callback
- Phase 1 includes a basic end-to-end test chain: Next.js -> n8n webhook -> LLM call -> response back to UI, proving the pipeline works

### Claude's Discretion
- n8n hosting provider (Railway, DigitalOcean, etc.)
- n8n <-> Next.js authentication method (shared secret vs JWT)
- Database schema design
- Context storage strategy (DB vs workflow state vs hybrid)
- Exact spacing, typography, and component styling
- Error state handling and loading patterns
- Auto-save implementation details

</decisions>

<specifics>
## Specific Ideas

- "Build this whole workflow like the get-shit-done skill — question/answer sessions, building your own claude.md file, tracking and compressing context as you go"
- The AI writing system should feel like a structured conversation partner, not a one-shot generator
- Model selection UI: pre-selected recommended models with expandable overrides per task type

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-28*
