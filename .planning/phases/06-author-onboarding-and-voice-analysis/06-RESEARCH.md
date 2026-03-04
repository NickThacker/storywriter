# Phase 6: Author Onboarding & Voice Analysis - Research

**Researched:** 2026-03-04
**Domain:** AI writing style analysis, file upload/parsing, PDF generation, wizard UI, persona injection
**Confidence:** HIGH (architecture/patterns), MEDIUM (PDF library choice), HIGH (file parsing)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Onboarding flow:**
- 3-step wizard: Step 1 (Writing Samples) → Step 2 (Style Preferences) → Step 3 (Analysis Results)
- Reuses the existing intake wizard pattern (`WizardNav`, `progress-bar`, step components)
- On first login: soft nudge — a dismissible modal or banner prompts the user to complete voice setup. They can skip and go straight to the dashboard.
- After initial setup: revisitable via a new "Voice Profile" tab in Settings (alongside API Key and Model tabs)

**Writing sample input (Step 1):**
- Both options available: paste text directly into a textarea OR upload a file (PDF, DOCX, TXT)
- Multiple samples can be provided to give the AI more signal

**Style preferences (Step 2):**
- Claude's discretion on exact UI (card pickers, sliders, or free text fields)
- Should capture: tone preferences, pacing, dialogue ratio, dark/light themes, POV preference, diction level

**Voice analysis (Step 3 / Results):**
- Blocking — user stays on screen while analysis runs (similar to outline streaming today)
- Streaming or progressive reveal preferred over a hard loading spinner
- After analysis completes: user sees results and can download the PDF report

**Author persona data stored** — all four fields per user:
1. Style descriptors (sentence length, rhythm, diction level, POV preference)
2. Thematic preferences (tone, pacing, dialogue ratio, dark/light themes)
3. Voice description paragraph (AI-generated prose summary of the author's voice)
4. Raw guidance text (free-form AI instruction text — editable by user in settings)
One persona per user — no multi-persona management in this phase.

**Persona injection:**
- Silent system prompt injection — voice description is automatically prepended to generation prompts for outline and chapter generation
- User does not see or toggle the injection; it just works once their profile is set up

**PDF style report:**
- Hybrid format: narrative editorial summary at the top, followed by data breakdowns for each style dimension (e.g., sentence length distribution, vocabulary richness, dialogue %, POV consistency)
- Downloadable from the Results step (Step 3) and from the Voice Profile settings tab

### Claude's Discretion

- Exact UI for Style Preferences step (card pickers, sliders, or free text fields)
- Specific style dimensions to capture and display in the PDF report

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 6 adds an author voice capture pipeline independent of the novel writing pipeline. It consists of four technical sub-systems: (1) a 3-step onboarding wizard for sample input and preference capture, (2) a server-side file parsing pipeline that extracts plain text from PDF/DOCX/TXT uploads, (3) an SSE-streaming AI voice analysis call that produces structured persona data, and (4) a server-side PDF report generator.

The wizard reuses existing `WizardNav`, `progress-bar`, and `intake-store` patterns verbatim. The wizard state is isolated in a new Zustand vanilla store following `intake-store.ts` exactly. File uploads flow through a Next.js API route handler using `request.formData()` — no new npm primitives needed for the upload transport itself. Text extraction from DOCX uses `mammoth` (extractRawText buffer API); text extraction from PDF uses `pdf-parse`. Both are pure Node.js and work cleanly in App Router route handlers. The AI analysis call follows the established SSE streaming pattern (OpenRouter → SSE passthrough → client consumes chunks). PDF report generation uses `pdfkit` (v0.17.2), which is a pure Node.js streaming API that generates a buffer with zero browser dependencies and no Next.js configuration issues — the same pattern already used for the DOCX export.

The first-login nudge is best implemented as a flag column in `user_settings` (e.g., `voice_onboarding_dismissed`) checked in the dashboard layout, not in Supabase `user_metadata` (which is user-writable and not authoritative). The `author_personas` table (new, one row per user) stores all four persona fields and acts as the source of truth for injection.

**Primary recommendation:** Build the file parsing and PDF generation in Next.js API route handlers (not server actions) to avoid the 1MB server action body size limit for file uploads. Use `pdfkit` for PDF generation — it avoids the `@react-pdf/renderer` App Router compatibility issues documented in the GitHub issue tracker as recently as February 2025.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mammoth` | ^1.8.0 | DOCX → plain text extraction | Buffer API, no filesystem access needed, widely used |
| `pdf-parse` | ^1.1.1 | PDF → plain text extraction | Pure TypeScript, works with Node.js Buffer directly |
| `pdfkit` | ^0.17.2 | Server-side PDF generation | Pure Node.js stream API, no browser APIs, zero Next.js config issues; already proven pattern in project (same event-listener → buffer collection pattern as DOCX export) |
| `zustand` | already installed | Voice wizard state store | Same vanilla store pattern as `intake-store.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-tabs` | already installed | "Voice Profile" settings tab | Already in project — no new install |
| `@radix-ui/react-dialog` | already installed | First-login onboarding modal | Already in project — no new install |
| `lucide-react` | already installed | Icons in wizard steps | Already in project |
| `sonner` | already installed | Toast feedback on save/error | Already in project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pdfkit` | `@react-pdf/renderer` | react-pdf/renderer has documented renderToBuffer failures in Next.js 15/16 App Router route handlers (GitHub issue #3074, February 2025); PDFKit has no such issues |
| `pdfkit` | `jsPDF` | jsPDF is client-side-oriented; PDFKit is the idiomatic server-side Node.js choice |
| `pdf-parse` | `pdf2json` | pdf-parse is simpler API for plain text extraction; pdf2json adds JSON structure we don't need |
| Separate API route for file upload | Server action | Server actions have a 1MB default body size limit — insufficient for DOCX/PDF uploads that can be several MB |

**Installation:**
```bash
npm install mammoth pdf-parse pdfkit
npm install --save-dev @types/pdfkit @types/mammoth
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── onboarding/           # New onboarding wizard route group
│   │   │   ├── layout.tsx        # VoiceWizardStoreProvider wrapper
│   │   │   └── page.tsx          # Step router — renders current step
│   │   └── settings/
│   │       └── page.tsx          # Add Voice Profile tab here
│   └── api/
│       ├── voice-analysis/       # New SSE streaming analysis endpoint
│       │   └── route.ts
│       ├── voice-upload/         # New multipart file upload → text extraction endpoint
│       │   └── route.ts
│       └── voice-report/         # New PDF report download endpoint
│           └── route.ts
├── components/
│   ├── onboarding/               # Voice wizard step components
│   │   ├── onboarding-store-provider.tsx
│   │   ├── writing-samples-step.tsx    # Step 1
│   │   ├── style-preferences-step.tsx  # Step 2
│   │   └── analysis-results-step.tsx   # Step 3
│   ├── settings/
│   │   └── voice-profile-tab.tsx       # New settings tab
│   └── dashboard/
│       └── voice-onboarding-nudge.tsx  # First-login modal/banner
├── lib/
│   ├── stores/
│   │   └── voice-wizard-store.ts       # Zustand vanilla store (mirrors intake-store.ts)
│   └── voice/
│       ├── prompt.ts                   # Build voice analysis system + user messages
│       ├── pdf-report.ts               # PDFKit-based report generator
│       └── text-extraction.ts          # mammoth + pdf-parse wrappers
├── actions/
│   └── voice.ts                        # savePersona, getPersona server actions
└── supabase/migrations/
    └── 00006_author_personas.sql        # New author_personas table
```

### Pattern 1: Zustand Voice Wizard Store (mirrors intake-store.ts)

**What:** A vanilla Zustand store with a React context provider wrapper. Holds writing samples, style preferences, and analysis results in memory during the wizard session.

**When to use:** Same as intake store — whenever wizard state must survive step navigation without a server round-trip.

**Example:**
```typescript
// src/lib/stores/voice-wizard-store.ts
import { createStore } from 'zustand/vanilla'

export const TOTAL_VOICE_STEPS = 3

export interface VoiceWizardState {
  currentStep: number
  // Step 1: Writing samples
  pastedSamples: string[]          // User-pasted text blocks
  uploadedFileTexts: string[]      // Extracted text from uploaded files
  // Step 2: Style preferences
  tonePreference: string | null
  pacingPreference: string | null
  dialogueRatio: string | null
  darkLightTheme: string | null
  povPreference: string | null
  dictionLevel: string | null
  // Step 3: Analysis results (populated after AI call)
  analysisComplete: boolean
  voiceDescription: string | null
  styleDescriptors: Record<string, string> | null
  thematicPreferences: Record<string, string> | null
  rawGuidanceText: string | null
  // Actions
  nextStep: () => void
  prevStep: () => void
  addPastedSample: (text: string) => void
  removePastedSample: (index: number) => void
  addUploadedFileText: (text: string) => void
  setStylePreference: (key: string, value: string) => void
  setAnalysisResult: (result: AnalysisResult) => void
}
```

### Pattern 2: File Upload via API Route (not server action)

**What:** A dedicated `/api/voice-upload` route handler that receives a `multipart/form-data` POST, extracts text from the uploaded file, and returns the plain text. The client calls this from the Step 1 component.

**Why API route, not server action:** Next.js server actions default to a 1MB body size limit. DOCX and PDF uploads can exceed this. API route handlers have no such limit.

**Example:**
```typescript
// src/app/api/voice-upload/route.ts
export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return new Response(JSON.stringify({ error: 'No file' }), { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop()?.toLowerCase()

  let text: string
  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    text = result.value
  } else if (ext === 'pdf') {
    const result = await pdfParse(buffer)
    text = result.text
  } else if (ext === 'txt') {
    text = buffer.toString('utf-8')
  } else {
    return new Response(JSON.stringify({ error: 'Unsupported file type' }), { status: 400 })
  }

  return new Response(JSON.stringify({ text }), { status: 200 })
}
```

### Pattern 3: SSE Streaming Voice Analysis (mirrors outline/route.ts)

**What:** A `/api/voice-analysis` route handler that receives the combined writing samples + style preferences, calls OpenRouter with SSE streaming, and pipes the response back to the client. The AI produces a structured JSON persona.

**When to use:** Follows the exact pattern already established in `/api/generate/outline/route.ts`.

**Key difference from outline:** The voice analysis response should be structured JSON (use `response_format: { type: 'json_schema', ... }`) to produce consistent persona fields. The client-side streaming view parses partial JSON exactly as the outline streaming view does with `parsePartialJSON`.

**Example:**
```typescript
// src/app/api/voice-analysis/route.ts — follows outline route pattern
export const dynamic = 'force-dynamic'

// ... auth + API key retrieval (identical to outline route) ...

const { systemMessage, userMessage } = buildVoiceAnalysisPrompt(samples, preferences)

const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: modelId,
    stream: true,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'author_persona', strict: true, schema: VOICE_ANALYSIS_SCHEMA },
    },
  }),
})

return new Response(orResponse.body, {
  status: 200,
  headers: {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Content-Encoding': 'none',
  },
})
```

### Pattern 4: PDFKit Buffer Generation (mirrors docx.ts pattern)

**What:** A pure Node.js function that takes persona data and produces a PDF buffer using PDFKit's event listener pattern. The buffer is returned by a `/api/voice-report` route handler.

**When to use:** Whenever the user requests the PDF style report download (from Step 3 results or Voice Profile settings tab).

**Example:**
```typescript
// src/lib/voice/pdf-report.ts
import PDFDocument from 'pdfkit'

export function buildVoiceReportPdf(persona: AuthorPersona): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Narrative editorial summary section
    doc.fontSize(24).text('Author Voice Report', { align: 'center' })
    doc.moveDown()
    doc.fontSize(12).text(persona.voiceDescription ?? '', { align: 'left' })
    doc.addPage()

    // Data breakdown sections
    doc.fontSize(16).text('Style Descriptors')
    // ... structured data sections per style dimension ...

    doc.end()
  })
}
```

### Pattern 5: Persona Injection into Generation Prompts

**What:** Before building the system message for outline or chapter generation, read the user's `author_personas` row and prepend the `voice_description` and `raw_guidance_text` to the system prompt.

**Where to add it:**
- `src/lib/outline/prompt.ts` — `buildOutlinePrompt` and `buildRegeneratePrompt` system messages
- `src/lib/memory/chapter-prompt.ts` — `buildChapterPrompt` system message

**Example (chapter prompt modification):**
```typescript
// In buildChapterPrompt — add persona to system message
const personaSection = persona?.voiceDescription
  ? `\n\nAuthor Voice:\n${persona.voiceDescription}`
  : ''
const guidanceSection = persona?.rawGuidanceText
  ? `\n\nAuthor Guidance:\n${persona.rawGuidanceText}`
  : ''

const systemMessage = `You are an expert novelist...${personaSection}${guidanceSection}`
```

**Fetch pattern:** In each generation route handler, fetch the user's persona row from `author_personas` in parallel with other data lookups. If no persona exists, skip injection silently — don't block generation.

### Pattern 6: First-Login Nudge via DB Flag

**What:** A boolean column `voice_onboarding_dismissed` in `user_settings` (default `false`). The dashboard layout checks this flag and renders a dismissible `<VoiceOnboardingNudge>` component when the flag is `false` AND the user has no persona yet.

**Why DB flag, not Supabase user_metadata:** `user_metadata` is writable by the client — any user can flip it via `supabase.auth.updateUser()`. A column in `user_settings` (protected by RLS) is authoritative.

**Why check both flag AND persona:** A user who completed the wizard should not see the nudge even if they somehow skipped dismissing it.

**Implementation:**
```typescript
// In dashboard layout — add to existing user_settings query
const { data: settings } = await supabase
  .from('user_settings')
  .select('openrouter_api_key, voice_onboarding_dismissed')
  .eq('user_id', user.id)
  .single()

const { data: persona } = await supabase
  .from('author_personas')
  .select('id')
  .eq('user_id', user.id)
  .maybeSingle()

const showVoiceNudge = !settings?.voice_onboarding_dismissed && !persona
```

### Pattern 7: Voice Profile Settings Tab

**What:** Add a third tab to `/settings` using `@radix-ui/react-tabs` (already installed). The tab shows the stored persona fields, allows editing `raw_guidance_text`, provides a "Re-run Analysis" button, and a "Download PDF Report" button.

**The settings page currently** renders sections directly with `<section>` tags without Tabs. To add the Voice Profile tab, refactor to a Tabs layout.

### Anti-Patterns to Avoid

- **Using a server action for file upload:** 1MB default limit will break on large DOCX/PDF files. Use an API route handler instead.
- **Using `@react-pdf/renderer` renderToBuffer in App Router:** Documented failures as of February 2025 (GitHub issue #3074). Use `pdfkit` instead.
- **Storing onboarding state in Supabase user_metadata:** User-writable, not authoritative. Use `user_settings` column instead.
- **Blocking generation routes when no persona exists:** Persona injection must be fail-open — if no persona, generation proceeds normally.
- **Single combined API route for upload + analysis:** Keep them separate. Upload extracts text (sync, fast). Analysis streams (slow, SSE). Mixing them complicates the UX.
- **Injecting raw writing sample text into generation prompts:** Only the AI-distilled `voice_description` and `raw_guidance_text` go into prompts — never the full writing samples (token cost, not needed).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOCX text extraction | Custom XML parser for .docx | `mammoth.extractRawText({buffer})` | DOCX is a ZIP of XML with complex relationship files; mammoth handles all of it |
| PDF text extraction | Custom PDF parser | `pdf-parse` | PDF is a complex binary format; pdf-parse wraps pdf.js for reliable extraction |
| PDF generation | Custom PDF byte writing | `pdfkit` | PDF binary format spec is extremely complex; PDFKit handles fonts, page layout, streams |
| Partial JSON streaming UI | Custom tokenizer | Reuse `parsePartialJSON` from `streaming-view.tsx` | Already battle-tested in outline streaming |

**Key insight:** Text extraction and PDF generation are solved problems. The complexity is in the AI prompting and the UX polish — not in the file format handling.

---

## Common Pitfalls

### Pitfall 1: File Upload Body Size Limit in Server Actions

**What goes wrong:** User uploads a 5MB PDF via a server action and gets a silent 500 or "body too large" error.
**Why it happens:** Next.js server actions default to 1MB body limit. The limit is configurable via `experimental.serverActionsBodySizeLimit` in `next.config.ts`, but changing global config for a single upload flow is fragile.
**How to avoid:** Use an API route handler (`/api/voice-upload`) for file uploads. Route handlers have no such limit.
**Warning signs:** Uploads of large PDFs/DOCX failing silently or with a network error.

### Pitfall 2: @react-pdf/renderer renderToBuffer Failures in App Router

**What goes wrong:** The PDF generation route crashes at build time or returns a 500 with "PDFDocument is not a constructor" or "ba.Component is not a constructor".
**Why it happens:** @react-pdf/renderer has ongoing compatibility issues with Next.js App Router route handlers, documented as recently as February 2025 (GitHub issue #3074: "NodeJS renderToBuffer not working with Next 15").
**How to avoid:** Use `pdfkit` for server-side PDF generation. It's a pure Node.js EventEmitter/stream API with zero browser dependencies and zero Next.js config requirements.
**Warning signs:** Any import of `@react-pdf/renderer` in a route handler.

### Pitfall 3: Persona Injection Blocking Generation When No Persona Exists

**What goes wrong:** New users who haven't completed onboarding cannot generate outlines or chapters because the generation route throws trying to fetch a non-existent persona.
**Why it happens:** Querying `author_personas` with `.single()` throws if no row exists.
**How to avoid:** Use `.maybeSingle()` (returns `null` instead of throwing). Check `if (persona)` before injecting.
**Warning signs:** Tests with fresh accounts failing chapter or outline generation.

### Pitfall 4: Large Writing Samples Exceeding OpenRouter Token Limit

**What goes wrong:** User pastes 50,000 words of sample text; the analysis call fails with a token limit error.
**Why it happens:** Some OpenRouter models have 32k or 128k context windows, but very large samples waste tokens unnecessarily.
**How to avoid:** Truncate combined writing samples to a maximum before sending to the analysis prompt (e.g., ~8,000 tokens / ~30,000 characters of sample text). Include this as a note in the prompt builder.
**Warning signs:** OpenRouter returning 400 "context too long" errors.

### Pitfall 5: Settings Page Tab Refactor Breaking Existing Layout

**What goes wrong:** The settings page currently uses plain `<section>` tags. Adding a Tabs wrapper around existing sections without careful audit breaks the API Key and Model sections.
**Why it happens:** Each existing section has its own server-fetched data passed as props. Tabs in a Server Component require careful scoping.
**How to avoid:** Keep the settings page as a Server Component but extract each tab's content into a separate Client Component or Server Component as needed. The Radix Tabs primitive works fine in Server Component layouts — only the tab state (which tab is active) needs to be client-side.

### Pitfall 6: Wizard URL vs Modal — Resume State Confusion

**What goes wrong:** User starts onboarding, navigates away, comes back, and starts from Step 1 again instead of where they left off.
**Why it happens:** If onboarding state is only in Zustand (in-memory), it resets on navigation.
**How to avoid:** Persist wizard progress to `author_personas` as a draft (or at minimum, track `voice_onboarding_step` in `user_settings`). On load, hydrate the store from the saved draft.
**Warning signs:** Users reporting having to re-upload samples after navigating away.

---

## Code Examples

Verified patterns from official sources:

### DOCX Text Extraction with Buffer

```typescript
// Source: mammoth.js official README — github.com/mwilliamson/mammoth.js
import mammoth from 'mammoth'

const buffer = Buffer.from(await file.arrayBuffer())
const result = await mammoth.extractRawText({ buffer })
const text: string = result.value  // plain text, paragraphs separated by \n\n
```

### PDF Text Extraction with Buffer

```typescript
// Source: pdf-parse npm docs
import pdfParse from 'pdf-parse'

const buffer = Buffer.from(await file.arrayBuffer())
const result = await pdfParse(buffer)
const text: string = result.text  // extracted plain text
```

### PDFKit Buffer Collection (server-side PDF generation)

```typescript
// Source: PDFKit docs — pdfkit.org/docs/getting_started.html + existing pattern in docx.ts
import PDFDocument from 'pdfkit'

function buildPdf(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'letter' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(24).font('Helvetica-Bold').text('Author Voice Report', { align: 'center' })
    doc.moveDown(2)
    doc.fontSize(11).font('Helvetica').text(data.voiceDescription)
    // ... additional sections ...
    doc.end()
  })
}
```

### File Upload in Route Handler (no size limit)

```typescript
// Source: Next.js App Router — request.formData() pattern
// Verified: docs.nextjs.org + multiple 2025 examples
export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return new Response(JSON.stringify({ error: 'No file' }), { status: 400 })
  const buffer = Buffer.from(await file.arrayBuffer())
  // ... extract text from buffer ...
}
```

### First-Login Nudge Check in Dashboard Layout

```typescript
// Pattern: check both DB flag and persona existence
// Reuses existing supabase query pattern from layout.tsx
const [settingsResult, personaResult] = await Promise.all([
  (supabase as any)
    .from('user_settings')
    .select('openrouter_api_key, voice_onboarding_dismissed')
    .eq('user_id', user.id)
    .single(),
  (supabase as any)
    .from('author_personas')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle(),
])
const showVoiceNudge =
  !settingsResult.data?.voice_onboarding_dismissed && !personaResult.data
```

### Persona Injection in Generation Routes

```typescript
// Fetch persona in parallel with other data, inject if present
const [settingsResult, personaResult] = await Promise.all([
  supabase.from('user_settings').select('openrouter_api_key').eq('user_id', user.id).single(),
  (supabase as any)
    .from('author_personas')
    .select('voice_description, raw_guidance_text')
    .eq('user_id', user.id)
    .maybeSingle(),
])

const persona = personaResult.data ?? null
const { systemMessage, userMessage } = buildOutlinePrompt(intakeData, persona)
```

---

## Database Schema

New table: `author_personas` — one row per user.

```sql
-- supabase/migrations/00006_author_personas.sql
create table if not exists author_personas (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade not null unique,
  -- Four persona fields (all nullable — partially populated during analysis)
  style_descriptors     jsonb,    -- { sentence_length, rhythm, diction_level, pov_preference }
  thematic_preferences  jsonb,    -- { tone, pacing, dialogue_ratio, dark_light_theme }
  voice_description     text,     -- AI-generated prose paragraph
  raw_guidance_text     text,     -- Editable free-form AI instruction text
  -- Wizard draft state (enables resume-where-you-left-off)
  wizard_step           integer not null default 1,  -- 1, 2, or 3
  analysis_complete     boolean not null default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

alter table author_personas enable row level security;

create policy "Users can view own persona"
  on author_personas for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own persona"
  on author_personas for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own persona"
  on author_personas for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Extend user_settings with onboarding dismissed flag
alter table user_settings
  add column if not exists voice_onboarding_dismissed boolean not null default false;

-- updated_at trigger
create trigger author_personas_updated_at
  before update on author_personas
  for each row execute function update_updated_at();

create index if not exists author_personas_user_id_idx on author_personas(user_id);
```

---

## Voice Analysis JSON Schema

The AI produces a structured JSON object. Define as a Zod schema and derive the JSON schema from it (matching the outline schema pattern).

```typescript
// src/lib/voice/schema.ts
export const VOICE_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    style_descriptors: {
      type: 'object',
      properties: {
        sentence_length: { type: 'string' },      // e.g., "Mix of short and long"
        rhythm: { type: 'string' },                // e.g., "Staccato, punchy"
        diction_level: { type: 'string' },         // e.g., "Literary, elevated"
        pov_preference: { type: 'string' },        // e.g., "First person, intimate"
      },
      required: ['sentence_length', 'rhythm', 'diction_level', 'pov_preference'],
      additionalProperties: false,
    },
    thematic_preferences: {
      type: 'object',
      properties: {
        tone: { type: 'string' },
        pacing: { type: 'string' },
        dialogue_ratio: { type: 'string' },
        dark_light_theme: { type: 'string' },
      },
      required: ['tone', 'pacing', 'dialogue_ratio', 'dark_light_theme'],
      additionalProperties: false,
    },
    voice_description: { type: 'string' },    // 2-4 sentence prose summary
    raw_guidance_text: { type: 'string' },    // AI instruction text for use in prompts
    data_observations: {                       // For the PDF report breakdowns
      type: 'object',
      properties: {
        sentence_length_distribution: { type: 'string' },
        vocabulary_richness: { type: 'string' },
        dialogue_percentage: { type: 'string' },
        pov_consistency: { type: 'string' },
      },
      required: ['sentence_length_distribution', 'vocabulary_richness', 'dialogue_percentage', 'pov_consistency'],
      additionalProperties: false,
    },
  },
  required: ['style_descriptors', 'thematic_preferences', 'voice_description', 'raw_guidance_text', 'data_observations'],
  additionalProperties: false,
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `serverComponentsExternalPackages` in next.config | `serverExternalPackages` (top-level) | Next.js 14 → 15 | Renamed; both still work in v16 |
| Server actions for file uploads | API route handlers for uploads > 1MB | Next.js 13+ | Server action body limit makes API routes required for file uploads |
| `@react-pdf/renderer` renderToBuffer | `pdfkit` event-listener buffer pattern | Ongoing App Router issues through 2025 | react-pdf/renderer unreliable in Next.js 15/16 App Router |

**Deprecated/outdated:**
- `experimental.serverComponentsExternalPackages`: Use `serverExternalPackages` directly in `NextConfig`. Still backward-compatible but old docs reference the experimental key.

---

## Open Questions

1. **Model for voice analysis — dedicated task type or reuse "editing"?**
   - What we know: Generation routes look up `user_model_preferences` by `task_type`. Current types are `'outline' | 'prose' | 'editing'`.
   - What's unclear: Should voice analysis use the "editing" model (semantic fit) or a new `'voice_analysis'` task type?
   - Recommendation: Reuse `'editing'` task type for Phase 6. Adding a new task type requires a DB migration to update the check constraint, which adds complexity without user-visible benefit. The "editing" model is semantically the closest fit.

2. **Onboarding wizard route — standalone `/onboarding` or under `/settings/voice`?**
   - What we know: CONTEXT.md says it's a wizard with 3 steps, revisitable from Settings.
   - What's unclear: Should the initial onboarding flow be at `/onboarding` (standalone) or render within `/settings`?
   - Recommendation: Use `/onboarding` as a standalone route for the initial wizard flow. The Voice Profile tab in `/settings` is the revisit surface. This avoids a complex settings-page-has-a-wizard-embedded situation and keeps the onboarding URL shareable/bookmarkable.

3. **How much writing sample text to send to the AI?**
   - What we know: Multiple samples can be provided; large inputs risk token limit errors.
   - What's unclear: What is the right cap?
   - Recommendation: Concatenate all samples, then truncate to 25,000 characters (~6,000 tokens) before sending. This fits within all mainstream OpenRouter models and leaves room for the system message and JSON output.

---

## Sources

### Primary (HIGH confidence)
- Codebase — `src/app/api/generate/outline/route.ts` (SSE streaming pattern, verified in production)
- Codebase — `src/lib/memory/chapter-prompt.ts` (persona injection point, direct read)
- Codebase — `src/lib/export/docx.ts` (buffer collection pattern already established)
- Codebase — `src/lib/stores/intake-store.ts` (Zustand vanilla store pattern to replicate)
- Codebase — `src/app/(dashboard)/layout.tsx` (dashboard layout injection point)
- Codebase — `src/app/(dashboard)/settings/page.tsx` (settings tab integration point)
- mammoth.js README — github.com/mwilliamson/mammoth.js (extractRawText buffer API)
- PDFKit docs — pdfkit.org/docs/getting_started.html (buffer collection with event listeners)
- Next.js App Router docs — request.formData() for file uploads in route handlers

### Secondary (MEDIUM confidence)
- npm: `pdf-parse` v2.4.5 — latest version, pure TypeScript, works with Node.js Buffer
- npm: `pdfkit` v0.17.2 — latest version, 956 downstream projects
- npm: `mammoth` — confirmed `extractRawText({buffer})` API, widely used
- Next.js docs: `serverExternalPackages` top-level config for packages with native modules

### Tertiary (LOW confidence)
- WebSearch: mammoth version reported as "0.3.25" in one result but likely outdated page — verify with `npm info mammoth version` before install
- WebSearch: @react-pdf/renderer renderToBuffer failure in Next.js 15 App Router — GitHub issue #3074, February 2025 — LOW because the issue tracker moves fast and a fix may ship; use pdfkit to avoid the risk entirely

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — mammoth, pdf-parse, pdfkit are all established, well-documented Node.js libraries with large adoption; no experimental APIs used
- Architecture: HIGH — all patterns are direct extensions of code already running in production in this codebase
- PDF generation library choice: MEDIUM — the choice of pdfkit over @react-pdf/renderer is based on avoiding documented issues; pdfkit works but produces more code than react-pdf would if its App Router issues were resolved
- Pitfalls: HIGH — all pitfalls are directly derived from reading the existing codebase or verified GitHub issues
- AI prompting for voice analysis: MEDIUM — prompt structure is based on established writing analysis patterns; exact prompt wording will need tuning during implementation

**Research date:** 2026-03-04
**Valid until:** 2026-06-04 (stable libraries; react-pdf/renderer status may change — check before planning)
