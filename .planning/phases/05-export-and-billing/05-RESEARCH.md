# Phase 5: Export and Billing - Research

**Researched:** 2026-03-03
**Domain:** Document generation (DOCX/ePub/RTF/TXT), Stripe subscriptions + credit packs, token usage tracking
**Confidence:** HIGH (core libraries verified; architecture patterns confirmed from official sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Export format & structure**
- Full book structure: title page, table of contents, chapter headers, page breaks between chapters
- Formats: DOCX and plain text (per EXPT-01/02), plus ePub and RTF (RTF specifically for Vellum import)
- Export assembles chapters into a single document (EXPT-03)
- User chooses which chapters to include: "approved only" or "all chapters" — draft chapters get a visible marker in the export
- Pen name field in export dialog, defaults to account name but editable

**Export UI placement**
- Export action lives in the project settings/actions area, not in the chapters page toolbar

**Payment provider**
- Stripe for all subscription and credit pack payments
- Stripe Checkout for purchase flow, Customer Portal for subscription management

**Subscription model**
- Hybrid: subscription tiers + purchasable credit packs
- Tiers provide a monthly token budget
- Credit packs are one-time purchases that add tokens on top of the tier budget
- Specific tier names, prices, and budget amounts are Claude's discretion

**Overage handling**
- Soft warning at 80% budget used (toast notification)
- Hard block at 100% — generation disabled
- User prompted to upgrade tier or buy a credit pack to continue

**BYOK billing visibility**
- Billing is completely invisible to BYOK users
- No billing pages, upgrade prompts, or token budgets shown
- BYOK users use their own OpenRouter credits directly

**Token tracking**
- Per-chapter granularity within each project
- Tokens tracked per generation request, aggregated to chapter and project level
- Display: tokens only, no dollar estimate conversion

**Usage display**
- Dedicated /usage page (new route)
- Budget progress bar showing used/remaining for the current billing cycle
- Total token counts

**Budget warnings UX**
- 80% threshold triggers a toast notification after generation completes
- At 100% exhausted: modal dialog with upgrade/credit pack options when user tries to generate
- Warning also appears as persistent banner on the /usage page when over threshold

### Claude's Discretion
- Stripe webhook handler design and event types
- Token counting implementation (from OpenRouter response headers vs manual counting)
- Credit pack denomination options and pricing
- Subscription tier names and budget amounts
- DOCX generation library choice
- ePub generation library choice
- RTF formatting approach
- Export file naming convention
- Usage page layout and chart design

### Deferred Ideas (OUT OF SCOPE)
- MOBI export format — PLAT-02 (v2)
- Per-project cost breakdown table on usage page — could be added later
- Dollar estimate conversion for token counts — user prefers tokens only for now
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXPT-01 | User can export their novel to DOCX format | `docx` v9.6.0 library — `Packer.toBuffer()` returns a Buffer sent via Next.js route handler with `Content-Disposition: attachment` |
| EXPT-02 | User can export their novel to plain text format | No library needed — assemble chapter text with line breaks, return as `text/plain` response |
| EXPT-03 | Export assembles all approved chapters into a single document | `chapters.ts` data access pattern — query `chapter_checkpoints` filtered by `approval_status`, assemble in `chapter_number` order |
| BILL-01 | Hosted tier users subscribe to a plan with token/credit budget | Stripe Checkout (embedded or hosted) + webhook updates `user_settings` subscription_tier + monthly token budget |
| BILL-02 | Token usage is tracked per user and per project | Parse final SSE chunk's `chunk.usage` field from OpenRouter streaming responses; write to new `token_usage` table |
| BILL-03 | User is warned when approaching their token budget limit | Server-side budget check after every generation; return `budget_warning` flag to client; Sonner toast at 80%, modal at 100% |
| BILL-04 | BYOK users bypass billing (use their own OpenRouter credits) | Gate all billing UI on `subscription_tier !== 'none' && !openrouter_api_key`; BYOK users skip token tracking entirely |
</phase_requirements>

---

## Summary

Phase 5 has two distinct technical domains: document export and Stripe billing. They are independent and can be developed in parallel but both must ship before public launch.

**Export** is straightforward: the `docx` npm library (v9.6.0, actively maintained, released 2026-02-24) handles DOCX generation server-side with a declarative TypeScript API. ePub generation uses `epub-gen-memory` (v1.1.2) which accepts HTML chapter content and returns a Buffer. RTF is simple enough to hand-generate as a templated string — the format is plain text with control words, and the content requirements (paragraphs, bold chapter titles, page breaks) need only ~20 control words. Plain text needs no library. All four formats are served via a single Next.js route handler (`/api/export/[projectId]`) with a `format` query param, returning appropriate `Content-Disposition` headers.

**Billing** is more complex but well-documented. Stripe Checkout creates subscription sessions via a Server Action; webhooks at `/api/webhooks/stripe` update the user's tier and token budget in Supabase. The hybrid tier + credit pack model requires: (1) a `token_usage` table tracking per-chapter consumption, (2) a `token_budget` column on `user_settings` for monthly allocation, (3) a credit balance column that accumulates pack purchases. Token counts come for free from OpenRouter — the final SSE chunk always includes `chunk.usage.total_tokens`. The current chapter generation route streams the OpenRouter body through directly; it must be modified to intercept the final chunk, extract usage, and persist it without blocking the stream.

The most architecturally interesting decision is how to intercept token counts from a passthrough SSE stream. The existing route handler passes the OpenRouter `ReadableStream` directly through. To extract usage from the final chunk, the route must transform the stream — reading each SSE chunk, passing it through, and saving usage data when it sees the final chunk. A `TransformStream` handles this cleanly.

**Primary recommendation:** Build export first (lower risk, no external service), then billing. Use `docx` for DOCX, `epub-gen-memory` for ePub, hand-generate RTF. For billing: Stripe with Server Actions for checkout, Route Handler for webhooks, TransformStream in the chapter route for token interception.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `docx` | 9.6.0 | DOCX document generation | Most maintained DOCX lib for Node/TS; declarative API; active (published 2026-02-24) |
| `epub-gen-memory` | 1.1.2 | ePub generation from HTML | Works in Node and browser; returns Buffer directly; TypeScript-native |
| `stripe` | latest (>=14) | Stripe Node SDK | Official; required for `stripe.webhooks.constructEvent()` signature verification |
| `@stripe/stripe-js` | latest | Stripe.js browser SDK | Required for Stripe Checkout embedded UI |
| `@stripe/react-stripe-js` | latest | React wrapper for Stripe.js | Required for `<EmbeddedCheckout>` component |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | already installed | Toast notifications | Already in project — use for 80% budget warning toast |
| RTF (hand-generated) | n/a | RTF export for Vellum | RTF is plain text; no library needed for basic paragraphs + page breaks |
| Native `TextEncoder` | built-in | SSE chunk parsing in TransformStream | No library needed for SSE parsing |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `docx` | `docxtemplater` | docxtemplater requires a template file on disk; `docx` generates from code — better for dynamic content |
| `epub-gen-memory` | `epub-gen` | `epub-gen` is 7 years old and unmaintained; `epub-gen-memory` is the active fork |
| Hand-generated RTF | `jsrtf` / `node-rtf` | Both libraries are unmaintained (last update 5+ years ago); RTF spec is stable and trivial to template for this use case |
| Stripe Checkout | Custom payment form | PCI compliance, fraud tooling, and localization require enormous effort; Stripe Checkout handles all of it |

**Installation:**
```bash
npm install docx epub-gen-memory stripe @stripe/stripe-js @stripe/react-stripe-js
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── usage/          # New /usage page route
│   │   │   └── page.tsx
│   │   └── projects/[id]/
│   │       └── settings/   # Export dialog lives here (per CONTEXT.md)
│   └── api/
│       ├── export/
│       │   └── [projectId]/
│       │       └── route.ts    # Single handler for all formats (?format=docx|epub|rtf|txt)
│       └── webhooks/
│           └── stripe/
│               └── route.ts    # Stripe webhook handler
├── actions/
│   ├── billing.ts              # createCheckoutSession, createPortalSession
│   └── token-usage.ts          # getTokenUsage, getBudgetStatus
├── components/
│   ├── export/
│   │   └── export-dialog.tsx   # Format picker + pen name + chapter selection
│   ├── billing/
│   │   ├── upgrade-modal.tsx   # Hard-block modal at 100% usage
│   │   ├── plan-card.tsx       # Tier display card
│   │   └── usage-bar.tsx       # Budget progress bar component
│   └── usage/
│       └── usage-page.tsx      # /usage page content
├── lib/
│   ├── export/
│   │   ├── assemble.ts         # Chapter assembly logic (shared across formats)
│   │   ├── docx.ts             # DOCX builder using docx library
│   │   ├── epub.ts             # ePub builder using epub-gen-memory
│   │   ├── rtf.ts              # RTF template generator (hand-written)
│   │   └── txt.ts              # Plain text assembler
│   └── stripe/
│       └── client.ts           # Stripe singleton (new Stripe(process.env.STRIPE_SECRET_KEY!))
└── supabase/
    └── migrations/
        └── 00005_billing_and_token_tracking.sql
```

### Pattern 1: Export Route Handler (all formats)

**What:** A single GET route handler assembles chapter data and streams the file as a download.
**When to use:** All export format requests route through this single handler.

```typescript
// Source: Next.js official docs + verified WebSearch
// src/app/api/export/[projectId]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'txt' // 'docx' | 'epub' | 'rtf' | 'txt'

  // 1. Auth check
  // 2. Fetch approved chapters ordered by chapter_number
  // 3. Call format-specific builder
  // 4. Return Response with Content-Disposition header

  const buffer = await buildDocx(chapters, options) // or buildEpub, buildRtf, buildTxt

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${slug}-novel.docx"`,
    },
  })
}
```

### Pattern 2: DOCX Generation with `docx` library

**What:** Declarative TypeScript API builds document structure, `Packer.toBuffer()` returns a Buffer.
**When to use:** EXPT-01.

```typescript
// Source: docx v9.6.0 official docs + GitHub (HIGH confidence)
import { Document, Packer, Paragraph, HeadingLevel, PageBreak, TextRun } from 'docx'

const doc = new Document({
  sections: [{
    children: [
      // Title page
      new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
      new Paragraph({ children: [new PageBreak()] }),
      // Chapter header
      new Paragraph({ text: `Chapter 1: ${chapter.title}`, heading: HeadingLevel.HEADING_1 }),
      // Body paragraphs
      ...chapter.paragraphs.map(p => new Paragraph({ text: p })),
      // Page break between chapters
      new Paragraph({ children: [new PageBreak()] }),
    ],
  }],
})

const buffer = await Packer.toBuffer(doc)
```

### Pattern 3: ePub Generation with `epub-gen-memory`

**What:** Accepts book metadata + chapters as HTML, returns a Buffer.
**When to use:** ePub export.

```typescript
// Source: epub-gen-memory v1.1.2 official GitHub README (HIGH confidence)
import epub from 'epub-gen-memory'
import type { Options } from 'epub-gen-memory'

const options: Options = {
  title: projectTitle,
  author: penName,
  tocTitle: 'Table of Contents',
  version: 3,
  content: chapters.map(ch => ({
    title: ch.title,
    content: `<h1>${ch.title}</h1><p>${ch.text}</p>`, // HTML
  })),
}

const buffer = await epub(options) // returns Promise<Buffer>
```

### Pattern 4: Stripe Checkout Session (Server Action)

**What:** Server Action creates a Checkout session and returns the client secret (embedded mode) or URL (hosted mode).
**When to use:** User initiates subscription purchase.

```typescript
// Source: Stripe + Next.js 15 guide (2026), MEDIUM-HIGH confidence
'use server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function createCheckoutSession(priceId: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const origin = (await headers()).get('origin')

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings?billing=success`,
    cancel_url: `${origin}/settings?billing=cancelled`,
    // Attach Supabase user ID to link webhook back
    metadata: { userId: authenticatedUserId },
  })

  return { url: session.url }
}
```

### Pattern 5: Stripe Webhook Handler (Route Handler — NOT Server Action)

**What:** Route Handler verifies Stripe signature, processes subscription events, updates Supabase.
**When to use:** All Stripe events (subscription created/updated/deleted, invoice paid, one-time credit pack purchase).

```typescript
// Source: Stripe official docs + Next.js App Router webhook guides (HIGH confidence)
// CRITICAL: Must read raw body as text — JSON.parse destroys signature verification
import { stripe } from '@/lib/stripe/client'

export async function POST(req: Request) {
  const body = await req.text()              // raw body required for signature
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object)
      break
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionChange(event.data.object)
      break
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object) // resets monthly token budget
      break
  }

  return new Response(null, { status: 200 })
}
```

### Pattern 6: Token Interception via TransformStream

**What:** The chapter generation route currently passes the OpenRouter SSE stream directly. To capture usage, the route wraps the stream in a TransformStream that parses each SSE chunk and writes token usage after the stream ends.
**When to use:** Every generation request for hosted-tier users (skip for BYOK).

```typescript
// Source: MDN TransformStream + OpenRouter streaming docs (MEDIUM confidence)
// Key: usage always appears in the FINAL SSE chunk as chunk.usage.total_tokens

function createTokenInterceptStream(
  onUsage: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
) {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk) // always pass through first
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.usage?.total_tokens) {
            onUsage(parsed.usage)
          }
        } catch { /* not JSON, skip */ }
      }
    },
    flush() {
      // stream ended — usage has been captured in onUsage callback
    },
  })
}
```

### Pattern 7: Token Budget Check Before Generation

**What:** Before calling OpenRouter, check if the user has budget remaining. Gate on subscription tier and BYOK status.
**When to use:** Every generation request in every route handler.

```typescript
// Source: makerkit credit-billing pattern + project conventions (MEDIUM confidence)
async function checkTokenBudget(userId: string, supabase: SupabaseClient) {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('openrouter_api_key, subscription_tier, token_budget_remaining')
    .eq('user_id', userId)
    .single()

  // BYOK users bypass billing entirely
  if (settings?.openrouter_api_key) return { allowed: true, isByok: true }

  // Hosted tier: check budget
  if ((settings?.token_budget_remaining ?? 0) <= 0) {
    return { allowed: false, reason: 'budget_exhausted' }
  }

  const pct = 1 - (settings!.token_budget_remaining / settings!.token_budget_total)
  return {
    allowed: true,
    isByok: false,
    warningThreshold: pct >= 0.8 ? 'near_limit' : null,
  }
}
```

### Anti-Patterns to Avoid

- **Parsing the webhook body as JSON:** `req.json()` will destroy the raw body needed for `stripe.webhooks.constructEvent()`. Always use `req.text()`.
- **Trusting webhook data without signature verification:** Never update subscription tier based on unverified webhook payload.
- **Using `Packer.toBlob()` server-side:** `toBlob()` is browser-only. Use `Packer.toBuffer()` in route handlers.
- **Blocking the SSE stream to write token usage:** Write token usage asynchronously after stream flush — never `await` a database write inside the passthrough stream.
- **Showing billing UI to BYOK users:** Check `openrouter_api_key` server-side; never render upgrade prompts if the user has a key.
- **No idempotency on webhooks:** Stripe retries failed webhooks. Store processed `event.id` values to prevent double-crediting or double-updating subscription tier.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOCX generation | Custom XML/ZIP builder | `docx` v9.6.0 | OOXML spec is 6,000+ pages; namespacing, content types, relationships are edge-case hell |
| ePub generation | Custom ZIP + OPF/NCX/HTML builder | `epub-gen-memory` v1.1.2 | ePub spec (OPF, NCX, EPUB3 nav) requires precise file structure; library handles it |
| Payment processing | Custom card capture | Stripe | PCI-DSS compliance, fraud, 3DS2, international cards — years of engineering |
| Webhook signature verification | Custom HMAC | `stripe.webhooks.constructEvent()` | Stripe requires specific raw-body + timestamp-bound HMAC; easy to get wrong |
| Token counting | Tokenizer (tiktoken etc.) | OpenRouter `chunk.usage` | OpenRouter returns exact counts from the model's native tokenizer; manual counting is model-specific and error-prone |

**Key insight:** The DOCX and ePub formats look like "just XML in a zip" but the internal structure (relationships, content types, required elements) is complex enough that hand-rolling always misses edge cases that cause Word/iBooks to reject or corrupt the file. Use libraries.

---

## Common Pitfalls

### Pitfall 1: Webhook Raw Body Destruction
**What goes wrong:** `await req.json()` in a Next.js Route Handler consumes and parses the body. Stripe signature verification uses the raw bytes including exact whitespace. After `req.json()`, the raw body is gone and `constructEvent()` throws.
**Why it happens:** Next.js/Fetch API body is a ReadableStream — it can only be consumed once.
**How to avoid:** Always use `await req.text()` in the Stripe webhook route, never `req.json()`.
**Warning signs:** `No signatures found matching the expected signature for payload` error from Stripe.

### Pitfall 2: Missing Stripe Idempotency for Webhooks
**What goes wrong:** Stripe retries webhooks on timeout or 5xx response. If your handler processes a subscription twice, users get double token credits or their tier gets toggled incorrectly.
**Why it happens:** Network failures, slow DB writes, cold starts on Vercel all cause webhook timeouts.
**How to avoid:** Store processed `stripe_event_id` in a `stripe_webhook_events` table; check before processing.
**Warning signs:** User reports double-credited tokens or subscription tier oscillating.

### Pitfall 3: Blocking SSE Stream for Token Write
**What goes wrong:** The chapter generation route currently passes the OpenRouter body directly as a Response. If you `await` a DB write inside the TransformStream's `transform` hook, it blocks the stream and the user sees the prose freeze mid-stream.
**Why it happens:** TransformStream `transform` is synchronous by design; async writes block the chunk pipeline.
**How to avoid:** Fire-and-forget the DB write in the `flush` hook; pass through the chunk immediately.
**Warning signs:** Streaming prose pauses or times out near the end of a chapter.

### Pitfall 4: DOCX Table of Contents Requires Word's Update Field
**What goes wrong:** The `docx` library can add a TOC element, but Word only renders the TOC content after the user clicks "Update Field." The TOC entries won't populate until the user opens Word and updates the document.
**Why it happens:** DOCX TOC is a field that requires Word to compute page numbers at open time.
**How to avoid:** Document this limitation in the UI ("open in Word and click Update Table of Contents"). Alternatively, generate a manual TOC as a list of chapter titles without page numbers — this renders immediately.
**Warning signs:** Exported file shows "Error! No table of contents entries found."

### Pitfall 5: epub-gen-memory + Chapter Content as HTML
**What goes wrong:** If chapter prose contains special characters (`<`, `>`, `&`) and is inserted as raw text (not HTML-escaped) into the `content` field, the ePub validator will reject the file.
**Why it happens:** `epub-gen-memory` uses the `content` string as raw HTML — it expects valid HTML fragments.
**How to avoid:** HTML-encode the chapter text before passing to `epub-gen-memory`, or wrap in `<p>` tags with escaped content.
**Warning signs:** ePub file opens with blank chapters or garbled text.

### Pitfall 6: BYOK Users Seeing Billing
**What goes wrong:** Showing billing UI, token budget warnings, or upgrade prompts to users with an `openrouter_api_key` set would confuse them — their AI usage is billed to their own OpenRouter account.
**Why it happens:** Easy to miss the BYOK check when adding new UI.
**How to avoid:** Create a single `isByok` boolean derived server-side; pass as prop to all billing-aware components. Never render `<BillingSection>` or `<UpgradeModal>` when `isByok` is true.
**Warning signs:** User with API key sees a token budget warning or an upgrade prompt.

---

## Code Examples

Verified patterns from official sources:

### File Download Response (Next.js App Router)
```typescript
// Source: Next.js official docs on Route Handlers (HIGH confidence)
return new Response(buffer, {
  status: 200,
  headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': String(buffer.byteLength),
  },
})
```

### Stripe Singleton (prevent multiple instances)
```typescript
// Source: Stripe Next.js guide pattern (HIGH confidence)
// src/lib/stripe/client.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia', // pin to a specific version
})
```

### OpenRouter Usage Object (streaming final chunk)
```typescript
// Source: OpenRouter official usage-accounting docs (HIGH confidence)
// The final SSE chunk structure when usage data is present:
// { "choices": [], "usage": { "prompt_tokens": 1234, "completion_tokens": 4567, "total_tokens": 5801, "cost": 0.00123 } }
if (parsed.usage?.total_tokens) {
  const { prompt_tokens, completion_tokens, total_tokens } = parsed.usage
}
```

### RTF Hand-Generated Template
```typescript
// Source: RTF 1.5 spec + verified working pattern (MEDIUM confidence)
// RTF is stable and has not changed for decades; this pattern is reliable
function buildRtf(title: string, penName: string, chapters: ChapterContent[]): Buffer {
  const header = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Times New Roman;}}{\\info{\\title ${escapeRtf(title)}}}`
  const titlePage = `\\f0\\fs48\\qc ${escapeRtf(title)}\\par\\fs24 ${escapeRtf(penName)}\\page`

  const body = chapters.map(ch =>
    `\\fs28\\b ${escapeRtf(ch.title)}\\b0\\par\\fs24\\ql ${escapeRtf(ch.text)}\\page`
  ).join('\n')

  const rtf = `${header}${titlePage}${body}}`
  return Buffer.from(rtf, 'utf-8')
}
// escapeRtf: replace { } \ with \{ \} \\ and non-ASCII with \uXXX?
```

---

## Database Schema (Migration 00005)

This migration must be applied manually in Supabase SQL Editor.

```sql
-- Token tracking: one row per generation request
create table if not exists token_usage (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  project_id     uuid references projects(id) on delete cascade not null,
  chapter_number integer not null,
  prompt_tokens  integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens   integer not null default 0,
  created_at     timestamptz default now()
);

-- Extend user_settings for billing
alter table user_settings
  add column if not exists stripe_customer_id    text,
  add column if not exists stripe_subscription_id text,
  add column if not exists token_budget_total     integer not null default 0,
  add column if not exists token_budget_remaining integer not null default 0,
  add column if not exists credit_pack_tokens     integer not null default 0,
  add column if not exists billing_period_end     timestamptz,
  -- constraint: extend existing subscription_tier check to include tier names
  ;

-- Update subscription_tier constraint to allow tier names
alter table user_settings
  drop constraint if exists user_settings_subscription_tier_check;
alter table user_settings
  add constraint user_settings_subscription_tier_check
    check (subscription_tier in ('none', 'hosted', 'starter', 'writer', 'pro'));

-- Idempotency for Stripe webhooks
create table if not exists stripe_webhook_events (
  event_id   text primary key,            -- stripe event ID (evt_xxx)
  processed_at timestamptz default now()
);

-- RLS
alter table token_usage enable row level security;
alter table stripe_webhook_events enable row level security;

create policy "users read own token_usage"
  on token_usage for select
  using ((select auth.uid()) = user_id);

-- token_usage inserts via service role only (route handlers use service key)
-- stripe_webhook_events: service role only
```

---

## Recommended Subscription Tiers (Claude's Discretion)

Based on typical AI writing SaaS pricing and token volumes needed for a novel:

| Tier | Price | Monthly Token Budget | Credit Pack Options |
|------|-------|---------------------|---------------------|
| Starter | $9/mo | 500,000 tokens | +250K for $4 / +1M for $12 |
| Writer | $19/mo | 2,000,000 tokens | +500K for $6 / +2M for $18 |
| Pro | $39/mo | 5,000,000 tokens | +1M for $8 / +5M for $30 |

**Rationale:** A typical chapter generation (1,500–2,500 words) consumes ~8,000–15,000 tokens. A 40-chapter novel costs ~400,000–600,000 tokens. Starter tier covers one complete novel per month; Writer tier covers 3–4; Pro is for power users.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe `stripe.redirectToCheckout()` (deprecated) | `stripe.checkout.sessions.create()` with `success_url` / embedded checkout | ~2023 | Old method removed; must use sessions API |
| `usage: { include: true }` in OpenRouter requests | Auto-included in all responses (no parameter needed) | 2024-2025 | Remove deprecated parameter if present |
| `Packer.toBase64String()` for download | `Packer.toBuffer()` + Response | docx v7+ | toBase64String still works but toBuffer is cleaner for server-side |
| Stripe `apiVersion: '2020-08-27'` | Pin to current: `'2024-12-18.acacia'` | Latest | Old versions may lack subscription fields; always pin |

---

## Open Questions

1. **Stripe Embedded vs. Hosted Checkout**
   - What we know: Both work with Next.js 15; embedded keeps user on-site; hosted is simpler (redirect-based)
   - What's unclear: User preference was not specified; CONTEXT.md says "Stripe Checkout" without specifying variant
   - Recommendation: Use hosted Checkout (redirect) — simpler implementation, Stripe's conversion-optimized design, no `@stripe/react-stripe-js` needed client-side. Reduces bundle size.

2. **Token Budget Reset Timing**
   - What we know: Stripe sends `invoice.paid` webhook when a subscription renews
   - What's unclear: Whether to reset `token_budget_remaining` on `invoice.paid` or `customer.subscription.updated`
   - Recommendation: Use `invoice.paid` — it fires specifically for successful payment, not on trial starts or other subscription state changes.

3. **Credit Pack Stripe Product Type**
   - What we know: Credit packs are one-time purchases on top of a subscription
   - What's unclear: Whether to use Stripe one-time price objects or subscription add-ons
   - Recommendation: Use `mode: 'payment'` (one-time checkout) for credit packs, separate from the subscription checkout. On success, a `checkout.session.completed` webhook increments `credit_pack_tokens`.

4. **Project-Level Token Display**
   - What we know: CONTEXT.md specifies per-chapter granularity in the `token_usage` table; defers per-project cost breakdown table to v2
   - What's unclear: Whether the /usage page shows per-project totals or just user-level totals
   - Recommendation: Show user-level total + budget bar on /usage; aggregate project totals as a secondary list (query `token_usage` grouped by `project_id`). This exceeds the deferred "per-project cost breakdown" only in that it shows token counts, not dollars — which is within scope.

---

## Sources

### Primary (HIGH confidence)
- `docx` v9.6.0 official GitHub — https://github.com/dolanmiu/docx — document structure, Packer API
- `epub-gen-memory` v1.1.2 official GitHub — https://github.com/cpiber/epub-gen-memory — Options/Chapter type, Buffer return
- OpenRouter usage-accounting docs — https://openrouter.ai/docs/guides/guides/usage-accounting — `chunk.usage` fields
- OpenRouter streaming docs — https://openrouter.ai/docs/api/reference/streaming — final chunk behavior
- Next.js file download pattern — https://www.codeconcisely.com/posts/nextjs-app-router-api-download-file/ — Response + Content-Disposition

### Secondary (MEDIUM confidence)
- Stripe + Next.js 15 guide (2025) — https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/ — checkout session + webhook patterns
- Stripe + Supabase integration — https://dev.to/flnzba/33-stripe-integration-guide-for-nextjs-15-with-supabase-13b5 — tier update after webhook
- Makerkit credit billing — https://makerkit.dev/docs/next-supabase-turbo/billing/credit-based-billing — credit schema + consume pattern
- Stripe Ultimate Guide 2026 — https://dev.to/sameer_saleem/the-ultimate-guide-to-stripe-nextjs-2026-edition-2f33 — Server Action checkout

### Tertiary (LOW confidence)
- RTF format specification — https://www.biblioscape.com/rtf15_spec.htm — control words for page break, bold, paragraph (format is stable but implementation untested in this project)

---

## Metadata

**Confidence breakdown:**
- Standard stack (docx, epub-gen-memory, stripe): HIGH — all verified via official GitHub/npm at current versions
- Export architecture: HIGH — Next.js file download pattern is well-documented
- Token interception via TransformStream: MEDIUM — OpenRouter final-chunk usage is verified; TransformStream pattern is standard Web API but untested in this codebase
- Stripe webhook + Supabase update: MEDIUM — pattern verified from multiple credible 2025/2026 sources
- RTF hand-generation: MEDIUM — format is stable, pattern is simple, but no authoritative "use this template" source
- Subscription tier design: LOW — pricing numbers are educated estimates, not industry-validated

**Research date:** 2026-03-03
**Valid until:** 2026-06-01 (stable libraries; Stripe API version should be rechecked at implementation)
