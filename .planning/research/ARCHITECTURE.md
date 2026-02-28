# Architecture Research

**Domain:** AI-powered novel writing web application (Next.js + n8n + OpenRouter)
**Researched:** 2026-02-28
**Confidence:** MEDIUM — core patterns are well-established; n8n streaming through webhooks has known limitations that affect design choices.

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      BROWSER (Client)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Novel Wizard │  │ Chapter View │  │ Decision Checkpoint│    │
│  │ (React UI)   │  │ + SSE Stream │  │ (Approve/Rewrite)  │    │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘    │
│         │ fetch/POST      │ EventSource          │ POST          │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
┌─────────┼─────────────────┼──────────────────────┼──────────────┐
│                    NEXT.JS (Server)                              │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌────────────▼──────────┐  │
│  │ /api/n8n/   │  │/api/generate/│  │  /api/checkpoint/     │  │
│  │ [workflow]  │  │ stream       │  │  resume               │  │
│  │ (proxy)     │  │ (SSE proxy)  │  │  (resume URL relay)   │  │
│  └──────┬──────┘  └───────┬──────┘  └────────────┬──────────┘  │
│         │                 │                      │              │
│  ┌──────▼─────────────────▼──────────────────────▼──────────┐  │
│  │              Auth Middleware (Auth.js)                    │  │
│  │              User context injected into all calls         │  │
│  └──────┬─────────────────┬──────────────────────┬──────────┘  │
└─────────┼─────────────────┼──────────────────────┼─────────────┘
          │                 │                      │
┌─────────▼─────────────────▼──────────────────────▼─────────────┐
│                   n8n INSTANCE                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ /webhook/   │  │ /webhook/    │  │ Wait Node              │  │
│  │ outline     │  │ chapter-gen  │  │ (pauses for user       │  │
│  │ (workflow)  │  │ (streaming)  │  │  checkpoint decision)  │  │
│  └──────┬──────┘  └───────┬──────┘  └────────────────────────┘  │
│         │                 │                                      │
│  ┌──────▼─────────────────▼────────────────────────────────┐    │
│  │              n8n Workflow Engine                         │    │
│  │  Outline Generation | Chapter Writing | Editing          │    │
│  └──────────────────────────┬────────────────────────────--┘    │
└─────────────────────────────┼───────────────────────────────────┘
                              │ OpenRouter API calls
┌─────────────────────────────▼───────────────────────────────────┐
│                  OPENROUTER                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Model Router: Claude / GPT-4o / Llama / Mistral / etc.  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  STORAGE LAYER                                   │
│  ┌─────────────────────────┐  ┌───────────────────────────┐    │
│  │      PostgreSQL          │  │      File System / S3     │    │
│  │  users, projects,        │  │  chapter_1.txt            │    │
│  │  chapters (metadata),    │  │  chapter_2.txt            │    │
│  │  workflow state,         │  │  outline.json             │    │
│  │  billing, checkpoints    │  │  revisions/               │    │
│  └─────────────────────────┘  └───────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Next.js UI | React pages, progressive wizard UX, SSE consumption, routing | Next.js App Router, React Server/Client Components |
| Next.js API Routes | Auth middleware, n8n proxy, SSE relay, BYOK key injection | Route Handlers (`app/api/**`) |
| Auth.js (NextAuth) | Session management, multi-tenant user isolation, JWT | Auth.js v5 with PostgreSQL adapter |
| n8n Workflows | AI pipeline orchestration: outline, chapter gen, editing | n8n Cloud or self-hosted with queue mode |
| n8n Wait Node | Pauses workflow at user checkpoints, generates resume URL | n8n Wait node (webhook resume mode) |
| OpenRouter | Multi-model AI gateway, streaming SSE, BYOK key routing | OpenRouter API via `@openrouter/ai-sdk-provider` |
| PostgreSQL | User data, project metadata, chapter records, workflow state | Postgres (Neon for serverless, or self-hosted) |
| File Storage | Prose content, revision history, outline JSON | Local FS (dev), S3-compatible object store (prod) |

## Recommended Project Structure

```
storywriter/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, register, BYOK setup)
│   │   ├── login/
│   │   └── onboarding/
│   ├── (app)/                    # Protected app pages
│   │   ├── dashboard/            # Novel list, project overview
│   │   ├── novel/
│   │   │   └── [novelId]/
│   │   │       ├── setup/        # Guided interview wizard
│   │   │       ├── outline/      # Outline review + refinement
│   │   │       └── write/
│   │   │           └── [chapter]/ # Chapter stream view + checkpoint
│   ├── api/
│   │   ├── auth/                 # Auth.js endpoints
│   │   ├── n8n/
│   │   │   ├── outline/route.ts  # Proxy: trigger outline workflow
│   │   │   ├── chapter/route.ts  # Proxy: trigger chapter workflow (SSE)
│   │   │   └── checkpoint/route.ts # Relay user decisions to wait node
│   │   ├── novels/               # CRUD for novel/chapter metadata
│   │   └── user/
│   │       └── keys/route.ts     # BYOK OpenRouter key management
│   └── layout.tsx
├── components/
│   ├── wizard/                   # Guided interview UI components
│   ├── outline/                  # Outline editor components
│   ├── chapter/
│   │   ├── StreamingChapter.tsx  # SSE consumer, text display
│   │   └── CheckpointPanel.tsx   # Approve/rewrite/redirect choices
│   └── ui/                       # Shared design system components
├── lib/
│   ├── auth.ts                   # Auth.js config
│   ├── db.ts                     # Postgres client (Drizzle ORM)
│   ├── n8n.ts                    # n8n webhook call helpers
│   ├── openrouter.ts             # OpenRouter client, key helpers
│   └── storage.ts                # File read/write abstraction
├── db/
│   ├── schema.ts                 # Drizzle schema definitions
│   └── migrations/               # SQL migrations
└── n8n-workflows/                # Exported n8n workflow JSON files
    ├── outline-generation.json
    ├── chapter-writing.json
    └── editing-pass.json
```

### Structure Rationale

- **`app/(auth)` vs `app/(app)`:** Route groups separate auth pages from protected app pages without URL segments, enabling layout reuse without auth overhead on public pages.
- **`api/n8n/`:** All n8n calls go through Next.js proxy routes — never direct from browser. This is where BYOK keys are injected, CORS is avoided, and auth is enforced before any n8n call.
- **`n8n-workflows/`:** Storing workflow JSON in the repo enables version control for workflow logic. Not all teams do this, but for a solo/small team it prevents workflow drift.
- **`lib/storage.ts`:** Abstracts file I/O so dev uses local disk and prod swaps to S3 without touching calling code.

## Architectural Patterns

### Pattern 1: Next.js as n8n Proxy (BFF — Backend for Frontend)

**What:** The browser never calls n8n webhooks directly. All n8n calls go through Next.js API route handlers that authenticate the user, inject the user's OpenRouter key, add the project/novel context, and proxy to n8n.

**When to use:** Always, for this app. Direct browser-to-n8n calls would expose webhook URLs, bypass auth, and require CORS configuration on n8n.

**Trade-offs:** Adds a network hop. Worth it for security, key injection, and clean separation.

**Example:**
```typescript
// app/api/n8n/chapter/route.ts
export async function POST(request: Request) {
  const session = await auth(); // Auth.js — throws 401 if not authenticated
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { novelId, chapterId, model } = await request.json();
  const userKey = await getUserOpenRouterKey(session.user.id); // BYOK or platform key

  // Proxy to n8n webhook, injecting auth context
  const n8nResponse = await fetch(process.env.N8N_CHAPTER_WEBHOOK_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-n8n-auth": process.env.N8N_WEBHOOK_SECRET!,
    },
    body: JSON.stringify({
      userId: session.user.id,
      novelId,
      chapterId,
      model,
      openrouterKey: userKey,
    }),
  });

  // Stream the SSE response back to the browser
  return new Response(n8nResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### Pattern 2: n8n Wait Node for User Checkpoints

**What:** After n8n generates a chapter, the workflow pauses at a Wait node. n8n stores its state to the database and returns a `$execution.resumeUrl` to the caller. The user sees the chapter and makes creative decisions (approve, rewrite, redirect). Their choice POSTs to the Next.js `/api/n8n/checkpoint` route, which calls the resume URL with the decision payload, and n8n continues.

**When to use:** Every inter-chapter checkpoint. This is the core creative control loop.

**Trade-offs:** Two-phase interaction (generate → wait → resume) is more complex than a simple request/response. The workflow execution is long-lived in n8n's database, not in memory. Resume URLs must be treated as secrets — store them server-side, never expose raw to browser.

**Example:**
```typescript
// n8n workflow returns resumeUrl after chapter generation
// Next.js stores it in Postgres linked to the chapter record

// app/api/n8n/checkpoint/route.ts
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { chapterId, decision, feedback } = await request.json();

  // Look up the stored resume URL for this chapter checkpoint
  const checkpoint = await db.query.checkpoints.findFirst({
    where: eq(checkpoints.chapterId, chapterId),
  });
  if (!checkpoint || checkpoint.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Resume the paused n8n workflow with user's decision
  await fetch(`${checkpoint.resumeUrl}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, feedback }),
  });

  return new Response("OK");
}
```

### Pattern 3: SSE Streaming via Next.js Proxy to Browser

**What:** For chapter generation, n8n streams SSE chunks back through the n8n → Next.js → Browser pipeline. The Next.js route handler pipes the `Response.body` (ReadableStream) directly to the browser with SSE headers.

**When to use:** Chapter generation only. Outline generation can be non-streaming (shorter, batch operation).

**Trade-offs:** n8n's streaming via Respond-to-Webhook node sends one chunk (the complete text), not incremental character-by-character tokens. True token-level streaming requires n8n to stream from OpenRouter AND relay those chunks — this is available only when using n8n's AI Agent node with streaming enabled. This is the most significant architecture constraint in this stack.

**Critical detail from research:** The n8n `Respond to Webhook` node with streaming enabled sends the full response in a single transmission unless the workflow uses an n8n AI Agent node with streaming explicitly configured. If using an HTTP Request node to call OpenRouter, you do NOT get incremental streaming through n8n. The workaround is: n8n processes logic, then Next.js calls OpenRouter directly for the final generation step (bypassing n8n for streaming).

**Hybrid streaming pattern (recommended):**
```
Browser → Next.js /api/n8n/chapter → n8n (context + planning, non-streaming)
                                        ↓ returns: prompt + context
Next.js /api/generate/stream → OpenRouter (streaming SSE, direct)
                                        ↓ streams tokens
Browser ← SSE chunks ← Next.js ← OpenRouter
```

**Example:**
```typescript
// app/api/generate/stream/route.ts
// Called after n8n returns the assembled prompt
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { prompt, model, chapterId } = await request.json();
  const userKey = await getUserOpenRouterKey(session.user.id);

  const { experimental_streamText } = await import("ai");
  const { openrouter } = await import("@openrouter/ai-sdk-provider");

  const result = experimental_streamText({
    model: openrouter(model),
    prompt,
    apiKey: userKey,
  });

  return result.toDataStreamResponse();
}
```

### Pattern 4: Hybrid Storage (Postgres Metadata + File Prose)

**What:** PostgreSQL stores structured data about the novel (user, title, outline, chapter list, word counts, status, checkpoint state). The actual prose text is stored as files (local in dev, S3-compatible in prod). Paths to files are stored in Postgres.

**When to use:** Always. Postgres TEXT columns can hold prose, but file-based storage enables version control, export, and avoids bloating the database with megabytes of creative content.

**Trade-offs:** Two storage systems to manage. Worth it: prose is append-heavy, file-friendly, and needs to be exportable as `.txt` or `.docx`. Postgres is not the right place for it at scale.

**Example schema:**
```typescript
// db/schema.ts
export const chapters = pgTable("chapters", {
  id: uuid("id").primaryKey().defaultRandom(),
  novelId: uuid("novel_id").references(() => novels.id),
  userId: uuid("user_id").references(() => users.id),
  chapterNumber: integer("chapter_number").notNull(),
  title: text("title"),
  status: text("status").default("pending"), // pending | generating | checkpoint | approved | complete
  wordCount: integer("word_count"),
  prosePath: text("prose_path"),   // e.g. "novels/{novelId}/chapters/01.txt"
  outlineFragment: jsonb("outline_fragment"), // this chapter's outline data
  checkpointResumeUrl: text("checkpoint_resume_url"), // n8n wait node URL (secret)
  model: text("model"),            // which OpenRouter model was used
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

## Data Flow

### Outline Generation Flow

```
User completes interview wizard
    ↓ POST /api/n8n/outline
Next.js proxy (injects userId, auth, OpenRouter key)
    ↓ POST n8n /webhook/outline
n8n Outline Workflow
    ↓ HTTP Request node → OpenRouter (non-streaming, sync)
    ↓ Returns: structured outline JSON
Next.js receives outline
    ↓ Saves outline to Postgres + outline.json file
Browser renders outline for user review
    ↓ User adjusts characters/structure/pacing
    ↓ POST /api/novels/{id}/outline (save revisions)
Postgres updated, ready for chapter phase
```

### Chapter Generation Flow (Hybrid Streaming Pattern)

```
User triggers chapter N generation
    ↓ POST /api/n8n/chapter
Next.js proxy
    ↓ POST n8n /webhook/chapter-context
n8n Chapter Context Workflow
    ↓ Reads outline, previous chapters, user prefs from DB
    ↓ Assembles generation prompt
    ↓ Returns: {prompt, model, contextSummary}
Next.js receives assembled prompt
    ↓ POST /api/generate/stream (internal to Next.js)
Next.js calls OpenRouter directly (streaming)
    ↓ @openrouter/ai-sdk-provider streamText()
    ↓ SSE chunks flow back through Next.js
Browser consumes SSE, renders chapter text in real time
    ↓ On [DONE] event: POST /api/n8n/chapter/complete
n8n Chapter Complete Workflow
    ↓ Saves prose to file, updates Postgres
    ↓ Wait node activates → returns resumeUrl to Next.js
Next.js stores resumeUrl in Postgres (checkpoints table)
Browser shows CheckpointPanel (approve / rewrite / redirect)
    ↓ User chooses
    ↓ POST /api/n8n/checkpoint
Next.js retrieves resumeUrl from Postgres
    ↓ Calls resumeUrl with decision payload
n8n resumes workflow
    ↓ Either: next chapter prep OR revision workflow
```

### State Management

```
Postgres (source of truth for workflow state)
    ↓
Novel status: interview → outline → writing → complete
Chapter status: pending → generating → checkpoint → approved
    ↓
Next.js reads status on page load
    ↓ Resumes from correct state if user returns mid-session
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Monolith is fine. n8n Cloud handles workflows. Local file storage on Next.js server (use /tmp with caution on serverless). Single Postgres instance. |
| 1k-10k users | Switch file storage to S3 (or Supabase Storage). n8n self-hosted with queue mode (main + 2 workers). Consider Neon serverless Postgres for connection pooling. Add Redis for Next.js session caching. |
| 10k+ users | n8n queue mode with autoscaling workers. CDN in front of Next.js. Postgres read replicas for dashboard queries. Consider separating streaming generation service from main Next.js app. |

### Scaling Priorities

1. **First bottleneck:** File storage — local disk doesn't work on serverless Next.js deployments (Vercel). Move to S3-compatible store before launch if deploying to Vercel.
2. **Second bottleneck:** n8n execution capacity — single-instance n8n blocks under parallel users. Enable queue mode with workers early (it's a config change, not a rewrite).
3. **Third bottleneck:** OpenRouter rate limits — per-user BYOK keys avoid shared rate limit pools. Platform-hosted keys hit shared limits quickly at scale; implement per-user usage tracking.

## Anti-Patterns

### Anti-Pattern 1: Direct Browser-to-n8n Webhook Calls

**What people do:** Call n8n webhook URLs directly from browser JavaScript to avoid writing Next.js API routes.

**Why it's wrong:** Exposes n8n webhook URLs publicly. No auth enforcement. No BYOK key injection. CORS problems. Anyone with the URL can trigger your AI workflows.

**Do this instead:** Always proxy n8n calls through Next.js API routes. Next.js is the security perimeter — auth, key injection, and input validation all happen there before any n8n call.

### Anti-Pattern 2: Storing Resume URLs in Browser State

**What people do:** Return the n8n Wait node's `$execution.resumeUrl` in the HTTP response and store it in React state or localStorage.

**Why it's wrong:** Anyone who can read localStorage or intercept the response can resume another user's workflow with arbitrary data. Resume URLs are effectively tokens that grant workflow execution.

**Do this instead:** Store resume URLs server-side only (Postgres). Browser sends "I chose Option A for chapter 3" to Next.js; Next.js looks up the stored resume URL and calls it internally.

### Anti-Pattern 3: Expecting Token-Level Streaming Through n8n Webhook

**What people do:** Assume that because n8n supports "streaming responses," users will see tokens appear character-by-character from a webhook endpoint.

**Why it's wrong:** n8n's Respond-to-Webhook streaming node sends one chunk containing the full response, not incremental tokens. Only the AI Agent node with streaming enabled sends progressive chunks — but even then, behavior is inconsistent compared to direct OpenRouter SSE.

**Do this instead:** Use the hybrid pattern: n8n handles context assembly and workflow orchestration (non-streaming), then Next.js calls OpenRouter directly with `@openrouter/ai-sdk-provider` for true token-level streaming.

### Anti-Pattern 4: Storing Prose in Postgres TEXT Columns

**What people do:** Store chapter prose directly in a `content TEXT` column in Postgres.

**Why it's wrong:** A novel chapter is 3,000-5,000 words (~15-25KB). A 30-chapter novel is ~450-750KB of prose. Multiply by users, revisions, and rewrite passes. Postgres TEXT works but bloats the DB, slows row-level operations, makes export awkward, and loses the natural portability of file-based content.

**Do this instead:** Store prose as `.txt` files referenced by path in Postgres. Keep Postgres for metadata, state, and queries. Files for content.

### Anti-Pattern 5: Single Monolithic n8n Workflow

**What people do:** Build one giant n8n workflow that handles interview → outline → all chapters → editing in sequence.

**Why it's wrong:** Long-running monolithic workflows are hard to debug, can't be retried mid-flow, and create single points of failure. n8n execution timeouts can kill hours of work.

**Do this instead:** Separate workflows for separate concerns: one for outline generation, one for chapter context assembly, one for post-generation completion (storing results, creating Wait node), one for the editing pass. Call them from Next.js as needed based on novel/chapter status in Postgres.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenRouter | `@openrouter/ai-sdk-provider` with Vercel AI SDK — `streamText()` for chapters, direct HTTP for outline | BYOK: per-user API key fetched server-side before each call. Platform key: stored in env var. |
| n8n | POST to webhook URLs from Next.js proxy routes. Auth via shared secret header (`x-n8n-auth`). | Never expose n8n webhooks directly to browser. |
| n8n Wait Node | Wait node returns `$execution.resumeUrl`. Store in Postgres. Next.js calls it on user decision. | Treat resumeUrl as a secret. One-time use per checkpoint. |
| Auth.js | Session validation in all API routes via `auth()` helper. PostgreSQL adapter for session persistence. | Multi-tenant: all queries scoped to `session.user.id`. |
| PostgreSQL | Drizzle ORM for type-safe queries. Postgres.js as driver. | Neon recommended for serverless/Vercel deployments. |
| S3 / Object Storage | `@aws-sdk/client-s3` or Supabase Storage SDK. Abstracted behind `lib/storage.ts`. | Use local disk in dev (via same abstraction), swap env var for prod. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Browser ↔ Next.js | fetch() + EventSource (SSE) | All API calls authenticated via session cookie |
| Next.js ↔ n8n | HTTPS POST with shared secret header | Proxy pattern — no direct browser-to-n8n traffic |
| Next.js ↔ OpenRouter | `@openrouter/ai-sdk-provider` streamText() | Only for streaming generation; n8n handles OpenRouter for non-streaming tasks |
| Next.js ↔ Postgres | Drizzle ORM — all queries scoped by userId | Row-level security optional but recommended for multi-tenant isolation |
| Next.js ↔ File Storage | `lib/storage.ts` abstraction layer | Local FS in dev, S3 in prod — same interface |
| n8n ↔ OpenRouter | HTTP Request node or official OpenRouter/AI node | n8n handles this for outline + editing (non-streaming) |

## Suggested Build Order (Phase Dependencies)

The architecture has hard dependencies that dictate build order:

```
1. Auth + DB schema (foundation — everything depends on user identity and data model)
    ↓
2. File storage abstraction (lib/storage.ts — needed before writing any prose)
    ↓
3. n8n outline workflow + Next.js proxy route (first AI feature, non-streaming, validates n8n integration)
    ↓
4. Outline UI (review + edit — validates UX pattern before chapter writing)
    ↓
5. n8n chapter-context workflow + hybrid streaming (most complex, builds on outline data)
    ↓
6. Streaming chapter UI (SSE consumer, depends on step 5)
    ↓
7. Wait node + checkpoint UI (depends on working chapter generation)
    ↓
8. BYOK key management (can parallel-track with 5-7, but must land before launch)
    ↓
9. Editing pass workflow (post-MVP, depends on complete chapter pipeline)
```

## Sources

- n8n Webhook Docs: [https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- n8n Streaming Responses Docs: [https://docs.n8n.io/workflows/streaming/](https://docs.n8n.io/workflows/streaming/) (MEDIUM confidence — page content partially inaccessible)
- n8n Wait Node / HITL Pattern: [https://rolandsoftwares.com/content/n8n-human-in-the-loop-approval-flows/](https://rolandsoftwares.com/content/n8n-human-in-the-loop-approval-flows/) — MEDIUM confidence, community-verified
- n8n Streaming Limitation (community): [https://community.n8n.io/t/streamin-respond-to-webhook-node-does-not-have-same-behaviour-as-streaming-ai-agent-node/232076](https://community.n8n.io/t/streamin-respond-to-webhook-node-does-not-have-same-behaviour-as-streaming-ai-agent-node/232076) — HIGH confidence (direct community confirmation)
- n8n Queue Mode Architecture: [https://docs.n8n.io/hosting/scaling/queue-mode/](https://docs.n8n.io/hosting/scaling/queue-mode/) — HIGH confidence (official docs)
- OpenRouter Streaming (SSE): [https://openrouter.ai/docs/api/reference/streaming](https://openrouter.ai/docs/api/reference/streaming) — HIGH confidence (official docs)
- OpenRouter BYOK: [https://openrouter.ai/docs/guides/overview/auth/byok](https://openrouter.ai/docs/guides/overview/auth/byok) — HIGH confidence (official docs)
- OpenRouter AI SDK Provider: [https://github.com/OpenRouterTeam/ai-sdk-provider](https://github.com/OpenRouterTeam/ai-sdk-provider) — HIGH confidence (official repo, actively maintained as of Feb 2026)
- Next.js SSE Streaming Pattern: [https://upstash.com/blog/sse-streaming-llm-responses](https://upstash.com/blog/sse-streaming-llm-responses) — HIGH confidence (verified against Next.js docs)
- Next.js Route Handler Best Practices: [https://makerkit.dev/blog/tutorials/nextjs-api-best-practices](https://makerkit.dev/blog/tutorials/nextjs-api-best-practices) — MEDIUM confidence
- n8n Security / Webhook Exposure: [https://n8npro.in/best-practices/using-webhooks-securely-in-n8n/](https://n8npro.in/best-practices/using-webhooks-securely-in-n8n/) — MEDIUM confidence
- n8n Webhook SSE PR: [https://github.com/n8n-io/n8n/pull/20499](https://github.com/n8n-io/n8n/pull/20499) — HIGH confidence (official PR)

---
*Architecture research for: AI-powered novel writing app (Next.js + n8n + OpenRouter)*
*Researched: 2026-02-28*
