# Phase 4: Creative Checkpoints - Research

**Researched:** 2026-03-02
**Domain:** React UI state machine, Next.js Route Handlers, OpenRouter structured JSON, Supabase JSONB, Tailwind animation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Checkpoint trigger**: Soft prompt (banner/toast: "Chapter ready — Review checkpoint") after compression finishes, not forced auto-transition. User CAN generate ahead without completing checkpoints (soft gating, no skip limit). Checkpoints accumulate as open items when skipped.
- **Two-step flow**: Step 1 = read chapter, approve or rewrite. Step 2 = pick direction for next chapter. Last chapter: approve/rewrite only, then show novel completion summary (word count, chapter count, plot threads resolved vs open).
- **Cascading impact**: When user changes a prior checkpoint's direction, reset that chapter's status from "approved" back to "checkpoint". Downstream chapters flagged as "potentially affected". Impact analysis is on-demand (user clicks "Analyze impact"), not automatic. Full re-read of downstream chapter text using a cheaper analysis model via OpenRouter. Impact analysis generates per-chapter descriptions of what's affected. Affected flags appear in chapter list sidebar AND a dedicated summary panel. Direction history: replace only (no version history).
- **Direction options**: 2–4 AI-generated options per checkpoint (AI decides count). Each option: bold title/hook (1 sentence) + short paragraph (3–4 sentences). Options stay grounded in approved outline beats. Custom direction also constrained to execution choices (tone, pacing, focus). Custom direction uses guided/structured prompts (tone, pacing, character focus fields).
- **Approve vs rewrite UX**: Dedicated checkpoint view (distinct from reading view). Soft approve: approval marks direction as confirmed but prose stays editable. Rewrite offers guided prompts by default with a free-text "advanced" toggle. Scene-level rewrites: user can select a section/scene to rewrite while keeping the rest (requires scene boundary detection + context stitching). Full chapter rewrite also available.
- **Checkpoint screen layout**: Expandable panel that slides in alongside the chapter text. Detailed stats: word count, plot threads advanced/resolved, characters featured, foreshadowing planted, continuity notes. Two-step flow uses in-place panel transition. Direction options displayed as cards (title + paragraph, click to select).
- **Outline immutability**: Approved outline is source of truth. All checkpoint directions operate within the outline's beats. Changes limited to execution-level: tone, pacing, character emphasis, scene detail.

### Claude's Discretion

- Exact animation/transition timing for the expandable panel
- Scene boundary detection approach for scene-level rewrites
- Specific guided prompt fields for rewrite and custom direction
- Novel completion summary design and content
- How the cheaper analysis model is selected/configured (new task_type or user picks in settings)
- Exact badge/flag design for affected chapters

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CKPT-01 | After each chapter generates, user reaches a checkpoint before proceeding | Post-compression banner/toast trigger; `checkpointMap` in ChapterPanel extended with `approval_status`; `deriveChapterList()` emits 'checkpoint' for chapters with text that are not yet approved |
| CKPT-02 | At each checkpoint, user can approve the chapter and continue | `approveChapter` server action sets `approval_status: 'approved'` in `chapter_checkpoints`; optimistic update in `checkpointMap`; `deriveChapterList()` emits 'approved' status |
| CKPT-03 | At each checkpoint, user can request a rewrite with specific direction | Extend existing `RewriteDialog` with guided mode (tone/pacing/focus fields) + "advanced" free-text toggle; rewrite calls existing `handleGenerate(chapterNumber, adjustments)` pipeline unchanged |
| CKPT-04 | At each checkpoint, user is presented with 2–3 plot direction options for the next chapter | New Route Handler `/api/generate/direction-options`; non-streaming structured JSON via OpenRouter using `response_format`; new `DirectionOptionCard` component; result cached in `chapter_checkpoints.direction_options` JSONB column |
| CKPT-05 | User can provide custom direction instead of choosing a presented option | Custom direction panel in Step 2 of checkpoint flow; structured fields (tone, pacing, character focus); stored in `chapter_checkpoints.selected_direction` JSONB column; fed into next-chapter generation via `adjustments` parameter |

</phase_requirements>

## Summary

Phase 4 builds a structured decision point that hooks into the existing post-compression flow in `ChapterPanel`. The compression pass already runs after every chapter stream and saves a `ChapterCheckpointRow`; Phase 4 extends that row with approval state, direction data, and affected flags, then wraps the reading view in a two-step checkpoint panel that slides in alongside the prose.

The key technical challenge is **state machine design** in `ChapterPanel`. Currently, each chapter moves linearly: `pending → generating → checkpoint`. Phase 4 adds `approved` (active), `affected` (advisory badge), and the concept of a "pending checkpoint step" (step 1 vs step 2). All of this must survive React re-renders without server round-trips on every click. The existing `checkpointMap` (a `Map<number, ChapterCheckpointRow>`) is the right container; it needs to carry extended fields.

A second challenge is the **direction-options generation**: a non-streaming, structured JSON call to OpenRouter (same pattern as the compression pass) that produces 2–4 cards grounded in the outline. The result is stored in `chapter_checkpoints` and loaded lazily — generating once per chapter and caching so re-entering the checkpoint does not re-call the API. The cheaper "analysis" model (currently wired to the `editing` task_type) is the right choice here.

**Primary recommendation:** Extend `ChapterCheckpointRow` with four new nullable JSONB columns (`approval_status`, `direction_options`, `selected_direction`, `direction_for_next`), add an `'analysis'` task_type to `user_model_preferences` (or reuse `'editing'`), and introduce a `CheckpointPanel` component that replaces the right panel when a non-approved chapter is selected.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (Next.js App Router) | 15.x (project) | Client state machine for checkpoint UX | Already the project framework; hooks pattern established |
| Supabase (postgres + RLS) | supabase-js v2 | Persist checkpoint state, direction data | Existing DB with `chapter_checkpoints` table; RLS policies already written |
| OpenRouter structured JSON | `/api/v1/chat/completions` + `response_format` | Direction-options generation, impact analysis | Same pattern as existing compression pass in `compress-chapter/route.ts` |
| shadcn/ui Dialog | Latest (project) | Checkpoint modals, rewrite dialog | Already used throughout; `ApproveDialog`, `RewriteDialog` are Dialog wrappers |
| Tailwind CSS | 3.x (project) | Panel slide animation via `transition-all duration-300` | Established animation pattern (ChapterPanel focus mode already uses this) |
| Sonner | Latest (project) | "Chapter ready" toast notification | Project-wide toast standard — established in Phase 1 decision log |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | Latest (project) | Status icons (CheckCircle, AlertTriangle, etc.) | Existing `STATUS_CONFIG` in `chapter-list.tsx` already uses lucide icons |
| `useTransition` (React built-in) | 18+ | Non-blocking server action calls for approve/save | Already used in `ApproveDialog` for outline approval — consistent pattern |
| `useDebouncedCallback` | Latest (project, from use-debounce) | Custom direction auto-save | Consistent with character editor and model selector patterns |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB new columns in `chapter_checkpoints` | Separate `chapter_directions` table | New table adds join complexity; JSONB keeps one row per chapter and matches existing pattern for `state_diff`, `continuity_notes` |
| Reuse `editing` task_type for analysis model | Add new `analysis` task_type | Reuse avoids schema migration; new type gives finer user control. Lean toward reuse in v1, expose separately in v2 |
| Panel slide (CSS `transition-all`) | Framer Motion | Framer Motion not installed; CSS transitions match existing focus-mode pattern and are sufficient |

**Installation:** No new packages required. All dependencies are already in the project.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/chapters/
│   ├── checkpoint-panel.tsx         # New: two-step checkpoint shell (slides in)
│   ├── checkpoint-step-approve.tsx  # New: Step 1 — chapter review + approve/rewrite
│   ├── checkpoint-step-direction.tsx# New: Step 2 — direction cards + custom input
│   ├── direction-option-card.tsx    # New: card component for a single AI direction
│   ├── novel-complete-summary.tsx   # New: last-chapter completion celebration
│   ├── rewrite-dialog.tsx           # Modified: add guided mode + advanced toggle
│   └── chapter-list.tsx             # Modified: add 'affected' badge variant
├── actions/
│   └── chapters.ts                  # Modified: add approveChapter, saveDirection, flagAffected
└── app/api/generate/
    ├── direction-options/route.ts   # New: generate 2–4 direction cards (non-streaming JSON)
    └── analyze-impact/route.ts      # New: impact analysis for downstream chapters
```

### Pattern 1: Extended ChapterCheckpointRow

**What:** Add four nullable JSONB columns to `chapter_checkpoints`. The existing `chapter_text`, `state_diff`, `summary` columns stay untouched.

**When to use:** Checkpoint UI state that must survive page reload. Direction data and approval status belong here.

```typescript
// Extended types — add to src/types/project-memory.ts

export type ApprovalStatus = 'draft' | 'approved'

export interface DirectionOption {
  id: string
  title: string          // 1-sentence hook
  body: string           // 3–4 sentence description
}

export interface SelectedDirection {
  type: 'option' | 'custom'
  optionId?: string      // if type === 'option'
  tone?: string          // if type === 'custom'
  pacing?: string
  characterFocus?: string
  freeText?: string      // advanced toggle
}

// Extended row (existing fields omitted for brevity)
export interface ChapterCheckpointRow {
  // ... existing fields ...
  approval_status: ApprovalStatus       // new column — default 'draft'
  direction_options: DirectionOption[] | null  // new column — null until generated
  selected_direction: SelectedDirection | null // new column — user's pick
  direction_for_next: string | null           // new column — assembled prompt string
  affected: boolean                           // new column — impact analysis flag
  impact_description: string | null           // new column — per-chapter description
}
```

**DB migration (new file: `00004_checkpoint_extensions.sql`):**

```sql
alter table chapter_checkpoints
  add column if not exists approval_status text not null default 'draft'
    check (approval_status in ('draft', 'approved')),
  add column if not exists direction_options jsonb,
  add column if not exists selected_direction jsonb,
  add column if not exists direction_for_next text,
  add column if not exists affected boolean not null default false,
  add column if not exists impact_description text;
```

### Pattern 2: Checkpoint Panel Slide-In

**What:** `CheckpointPanel` renders as a right-side panel alongside the existing chapter text, using the same CSS `transition-all` pattern established for focus mode.

**When to use:** When the selected chapter has status `'checkpoint'` (text exists but not approved) — replaces the current reading-view header buttons with a structured two-step flow.

```typescript
// Mirrors existing focus mode animation pattern from chapter-panel.tsx

// In ChapterPanel render:
const showCheckpoint = !showStreamingView
  && selectedCheckpoint?.chapter_text
  && selectedCheckpoint.approval_status !== 'approved'

return (
  <div className="flex flex-1 overflow-hidden">
    {/* Chapter text stays visible on the left */}
    <div
      className="transition-all duration-300 ease-in-out overflow-y-auto"
      style={{ width: showCheckpoint ? '55%' : '100%' }}
    >
      <ChapterReadingView ... />
    </div>

    {/* Checkpoint panel slides in from right */}
    <div
      className="shrink-0 border-l border-border transition-all duration-300 ease-in-out overflow-hidden"
      style={{ width: showCheckpoint ? '45%' : 0 }}
    >
      {showCheckpoint && (
        <CheckpointPanel
          projectId={projectId}
          chapter={selectedChapter}
          checkpoint={selectedCheckpoint}
          outlineChapters={outlineChapters}
          isLastChapter={selectedChapter.number === outlineChapters.length}
          onApprove={handleApprove}
          onRewrite={handleRewriteRequest}
          onDirectionSaved={handleDirectionSaved}
        />
      )}
    </div>
  </div>
)
```

### Pattern 3: Direction Options — Non-Streaming Structured JSON

**What:** New Route Handler `/api/generate/direction-options` calls OpenRouter with `response_format: { type: 'json_schema' }` (same as compression pass) to produce 2–4 direction cards.

**When to use:** Step 2 of the checkpoint flow, after the user approves the chapter. Result cached in `chapter_checkpoints.direction_options` — only fetched once.

```typescript
// Source: mirrors compress-chapter/route.ts exactly

// JSON schema for direction options response
export const DIRECTION_OPTIONS_SCHEMA = {
  type: 'object',
  properties: {
    options: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string', description: 'One-sentence hook / bold title' },
          body: { type: 'string', description: '3-4 sentence description of this direction' },
        },
        required: ['id', 'title', 'body'],
        additionalProperties: false,
      },
    },
  },
  required: ['options'],
  additionalProperties: false,
}

// Prompt context: chapter N's state_diff, next chapter's outline beats
// Constraint: options must stay within the outline beat sheet
```

### Pattern 4: `deriveChapterList()` Status Extension

**What:** The existing `deriveChapterList()` function in `ChapterPanel` needs to emit `'approved'` (when `approval_status === 'approved'`) and a new `'affected'` advisory badge. The status type must be extended.

**When to use:** Whenever `checkpointMap` changes.

```typescript
// Extended ChapterListItem — add to chapter-list.tsx
export interface ChapterListItem {
  number: number
  title: string
  status: 'pending' | 'generating' | 'checkpoint' | 'approved'
  wordCount: number
  hasText: boolean
  isAffected: boolean   // new: shows amber warning badge
}

// Extended deriveChapterList()
function deriveChapterList(): ChapterListItem[] {
  return outlineChapters.map((ch) => {
    const checkpoint = checkpointMap.get(ch.number)
    const wc = ...
    let status: ChapterListItem['status'] = 'pending'

    if (generatingChapter === ch.number) {
      status = 'generating'
    } else if (checkpoint?.chapter_text) {
      // Approved takes priority over checkpoint
      status = checkpoint.approval_status === 'approved' ? 'approved' : 'checkpoint'
    }

    return {
      number: ch.number,
      title: ch.title,
      status,
      wordCount: wc,
      hasText: !!checkpoint?.chapter_text,
      isAffected: checkpoint?.affected ?? false,
    }
  })
}
```

### Pattern 5: Checkpoint Trigger — Post-Compression Banner

**What:** After the compression effect in `ChapterPanel` completes (currently line 206-210 in `chapter-panel.tsx`), instead of just clearing `generatingChapter`, show a Sonner toast with an action button.

**When to use:** Every time compression succeeds and a new checkpoint is created.

```typescript
// In the compression useEffect finally block:
// After setGeneratingChapter(null) and word count update:

import { toast } from 'sonner'

toast.success('Chapter ready — Review checkpoint', {
  action: {
    label: 'Review',
    onClick: () => {
      // Select the just-generated chapter
      const idx = outlineChapters.findIndex(c => c.number === chapterNumber)
      if (idx >= 0) handleSelectChapter(idx)
    },
  },
  duration: 8000,  // longer timeout — user should see this
})
```

Sonner supports action buttons natively. This is the correct tool per Phase 1 decision log (sonner as the single notification system). Confidence: HIGH — verified against Sonner's API.

### Pattern 6: `approveChapter` Server Action

**What:** New server action in `src/actions/chapters.ts`. Updates `chapter_checkpoints.approval_status` to `'approved'`. Mirrors the `saveChapterProse` pattern exactly.

```typescript
// In src/actions/chapters.ts

export async function approveChapter(
  projectId: string,
  chapterNumber: number
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  // ... auth + ownership check (same as existing actions) ...

  const { error } = await (supabase as any)
    .from('chapter_checkpoints')
    .update({ approval_status: 'approved' })
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber)

  if (error) return { error: error.message }
  return { success: true }
}
```

No `revalidatePath` needed — optimistic update in `checkpointMap` handles the UI transition immediately (same pattern as `saveChapterProse`).

### Pattern 7: Impact Analysis — On-Demand, Cheaper Model

**What:** New Route Handler `/api/generate/analyze-impact`. When user changes a prior checkpoint's direction, they can trigger impact analysis. The route reads all downstream chapter texts and runs them through the cheaper model (reuse `editing` task_type model preference) with a prompt that asks "what in this chapter references the changed event?"

**When to use:** Only when user explicitly clicks "Analyze Impact." NOT automatic.

```typescript
// Per-chapter impact analysis result
interface ChapterImpact {
  chapterNumber: number
  description: string  // e.g., "References the ally betrayal from Ch5"
  affectsPlotThreads: string[]
}

interface ImpactAnalysisResult {
  changedChapter: number
  affectedChapters: ChapterImpact[]
}
```

Result stored per chapter: `chapter_checkpoints.affected = true` + `impact_description = "..."` for each affected chapter.

### Anti-Patterns to Avoid

- **Auto-triggering impact analysis**: The CONTEXT.md is explicit — on-demand only. Auto-running on every direction change causes unnecessary API calls and disrupts the UX flow.
- **Storing direction options in React state only**: Direction options must be persisted in `chapter_checkpoints.direction_options` so they survive navigation away and back. Re-fetching from the API on every checkpoint view wastes API calls and introduces latency.
- **Blocking generation on checkpoint completion**: Soft gating is required. The "Generate Next" button must remain available even for chapters that are post a skipped checkpoint. The only change to `handleGenerate` is adding the `direction_for_next` from the checkpoint as an additional `adjustments` string when it exists.
- **`revalidatePath` on approve**: Will reset client `checkpointMap` state — use optimistic updates as established in Phase 3.
- **Dialog for checkpoint**: CONTEXT.md specifies an expandable panel alongside the chapter text (not a modal). The `ApproveDialog` from the outline phase is a pattern for confirmation modals — the checkpoint panel is a fundamentally different layout component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast with action button | Custom toast UI | Sonner `toast.success({ action: { label, onClick } })` | Already installed; action buttons are built-in to Sonner |
| Structured JSON from AI | Custom JSON parser with retry | OpenRouter `response_format: { type: 'json_schema' }` | Same pattern as compression pass; handles malformed output at the API level |
| Panel slide animation | Custom CSS keyframes | Tailwind `transition-all duration-300 ease-in-out` + inline `style={{ width: ... }}` | Established in focus mode — identical mechanism |
| Scene boundary detection | NLP library | Paragraph-double-newline splitting (`\n\n`) + chapter text marker heuristics | Good enough for v1; scene breaks are prose-level, not semantic |

**Key insight:** Every hard problem in Phase 4 has already been solved by an existing pattern in the codebase. The implementation is composition, not invention.

## Common Pitfalls

### Pitfall 1: Double-Rendering Checkpoint Panel on Stream Complete

**What goes wrong:** When compression finishes and `generatingChapter` is cleared, if the selected chapter index is the just-generated chapter, the right panel switches immediately from `ChapterStreamingView` to the reading view AND the checkpoint panel. The `showCheckpoint` condition fires before the `checkpointMap` optimistic update has propagated, causing a frame where neither panel shows.

**Why it happens:** React state updates are batched but `setGeneratingChapter(null)` and `setCheckpointMap(...)` both fire in the same async block. The render between them can be empty.

**How to avoid:** Set `checkpointMap` before clearing `generatingChapter`:
```typescript
// Set map FIRST, then clear generating state
setCheckpointMap(next)
setGeneratingChapter(null)  // triggers re-render with new map already in place
```

**Warning signs:** Momentary blank right panel after compression completes.

### Pitfall 2: Direction Options Fetched Multiple Times

**What goes wrong:** If the checkpoint panel unmounts and remounts (user switches chapters and comes back), the direction-options API call fires again despite results already being in `chapter_checkpoints`.

**Why it happens:** The options are generated in component effect with no cache check.

**How to avoid:** Before calling `/api/generate/direction-options`, check `checkpoint.direction_options`. If non-null, use cached data. Only call the API if `direction_options === null`. Store the result immediately in `checkpointMap` optimistically, then persist via server action.

### Pitfall 3: `approval_status` Not in `checkpointMap` After Page Load

**What goes wrong:** `ChaptersPage` server component fetches checkpoints via `getChapterCheckpoints(id)`. If the SQL schema migration `00004_checkpoint_extensions.sql` has not been applied, the new columns return `null` or are absent from the result, causing TypeScript runtime errors when the client tries to read `checkpoint.approval_status`.

**Why it happens:** Supabase remote project requires manual migration application via SQL Editor. The type system won't catch absent columns at runtime.

**How to avoid:** Default-safe access pattern:
```typescript
const approvalStatus = checkpoint?.approval_status ?? 'draft'
```
And document clearly in task verification: "Migration 00004 must be applied in Supabase SQL Editor before testing."

### Pitfall 4: Scene Boundary Detection False Positives

**What goes wrong:** For scene-level rewrites, splitting chapter text on `\n\n` (double newline) to find scene boundaries misidentifies paragraph breaks as scene breaks, producing too many "scenes."

**Why it happens:** Prose paragraphs routinely use double newlines; only narrative scene breaks (marked with `***` or `---`) reliably indicate scene transitions.

**How to avoid:** Scene detection heuristic should treat `\n\n---\n\n`, `\n\n***\n\n`, `\n\n* * *\n\n` as hard scene breaks, and group consecutive paragraphs between them as a single scene. Present scenes to the user by their first sentence (truncated to 80 chars). If no scene markers are found, fall back to chapter-level rewrite only (no scene option shown).

### Pitfall 5: Affected Flags Stale After Re-Approve

**What goes wrong:** User changes direction on Chapter 5, runs impact analysis, flags Chapter 8 as affected. User then re-generates and re-approves Chapter 8. The `affected = true` flag on Chapter 8's checkpoint is never cleared, so it shows the "potentially affected" warning badge indefinitely.

**Why it happens:** The `approveChapter` action only sets `approval_status = 'approved'` — it doesn't reset `affected`.

**How to avoid:** `approveChapter` should also reset `affected = false` and `impact_description = null`. Approval semantics: "I've reviewed this chapter and accept its current state."

### Pitfall 6: Last-Chapter Checkpoint Shows Direction Step

**What goes wrong:** The two-step flow (approve → direction) applies to every chapter, including the last. The last chapter has no "next chapter" to pick direction for.

**Why it happens:** `CheckpointPanel` doesn't check whether it's the last chapter before rendering Step 2.

**How to avoid:** Pass `isLastChapter` boolean prop to `CheckpointPanel`. When true: Step 1 only (approve/rewrite), then show `NovelCompleteSummary` instead of Step 2.

## Code Examples

Verified patterns from existing codebase:

### Sonner Toast with Action Button

```typescript
// Pattern: consistent with existing sonner usage in ChapterPanel
import { toast } from 'sonner'

// After compression completes:
toast.success('Chapter ready — Review checkpoint', {
  action: {
    label: 'Review',
    onClick: () => handleSelectChapter(completedChapterIndex),
  },
  duration: 8000,
})
```

Sonner's `toast` function accepts an options object with `action: { label: string, onClick: () => void }`. This is the documented Sonner API (HIGH confidence — directly observable in the installed package).

### OpenRouter Non-Streaming Structured JSON (Direction Options)

```typescript
// Mirrors compress-chapter/route.ts exactly — source: existing codebase

const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'StoryWriter',
  },
  body: JSON.stringify({
    model: modelId,  // reuse editing task_type model
    stream: false,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'direction_options',
        strict: true,
        schema: DIRECTION_OPTIONS_SCHEMA,
      },
    },
  }),
})

const orJson = await orResponse.json()
const content = orJson.choices?.[0]?.message?.content
const result = JSON.parse(content) as DirectionOptionsResult
```

### Optimistic `checkpointMap` Update (Approve)

```typescript
// Pattern: mirrors existing optimistic updates in ChapterPanel
// Source: chapter-panel.tsx handleEditorSave pattern

const handleApprove = useCallback(async (chapterNumber: number) => {
  // Optimistic update — immediate UI feedback
  setCheckpointMap((prev) => {
    const next = new Map(prev)
    const existing = next.get(chapterNumber)
    if (existing) {
      next.set(chapterNumber, {
        ...existing,
        approval_status: 'approved',
        affected: false,  // clear affected on approve
        impact_description: null,
      })
    }
    return next
  })

  // Persist to DB (no revalidatePath — same reason as saveChapterProse)
  const result = await approveChapter(projectId, chapterNumber)
  if ('error' in result) {
    // Roll back optimistic update
    toast.error(`Failed to approve: ${result.error}`)
    setCheckpointMap(prev => /* restore previous */ ...)
  }
}, [projectId])
```

### Direction Injection into Next Chapter Generation

```typescript
// In handleGenerate — direction_for_next feeding into adjustments
const handleGenerate = useCallback(
  (chapterNumber: number, adjustments?: string) => {
    // If the previous chapter has a selected direction, inject it
    const prevCheckpoint = checkpointMap.get(chapterNumber - 1)
    const directionContext = prevCheckpoint?.direction_for_next

    const fullAdjustments = [directionContext, adjustments]
      .filter(Boolean)
      .join('\n\n')

    setGeneratingChapter(chapterNumber)
    setCompressionTriggered(false)
    void startStream(projectId, chapterNumber, fullAdjustments || undefined)
  },
  [projectId, startStream, checkpointMap]
)
```

### DB Migration — Checkpoint Extensions

```sql
-- 00004_checkpoint_extensions.sql
-- Adds Phase 4 Creative Checkpoint fields to chapter_checkpoints.
-- Apply manually in Supabase SQL Editor.

alter table chapter_checkpoints
  add column if not exists approval_status text not null default 'draft'
    check (approval_status in ('draft', 'approved')),
  add column if not exists direction_options jsonb,
  add column if not exists selected_direction jsonb,
  add column if not exists direction_for_next text,
  add column if not exists affected boolean not null default false,
  add column if not exists impact_description text;

-- Index for fast "find all affected chapters" queries
create index if not exists idx_chapter_checkpoints_affected
  on chapter_checkpoints(project_id, affected)
  where affected = true;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal-based approval (AlertDialog) | In-panel two-step flow | Phase 4 design | Keeps chapter text visible during decision |
| Single-status checkpoint ('checkpoint') | Status + approval_status | Phase 4 | Decouples "has text" from "user has approved" |
| Adjustments as raw free text | Structured direction + free-text advanced toggle | Phase 4 | Richer direction signal for next chapter generation |

**Deprecated/outdated:**
- The existing "chapter ready" state where compression completes and `generatingChapter` is cleared with no notification: replaced by the Sonner action toast.
- The `'checkpoint'` status as meaning "needs user attention": after Phase 4, `'checkpoint'` means "has text, not yet approved" and `'approved'` means the user has explicitly signed off.

## Open Questions

1. **Scene boundary detection confidence**
   - What we know: Double-newline splitting is naive; `***` markers are conventional but not guaranteed
   - What's unclear: What percentage of AI-generated chapters will include explicit scene break markers? If zero, scene-level rewrite falls back to chapter-level always
   - Recommendation: Implement the heuristic detection. If no markers found, hide the scene-select UI and show only full-chapter rewrite. Do not invest in ML-based boundary detection for v1.

2. **`analysis` vs `editing` task_type for direction-options and impact analysis**
   - What we know: The compression pass already reuses the `editing` model. Direction options and impact analysis are different cognitive tasks but similar in cost profile.
   - What's unclear: Whether users will want to configure direction-options model separately from prose editing
   - Recommendation: Reuse `editing` task_type for all three analysis-style tasks in v1. Add a distinct `analysis` task_type in v2 if user demand exists. No schema change needed.

3. **Novel completion summary content**
   - What we know: CONTEXT.md specifies: word count, chapter count, plot threads resolved vs open
   - What's unclear: Whether to call an AI to generate a "celebration" narrative summary or show stats-only
   - Recommendation: Stats-only for v1 (no API call, instant display). Stats come directly from `project_memory.plot_threads` (count resolved), `projects.word_count`, and `projects.chapter_count`. Add AI-generated summary in v2.

## Sources

### Primary (HIGH confidence)

- Existing codebase — `src/components/chapters/chapter-panel.tsx`: ChapterPanel state machine, checkpointMap pattern, compression trigger, focus mode animation
- Existing codebase — `src/app/api/generate/compress-chapter/route.ts`: Non-streaming structured JSON via OpenRouter — exact template for direction-options route
- Existing codebase — `src/types/project-memory.ts`: ChapterCheckpointRow structure, CompressionResult, StateDiff
- Existing codebase — `src/components/intake/card-picker.tsx`: CardPicker component — direction option cards reuse this design
- Existing codebase — `src/components/outline/approve-dialog.tsx`: `useTransition` + server action pattern for approval flows
- Existing codebase — `src/components/chapters/chapter-list.tsx`: ChapterListItem type, STATUS_CONFIG — to be extended with 'affected'
- Existing codebase — `src/actions/chapters.ts`: Server action patterns (auth, ownership check, upsert, no revalidatePath for non-nav saves)
- Existing codebase — `supabase/migrations/00003_project_memory.sql`: Migration structure template for `00004_checkpoint_extensions.sql`
- Planning — `.planning/phases/04-creative-checkpoints/04-CONTEXT.md`: All locked decisions; source of truth for UX and behavior

### Secondary (MEDIUM confidence)

- Sonner documentation — action button support on toast notifications: confirmed by inspecting installed package signatures and the pattern used throughout the project

### Tertiary (LOW confidence)

- Scene break detection heuristic (`***`, `---` markers): Based on common prose conventions, not verified against AI output. Flag for validation in plan verification.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; no new dependencies
- Architecture: HIGH — patterns directly derived from existing codebase; no novel approaches
- Pitfalls: HIGH for state-machine pitfalls (directly observed in existing code); MEDIUM for scene detection (convention-based)

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (stable stack; main risk is Supabase API changes which are rare)
