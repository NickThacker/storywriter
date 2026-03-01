# Phase 2: Guided Intake and Outline - Research

**Researched:** 2026-03-01
**Domain:** Multi-step wizard UI, n8n outline generation, OpenRouter structured outputs, story bible schema, SSE streaming
**Confidence:** HIGH (core stack verified against official docs and existing Phase 1 codebase)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Intake flow design**
- Decision-driven cards: each step presents 3-5 visual cards to pick from (genre cards, tone cards, etc.) — feels like creative choices, not form-filling
- Two paths at the start: "Build step by step" (card wizard) OR "I already have an idea" (paste premise)
- Premise path is hybrid: user pastes text, AI pre-fills what it can infer (genre, tone, etc.), user confirms/adjusts remaining cards
- Five separate wizard steps: Genre, Themes, Characters, Setting, Tone — each on its own screen
- Back button + progress bar: user can freely navigate forward and back through all steps
- Review screen at the end before generation (INTK-03)

**Outline display and editing**
- Two-panel layout hybrid with visual timeline: left panel lists chapters, right panel shows detail for selected chapter, with a visual timeline/node view showing chapter flow and plot arcs
- Beat sheet integration: user selects a known beat sheet during intake (Save the Cat, Romancing the Beat, etc.) — AI uses it to structure the outline
- Beat sheet is switchable on the outline page: user can compare their outline against different beat sheet structures
- Beat sheet beats map to corresponding outline beats, giving a high-level structural overview
- Inline editing: click any text in the detail panel to edit directly (titles, beats, character notes)
- Target length and chapter count: presets offered during intake ("Short novel 50k", "Standard 80k", "Epic 120k"), adjustable on the outline page with regeneration if needed

**Outline regeneration**
- Three levels of regeneration, all available:
  1. Full regenerate: replaces entire outline from same intake data
  2. Regenerate with direction: text field for feedback ("Make act 2 more tense") — AI uses intake data + feedback
  3. Per-chapter regenerate: redo individual chapters without losing the rest

**Story bible layout**
- Tabbed sections: Characters, Locations, Timeline, World Facts — each tab shows a card grid
- Click a card to see/edit full detail
- Character profiles are tiered: card shows name, role, one-line summary; expanding reveals full profile (appearance, backstory, personality/voice, motivations, relationships, arc)
- Story bible has its own page AND is cross-linked from the outline — character/location names in outline beats are clickable links to their bible entries

**AI generation experience**
- Streaming: outline builds live on screen as AI generates — chapters and beats appear in real time
- Multi-step n8n workflow: generation broken into observable steps (e.g., generate structure → expand beats → populate characters) — each step is an n8n node

### Claude's Discretion
- Story bible timing: whether bible is editable before or after outline approval
- Outline version history: whether previous outline versions are kept on regeneration
- Optimal step grouping/order within the five intake steps
- Loading skeleton and transition designs
- Error state handling throughout the flow
- Beat sheet data structure and mapping algorithm

### Deferred Ideas (OUT OF SCOPE)
- **AI character headshots**: Use an image generation model to create character portraits from profile data, with regenerate button when profile changes — separate domain (image generation API, cost model, error handling)
- **Custom beat sheet import**: Authors create/import their own beat sheet templates — future enhancement after v1 beat sheet support proves out
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTK-01 | User is guided through a multi-step interview (genre, themes, characters, setting, tone) when starting a new novel | Zustand store with step state + React `use client` Client Components; shadcn Progress bar + card-grid step UI |
| INTK-02 | User can paste an existing premise/logline instead of using the interview | Hybrid path: textarea → n8n AI pre-fill endpoint → Zustand store hydrated with inferred values; user reviews cards |
| INTK-03 | User can review and adjust interview answers before outline generation begins | Review screen is a final wizard step that renders all stored Zustand state as editable cards; no AI called until explicit "Generate Outline" submit |
| INTK-04 | Interview uses decision-driven UI (structured options, not open-ended text boxes) | Card-grid selection pattern in React; Zustand stores selected option IDs; cards rendered from static data files |
| OUTL-01 | AI generates a full novel outline (chapters, plot beats, character arcs) from intake data | n8n webhook → OpenRouter with `response_format: json_schema` → structured JSON outline; streamed back via Next.js route handler SSE |
| OUTL-02 | User can review the generated outline before writing begins | Two-panel outline viewer (chapter list + detail panel) as a Next.js Client Component; outline stored in Supabase `projects.outline` JSONB column |
| OUTL-03 | User can edit the outline — adjust chapter structure, plot beats, and pacing | Inline edit pattern: `contentEditable` or controlled input overlay on click; mutations saved via `updateProject` Server Action |
| OUTL-04 | User sets target novel length and chapter count | Length preset picker during intake (stored in Zustand/DB); chapter count field with numeric input; values passed to n8n as generation parameters |
| OUTL-05 | Approved outline populates the story bible with characters, locations, and plot beats | n8n post-approval step or Server Action parses outline JSON, extracts entities, upserts into normalized `characters` / `locations` tables |
| CHAR-01 | User can create character profiles with structured fields (name, appearance, backstory, voice, role) | Character form with Zod-validated fields; upsert to `characters` table via Server Action |
| CHAR-02 | User can edit character profiles at any time during the writing process | Same form component in edit mode; Server Action updates row; revalidatePath for story bible page |
| CHAR-03 | Story bible tracks characters, locations, timeline, and established world facts | Normalized tables: `characters`, `locations`, `world_facts`; `project_id` FK on each; queried together for story bible page |
| CHAR-04 | Story bible context is automatically injected into every chapter generation prompt | Phase 3 consumes this; Phase 2 must define the schema and populate it correctly so Phase 3 can SELECT and inject |
</phase_requirements>

---

## Summary

Phase 2 is the most complex UI phase in the project. It introduces three distinct interaction surfaces — the intake wizard, the outline editor, and the story bible — each with its own state management, AI integration, and data persistence requirements. The technical stack is an extension of Phase 1 (Next.js App Router, Supabase, n8n, shadcn/ui); no new frameworks are needed.

The intake wizard requires client-side state that persists across five steps without hitting the server between each step. **Zustand with the Next.js App Router provider pattern** is the established solution: a `use client` provider wraps the wizard route group, holding all intake answers in memory with optional `persist` middleware for localStorage resume. This is a locked pattern in the ecosystem (verified in Zustand official docs and multiple Next.js 15 implementations). React Hook Form is NOT the right tool here — the card-grid selection model doesn't map to form fields; plain React state managed through Zustand is cleaner.

The outline generation is the critical AI integration. The ROADMAP establishes a mandatory hybrid streaming pattern: **n8n assembles context and calls OpenRouter; but for streaming the tokens back to the UI, Next.js calls OpenRouter directly** (to avoid n8n's 30-second webhook timeout constraint). For outline generation this creates an architectural choice: (1) n8n generates the complete outline non-streaming and returns JSON to a Next.js Route Handler which streams it as a synthetic progress event; OR (2) Next.js calls OpenRouter directly with `response_format: json_schema` and streams the structured JSON. Option 2 is simpler and avoids n8n timeout issues entirely for a single-pass generation. n8n's value in Phase 2 is the multi-step orchestration (premise → infer fields, intake → outline → bible population) where it chains nodes without streaming concerns.

The most consequential architectural decision in Phase 2 is the **story bible schema**. STATE.md explicitly flags: "Optimal story bible schema for context injection not yet defined — needs definition during Phase 2 planning to avoid the 'full context in every prompt' performance trap after chapter 10+." The decision between a flat JSONB column on `projects` vs. normalized relational tables (`characters`, `locations`, `world_facts`) should resolve to **normalized tables** in Phase 2: each entity type gets its own table with `project_id` FK, enabling selective injection (inject only characters relevant to the current chapter's scene) rather than full-context dump.

**Primary recommendation:** Intake wizard via Zustand client store + card-grid UI. Outline generation via direct Next.js → OpenRouter with `response_format: json_schema` + SSE streaming. Story bible as normalized tables (`characters`, `locations`, `world_facts`) seeded by a Server Action that parses the approved outline JSON.

---

## Standard Stack

### Core (all already installed in Phase 1)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | ^16.1.6 (installed) | App Router, Server Components, Server Actions, Route Handlers | Locked decision |
| @supabase/supabase-js | ^2.98.0 | DB queries for outline, characters, locations | Locked decision |
| tailwindcss | ^4.2.1 | Styling | Locked decision |
| shadcn/ui (Radix UI) | installed | Cards, Tabs, Progress, Dialog, Badge | Locked; already in project |
| lucide-react | ^0.575.0 | Icons for wizard steps, chapter list | Already installed |
| sonner | ^2.0.7 | Toast notifications for save/error states | Already installed (replaces deprecated shadcn toast) |
| react-hook-form | ^7.71.2 | Inline edit forms (character profile, world facts) | Already installed |
| zod | ^4.3.6 | Schema validation for Server Actions | Already installed |
| use-debounce | ^10.1.0 | Auto-save on inline edits | Already installed |

### New Dependencies Needed
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.x | Intake wizard step state management across client-side navigation | Official recommendation for cross-component state in Next.js App Router; avoids prop-drilling across 6+ wizard steps |

### Supporting (optional)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-scroll-area | latest | Scrollable chapter list in left panel | If shadcn ScrollArea component needed |
| framer-motion | ^11.x | Step transition animations in wizard | Only if Claude's Discretion calls for smooth transitions; adds ~50KB |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand | React Context + useReducer | Context causes full re-render on state change; Zustand uses selectors to prevent unnecessary renders; Zustand is lighter than Redux |
| Zustand | URL state (searchParams) | URL state works for shallow wizard state but becomes unwieldy with nested character arrays and beat sheet selections |
| Zustand | React Hook Form across steps | RHF is form-centric; card-grid selections don't map naturally to form fields; mixing RHF across unmounted steps loses state |
| Direct OpenRouter for outline | n8n OpenRouter node | n8n's 30s webhook timeout cannot accommodate a multi-chapter outline generation that may take 60-90s; direct call from Route Handler has no such constraint |
| Normalized tables for story bible | JSONB on projects | JSONB makes selective injection difficult (can't JOIN on a character's chapter appearances); normalized tables support Phase 3's requirement to inject only relevant context |

**Installation:**
```bash
npm install zustand
```

---

## Architecture Patterns

### Recommended Project Structure for Phase 2

```
src/
├── app/(dashboard)/
│   └── projects/
│       └── [id]/
│           ├── page.tsx                    # Project root — routes to intake or outline based on project.status
│           ├── intake/
│           │   ├── layout.tsx              # Intake layout — mounts IntakeStoreProvider
│           │   └── [step]/
│           │       └── page.tsx            # Dynamic step route: genre, themes, characters, setting, tone, review
│           ├── outline/
│           │   └── page.tsx                # Outline editor — two-panel + timeline
│           └── story-bible/
│               └── page.tsx                # Story bible — tabbed Characters/Locations/Timeline/World Facts
├── components/
│   ├── intake/
│   │   ├── card-picker.tsx                 # Reusable card-grid selection component
│   │   ├── progress-bar.tsx                # Wizard step progress indicator
│   │   ├── premise-input.tsx               # Premise paste path
│   │   ├── review-screen.tsx               # Final review before generation
│   │   └── steps/
│   │       ├── genre-step.tsx
│   │       ├── themes-step.tsx
│   │       ├── characters-step.tsx
│   │       ├── setting-step.tsx
│   │       ├── tone-step.tsx
│   │       └── length-step.tsx             # Target length + chapter count
│   ├── outline/
│   │   ├── outline-panel.tsx               # Two-panel layout shell
│   │   ├── chapter-list.tsx                # Left panel: chapter list
│   │   ├── chapter-detail.tsx              # Right panel: selected chapter detail
│   │   ├── outline-timeline.tsx            # Visual node/arc timeline
│   │   ├── beat-sheet-overlay.tsx          # Beat sheet mapping overlay
│   │   ├── inline-editable.tsx             # Click-to-edit wrapper
│   │   └── regenerate-dialog.tsx           # Direction input for guided regen
│   └── story-bible/
│       ├── bible-tabs.tsx                  # Tab shell: Characters/Locations/Timeline/World Facts
│       ├── character-card.tsx              # Card showing name + role + one-liner
│       ├── character-detail.tsx            # Expanded profile view/edit
│       ├── location-card.tsx
│       └── world-facts-card.tsx
├── lib/
│   ├── stores/
│   │   └── intake-store.ts                 # Zustand store for wizard state
│   └── data/
│       ├── genres.ts                       # Static genre options data
│       ├── themes.ts                       # Static theme options data
│       ├── tones.ts                        # Static tone options data
│       ├── settings.ts                     # Static setting options data
│       └── beat-sheets.ts                  # Beat sheet definitions (Save the Cat 15 beats, Romancing the Beat, etc.)
├── actions/
│   ├── intake.ts                           # Server Actions: saveIntakeData, triggerPremisePrefill
│   ├── outline.ts                          # Server Actions: saveOutline, approveOutline, regenerateChapter
│   └── story-bible.ts                      # Server Actions: upsertCharacter, upsertLocation, upsertWorldFact
└── app/api/
    └── generate/
        ├── outline/
        │   └── route.ts                    # SSE streaming Route Handler: calls OpenRouter directly
        └── premise-prefill/
            └── route.ts                    # Calls n8n to infer intake fields from premise text
```

### Pattern 1: Zustand Intake Store with Next.js App Router Provider

**What:** A Zustand store scoped to the intake wizard. Created per-page-load (not global) via a React Context provider mounted in the intake layout. All intake step answers live here until final submission.

**When to use:** Any Client Component within the intake wizard that needs to read or write wizard state.

```typescript
// lib/stores/intake-store.ts
import { createStore } from 'zustand/vanilla'

export type BeatSheetId = 'save-the-cat' | 'romancing-the-beat' | 'three-act' | 'heros-journey'
export type NovelLength = 'short' | 'standard' | 'epic'

export interface IntakeState {
  // Path
  path: 'wizard' | 'premise' | null
  // Step data
  genre: string | null
  themes: string[]
  characters: { role: string; archetype: string }[]
  setting: string | null
  tone: string | null
  beatSheet: BeatSheetId | null
  targetLength: NovelLength
  chapterCount: number
  premise: string | null
  // Navigation
  currentStep: number
  totalSteps: number
  // Actions
  setPath: (path: 'wizard' | 'premise') => void
  setGenre: (genre: string) => void
  setThemes: (themes: string[]) => void
  setCharacters: (characters: { role: string; archetype: string }[]) => void
  setSetting: (setting: string) => void
  setTone: (tone: string) => void
  setBeatSheet: (id: BeatSheetId) => void
  setTargetLength: (length: NovelLength, chapters: number) => void
  setPremise: (text: string) => void
  hydrateFromPrefill: (prefill: Partial<IntakeState>) => void
  goToStep: (step: number) => void
  reset: () => void
}

export type IntakeStore = ReturnType<typeof createIntakeStore>

export const createIntakeStore = (initState?: Partial<IntakeState>) =>
  createStore<IntakeState>()((set) => ({
    path: null,
    genre: null,
    themes: [],
    characters: [],
    setting: null,
    tone: null,
    beatSheet: null,
    targetLength: 'standard',
    chapterCount: 24,
    premise: null,
    currentStep: 0,
    totalSteps: 7, // path select + 5 content steps + review
    ...initState,
    setPath: (path) => set({ path }),
    setGenre: (genre) => set({ genre }),
    setThemes: (themes) => set({ themes }),
    setCharacters: (characters) => set({ characters }),
    setSetting: (setting) => set({ setting }),
    setTone: (tone) => set({ tone }),
    setBeatSheet: (beatSheet) => set({ beatSheet }),
    setTargetLength: (targetLength, chapterCount) => set({ targetLength, chapterCount }),
    setPremise: (premise) => set({ premise }),
    hydrateFromPrefill: (prefill) => set((state) => ({ ...state, ...prefill })),
    goToStep: (currentStep) => set({ currentStep }),
    reset: () => set({ path: null, genre: null, themes: [], characters: [], setting: null, tone: null, beatSheet: null, targetLength: 'standard', chapterCount: 24, premise: null, currentStep: 0 }),
  }))
```

```typescript
// components/intake/intake-store-provider.tsx
'use client'
import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { createIntakeStore, type IntakeStore, type IntakeState } from '@/lib/stores/intake-store'

// Context holds the store instance (not the state)
const IntakeStoreContext = createContext<IntakeStore | null>(null)

export function IntakeStoreProvider({ children }: { children: ReactNode }) {
  // useRef ensures the store is only created once per mount (not re-created on render)
  const storeRef = useRef<IntakeStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createIntakeStore()
  }
  return (
    <IntakeStoreContext.Provider value={storeRef.current}>
      {children}
    </IntakeStoreContext.Provider>
  )
}

// Hook for consuming the store with selector support
export function useIntakeStore<T>(selector: (state: IntakeState) => T): T {
  const store = useContext(IntakeStoreContext)
  if (!store) throw new Error('useIntakeStore must be used within IntakeStoreProvider')
  return useStore(store, selector)
}
```

```typescript
// app/(dashboard)/projects/[id]/intake/layout.tsx
import { IntakeStoreProvider } from '@/components/intake/intake-store-provider'

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return (
    <IntakeStoreProvider>
      {children}
    </IntakeStoreProvider>
  )
}
```

### Pattern 2: Card Picker Step Component

**What:** Each wizard step renders a grid of selectable cards. Selection is stored in Zustand. No form submission between steps — state persists in the store.

```typescript
// components/intake/card-picker.tsx
'use client'
interface CardOption {
  id: string
  label: string
  description?: string
  icon?: string
}

interface CardPickerProps {
  options: CardOption[]
  selected: string | string[]  // string for single-select, string[] for multi-select
  multiSelect?: boolean
  onSelect: (id: string) => void
}

export function CardPicker({ options, selected, multiSelect = false, onSelect }: CardPickerProps) {
  const isSelected = (id: string) =>
    Array.isArray(selected) ? selected.includes(id) : selected === id

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onSelect(option.id)}
          className={`p-4 rounded-lg border-2 text-left transition-colors ${
            isSelected(option.id)
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50'
          }`}
        >
          {option.icon && <span className="text-2xl mb-2 block">{option.icon}</span>}
          <div className="font-medium">{option.label}</div>
          {option.description && (
            <div className="text-sm text-muted-foreground mt-1">{option.description}</div>
          )}
        </button>
      ))}
    </div>
  )
}
```

### Pattern 3: SSE Streaming Route Handler for Outline Generation

**What:** A Next.js Route Handler that calls OpenRouter directly with `response_format: json_schema` and streams the response back to the client as SSE. This avoids n8n's 30-second webhook timeout constraint for long outline generation calls (60-120s possible).

**Critical detail:** The `export const dynamic = 'force-dynamic'` directive is mandatory to prevent Vercel edge caching from buffering the stream.

```typescript
// app/api/generate/outline/route.ts
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'

const OUTLINE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    premise: { type: 'string' },
    chapters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          number: { type: 'number' },
          title: { type: 'string' },
          summary: { type: 'string' },
          beats: { type: 'array', items: { type: 'string' } },
          characters_featured: { type: 'array', items: { type: 'string' } },
          beat_sheet_mapping: { type: 'string' },  // e.g. "Catalyst" or "Fun and Games"
          act: { type: 'number' },  // 1, 2, or 3
        },
        required: ['number', 'title', 'summary', 'beats'],
        additionalProperties: false,
      },
    },
    characters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          one_line: { type: 'string' },
          arc: { type: 'string' },
        },
        required: ['name', 'role', 'one_line'],
        additionalProperties: false,
      },
    },
    locations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'description'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'chapters', 'characters', 'locations'],
  additionalProperties: false,
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { intakeData, projectId } = await request.json()

  // Retrieve API key server-side — never from client
  const { data: settings } = await (supabase as any)
    .from('user_settings')
    .select('openrouter_api_key')
    .eq('user_id', user.id)
    .single()

  const apiKey = settings?.openrouter_api_key
  if (!apiKey) return new Response('No API key configured', { status: 400 })

  // Retrieve user's preferred outline model
  const { data: prefs } = await (supabase as any)
    .from('user_model_preferences')
    .select('model_id')
    .eq('user_id', user.id)
    .eq('task_type', 'outline')
    .single()

  const modelId = prefs?.model_id ?? 'anthropic/claude-3-5-sonnet'

  const prompt = buildOutlinePrompt(intakeData)

  const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      stream: true,
      messages: [
        { role: 'system', content: 'You are an expert novel outliner. Generate a structured outline in JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'novel_outline',
          strict: true,
          schema: OUTLINE_SCHEMA,
        },
      },
    }),
  })

  if (!openRouterResponse.ok) {
    return new Response('Generation failed', { status: 502 })
  }

  // Stream tokens directly to client as SSE
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const reader = openRouterResponse.body!
        .pipeThrough(new TextDecoderStream())
        .getReader()

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          // Forward SSE lines as-is; client parses delta.content chunks
          if (value) {
            controller.enqueue(encoder.encode(value))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Content-Encoding': 'none',
    },
  })
}

function buildOutlinePrompt(intakeData: Record<string, unknown>): string {
  return `Create a detailed novel outline with the following parameters:
Genre: ${intakeData.genre}
Themes: ${Array.isArray(intakeData.themes) ? intakeData.themes.join(', ') : intakeData.themes}
Tone: ${intakeData.tone}
Setting: ${intakeData.setting}
Beat sheet structure: ${intakeData.beatSheet}
Target length: ${intakeData.targetLength} (${intakeData.chapterCount} chapters)
${intakeData.premise ? `Premise: ${intakeData.premise}` : ''}

Generate ${intakeData.chapterCount} chapters. Map each chapter to the appropriate beat in the ${intakeData.beatSheet} beat sheet structure. Include 3-5 plot beats per chapter and identify featured characters and locations.`
}
```

### Pattern 4: Client-Side SSE Consumer for Streaming Outline

```typescript
// components/outline/streaming-outline-builder.tsx
'use client'
import { useState, useCallback } from 'react'

export function useOutlineStream(projectId: string) {
  const [streamedContent, setStreamedContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startStream = useCallback(async (intakeData: unknown) => {
    setIsStreaming(true)
    setStreamedContent('')
    setError(null)

    try {
      const response = await fetch('/api/generate/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intakeData, projectId }),
      })

      if (!response.ok) throw new Error('Generation failed')

      const reader = response.body!
        .pipeThrough(new TextDecoderStream())
        .getReader()

      let accumulated = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (!value) continue

        // Parse SSE lines: "data: {...}" -> extract delta.content
        const lines = value.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          if (data.startsWith(': ')) continue  // OpenRouter heartbeat comment
          try {
            const parsed = JSON.parse(data)
            const token = parsed.choices?.[0]?.delta?.content ?? ''
            if (token) {
              accumulated += token
              setStreamedContent(accumulated)
            }
          } catch {
            // Partial JSON chunk — skip
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsStreaming(false)
    }
  }, [projectId])

  return { streamedContent, isStreaming, error, startStream }
}
```

### Pattern 5: Story Bible Database Schema (Normalized Tables)

**What:** Three normalized tables replace the flat `story_bible jsonb` column on `projects`. This is the Phase 2 schema migration, resolving the STATE.md open question.

**Why normalize vs. JSONB:** Phase 3 requires selective context injection — injecting only characters who appear in the current chapter, not all 15 characters. Relational tables support `SELECT * FROM characters WHERE project_id = $1 AND chapters_featured @> ARRAY[$2]` or a join table pattern. JSONB makes this query complex and unindexable.

```sql
-- Migration: 00002_story_bible_tables.sql
-- Replaces story_bible JSONB on projects with normalized entity tables.
-- projects.story_bible column is kept as a JSONB metadata overflow bucket but
-- primary story data lives in these tables.

-- Characters
create table if not exists characters (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade not null,
  name        text not null,
  role        text not null,                    -- 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  one_line    text,                             -- card-level summary
  appearance  text,
  backstory   text,
  personality text,
  voice       text,
  motivations text,
  arc         text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Locations
create table if not exists locations (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade not null,
  name        text not null,
  description text,
  significance text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- World facts (timeline events, established rules, etc.)
create table if not exists world_facts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade not null,
  category    text not null,                    -- 'timeline' | 'rule' | 'lore' | 'relationship'
  fact        text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Outline (chapters with beats — separate from projects.story_bible)
-- Stores the full approved outline for the project
create table if not exists outlines (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade not null unique,
  beat_sheet_id   text not null,                -- 'save-the-cat' | 'romancing-the-beat' | etc.
  target_length   text not null,                -- 'short' | 'standard' | 'epic'
  chapter_count   integer not null,
  chapters        jsonb not null default '[]',  -- Array of chapter objects (see OUTLINE_SCHEMA above)
  status          text not null default 'draft',  -- 'draft' | 'approved'
  approved_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  constraint outlines_status_check check (status in ('draft', 'approved'))
);

-- RLS — all tables scoped to project owner via projects FK
alter table characters enable row level security;
alter table locations enable row level security;
alter table world_facts enable row level security;
alter table outlines enable row level security;

-- characters policies (replicate pattern for locations, world_facts, outlines)
create policy "Users can manage own project characters"
  on characters for all
  to authenticated
  using (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  );

create policy "Users can manage own project locations"
  on locations for all
  to authenticated
  using (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  );

create policy "Users can manage own project world facts"
  on world_facts for all
  to authenticated
  using (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  );

create policy "Users can manage own project outlines"
  on outlines for all
  to authenticated
  using (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  );

-- Triggers
create trigger characters_updated_at
  before update on characters
  for each row execute function update_updated_at();

create trigger locations_updated_at
  before update on locations
  for each row execute function update_updated_at();

create trigger world_facts_updated_at
  before update on world_facts
  for each row execute function update_updated_at();

create trigger outlines_updated_at
  before update on outlines
  for each row execute function update_updated_at();

-- Indexes
create index if not exists characters_project_id_idx on characters (project_id);
create index if not exists locations_project_id_idx on locations (project_id);
create index if not exists world_facts_project_id_idx on world_facts (project_id);
```

### Pattern 6: Beat Sheet Static Data

**What:** Beat sheets are static data files, not database records. They define named beats with positional metadata. The AI uses the beat sheet name in the generation prompt; the front-end uses the static data for the overlay visualization.

```typescript
// lib/data/beat-sheets.ts
export interface Beat {
  id: string
  name: string
  act: 1 | 2 | 3
  positionPercent: number  // 0-100 — approximate story position
  description: string
}

export interface BeatSheet {
  id: string
  name: string
  description: string
  beats: Beat[]
}

export const BEAT_SHEETS: BeatSheet[] = [
  {
    id: 'save-the-cat',
    name: 'Save the Cat',
    description: "Blake Snyder's 15-beat structure for novels and screenplays",
    beats: [
      { id: 'opening-image', name: 'Opening Image', act: 1, positionPercent: 1, description: "Snapshot of the hero's 'before' world" },
      { id: 'theme-stated', name: 'Theme Stated', act: 1, positionPercent: 5, description: 'Hints at the story\'s deeper truth' },
      { id: 'setup', name: 'Set-Up', act: 1, positionPercent: 7, description: 'Introduces protagonist, stakes, supporting cast' },
      { id: 'catalyst', name: 'Catalyst', act: 1, positionPercent: 10, description: 'Inciting incident that changes everything' },
      { id: 'debate', name: 'Debate', act: 1, positionPercent: 15, description: 'Hero hesitates, wrestling with doubts' },
      { id: 'break-into-two', name: 'Break Into Two', act: 2, positionPercent: 20, description: 'Hero commits to change, entering new world' },
      { id: 'b-story', name: 'B Story', act: 2, positionPercent: 22, description: 'Secondary plotline deepens the theme' },
      { id: 'fun-and-games', name: 'Fun and Games', act: 2, positionPercent: 35, description: "Explores the story's hook and premise" },
      { id: 'midpoint', name: 'Midpoint', act: 2, positionPercent: 50, description: 'Major twist elevating stakes; false victory or defeat' },
      { id: 'bad-guys-close-in', name: 'Bad Guys Close In', act: 2, positionPercent: 62, description: 'External threats and internal doubts collide' },
      { id: 'all-is-lost', name: 'All Is Lost', act: 2, positionPercent: 75, description: 'Something dies; hope fades' },
      { id: 'dark-night', name: 'Dark Night of the Soul', act: 3, positionPercent: 78, description: 'Hero grieves and faces transformation' },
      { id: 'break-into-three', name: 'Break Into Three', act: 3, positionPercent: 80, description: 'Epiphany sparks renewed resolve' },
      { id: 'finale', name: 'Finale', act: 3, positionPercent: 90, description: 'Climax where protagonist applies lessons' },
      { id: 'final-image', name: 'Final Image', act: 3, positionPercent: 99, description: 'Mirrors opening, showing transformation' },
    ],
  },
  {
    id: 'three-act',
    name: 'Three-Act Structure',
    description: 'Classic beginning, middle, end with turning points',
    beats: [
      { id: 'act-1-setup', name: 'Act 1 Setup', act: 1, positionPercent: 10, description: 'Establish world, character, conflict' },
      { id: 'inciting-incident', name: 'Inciting Incident', act: 1, positionPercent: 15, description: 'Event that sets story in motion' },
      { id: 'plot-point-1', name: 'First Plot Point', act: 1, positionPercent: 25, description: 'Point of no return — enters Act 2' },
      { id: 'midpoint', name: 'Midpoint Shift', act: 2, positionPercent: 50, description: 'Stakes change; protagonist shifts approach' },
      { id: 'plot-point-2', name: 'Second Plot Point', act: 2, positionPercent: 75, description: 'Crisis: lowest point before climax' },
      { id: 'climax', name: 'Climax', act: 3, positionPercent: 85, description: 'Final confrontation' },
      { id: 'resolution', name: 'Resolution', act: 3, positionPercent: 95, description: 'New normal established' },
    ],
  },
  // Romancing the Beat (Gail Carriger) to be added — romance-specific beats
]

export function getBeatSheetById(id: string): BeatSheet | undefined {
  return BEAT_SHEETS.find(bs => bs.id === id)
}
```

### Pattern 7: Approve Outline → Seed Story Bible (Server Action)

**What:** On outline approval, a Server Action parses the outline JSON, extracts characters and locations, and upserts them into the normalized tables. This is the OUTL-05 implementation path.

```typescript
// actions/outline.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface OutlineChapter {
  number: number
  title: string
  summary: string
  beats: string[]
  characters_featured: string[]
  beat_sheet_mapping: string
  act: number
}

interface OutlineData {
  title: string
  chapters: OutlineChapter[]
  characters: { name: string; role: string; one_line: string; arc?: string }[]
  locations: { name: string; description: string }[]
}

export async function approveOutline(
  projectId: string,
  outlineId: string,
  outlineData: OutlineData
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Mark outline as approved
  await (supabase as any)
    .from('outlines')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', outlineId)
    .eq('project_id', projectId)

  // 2. Upsert characters — delete existing AI-generated ones, re-insert from outline
  await (supabase as any).from('characters').delete().eq('project_id', projectId)
  if (outlineData.characters.length > 0) {
    await (supabase as any).from('characters').insert(
      outlineData.characters.map(c => ({
        project_id: projectId,
        name: c.name,
        role: c.role,
        one_line: c.one_line,
        arc: c.arc ?? null,
      }))
    )
  }

  // 3. Upsert locations
  await (supabase as any).from('locations').delete().eq('project_id', projectId)
  if (outlineData.locations.length > 0) {
    await (supabase as any).from('locations').insert(
      outlineData.locations.map(l => ({
        project_id: projectId,
        name: l.name,
        description: l.description,
      }))
    )
  }

  // 4. Update project status to 'writing'
  await (supabase as any)
    .from('projects')
    .update({ status: 'writing', title: outlineData.title })
    .eq('id', projectId)

  revalidatePath(`/projects/${projectId}/story-bible`)
  revalidatePath(`/dashboard`)
  return { success: true }
}
```

### Pattern 8: n8n Workflow for Premise Pre-fill (Non-streaming)

**What:** When user pastes a premise, Next.js calls n8n via `triggerN8nWorkflow()`. n8n sends the premise text to OpenRouter with a structured JSON prompt asking it to infer genre, themes, setting, tone. n8n returns the structured JSON to Next.js. This IS appropriate for n8n (short inference call, not streaming, well within 30s timeout).

```typescript
// app/api/generate/premise-prefill/route.ts
import { createClient } from '@/lib/supabase/server'
import { triggerN8nWorkflow } from '@/lib/n8n/client'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { premise } = await request.json()

  // Retrieve API key to pass to n8n (n8n makes the actual OpenRouter call)
  const { data: settings } = await (supabase as any)
    .from('user_settings')
    .select('openrouter_api_key')
    .eq('user_id', user.id)
    .single()

  try {
    const result = await triggerN8nWorkflow('premise-prefill', {
      premise,
      apiKey: settings?.openrouter_api_key,
      userId: user.id,
    })
    return Response.json(result)
  } catch {
    return Response.json({ error: 'Prefill failed' }, { status: 502 })
  }
}
```

### Anti-Patterns to Avoid

- **Global Zustand store (non-provider pattern):** In Next.js App Router, a module-level `create()` store is a singleton shared across all server-rendered requests. This causes state to leak between users in SSR. Always use the store-per-mount provider pattern.
- **Calling the outline generation API from a Server Action:** Server Actions have a different execution model and cannot return streaming responses. Use a Route Handler (`route.ts`) for SSE streaming.
- **Storing full outline in `projects.story_bible` JSONB:** Leads to the "full context in every prompt" trap in Phase 3. The outline goes in the `outlines` table; characters/locations go in normalized tables.
- **Hydration mismatch from Zustand persist + SSR:** If Zustand persist middleware writes to localStorage, the server-rendered HTML won't match the hydrated client HTML. Handle with a `mounted` state check or use `skipHydration` option before accessing localStorage.
- **Blocking the intake wizard behind n8n for premise prefill:** The premise prefill is a short inference call (< 10s). It should use n8n (fast, non-streaming). The outline generation is long (60-120s) and streaming — it goes direct to OpenRouter from a Route Handler.
- **Using `response_format: json_schema` with models that don't support it:** Check OpenRouter model compatibility. Fall back to prompt-engineering-based JSON extraction with validation if model doesn't support structured outputs. Anthropic Sonnet 4.5+ and GPT-4o support it.
- **Missing `export const dynamic = 'force-dynamic'` on streaming route:** Without this, Vercel may cache the response. The streaming Route Handler MUST have this directive.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wizard step state across navigation | URL params or prop drilling | Zustand store provider | State spans 6+ steps with complex nested data; URL params get unwieldy with character arrays |
| Streaming JSON parsing | Custom SSE + JSON reassembler | `pipeThrough(new TextDecoderStream())` + OpenRouter delta chunks | Edge case: SSE lines can split across read() calls; TextDecoderStream handles buffering |
| Beat sheet positioning | Custom algorithm | Static data file + CSS positioning | Beat positions are well-known constants; don't compute what can be a lookup |
| Outline version diffing | Custom diff algorithm | Simple snapshot: save previous JSON on regenerate, offer "restore" | Version diffing is complex; this is Claude's Discretion — a simple snapshot is sufficient |
| Story bible context assembly | Custom context builder | SQL SELECT with project_id filter — structure defined now | Phase 3 inherits this schema; define it right in Phase 2 |

**Key insight:** The streaming and state patterns in Phase 2 are well-established. The highest-risk custom implementation is JSON schema construction for OpenRouter structured outputs — use the official `response_format: json_schema` pattern rather than relying on prompt-engineering-only JSON extraction.

---

## Common Pitfalls

### Pitfall 1: n8n Timeout for Outline Generation

**What goes wrong:** Developer routes outline generation through n8n as a blocking webhook call. n8n's Respond to Webhook node times out after 30s. The outline generation for a 24-chapter novel with beats takes 60-120s. Response is lost; UI shows error.

**Why it happens:** n8n is the established pattern for AI calls in this project (established in Phase 1). Developer naturally routes the new AI call through the same pattern.

**How to avoid:** Outline generation MUST go through a Next.js Route Handler calling OpenRouter directly with SSE streaming. n8n handles non-streaming multi-step orchestration (premise prefill, post-approval bible seeding via a fire-and-forget call).

**Warning signs:** Outline generation is POSTed to `/api/n8n/...` or `triggerN8nWorkflow()` is called for the main outline generation.

### Pitfall 2: Zustand Hydration Mismatch

**What goes wrong:** Intake wizard renders on server (some data from URL params or server props), Zustand store initializes empty on client, React logs hydration mismatch errors. Alternatively: Zustand persist reads localStorage but server-rendered HTML is empty, causing content flash.

**Why it happens:** App Router defaults to Server Components. Zustand stores only exist on the client. If any parent server component passes initial data that conflicts with empty client store state, hydration fails.

**How to avoid:** The intake wizard layout (`intake/layout.tsx`) provides the store with no initial state. All initial data fetching (project data, any draft intake data) must happen in the intake layout Server Component and be passed as props to a Client Component that initializes the store. The `IntakeStoreProvider` should accept `initialState?: Partial<IntakeState>` to seed the store from server-fetched data.

**Warning signs:** "Hydration failed because the server rendered HTML didn't match" errors in the browser console.

### Pitfall 3: Streaming JSON Partially Parsed

**What goes wrong:** `JSON.parse()` on a partial SSE token chunk throws. This happens when the ReadableStream read() call returns data mid-JSON-object. Developer sees console errors on every non-final chunk.

**Why it happens:** SSE chunks are not aligned to JSON object boundaries. A `data: {"choices":...` line may split across two read() calls.

**How to avoid:** Two strategies: (1) Parse only `data: [DONE]` as the completion signal and accumulate raw delta content without parsing each chunk — then JSON.parse the full accumulated string at the end. (2) Wrap JSON.parse in try/catch and skip partial chunks. The `useOutlineStream` hook in Pattern 4 above uses strategy 2. The display shows partial text; the final parse for DB save uses strategy 1.

**Warning signs:** Unhandled JSON.parse errors in browser console during streaming.

### Pitfall 4: Story Bible Schema Designed for Display, Not Injection

**What goes wrong:** Characters table stores exactly what's displayed in the UI (name, role, one-liner). Phase 3 needs to inject character context into prompts. The display data is too thin — missing backstory, voice, personality. The injection context is too broad — including all characters in every prompt causes token bloat after chapter 10.

**Why it happens:** Phase 2 optimizes for what the UI needs to display. Phase 3's requirements aren't fully considered.

**How to avoid:** The `characters` table schema above includes all profile fields (appearance, backstory, personality, voice, motivations, arc). Phase 3 will SELECT only characters listed in `chapters.characters_featured` for the current chapter. The schema must include these fields now or Phase 3 requires a breaking migration.

**Warning signs:** Character table only has `name`, `role`, `description` columns.

### Pitfall 5: Premise Prefill Blocked by n8n Not Running

**What goes wrong:** Developer uses `isN8nConfigured()` guard (Phase 1 pattern) and degrades gracefully. But premise path is completely broken in local dev without n8n, making it untestable.

**Why it happens:** n8n guard is the established fallback pattern.

**How to avoid:** Premise prefill Route Handler should return a mock response when `!isN8nConfigured()`, allowing the intake flow to be developed without n8n. The mock returns plausible inferred values from the premise text (or a fixed stub) so the wizard UI can be built and tested independently.

### Pitfall 6: Two-Panel Outline Editor Without Stable Selection State

**What goes wrong:** User selects chapter 3 in the left panel, edits the title in the right panel, triggers a save, the save revalidates the path, and the right panel resets to no selection (or chapter 1).

**Why it happens:** `revalidatePath` causes a Server Component re-render. Client state (selected chapter) lives in the Client Component, which unmounts/remounts and loses selection.

**How to avoid:** Keep the selected chapter ID in `useState` at the two-panel shell level. Do not use `revalidatePath` after inline edits — use optimistic updates with `useOptimistic` (Next.js 15) or local state update + background Server Action. Only `revalidatePath` on major operations (approve outline, regenerate).

---

## Code Examples

Verified patterns from official sources:

### OpenRouter Structured Output Request (from official docs)
```typescript
// Source: https://openrouter.ai/docs/guides/features/structured-outputs
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4-5',
    stream: true,  // works with structured outputs
    messages: [{ role: 'user', content: 'Generate novel outline...' }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'novel_outline',
        strict: true,
        schema: { /* your schema */ },
      },
    },
  }),
})
```

### Next.js SSE Route Handler (from Upstash blog pattern, 2025)
```typescript
// Source: https://upstash.com/blog/sse-streaming-llm-responses
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      // ... stream tokens via controller.enqueue(encoder.encode(`data: ${token}\n\n`))
    },
  })

  return new Response(readable, {
    headers: {
      'Connection': 'keep-alive',
      'Content-Encoding': 'none',
      'Cache-Control': 'no-cache, no-transform',
      'Content-Type': 'text/event-stream; charset=utf-8',
    },
  })
}
```

### Client-Side Stream Reader (fetch + getReader, no EventSource)
```typescript
// Source: https://upstash.com/blog/sse-streaming-llm-responses
const response = await fetch('/api/generate/outline', { method: 'POST', body: ... })
const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()

while (true) {
  const { value, done } = await reader.read()
  if (done) break
  // process `value` — contains one or more SSE lines
}
```

### Zustand Store Provider for Next.js App Router
```typescript
// Source: https://zustand.docs.pmnd.rs/guides/nextjs (official pattern, verified 2025)
// Key: createStore (vanilla) + createContext + useRef — NOT global create()
'use client'
import { createContext, useContext, useRef } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const storeRef = useRef(null)
  if (!storeRef.current) {
    storeRef.current = createStore(/* ... */)
  }
  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>
}

export function useMyStore(selector) {
  const store = useContext(StoreContext)
  if (!store) throw new Error('must be within StoreProvider')
  return useStore(store, selector)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Context for wizard state | Zustand provider pattern | 2024 | Zustand avoids full-tree re-render on each step change; Context causes all children to re-render |
| n8n for all AI calls including streaming | Hybrid: n8n for orchestration, Next.js Route Handler for streaming | 2024 | n8n Respond to Webhook has SSE streaming issues (GitHub issue #25982, unresolved Jan 2026) — direct Route Handler is the reliable path |
| JSONB for story bible | Normalized tables (characters, locations, world_facts, outlines) | Phase 2 decision | Enables selective context injection in Phase 3; JSONB cannot be selectively queried efficiently |
| `response_format: {type: 'json_object'}` | `response_format: {type: 'json_schema', json_schema: {...}}` | 2024 | Strict schema mode guarantees structure; json_object only guarantees valid JSON, not schema conformance |
| EventSource API for SSE | `fetch` + `body.pipeThrough(TextDecoderStream()).getReader()` | 2023+ | EventSource only supports GET; AI generation requires POST with payload |

**Deprecated/outdated:**
- `n8n Respond to Webhook` with SSE streaming: Active bug (GitHub #25982, Jan 2026) — streaming via n8n webhook is unreliable; use Next.js Route Handler for streaming.
- `response_format: {type: 'json_object'}`: Still supported but `json_schema` with `strict: true` is preferred for guaranteed schema conformance.

---

## Open Questions

1. **Inline Edit: contentEditable vs controlled input overlay**
   - What we know: `contentEditable` is notoriously unpredictable in React (cursor position, paste handling, re-render conflicts). A controlled `<input>` or `<textarea>` revealed on click is more predictable.
   - What's unclear: UX feel — contentEditable looks more "in-place"; input overlay can feel modal
   - Recommendation: Use a reveal-on-click `<input>` pattern (click text → input appears with same value → blur saves). Avoids contentEditable React issues. Claude's Discretion area.

2. **Outline version history on regeneration**
   - What we know: State.md marks this as Claude's Discretion. Adding a `previous_chapters` JSONB on the `outlines` table costs nothing.
   - What's unclear: Whether the UI for "restore previous version" is worth building in Phase 2
   - Recommendation: Snapshot `chapters` → `previous_chapters` on every regeneration. Skip the restore UI for Phase 2 (add data structure now, restore UI in a future phase). This is a reversible decision.

3. **Story bible editability before/after outline approval**
   - What we know: State.md marks this as Claude's Discretion. Characters are populated at outline approval.
   - What's unclear: Should characters be editable on the story bible page before outline approval (to let users add characters manually before generating)?
   - Recommendation: Allow manual character creation on the story bible page at any time. On outline approval, AI-generated characters are upserted (merge by name, don't overwrite manual edits). Flag AI-generated vs. manually-created with a `source` column.

4. **Romancing the Beat beat definitions**
   - What we know: User has explicitly named "Romancing the Beat" (Gail Carriger). It's a romance-specific beat sheet with different beat names.
   - What's unclear: The exact beat names are in a book; they are not as freely documented as Save the Cat online.
   - Recommendation: Include a simplified version of Romancing the Beat beats in `lib/data/beat-sheets.ts` (Gail Carriger's framework is public knowledge): Meets Cute, First Kiss, Midpoint Swoon, Dark Moment, Happily Ever After. Exact beat names at Claude's Discretion.

---

## Sources

### Primary (HIGH confidence)
- [OpenRouter: Streaming API Reference](https://openrouter.ai/docs/api/reference/streaming) — SSE format, delta content, `[DONE]` sentinel, error handling
- [OpenRouter: Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs) — `response_format: json_schema`, strict mode, streaming compatibility, model support
- [Upstash: SSE Streaming LLM Responses in Next.js](https://upstash.com/blog/sse-streaming-llm-responses) — Next.js Route Handler pattern with ReadableStream, SSE headers, client-side `pipeThrough(TextDecoderStream())`
- Zustand official docs (zustand.docs.pmnd.rs/guides/nextjs) — store-per-request provider pattern for App Router; `createStore` (vanilla) vs `create`; `useRef` for store initialization
- Existing Phase 1 codebase — patterns for Server Actions, Supabase client, n8n client, project DB schema, settings patterns all verified against running code

### Secondary (MEDIUM confidence)
- [Kindlepreneur: Save the Cat Beat Sheet 101](https://kindlepreneur.com/save-the-cat-beat-sheet/) — all 15 beats with act positioning and percentage locations
- [GitHub: next-stepper (ebulku)](https://github.com/ebulku/next-stepper) — multi-step form with Next.js + shadcn + Zustand + framer-motion reference implementation
- [GitHub: n8n issue #25982](https://github.com/n8n-io/n8n/issues/25982) — streaming not working in Respond to Webhook node; confirms why direct Route Handler is required for streaming
- WebSearch results for Zustand + Next.js 15 App Router multi-step wizard — multiple independent sources confirm the createContext + useRef provider pattern as the standard

### Tertiary (LOW confidence — needs validation)
- Romancing the Beat beat definitions — primary source is Gail Carriger's book; online documentation is incomplete; beat names used in `lib/data/beat-sheets.ts` should be validated against the actual framework
- n8n SSE streaming via Respond to Webhook — issue #25982 reports it as broken; this may be fixed in n8n 2.x releases after Jan 2026; re-verify before concluding it's permanently unreliable

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries are already installed in Phase 1; Zustand is the only new addition with official docs and multiple verified implementations
- Architecture (wizard + SSE streaming): HIGH — patterns verified against official docs (OpenRouter, Next.js) and active GitHub examples
- Story bible schema: HIGH — normalized table design is straightforward Postgres; rationale verified against Phase 3 requirements in ROADMAP
- n8n streaming limitation: HIGH — GitHub issue #25982 is a recent confirmed bug; hybrid pattern decision aligns with existing STATE.md architectural decision
- Beat sheet data: MEDIUM — Save the Cat beats verified; Romancing the Beat beats need validation against source material
- Inline edit UX pattern: MEDIUM — contentEditable vs. reveal-on-click is Claude's Discretion; both approaches are well-documented

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable ecosystem; n8n streaming issue may be resolved, re-verify before Phase 3)
