---
phase: 03-chapter-generation
verified: 2026-03-03T22:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Generate a chapter and watch prose stream in real time"
    expected: "Tokens appear progressively in the streaming view with typing cursor effect; live word count updates; Stop button aborts and preserves text"
    why_human: "Real-time SSE streaming cannot be verified by static code inspection"
  - test: "Stop mid-stream, then generate a new chapter"
    expected: "Stop preserves streamed text in the view; triggering a new generation for the same chapter replaces the previous stream correctly (no ReadableStream locked error)"
    why_human: "Stream abort behavior requires live execution to verify"
  - test: "Open RewriteDialog, submit adjustments, and watch the chapter regenerate"
    expected: "Guided mode (Tone/Pacing/Character Focus) or Advanced mode (free text) builds an adjustments string; chapter starts streaming with those adjustments injected into the prompt"
    why_human: "Rewrite flow requires triggering the dialog and observing the regeneration"
  - test: "Edit a generated chapter in the Tiptap editor"
    expected: "Toolbar shows Bold/Italic/H2/H3/Scene Break/Author Note; typing triggers auto-save after 600ms debounce; word count badge updates live; scene breaks render as ***; author notes render in amber aside"
    why_human: "Rich text editing and ProseMirror custom node rendering cannot be verified without a browser"
  - test: "Navigate between project phases using PhaseNav"
    expected: "Phase nav bar shows Intake/Outline/Story Bible/Chapters tabs; current phase is highlighted; completed phases show checkmarks; navigating away while generating shows a confirmation dialog"
    why_human: "Navigation guard and visual phase state require live interaction"
  - test: "Check dashboard card for a writing-status project"
    expected: "Card shows X/Y chapters and word count with a thin progress bar; progress bar fill reflects chapters_done/chapter_count ratio"
    why_human: "Visual display of progress data requires a real project in writing status"
---

# Phase 3: Chapter Generation Verification Report

**Phase Goal:** Users can generate chapters one at a time and watch prose stream in real time, with full chapter management and visible progress through the novel
**Verified:** 2026-03-03T22:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can navigate to /projects/[id]/chapters and see a chapter list | VERIFIED | `src/app/(dashboard)/projects/[id]/chapters/page.tsx` — server component loads outline + checkpoints, renders ChapterPanel |
| 2 | Each chapter shows title, status badge (pending/generating/checkpoint/approved), and word count | VERIFIED | `chapter-list.tsx` STATUS_CONFIG lookup with Clock/Loader2/BookOpen/CheckCircle icons; word count in list item |
| 3 | User can trigger chapter generation and watch prose stream in real time | VERIFIED | `use-chapter-stream.ts` POSTs to `/api/generate/chapter`, pipes SSE chunks into accumulated text; `chapter-streaming-view.tsx` renders with typing cursor |
| 4 | Streaming view shows live word count, chapter title, and typing cursor | VERIFIED | `chapter-streaming-view.tsx` header bar with word count badge and `animate-pulse` inline cursor on last paragraph |
| 5 | User can view and edit chapter prose in a Tiptap editor with bold, italic, headings, scene breaks, and author notes | VERIFIED | `chapter-editor.tsx` — StarterKit + SceneBreak + AuthorNote extensions, full toolbar, `immediatelyRender: false` SSR safety |
| 6 | Changes auto-save with 600ms debounce — no save button needed | VERIFIED | `chapter-editor.tsx` uses `useDebouncedCallback(onSave, 600)` on editor `onUpdate`; flush on unmount |
| 7 | User can request a chapter rewrite via an adjustments dialog | VERIFIED | `rewrite-dialog.tsx` — Guided (Tone/Pacing/Character Focus) and Advanced (free text) modes; disabled submit when empty; `chapter-panel.tsx` wires `handleRewrite` to `startStream` with adjustments |
| 8 | User sees a two-panel layout with chapter list and content area | VERIFIED | `chapter-panel.tsx` — CSS flex layout; left panel (chapter list, collapses in focus mode); right panel (streaming view or editor or reading view) |
| 9 | User sees a phase nav bar showing all novel-writing phases with current phase highlighted | VERIFIED | `phase-nav.tsx` + `project-phase-nav.tsx` rendered in `layout.tsx` above all project pages; pathname-derived `currentPhase` |
| 10 | User sees a progress bar with milestone markers at 25%, 50%, 75%, 100% and chapter/word count | VERIFIED | `progress-bar.tsx` — diamond markers at MILESTONES=[25,50,75,100]; chapter count left label; word count vs target right label |
| 11 | User with an approved outline is routed to /projects/[id]/chapters when visiting the project page | VERIFIED | `projects/[id]/page.tsx` — `status === 'writing'` and fallback both redirect to `/projects/${id}/chapters` |
| 12 | Project dashboard card shows chapter progress (X/Y chapters) and word count for projects in writing status | VERIFIED | `project-card.tsx` — `showProgress` when `status === 'writing' && chapter_count > 0`; thin progress bar with chapters_done/chapter_count fill |

**Score:** 12/12 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/use-chapter-stream.ts` | SSE consumer with start/stop | VERIFIED | 167 lines; `startStream`, `stop`, `streamedText`, `isStreaming`, `error`, `wordCount` exports; AbortController ref pattern |
| `src/actions/chapters.ts` | Server actions for chapter management | VERIFIED | 400 lines; `saveChapterProse`, `getChapterCheckpoints`, `updateProjectWordCount` + Phase 4 actions; auth + ownership guards |
| `src/app/api/generate/chapter/route.ts` | SSE streaming route with adjustments support | VERIFIED | `adjustments?: string` in `GenerateChapterBody`; passed to `buildChapterPrompt(context, adjustments)`; streams OpenRouter response as `text/event-stream` |
| `src/components/chapters/chapter-editor.tsx` | Tiptap rich text editor with custom extensions | VERIFIED | 345 lines; SceneBreak (atom node), AuthorNote (aside node), ToolbarButton, `useDebouncedCallback(600)`, `immediatelyRender: false` |
| `src/app/(dashboard)/projects/[id]/chapters/page.tsx` | Server component loading outline + checkpoints | VERIFIED | 107 lines; auth, project ownership, outline approval guard, memory guard; renders ChapterPanel |
| `src/components/chapters/chapter-list.tsx` | Scrollable list with status badges | VERIFIED | 277 lines; STATUS_CONFIG, StatusBadge, GenerateNext button, per-row Generate button; collapsed mode for checkpoint view |
| `src/components/chapters/chapter-streaming-view.tsx` | Streaming prose view with typing cursor | VERIFIED | 220 lines; paragraph split on `\n\n`, typing cursor on last paragraph while `isStreaming`, auto-scroll via `scrollTo`, Stop button |
| `src/components/chapters/chapter-panel.tsx` | Top-level orchestrator | VERIFIED | 620 lines; `useChapterStream`, generation flow, compression trigger, rewrite flow, approve flow, two-panel layout, CheckpointPanel integration |
| `src/components/chapters/rewrite-dialog.tsx` | Modal dialog for rewrite adjustments | VERIFIED | 304 lines; Guided + Advanced modes, scene-level scope, disabled submit when empty, resets on close |
| `src/components/chapters/phase-nav.tsx` | Phase navigation bar | VERIFIED | 123 lines; PHASES config, completed/active/future states, connector lines, generation guard confirmation |
| `src/components/chapters/progress-bar.tsx` | Progress bar with milestone markers | VERIFIED | 110 lines; TARGET_WORDS map, MILESTONES=[25,50,75,100], diamond markers, chapter count + word count labels |
| `src/app/(dashboard)/projects/[id]/page.tsx` | Project router with writing → chapters redirect | VERIFIED | `status === 'writing'` redirects to `/projects/${id}/chapters`; fallback also goes to chapters |
| `src/components/dashboard/project-card.tsx` | Dashboard card with chapter progress | VERIFIED | `showProgress = status === 'writing' && chapter_count > 0`; chapters_done/chapter_count bar; word count display |
| `src/app/api/generate/compress-chapter/route.ts` | Post-stream compression route | VERIFIED | Full implementation; authenticates, compresses via OpenRouter, calls `saveChapterCheckpoint`, returns result |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `use-chapter-stream.ts` | `/api/generate/chapter` | `fetch POST with projectId, chapterNumber, adjustments` | WIRED | Line 49: `fetch('/api/generate/chapter', { method: 'POST', body: JSON.stringify({ projectId, chapterNumber, adjustments }) })` |
| `chapters.ts` | `chapter_checkpoints` table | `supabase upsert/select` | WIRED | `saveChapterProse` upserts on conflict `project_id,chapter_number`; `getChapterCheckpoints` selects all ordered by chapter_number |
| `chapters/page.tsx` | `outlines` + `chapter_checkpoints` | `supabase select + getChapterCheckpoints()` | WIRED | Fetches outline from `outlines` table (line 44); calls `getChapterCheckpoints(id)` (line 61) — separate calls, both present |
| `chapter-streaming-view.tsx` | `use-chapter-stream.ts` | `useChapterStream` hook | WIRED | `chapter-panel.tsx` line 86: `const { streamedText, isStreaming, error, wordCount, startStream, stop } = useChapterStream()`; props passed to ChapterStreamingView |
| `chapter-panel.tsx` | `use-chapter-stream.ts` | `useChapterStream` hook | WIRED | Line 86: `useChapterStream()` called; `startStream` called in `handleGenerate`; `stop` passed to ChapterStreamingView |
| `chapter-panel.tsx` | `chapter-list.tsx` | `ChapterList` component | WIRED | Import line 6; rendered at line 460 with all required props |
| `chapter-panel.tsx` | `chapter-streaming-view.tsx` | `ChapterStreamingView` component | WIRED | Import line 7; rendered at line 478 with `streamedText`, `isStreaming`, `wordCount`, `error`, `onStop`, `onRetry` |
| `chapter-panel.tsx` | `chapter-editor.tsx` | `ChapterEditor` component | WIRED | Import line 8; rendered at line 548 with `initialContent`, `onSave` |
| `chapter-panel.tsx` | `/api/generate/compress-chapter` | `fetch POST after stream completes` | WIRED | Line 165: `fetch('/api/generate/compress-chapter', { method: 'POST', body: JSON.stringify({ projectId, chapterNumber, chapterTitle, chapterText: streamedText }) })` |
| `chapter-editor.tsx` | `onSave callback prop` | `useDebouncedCallback on editor onUpdate` | WIRED | Line 166: `useDebouncedCallback(async (text) => { await onSave(text) }, 600)` called in `onUpdate` handler |
| `projects/[id]/page.tsx` | `/projects/[id]/chapters` | `redirect when status is writing` | WIRED | Lines 69-74: `if (status === 'writing') { redirect('/projects/${id}/chapters') }` and fallback redirect |
| `layout.tsx` | `phase-nav.tsx` | `ProjectPhaseNav → PhaseNav` | WIRED | `layout.tsx` imports `ProjectPhaseNav`; `project-phase-nav.tsx` imports and renders `PhaseNav` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CHAP-01 | 03-01, 03-03 | AI generates chapters one at a time, streaming prose in real time | SATISFIED | `startStream` in `use-chapter-stream.ts` POSTs to chapter route; SSE piped through TextDecoderStream; one chapter generated per call |
| CHAP-02 | 03-01, 03-03 | User can watch prose appear via real-time streaming (SSE) | SATISFIED | Route returns `text/event-stream` response; hook reads SSE chunks; `ChapterStreamingView` renders accumulated text with typing cursor |
| CHAP-03 | 03-01 | Generated chapter prose is saved to database | SATISFIED | `compress-chapter` route calls `saveChapterCheckpoint` (upserts `chapter_text` into `chapter_checkpoints`); `saveChapterProse` available for auto-save |
| CHAP-04 | 03-01, 03-04 | User can request a rewrite with style/tone adjustments | SATISFIED | `RewriteDialog` collects Guided or Advanced adjustments; `handleRewrite` calls `handleGenerate` with adjustments; `buildChapterPrompt` appends "## Rewrite Adjustments" section |
| CHAP-05 | 03-02 | User can manually edit generated prose inline | SATISFIED | `ChapterEditor` with Tiptap 3, StarterKit + SceneBreak + AuthorNote; toolbar with Bold/Italic/H2/H3/SceneBreak/AuthorNote; `editingChapter` state in ChapterPanel toggles editor |
| PROG-01 | 03-03, 03-04 | User can see a chapter list with status indicators | SATISFIED | `ChapterList` with STATUS_CONFIG: pending/generating/checkpoint/approved badges; per-row status derived from `checkpointMap` and `generatingChapter` in `deriveChapterList()` |
| PROG-02 | 03-04, 03-05 | User can see total word count and percentage complete | SATISFIED | `ProgressBar` shows `wordCount.toLocaleString() / targetWords.toLocaleString() words` and `chaptersDone/totalChapters` fill percentage; dashboard card shows same |
| PROG-03 | 03-04, 03-05 | User always knows where they are in the novel-writing process | SATISFIED | `PhaseNav` in `layout.tsx` renders on ALL project pages (not just chapters); pathname-derived `currentPhase` highlights correct phase; completed phases show checkmarks |

**All 8 requirements (CHAP-01 through CHAP-05, PROG-01 through PROG-03) are SATISFIED.**

---

## Notable Deviations (Non-Blocking)

### Plan 01 Truth 2: "useChapterStream supports pause (abort + save text), stop, and tracks streaming/paused state"

The actual hook exports only `stop()` — there is no `isPaused` state, no `pause()` function, and no `resume()` function. This is an intentional design simplification documented in the 03-01 SUMMARY (the `resume()` pattern was noted as "caller re-triggers startStream").

**Impact assessment:** The `stop()` function preserves `streamedText` (does not call `setStreamedText('')`), giving the user a stop-and-preserve behavior. The ChapterPanel exposes a `handleRetry` function to restart the stream. The REQUIREMENTS-level requirement (CHAP-02) says only "user can watch prose appear via real-time streaming" — it does not require pause/resume. The phase goal does not mention pause. This deviation does not block any requirement or phase goal truth.

### Plan 03 Key Link: "from.*outlines.*chapter_checkpoints" (single join)

The chapters page fetches `outlines` and `chapter_checkpoints` in two separate queries (not a join). Both queries execute and both results are used to render `ChapterPanel`. This is functionally equivalent — the data is present. The query pattern differs from the plan's expectation of a single combined query, but the outcome (both datasets available to ChapterPanel) is achieved.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `rewrite-dialog.tsx` | 226, 239, 252, 265 | `placeholder=` HTML attribute in form inputs | Info | Expected — HTML placeholder text for form fields, not code stubs |
| `chapter-editor.tsx` | 264 | `content: attr(data-placeholder)` in CSS | Info | Expected — ProseMirror empty-paragraph placeholder CSS, not a stub |

No blocker or warning-level anti-patterns found. All `placeholder` references are legitimate HTML/CSS form UX patterns, not stub implementations.

---

## Human Verification Required

### 1. Real-Time Streaming Prose

**Test:** Open a project with an approved outline. Navigate to Chapters. Select Chapter 1 and click "Generate." Watch the right panel.
**Expected:** Prose tokens appear progressively in the streaming view; typing cursor (vertical bar) pulses on the last paragraph; live word count badge updates in the header; the prose auto-scrolls to follow the cursor.
**Why human:** SSE streaming behavior and DOM animation cannot be verified statically.

### 2. Stop and Resume Workflow

**Test:** Start generating a chapter. Click "Stop" mid-stream. Observe the text. Then click "Generate" again for the same chapter.
**Expected:** Clicking Stop halts generation and preserves the streamed text in the view. Starting a new generation resets and begins fresh (no "ReadableStream locked" error in console).
**Why human:** AbortController behavior and state reset on re-stream requires live execution.

### 3. Rewrite Dialog — Guided and Advanced Modes

**Test:** After a chapter is generated, click "Rewrite." Try (a) Guided mode: fill in Tone field only and submit. Try (b) Advanced mode: type a free-text instruction and submit.
**Expected:** Submit button is disabled with empty fields. After submission, the chapter begins regenerating. The adjustments appear in the generation prompt (verifiable via network inspection of the POST body).
**Why human:** Dialog interaction and prompt injection require live execution.

### 4. Tiptap Editor — Novel Extensions

**Test:** After chapter generation, click "Edit." Type content. Click the Scene Break toolbar button. Click the Author Note toolbar button.
**Expected:** Scene break renders as centered "* * *" separator. Author note renders as amber-styled aside with "Author Note:" prefix. Typing triggers auto-save after 600ms (verifiable via network tab showing POST to saveChapterProse). Word count badge updates.
**Why human:** ProseMirror DOM rendering and debounce timing require a browser.

### 5. Phase Nav — Visual State and Generation Guard

**Test:** Navigate between Intake / Outline / Chapters tabs while a chapter is generating.
**Expected:** Current phase is highlighted with primary/10 background. Completed phases show checkmarks. Clicking away while generating shows a confirmation dialog: "A chapter is being generated. Leaving now will lose the generated text."
**Why human:** Visual active states and generation guard dialog require live interaction.

### 6. Dashboard Chapter Progress

**Test:** Visit the dashboard with at least one project in "writing" status that has chapters done.
**Expected:** Project card shows a thin progress bar with "X/Y chapters" and word count. The bar fill width matches chapters_done/chapter_count. Word count does not appear twice (it moves from the top row into the progress section).
**Why human:** Dashboard card visual rendering requires a real project in writing status.

---

## Gaps Summary

No gaps. All 12 observable truths are verified. All 14 key artifacts exist and are substantive (no stubs). All 12 key links are wired. All 8 requirements (CHAP-01 through CHAP-05, PROG-01 through PROG-03) are satisfied. The plan-01 pause/resume deviation is non-blocking and pre-documented in the SUMMARY. Six items require human verification for full confidence.

---

_Verified: 2026-03-03T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
