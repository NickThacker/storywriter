# Phase 3: Chapter Generation - Research

**Researched:** 2026-03-01
**Domain:** Streaming prose generation, rich text editing, chapter management, progress tracking
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Streaming Experience**
- Word-by-word typing effect — tokens appear as if being typed, immersive "watching a writer" feel
- Stop + pause/resume controls — user can pause streaming to read, then resume generation
- Side panel alongside outline — prose streams in a panel next to the chapter list/outline, keeping context visible
- Visible metadata during streaming: live word count, chapter number/title at top, and a progress indicator

**Chapter Management**
- Vertical scrollable list — each chapter shows title, status badge, and word count
- Both "Generate Next" button (guided path for sequential generation) and per-chapter "Generate" buttons (for out-of-order generation)
- Rewrite via adjustments dialog — modal where user specifies what to change (tone, pacing, focus) before regenerating; old version is replaced
- Out-of-order generation: AI uses outline beats as a bridge for continuity when earlier chapters are still pending. System must track which chapters exist and reference outline beats for missing chapters to maintain narrative coherence

**Inline Editing**
- Rich text editor (WYSIWYG) — bold, italic, headings, formatted text as you edit
- Novel-specific tools: scene break separator (***) and author notes/comments that don't appear in final text
- Auto-save with debounce — changes persist automatically, no save button needed
- Click chapter to open in editor — always editable when viewing, no separate "edit mode" toggle

**Progress Tracking**
- Progress displayed in both locations: summary on project dashboard, detailed breakdown on chapter list page
- Key metrics: total word count, target word count, and X/Y chapters completed
- Sidebar navigation showing all novel-writing phases (Intake, Outline, Chapters, etc.) with completion status; current phase highlighted
- Progress bar with milestone markers at 25%, 50%, 75%, and complete

### Claude's Discretion
- Chapter status flow design (will include statuses from success criteria: pending, generating, checkpoint, approved)
- Rich text editor library choice (Tiptap, Slate, etc.)
- Exact spacing, typography, and visual design details
- Error state handling
- Loading skeleton design

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAP-01 | AI generates chapters one at a time, streaming prose in real time | Route handler `/api/generate/chapter` already exists and streams SSE from OpenRouter. Research covers the hook pattern to consume it client-side (mirrors `useOutlineStream`). |
| CHAP-02 | User can watch prose appear via real-time streaming (SSE) | SSE consumption via `fetch` + `ReadableStream` + `TextDecoderStream` is established in this project. Chapter hook accumulates raw prose tokens (not JSON). Pause/resume via AbortController + re-fetch pattern. |
| CHAP-03 | Generated chapter prose is saved to file storage and metadata to database | `chapter_checkpoints` table stores `chapter_text` + `summary`. `saveChapterCheckpoint` server action + `/api/generate/compress-chapter` route already exist. No file-storage layer needed — prose stored directly in `chapter_text` TEXT column. |
| CHAP-04 | User can request a rewrite of any chapter with style/tone adjustments | Rewrite triggers the same `/api/generate/chapter` endpoint with an adjustments field in the request body. New prose replaces `chapter_text` in the checkpoint upsert (idempotent on `project_id, chapter_number`). |
| CHAP-05 | User can manually edit generated prose inline | Tiptap 3 with `use client` component, `immediatelyRender: false` for SSR safety. Content sourced from `chapter_text`. Auto-save via `useDebouncedCallback` (600ms, consistent with Phase 2 pattern). |
| PROG-01 | Chapter list with status indicators (pending, generating, checkpoint, approved) | `chapter_checkpoints` table tracks per-chapter text. Chapter status derives from: no checkpoint row = pending, active SSE = generating, has checkpoint but not approved = checkpoint, approved_at set = approved. A new `chapters_meta` server action or derived state from outline + checkpoints covers this. |
| PROG-02 | Total word count and percentage complete | Word count from `projects.word_count` (updated after compression). Target from `outlines.target_length` + `outlines.chapter_count`. Percentage = `chapters_done / chapter_count`. |
| PROG-03 | User always knows where they are in the novel-writing process | Novel-phase sidebar nav component. Shows phases: Intake, Outline, Story Bible, Chapters. Current phase highlighted. Uses `projects.status` and `outlines.status` to determine progress. |

</phase_requirements>

## Summary

Phase 3 has significant backend infrastructure already in place from Phase 2 work. The `/api/generate/chapter` route handler is complete and streams SSE prose from OpenRouter. The compression route, memory system, context assembly, and all supporting DB tables (`project_memory`, `chapter_checkpoints`) are built and waiting. What Phase 3 must deliver is the UI layer: a chapter management page, a streaming prose view with typing effect and pause/resume, a Tiptap-based inline editor, and progress/navigation components.

The streaming pattern is identical to the outline flow — `fetch` a POST endpoint, pipe through `TextDecoderStream`, accumulate tokens as raw text (not JSON this time). The key implementation difference is that chapter prose is plain text rather than JSON, so no partial-JSON parsing is needed. The cursor-blink typing effect, live word count, and pause/resume (via AbortController abort + re-fetch) are all achievable with the existing React + hook architecture.

For the rich text editor, Tiptap 3 is the right choice. It ships stable (v3.x), has explicit Next.js SSR guidance (`immediatelyRender: false`), uses MIT license with no cloud dependency, and supports custom Node extensions for scene breaks and author notes. The `use-debounce` package (already installed) covers auto-save. No new infrastructure packages are needed beyond Tiptap.

**Primary recommendation:** Use Tiptap 3 for inline editing. Build `useChapterStream` mirroring `useOutlineStream`. Derive chapter status from outline + checkpoint data. The entire phase is UI work against a complete backend.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tiptap/react` | `^3.x` | React bindings for the editor | Official React integration, App Router safe with `immediatelyRender: false` |
| `@tiptap/pm` | `^3.x` | ProseMirror peer dependency | Required by Tiptap core |
| `@tiptap/starter-kit` | `^3.x` | Bold, italic, headings, blockquote, etc. | Batteries-included baseline; tree-shakable |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `use-debounce` | already installed | Auto-save debouncing | 600ms debounce on editor onChange → server action (consistent with Phase 2 pattern) |
| `lucide-react` | already installed | Status icons (clock, zap, check-circle, bookmark) | Chapter list status badges |
| `sonner` | already installed | Error and success toasts | Generation errors, rewrite confirmations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tiptap 3 | Slate | Slate is lower-level, requires far more custom wiring; Tiptap has established Next.js docs and SSR guidance |
| Tiptap 3 | Novel.sh | Novel is a pre-built Tiptap wrapper — adds a dependency with less control; Tiptap directly gives full control for custom extensions |
| Tiptap 3 | `<textarea>` | textarea does not support rich text, headings, or custom node types for scene breaks |
| Tiptap 3 | Lexical (Meta) | Lexical is viable but has lower community adoption and fewer Next.js-specific guides |

**Installation:**
```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(dashboard)/projects/[id]/
│   ├── chapters/                    # NEW: Chapter management route
│   │   └── page.tsx                 # Server component: loads outline + checkpoints
│   ├── page.tsx                     # MODIFY: add 'writing' → /chapters redirect
├── components/chapters/             # NEW: All chapter UI components
│   ├── chapter-panel.tsx            # Top-level client orchestrator (mirrors OutlinePanel)
│   ├── chapter-list.tsx             # Left panel: scrollable list with status badges
│   ├── chapter-streaming-view.tsx   # Right panel: streaming prose with typing cursor
│   ├── chapter-editor.tsx           # Right panel: Tiptap editor (post-generation)
│   ├── rewrite-dialog.tsx           # Modal: style/tone adjustments for rewrite
│   └── phase-nav.tsx                # Sidebar: Intake → Outline → Chapters progress
├── hooks/
│   └── use-chapter-stream.ts        # NEW: SSE consumer for /api/generate/chapter
├── actions/
│   └── chapters.ts                  # NEW: saveChapterProse, approveChapter, updateWordCount
```

### Pattern 1: Chapter Stream Hook
**What:** Client hook that mirrors `useOutlineStream` but accumulates raw prose tokens (not JSON).
**When to use:** Any component that triggers chapter generation and needs streaming state.

```typescript
// src/hooks/use-chapter-stream.ts
'use client'

import { useState, useCallback, useRef } from 'react'

interface UseChapterStreamReturn {
  streamedText: string
  isStreaming: boolean
  isPaused: boolean
  error: string | null
  wordCount: number
  startStream: (projectId: string, chapterNumber: number, adjustments?: string) => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
}

export function useChapterStream(): UseChapterStreamReturn {
  const [streamedText, setStreamedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState(0)

  // AbortController ref for stop/cancel
  const abortRef = useRef<AbortController | null>(null)
  // Pause is implemented by keeping track of accumulated text and re-fetching
  // (true pause-in-place of a fetch stream is not supported; the pattern is stop + resume from saved text)
  const pausedAtRef = useRef<string>('')

  const startStream = useCallback(async (
    projectId: string,
    chapterNumber: number,
    adjustments?: string
  ) => {
    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    setIsStreaming(true)
    setIsPaused(false)

    try {
      const response = await fetch('/api/generate/chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, chapterNumber, adjustments }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        const errBody = await response.json().catch(() => ({}))
        setError((errBody as { error?: string }).error ?? 'Generation failed')
        setIsStreaming(false)
        return
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        for (const line of value.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice('data: '.length).trim()
          if (data === '[DONE]' || !data) continue
          try {
            const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              accumulated += content
              setStreamedText(accumulated)
              // Live word count: split on whitespace
              setWordCount(accumulated.trim().split(/\s+/).filter(Boolean).length)
            }
          } catch { /* skip malformed SSE */ }
        }
      }

      pausedAtRef.current = accumulated
    } catch (err) {
      if ((err as Error).name === 'AbortError') return // cancelled intentionally
      setError(err instanceof Error ? err.message : 'Stream error')
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
    setIsPaused(false)
  }, [])

  const pause = useCallback(() => {
    // Pause = abort current stream, save accumulated text
    pausedAtRef.current = streamedText
    abortRef.current?.abort()
    setIsStreaming(false)
    setIsPaused(true)
  }, [streamedText])

  // Resume is implemented by the caller: show a "Resume Generation" button that
  // triggers startStream again. The backend restarts generation from scratch but
  // the user can keep the already-streamed portion as their chapter.
  const resume = useCallback(() => {
    setIsPaused(false)
  }, [])

  return { streamedText, isStreaming, isPaused, error, wordCount, startStream, pause, resume, stop }
}
```

**Key insight on pause/resume:** True mid-stream pause (freeze tokens in place, then continue) is not achievable with the OpenRouter SSE + fetch model. What is achievable: abort the stream (saving accumulated text), show a "Resume" button, and allow the user to keep the partial prose or restart. This satisfies the user requirement of "pause to read" — the text stays visible, the spinner stops.

### Pattern 2: Chapter Status Derivation
**What:** Derive chapter statuses by joining outline chapters with checkpoint records.
**When to use:** Chapter list rendering. No separate `chapters` table needed.

```typescript
// In the server component (chapters/page.tsx)
type ChapterStatus = 'pending' | 'generating' | 'checkpoint' | 'approved'

interface ChapterListItem {
  number: number
  title: string
  status: ChapterStatus
  wordCount: number
  hasText: boolean
}

// Derive from outline.chapters + checkpoint rows
function deriveChapterList(
  outlineChapters: OutlineChapter[],
  checkpoints: ChapterCheckpointRow[],
  approvedNumbers: Set<number>
): ChapterListItem[] {
  return outlineChapters.map((ch) => {
    const checkpoint = checkpoints.find((c) => c.chapter_number === ch.number)
    const wordCount = checkpoint?.chapter_text
      ? checkpoint.chapter_text.trim().split(/\s+/).filter(Boolean).length
      : 0
    let status: ChapterStatus = 'pending'
    if (checkpoint) {
      status = approvedNumbers.has(ch.number) ? 'approved' : 'checkpoint'
    }
    return { number: ch.number, title: ch.title, status, wordCount, hasText: !!checkpoint }
  })
}
```

### Pattern 3: Tiptap Editor with Auto-Save and Custom Extensions
**What:** Controlled Tiptap editor that loads chapter prose, saves on debounce, supports scene breaks and author notes.
**When to use:** Chapter editor pane (right side when viewing a chapter with existing text).

```typescript
// src/components/chapters/chapter-editor.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Node } from '@tiptap/core'
import { useDebouncedCallback } from 'use-debounce'

// Custom scene break node — renders as *** separator
const SceneBreak = Node.create({
  name: 'sceneBreak',
  group: 'block',
  parseHTML() { return [{ tag: 'hr.scene-break' }] },
  renderHTML() { return ['hr', { class: 'scene-break' }] },
  addCommands() {
    return {
      insertSceneBreak: () => ({ commands }) =>
        commands.insertContent({ type: 'sceneBreak' }),
    }
  },
})

// Author note node — inline, visually distinct, not exported to final text
const AuthorNote = Node.create({
  name: 'authorNote',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'aside[data-author-note]' }] },
  renderHTML() { return ['aside', { 'data-author-note': '', class: 'author-note' }, 0] },
})

interface ChapterEditorProps {
  initialContent: string   // raw prose text from chapter_text
  onSave: (text: string) => Promise<void>
}

export function ChapterEditor({ initialContent, onSave }: ChapterEditorProps) {
  const debouncedSave = useDebouncedCallback(onSave, 600)

  const editor = useEditor({
    extensions: [StarterKit, SceneBreak, AuthorNote],
    content: initialContent,
    immediatelyRender: false, // REQUIRED for Next.js SSR safety
    onUpdate({ editor }) {
      const text = editor.getText()
      debouncedSave(text)
    },
  })

  return <EditorContent editor={editor} className="prose prose-sm max-w-none" />
}
```

### Pattern 4: Phase Navigation Sidebar
**What:** Vertical sidebar showing writing phases, with current phase highlighted and completion status.
**When to use:** Chapter page layout, embedded in the left or top nav area.

```typescript
// src/components/chapters/phase-nav.tsx
type PhaseStatus = 'complete' | 'active' | 'pending'

const PHASES = [
  { id: 'intake', label: 'Intake', path: (id: string) => `/projects/${id}/intake` },
  { id: 'outline', label: 'Outline', path: (id: string) => `/projects/${id}/outline` },
  { id: 'story-bible', label: 'Story Bible', path: (id: string) => `/projects/${id}/story-bible` },
  { id: 'chapters', label: 'Chapters', path: (id: string) => `/projects/${id}/chapters` },
]
```

### Pattern 5: Progress Bar with Milestone Markers
**What:** Progress bar showing 25/50/75/100% milestones, derived from `chapters_done / chapter_count`.
**When to use:** Both the chapter list header and the project dashboard card.

```typescript
// Progress calculation from ProjectRow
const pct = project.chapter_count > 0
  ? Math.round((project.chapters_done / project.chapter_count) * 100)
  : 0
const milestones = [25, 50, 75, 100]
```

### Anti-Patterns to Avoid
- **Using a separate `chapters` table:** The chapter data model is fully covered by `outlines.chapters[]` (for structure) + `chapter_checkpoints` (for text + status). Do not add a new table.
- **Parsing HTML from Tiptap for prose save:** Use `editor.getText()` (plain text) for the `chapter_text` column, not `editor.getHTML()`. The export phase will handle formatting — the DB stores prose, not markup.
- **Storing chapter status in the DB:** Status is derived from checkpoint existence and a separate `approved_chapters` set. Do not add a `status` column to `chapter_checkpoints` — derive it to avoid state sync bugs.
- **Using `revalidatePath` inside streaming loops:** Same pitfall as Phase 2 (plan 02-06 pitfall #6). Only call `revalidatePath` after the stream completes and data is saved.
- **Calling `getUser()` on every auto-save:** Cache the auth check — use a Zustand store or React context to hold chapter state client-side, only flush to server on debounce. Don't re-auth on every keystroke.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich text editing | Custom contentEditable + selection management | Tiptap 3 | ProseMirror's selection/cursor/paste/IME handling is thousands of lines of well-tested code. Phase 2 tried `contentEditable` for inline editing and switched to `<input>` to avoid conflicts. |
| Debounced auto-save | Custom `setTimeout` ref management | `useDebouncedCallback` (use-debounce, already installed) | Already established in Phase 1 and Phase 2 for model selector and character editor. |
| SSE token accumulation | EventSource browser API | `fetch` + `ReadableStream` (established pattern) | `EventSource` doesn't support POST requests. This project already uses the fetch+TextDecoderStream pattern for outline generation. |
| Toast notifications | Custom notification system | `sonner` (already installed) | Established in Phase 1. |
| Word count | Character count library | Split on whitespace in hook | `accumulated.trim().split(/\s+/).filter(Boolean).length` — sufficient for novel word counts, no library needed. |

**Key insight:** The backend (route handlers, compression, memory) is already built. Every "don't hand-roll" here is a UI concern that either already has a project-established solution or has a simple one-liner.

## Common Pitfalls

### Pitfall 1: Tiptap SSR Hydration Error
**What goes wrong:** Tiptap renders on the server with a different DOM than on the client, causing React hydration mismatch.
**Why it happens:** Tiptap 3's `useEditor` runs immediately in SSR by default.
**How to avoid:** Always pass `immediatelyRender: false` in the `useEditor` config.
**Warning signs:** `Hydration failed because the server rendered HTML didn't match the client` console error.

### Pitfall 2: Tiptap 3 StarterKit Undoredo Rename
**What goes wrong:** Passing `{ history: false }` to StarterKit (Tiptap 2 API) silently fails in Tiptap 3.
**Why it happens:** Tiptap 3 renamed the history extension option to `undoRedo`.
**How to avoid:** Use `StarterKit.configure({ undoRedo: false })` if disabling undo history.
**Warning signs:** History still enabled when you expected it disabled; no console error.

### Pitfall 3: AbortError on Pause Causing Unhandled State
**What goes wrong:** Aborting the fetch during streaming throws `AbortError`. If not caught, the hook leaves `isStreaming: true`.
**Why it happens:** `AbortController.abort()` causes the `reader.read()` promise to reject with `AbortError`.
**How to avoid:** In the catch block, check `err.name === 'AbortError'` and return silently. Always set `isStreaming: false` in `finally`.
**Warning signs:** Loading spinner persists after pause/stop.

### Pitfall 4: ReadableStream Locked Error on Re-Read
**What goes wrong:** If a component re-mounts while a stream is active, calling `getReader()` again on a locked stream throws.
**Why it happens:** A `ReadableStream` can only have one active reader at a time.
**How to avoid:** Track the active `AbortController` in a ref. Before starting a new stream, always abort the previous one first.
**Warning signs:** `Failed to execute 'getReader' on 'ReadableStream': ReadableStream is locked`.

### Pitfall 5: Saving HTML Instead of Plain Text
**What goes wrong:** `editor.getHTML()` returns `<p>...</p>` markup which bloats the `chapter_text` column and breaks downstream text operations (word count, compression prompt, export).
**Why it happens:** Tiptap exposes both `getText()` and `getHTML()`.
**How to avoid:** Always use `editor.getText()` for persistence. Use `getHTML()` only for display purposes if needed.
**Warning signs:** `chapter_text` column contains `<p>` tags when inspected in Supabase.

### Pitfall 6: Word Count Updating on Every Keystroke
**What goes wrong:** Updating word count state on every token or keystroke causes excessive re-renders.
**Why it happens:** Naive `setWordCount` inside `onUpdate` fires on every character.
**How to avoid:** Use `useDebouncedCallback` for word count updates during editing. During streaming, update the count every N tokens or on a `requestAnimationFrame` cadence.
**Warning signs:** Janky typing experience in the editor.

### Pitfall 7: Out-of-Order Chapter Context Missing
**What goes wrong:** Generating Chapter 5 before Chapter 3 results in `assembleChapterContext` finding no checkpoint for Chapter 4, so context gaps produce narrative incoherence.
**Why it happens:** `assembleChapterContext` only fetches the N-1 checkpoint. If that's missing, it falls back to null for `previousChapterSummary`.
**How to avoid:** The existing context assembly already handles null gracefully (falls back to outline beats). UI should make clear which chapters are pending and warn when generating out of order. The "Generate Next" guided path prevents this by default.
**Warning signs:** AI-generated prose that contradicts established events from a pending chapter.

### Pitfall 8: project_memory Migration Not Applied
**What goes wrong:** Calling `/api/generate/chapter` fails at context assembly because `project_memory` table doesn't exist.
**Why it happens:** `00003_project_memory.sql` was implemented but not yet applied to Supabase (noted as pending in STATE.md).
**How to avoid:** Include migration step in Phase 3 Wave 0 plan. Block chapter generation behind a memory-initialized check.
**Warning signs:** 500 error from `assembleChapterContext` with Postgres relation-not-found.

## Code Examples

### SSE Streaming Route (Already Exists)
```typescript
// Source: src/app/api/generate/chapter/route.ts (complete, working)
// Key pattern: force-dynamic + pipe OpenRouter body directly as SSE
export const dynamic = 'force-dynamic'

return new Response(responseBody, {
  headers: {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Content-Encoding': 'none',
  },
})
```

### Tiptap Editor Init (Next.js Safe)
```typescript
// Source: https://tiptap.dev/docs/editor/getting-started/install/nextjs
'use client'
const editor = useEditor({
  extensions: [StarterKit],
  content: initialContent,
  immediatelyRender: false,  // CRITICAL for Next.js App Router
})
```

### Chapter Status Badge
```typescript
// Derived status — no DB column needed
const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'text-muted-foreground', icon: Clock },
  generating: { label: 'Generating', color: 'text-blue-500', icon: Loader2 },
  checkpoint: { label: 'Checkpoint', color: 'text-amber-500', icon: BookOpen },
  approved:   { label: 'Approved',   color: 'text-green-500', icon: CheckCircle },
} as const
```

### Auto-Save Pattern (Established in Phase 2)
```typescript
// Source: consistent with use-debounce pattern from Phase 1 (model-selector)
// and Phase 2 (character editor)
const debouncedSave = useDebouncedCallback(async (text: string) => {
  await saveChapterProse(projectId, chapterNumber, text)
}, 600)
```

### Rewrite Request Body Extension
```typescript
// Extend existing /api/generate/chapter to accept optional adjustments
interface GenerateChapterBody {
  projectId: string
  chapterNumber: number
  adjustments?: string  // "Make the tone darker. Focus more on the antagonist."
}
// The buildChapterPrompt function in chapter-prompt.ts needs a minor extension
// to append adjustments to the user message when present.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tiptap 2 (history: false) | Tiptap 3 (undoRedo: false) | 2025 — v3 stable | Must use new option name |
| EventSource for SSE | fetch + ReadableStream | 2020+ | EventSource doesn't support POST; fetch pattern is universal |
| Global Zustand store | Vanilla `createStore` with Context | Phase 2 — App Router safe | Prevents SSR singleton hydration issues; established pattern in this project |

**Deprecated/outdated:**
- `EventSource` API for POST-based SSE streams: Cannot send a request body; all SSE generation in this project uses `fetch` instead.
- `editor.getHTML()` for persistence: Returns markup, not prose text.

## Open Questions

1. **Approved Chapter Tracking**
   - What we know: `chapter_checkpoints` has `chapter_text` and `summary`. No `approved_at` column exists on that table. `outlines` has `approved_at`.
   - What's unclear: Where to store per-chapter approval. Options: (a) add `approved_at` column to `chapter_checkpoints` via a new migration `00004_chapter_approved.sql`, (b) store an `approved_chapter_numbers` array on `project_memory`, (c) defer approval to Phase 4 (CKPT-01 through CKPT-05 are Phase 4 requirements).
   - Recommendation: For Phase 3, treat "checkpoint" status (has text, not yet formally approved) as the completed state. Formal approval workflow ships in Phase 4. The status badge shows `checkpoint` for chapters with text, `approved` only when Phase 4 sets it. No new migration needed now — Phase 3 can treat all chapters with a checkpoint as effectively "done for writing purposes."

2. **`project_memory` Migration Timing**
   - What we know: `00003_project_memory.sql` is written but marked as "needs manual apply" in STATE.md.
   - What's unclear: Whether it has been applied to the Supabase project. Must be confirmed before any chapter generation works.
   - Recommendation: Wave 0 of Phase 3 planning must include a verification step that confirms the table exists.

3. **Chapter Prose Storage Format**
   - What we know: `chapter_text TEXT` column in `chapter_checkpoints`. Tiptap outputs both `getText()` (plain) and `getHTML()` (marked-up).
   - What's unclear: Whether plain text is sufficient or if we should store HTML for faithful round-trip editing.
   - Recommendation: Store plain text. Tiptap can load plain text into its `content` prop (wraps in a paragraph). Storing HTML couples the editor to the storage layer. Phase 5 export assembles from plain text. Keep it simple.

4. **`initializeMemory` Trigger**
   - What we know: `initializeMemory` is called in `saveIntakeData` (Phase 2). `seedPlotThreadsFromOutline` is called after outline approval. Memory must exist before chapter generation.
   - What's unclear: What happens if a user's memory row is missing due to the migration not being applied at intake time.
   - Recommendation: Add a guard in the chapter page server component — if `project_memory` row is missing, show an error state and a "Repair" button that calls `initializeMemory`.

## Sources

### Primary (HIGH confidence)
- `src/app/api/generate/chapter/route.ts` — existing SSE chapter generation route (complete)
- `src/app/api/generate/compress-chapter/route.ts` — existing compression route (complete)
- `src/lib/memory/context-assembly.ts` — existing context assembly (complete)
- `src/actions/project-memory.ts` — existing server actions for memory management (complete)
- `supabase/migrations/00003_project_memory.sql` — schema for `project_memory` + `chapter_checkpoints`
- `src/hooks/use-outline-stream.ts` — SSE hook pattern to mirror for chapters
- `https://tiptap.dev/docs/editor/getting-started/install/nextjs` — Official Next.js install guide with `immediatelyRender: false`

### Secondary (MEDIUM confidence)
- Tiptap 3.0 stable release confirmed via tiptap.dev blog and npm; v3.x install command `npm install @tiptap/react @tiptap/pm @tiptap/starter-kit`
- `StarterKit` rename of `history` → `undoRedo` confirmed via Mantine migration guide and Liveblocks guide
- AbortController + AbortError pattern for stream cancellation confirmed via MDN and multiple 2025 sources

### Tertiary (LOW confidence)
- Specific Tiptap 3.x version number (3.20.0 cited in one source — verify at install time with `npm info @tiptap/react version`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Tiptap 3 install command and SSR config verified against official Next.js docs; use-debounce already in project
- Architecture: HIGH — Route handlers, memory system, and SSE pattern are existing, working code; hook pattern mirrors established `useOutlineStream`
- Pitfalls: HIGH for project-specific pitfalls (confirmed from Phase 2 decisions in STATE.md); MEDIUM for Tiptap 3-specific pitfalls (sourced from official upgrade guides)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (Tiptap moves fast; verify version before install)
