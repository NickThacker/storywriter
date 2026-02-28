# Stack Research

**Domain:** AI-powered novel writing web application
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH (core stack HIGH, n8n streaming workarounds MEDIUM)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x (LTS; 16.x available but newer) | Frontend framework + API routes | App Router is stable and production-ready; RSC + streaming support; built-in route handlers for SSE proxy; strong ecosystem for public SaaS. Use 15.x — 16.x was released October 2025 and is still stabilizing. |
| React | 19.x | UI layer | Ships with Next.js 15; required for concurrent features and useFormState patterns used in progressive disclosure UI. |
| TypeScript | 5.x | Language | Non-negotiable for a long-lived app with complex workflow state; Drizzle ORM's schema inference requires it. |
| n8n | Latest (self-hosted Community Edition OR n8n Cloud) | Backend workflow orchestration | Visual workflow builder means non-developers can modify generation pipelines without code changes; built-in webhook triggers; native OpenAI/HTTP nodes for OpenRouter calls. Self-hosted Community Edition is free with unlimited executions — preferred for cost control at volume. |
| OpenRouter | API (no version; use `@openrouter/ai-sdk-provider` latest) | Unified LLM access | Single integration point for all models (Claude, GPT-4, Llama, Mistral, etc.); handles BYOK via user-supplied API keys; streaming support via SSE for all models. |
| Vercel AI SDK | 6.x (`ai` package) | Streaming + LLM client layer | Current stable as of December 2025; `streamText()` handles SSE streaming; `useChat` hook for React UI streaming; `@openrouter/ai-sdk-provider` is the official provider package; eliminates manual SSE parsing. |
| PostgreSQL | 16.x | Relational database for metadata, users, project state | User accounts, novel projects, chapter metadata, workflow state all fit relational model; strong Drizzle/Prisma support; proven at scale. |
| Drizzle ORM | 0.45.x (`drizzle-orm`) | Database access layer | 90% smaller bundle than Prisma — critical for Next.js route handlers; schema-as-TypeScript means no codegen step; direct SQL ergonomics; excellent Neon/PostgreSQL support. Use over Prisma for this serverless-style Next.js setup. |
| Better Auth | Latest (`better-auth`) | Authentication | Modern library built for Next.js App Router; multi-tenant organization support built-in; Drizzle adapter available; self-hosted user data (vs. Clerk's vendor lock-in); handles email/password + OAuth providers; rate limiting and MFA included. |
| Tailwind CSS | 4.x | Styling | Standard for Next.js 2025/2026; token-driven theming; zero runtime CSS; compatible with shadcn/ui. |
| shadcn/ui | Latest (copy-paste components) | UI component system | Built on Radix primitives (accessible); Tailwind v4 compatible; full source ownership means customization for novel-writing UX is easy; no vendor dependency. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@openrouter/ai-sdk-provider` | Latest | OpenRouter provider for Vercel AI SDK | Always — this is the official bridge between AI SDK 6 and OpenRouter's 300+ models |
| `drizzle-kit` | 0.45.x | Drizzle migrations CLI | Database schema migrations and introspection during development and deployment |
| `@neondatabase/serverless` | Latest | Neon PostgreSQL driver | If using Neon (recommended managed PostgreSQL); supports HTTP and WebSocket connections for serverless |
| `postgres` | 3.x | node-postgres driver | If self-hosting PostgreSQL; Drizzle's recommended driver for standard PostgreSQL |
| `zod` | 3.x | Schema validation | Validate n8n webhook payloads, API inputs, and form data; integrates with React Hook Form |
| `react-hook-form` | 7.x | Form state management | Guided interview forms (genre, themes, characters) — declarative, performant, Zod integration |
| `@tanstack/react-query` | 5.x | Client-side server state caching | Polling workflow status, caching outline data, managing chapter list — use for client components that need server state; not needed for RSC data fetching |
| `lucide-react` | Latest | Icon set | Ships with shadcn/ui; consistent icon system |
| `@aws-sdk/client-s3` | 3.x | S3 file storage client | For chapter prose file storage; use if deploying to AWS or using S3-compatible storage (MinIO for local dev) |
| `nanoid` | 5.x | ID generation | Short, URL-safe IDs for novel projects and chapters; faster and smaller than UUID libraries |
| `date-fns` | 3.x | Date formatting | Lightweight date utilities for project timestamps; no moment.js |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Turbopack | Next.js dev server bundler | Enabled by default in Next.js 15; 10x faster cold starts vs. Webpack; use `next dev --turbopack` |
| `drizzle-kit` | Schema migration and studio | `drizzle-kit push` for dev, `drizzle-kit migrate` for production; `drizzle-kit studio` for database GUI |
| Docker Compose | Local dev environment | Run PostgreSQL + MinIO (S3-compatible) locally; isolate from host; exact parity with production |
| MinIO | Local S3-compatible storage | Drop-in S3 replacement for local dev; same SDK works in both environments |
| Vitest | Unit testing | Fast, TypeScript-native; better than Jest for Next.js App Router projects |
| Playwright | E2E testing | Test the guided interview flow, streaming chapters, authentication — browser automation |
| ESLint + Prettier | Code quality | Next.js includes ESLint config; add Prettier for formatting consistency |

## Installation

```bash
# Core Next.js app (creates the project)
npx create-next-app@15 storywriter --typescript --tailwind --app --src-dir --use-npm

# AI and OpenRouter
npm install ai @openrouter/ai-sdk-provider

# Database
npm install drizzle-orm @neondatabase/serverless
# OR for self-hosted PostgreSQL:
npm install drizzle-orm postgres

# Authentication
npm install better-auth

# Validation and forms
npm install zod react-hook-form @hookform/resolvers

# UI components (shadcn CLI adds components individually)
npx shadcn@latest init

# Client state
npm install @tanstack/react-query

# File storage
npm install @aws-sdk/client-s3

# Utilities
npm install nanoid date-fns lucide-react

# Dev dependencies
npm install -D drizzle-kit vitest @playwright/test @types/node
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 15.x | Next.js 16.x | When 16.x stabilizes (mid-2026); features like Turbopack file caching are compelling but it's too new for a greenfield public app right now |
| Drizzle ORM | Prisma | If the team is unfamiliar with SQL and prefers a higher-level API; Prisma has better DX for beginners but its binary engine causes cold start issues in serverless Next.js deployments |
| Better Auth | Clerk | If you want zero-configuration auth in exchange for $25+/month and user data stored with Clerk; valid choice for rapid MVP, but BYOK feature and data ownership favor self-hosted Better Auth |
| Better Auth | Auth.js (NextAuth v5) | If most users authenticate via OAuth only and you want maximum provider support; Auth.js has less built-in for multi-tenant organizations |
| Neon (managed PostgreSQL) | Self-hosted PostgreSQL on VPS | If cost is a concern and you have DevOps capacity; Neon's serverless driver is purpose-built for Next.js and handles connection pooling automatically |
| Vercel AI SDK 6 | Direct OpenRouter fetch() | If you need full control over SSE parsing or the AI SDK introduces unwanted abstractions; raw fetch() works but requires manual SSE chunking and error handling |
| shadcn/ui | Radix UI directly | If you have a dedicated designer and custom design system; shadcn is pre-styled Radix, so skip the styling layer if you'll replace it entirely |
| File storage (S3/MinIO) | Storing prose in PostgreSQL TEXT columns | For small projects (< 1000 novels), DB storage works; at scale, large TEXT blobs degrade query performance on the metadata table — keep prose in files |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Prisma with Next.js serverless | Prisma's query engine is a binary (~50MB); causes cold start timeouts in serverless/edge deployments; bundle size 90% larger than Drizzle | Drizzle ORM |
| NextAuth v4 | Outdated; App Router support was bolted on; session handling is inconsistent with RSC | Better Auth or Auth.js v5 |
| Moment.js | 67KB bundled, deprecated by maintainers | date-fns (tree-shakeable, ~5KB per function) |
| Axios | Unnecessary wrapper over fetch; Next.js 15 has native fetch with built-in caching | Native fetch() or AI SDK's streamText() |
| Redux / Zustand for server state | Overkill when RSC handles most server data; creates double-fetching patterns | TanStack Query for client-side caching only; RSC for server-fetched data |
| WebSockets for streaming prose | More complex than SSE for one-directional AI text streaming; requires custom server setup | Server-Sent Events (SSE) via Next.js Route Handlers + Vercel AI SDK's `streamText()` |
| n8n Cloud for high-volume production | Execution-based billing becomes expensive at novel-generation volumes (each chapter = 1+ executions); costs spike unpredictably | Self-hosted n8n Community Edition on a $40-80/mo VPS (4GB RAM, 2 CPU minimum) |

## Stack Patterns by Variant

**If using BYOK (user provides their OpenRouter API key):**
- Store the key encrypted in PostgreSQL, associated with the user record
- Pass it per-request to OpenRouter via the `extraBody` parameter in `@openrouter/ai-sdk-provider`
- Never log or cache the raw key; decrypt only at request time

**If using hosted/subscription model (platform pays for AI):**
- Use a single platform-owned OpenRouter API key stored in server environment variables
- Implement per-user token budgets tracked in PostgreSQL
- Add rate limiting middleware in Next.js Route Handlers before proxying to n8n

**If n8n streaming is unreliable for long chapter generation:**
- Use a two-webhook pattern: webhook 1 starts the n8n workflow and returns a job ID immediately; webhook 2 is polled for status or SSE push
- Alternatively: Next.js Route Handler calls OpenRouter directly via AI SDK for streaming prose; n8n handles outline/planning stages only (non-streaming)
- This hybrid avoids n8n's 100-second webhook response timeout for long prose generation

**If deploying to Vercel:**
- Use Neon PostgreSQL (official Vercel partner, native serverless driver)
- Configure Route Handler `maxDuration` for streaming responses (default 10s is too short; set 60-300s)
- Disable static caching on all AI Route Handlers with `export const dynamic = 'force-dynamic'`

**If self-hosting Next.js (VPS/Docker):**
- PostgreSQL can run on same host or managed service
- MinIO runs as a sidecar container for S3-compatible file storage
- Use PM2 or Docker for process management; no serverless constraints on route duration

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `ai` (AI SDK 6.x) | Next.js 15.x + React 19 | AI SDK 6 requires React 19 for `useChat` hook; confirmed compatible |
| `@openrouter/ai-sdk-provider` latest | `ai` (AI SDK 6.x) | Version 1.5.4 was the last AI SDK v5 compatible release; latest tracks v6 |
| `better-auth` latest | Next.js 15 App Router | Better Auth was designed for App Router; middleware integration is explicit |
| `drizzle-orm` 0.45.x | PostgreSQL 16.x, Neon serverless driver | Neon driver requires `@neondatabase/serverless`; not compatible with `pg` (node-postgres) |
| shadcn/ui latest | Tailwind CSS 4.x + React 19 | Components updated for Tailwind v4 and React 19 as of 2025; `data-slot` attributes replace `forwardRef` patterns |
| `@tanstack/react-query` v5 | Next.js App Router | Supports prefetch + hydration via `HydrationBoundary`; works with streaming RSC |

## Critical Architecture Note: n8n Streaming Limitation

**This is the most important stack decision for this project.**

n8n's webhook streaming (SSE via "Respond to Webhook" node with streaming enabled) is **functional but has known stability issues** as of early 2026 — community reports of version mismatches in the UI, inconsistent behavior with long-running AI workflows, and the 100-second hard webhook timeout on n8n Cloud.

**Recommended pattern:** Use n8n for non-streaming orchestration stages (outline generation, chapter planning, revision metadata) where a complete JSON response is acceptable. For real-time prose streaming during chapter generation, route requests through a Next.js Route Handler that calls OpenRouter directly via the AI SDK — bypassing n8n for that specific step:

```
Outline/Planning:  Frontend → n8n webhook → OpenRouter → n8n webhook response → Frontend
Chapter Streaming: Frontend → Next.js Route Handler → OpenRouter (stream) → Frontend (SSE)
                   Next.js Route Handler → n8n (fire-and-forget: save metadata) → n8n webhook
```

This preserves n8n for workflow orchestration while ensuring reliable streaming prose delivery. n8n still records chapter completion and manages state — it just doesn't sit in the critical path of the SSE stream.

## Sources

- Next.js official docs (version 16.1.6, lastUpdated 2026-02-27): https://nextjs.org/docs/app/guides — Next.js current version and App Router patterns verified
- Vercel AI SDK official blog: https://vercel.com/blog/ai-sdk-6 — AI SDK 6 confirmed stable as of December 22, 2025
- OpenRouter AI SDK Provider GitHub: https://github.com/OpenRouterTeam/ai-sdk-provider — @openrouter/ai-sdk-provider confirmed for AI SDK 6; v1.5.4 = last v5 compatible
- n8n Streaming docs: https://docs.n8n.io/workflows/streaming/ — Streaming support confirmed exists; requires streaming-capable nodes
- n8n community (webhook streaming): https://community.n8n.io/t/webhook-streaming/182718 — Known node versioning bug in streaming UI; workaround: manually upgrade to node v1.5
- n8n community (timeout issues): https://community.n8n.io/t/ai-agent-and-openai-chat-model-times-out/243579 — Confirmed 2-3 min webhook timeout is real production issue for long AI generation
- Drizzle ORM npm: https://www.npmjs.com/package/drizzle-orm — Version 0.45.1 confirmed current
- Better Auth docs: https://www.better-auth.com/docs/adapters/postgresql — PostgreSQL adapter and multi-tenant organization support confirmed
- shadcn/ui Tailwind v4 docs: https://ui.shadcn.com/docs/tailwind-v4 — Tailwind v4 compatibility confirmed
- WebSearch (multiple sources): Drizzle vs. Prisma 2025/2026 comparison, n8n self-hosted pricing, Next.js 15/16 release timeline — MEDIUM confidence (community/blog sources)

---
*Stack research for: AI-powered novel writing web application (StoryWriter)*
*Researched: 2026-02-28*
