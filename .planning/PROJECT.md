# StoryWriter

## What This Is

A public web application that guides users through writing full-length novels via AI-powered collaboration. Users go from a premise or guided interview through a 6-stage pipeline — intake, outline, story bible, chapter generation with creative checkpoints, and export. All AI calls route through OpenRouter. The platform runs on a three-tier pricing model (Project, Author, Studio) with Stripe billing.

## Core Value

Users can go from an idea to a complete, full-length novel through structured AI collaboration — with meaningful creative control at every step.

## Current Milestone: v1.1 Auth & Billing

**Goal:** Fix the password reset flow so recovery links land on a proper "set new password" page, and rework Stripe billing from token-based to the three-tier pricing model (Project / Author / Studio).

**Target features:**
- Working password reset page that intercepts Supabase recovery flow
- Three-tier Stripe pricing: Project ($39 one-time), Author ($49/mo or $490/yr), Studio ($99/mo)
- Project-count enforcement replacing token-budget enforcement
- Stripe products/prices created via CLI
- Repeat project discount ($25 after first)
- Completed projects always readable, generation locked after expiry

## Requirements

### Validated

- AUTH-01..04: Authentication (v1.0)
- PROJ-01..05: Project management (v1.0)
- INTK-01..04: Guided intake (v1.0)
- OUTL-01..05: Outline generation (v1.0)
- CHAR-01..04: Characters & story bible (v1.0)
- CHAP-01..05: Chapter generation (v1.0)
- CKPT-01..05: Creative checkpoints (v1.0)
- PROG-01..03: Progress & navigation (v1.0)
- LLM-01..04: LLM configuration (v1.0)
- EXPT-01..03: Export (v1.0)
- VOIC-01..07: Voice & onboarding (v1.0)

### Active

- [ ] Password reset page intercepts recovery flow and presents "set new password" form
- [ ] Three-tier Stripe billing (Project / Author / Studio) with self-serve checkout
- [ ] Project-count enforcement replaces token-budget gates
- [ ] Repeat project discount for returning buyers

### Out of Scope

- Real-time collaborative editing (multiple users on one novel) — complexity too high
- Mobile native app — web-first, responsive design covers mobile
- Offline mode — requires connectivity for AI generation
- Publishing/export to Amazon KDP or other platforms — defer to v2+
- AI-generated illustrations or cover art — separate concern, defer
- Token-based billing enforcement — replaced by project-count model

## Context

- **Frontend**: Next.js App Router (React + SSR, route handlers, server actions)
- **Backend**: Next.js route handlers + server actions (n8n removed in v1.0)
- **AI provider**: OpenRouter (unified API for multiple LLMs) with platform key
- **Auth**: Supabase Auth (email/password)
- **Database**: Supabase PostgreSQL with RLS
- **Payments**: Stripe (subscriptions + one-time purchases)
- **Streaming**: SSE for chapter generation, voice analysis
- **State**: Zustand stores with React Context providers

## Constraints

- **API dependency**: All AI features depend on OpenRouter availability and model access
- **Stripe products**: Must be created via Stripe CLI before billing works
- **Supabase recovery flow**: Recovery tokens come via redirect URL; must intercept before dashboard redirect
- **Project limits**: Enforcement must check active (non-expired, non-completed) project count

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router | SSR, API routes, strong ecosystem, good for public product | ✓ Good |
| OpenRouter over direct API keys | Single integration point, model flexibility, user choice | ✓ Good |
| Platform API key (no BYOK) | Simpler UX, single billing model | ✓ Good |
| Supabase Auth | Free tier, built-in RLS, email/password flow | ✓ Good |
| Three-tier pricing (Project/Author/Studio) | Clear value ladder, one-time entry point lowers barrier | — Pending |
| Project-count limits over token budgets | Simpler mental model for users, "unlimited generation within project" | — Pending |
| $25 repeat project discount | Rewards returning users, encourages upgrade to Author | — Pending |

---
*Last updated: 2026-03-11 after v1.1 milestone start*
