---
phase: 03-chapter-generation
plan: "03"
subsystem: chapter-generation
tags: [ui, streaming, chapter-list, status-badges, typing-cursor, server-component]
dependency_graph:
  requires:
    - 03-01 (useChapterStream hook, getChapterCheckpoints server action)
  provides:
    - /projects/[id]/chapters server page
    - ChapterList component with status badges
    - ChapterStreamingView with typing cursor
    - ChapterPanel stub (ready for Plan 04 orchestrator)
  affects:
    - src/app/(dashboard)/projects/[id]/chapters/page.tsx
    - src/components/chapters/chapter-list.tsx
    - src/components/chapters/chapter-streaming-view.tsx
    - src/components/chapters/chapter-panel.tsx
tech_stack:
  added: []
  patterns:
    - Server component auth + outline guard pattern (follows outline/page.tsx)
    - supabase as any workaround for PostgREST v12 type incompatibility
    - animate-pulse blinking cursor effect for streaming typography
    - Auto-scroll sentinel div with scrollIntoView (streaming-only, not post-pause)
    - STATUS_CONFIG lookup table with icon + color + label per status variant
key_files:
  created:
    - src/app/(dashboard)/projects/[id]/chapters/page.tsx
    - src/components/chapters/chapter-list.tsx
    - src/components/chapters/chapter-streaming-view.tsx
    - src/components/chapters/chapter-panel.tsx
  modified: []
decisions:
  - ChapterPanel stub created as Plan 03-03 deviation (blocking Rule 3) to allow page.tsx to compile before Plan 04 orchestrator ships
  - Status badge config as const lookup table — avoids switch statements, tree-shakeable icon imports
  - Typing cursor implemented as inline animate-pulse span on last paragraph (not pseudo-element) for React compatibility
  - Auto-scroll only fires when isStreaming=true — prevents scroll jump when user reads paused text
  - outline status !== 'approved' redirects to /outline — user must approve before chapter generation
metrics:
  duration: "~2 min"
  completed: "2026-03-02"
  tasks: 3
  files_created: 4
  files_modified: 0
---

# Phase 3 Plan 03: Chapter Management UI and Streaming View Summary

**One-liner:** Chapter server page with outline/memory guards, scrollable chapter list with four-state status badges, and streaming prose view with blinking typing cursor effect.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create chapters server page | 7d396ca | src/app/(dashboard)/projects/[id]/chapters/page.tsx, src/components/chapters/chapter-panel.tsx |
| 2 | Create ChapterList component with status badges | 05fc4bb | src/components/chapters/chapter-list.tsx |
| 3 | Create ChapterStreamingView with typing cursor effect | f914fe4 | src/components/chapters/chapter-streaming-view.tsx |

## What Was Built

### Task 1: Chapters server page

`src/app/(dashboard)/projects/[id]/chapters/page.tsx` is a Next.js App Router server component that:
- Authenticates the user (redirects to /login if unauthenticated)
- Fetches project with ownership verification (redirects to /dashboard if missing)
- Fetches outline and checks `status === 'approved'` — redirects to `/projects/${id}/outline` if not approved
- Fetches all chapter checkpoints via `getChapterCheckpoints(id)`
- Checks `project_memory` exists — renders an inline error state with an "Go to Intake" link if missing (does not render ChapterPanel)
- Renders `ChapterPanel` with: `projectId`, `projectTitle`, `outlineChapters`, `checkpoints`, `chapterCount`, `targetLength`, `projectWordCount`, `chaptersDone`

### Task 2: ChapterList component

`src/components/chapters/chapter-list.tsx` exports `ChapterList` (`'use client'`) with:
- `ChapterListProps`: chapters array, selectedIndex, onSelect, onGenerate, generatingChapter
- `STATUS_CONFIG` as const lookup with `Clock | Loader2 | BookOpen | CheckCircle` icons and color variants for `pending | generating | checkpoint | approved`
- `StatusBadge` internal component: colored pill with icon (Loader2 animates with `animate-spin` when generating)
- "Generate Next Chapter" button at top: triggers first pending chapter, disabled and shows Loader2 when any chapter is generating
- Per-row "Generate" button (Sparkles icon) only for pending chapters; replaced by Loader2 for the currently generating chapter
- Selected row: `ring-2 ring-inset ring-primary/40` + `bg-muted` highlight
- `overflow-y-auto` + `flex-1` for scroll within panel

### Task 3: ChapterStreamingView

`src/components/chapters/chapter-streaming-view.tsx` exports `ChapterStreamingView` (`'use client'`) with:
- **Header**: chapter title, live word count badge (updates during streaming), pulsing green dot (streaming) or amber dot (paused)
- **Prose area**: paragraphs split on `\n\n`, rendered as `<p>` elements within `prose prose-sm max-w-none` container
- **Typing cursor**: `animate-pulse` inline vertical bar (`bg-foreground w-[2px] h-[1em]`) appended to last paragraph while `isStreaming=true`
- **Auto-scroll**: sentinel `<div ref={sentinelRef}>` at bottom, `scrollIntoView({ behavior: 'smooth' })` fires on `streamedText` changes only while `isStreaming`
- **Control bar states**: streaming (Pause + Stop buttons + Loader2 spinner), paused (Resume + Stop + preservation note), error (inline error card + Retry button), done (word count message)
- **Error state**: prominent inline card with `AlertCircle` icon, destructive color scheme

### Deviation: ChapterPanel stub (Rule 3 — blocking issue)

`ChapterPanel` is the Plan 04 orchestrator but `chapters/page.tsx` imports it. Created a minimal placeholder (`chapter-panel.tsx`) to allow TypeScript to compile. The stub renders a simple loading message; Plan 04 replaces it with the full implementation.

## Verification

- `npx tsc --noEmit` passes cleanly (all 3 tasks verified)
- Chapters page guards: unapproved outline redirects to outline page; missing memory shows error state
- ChapterList renders all four status badges with correct icons and color variants
- ChapterStreamingView shows typing cursor during streaming, hides when stopped
- All components follow established patterns (use client directive, lucide icons, Tailwind styling, supabase as any)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created ChapterPanel stub to unblock TypeScript compilation**
- **Found during:** Task 1
- **Issue:** `chapters/page.tsx` imports `ChapterPanel` which is the Plan 04 orchestrator. Without a stub, TypeScript would fail to compile.
- **Fix:** Created `src/components/chapters/chapter-panel.tsx` as a minimal placeholder with the correct prop types. Plan 04 will replace this with the full orchestrator.
- **Files modified:** src/components/chapters/chapter-panel.tsx (created)
- **Commit:** 7d396ca (same commit as Task 1)

## Self-Check: PASSED

Files exist:
- src/app/(dashboard)/projects/[id]/chapters/page.tsx: FOUND
- src/components/chapters/chapter-list.tsx: FOUND
- src/components/chapters/chapter-streaming-view.tsx: FOUND
- src/components/chapters/chapter-panel.tsx: FOUND

Commits exist:
- 7d396ca: FOUND (feat(03-03): create chapters server page)
- 05fc4bb: FOUND (feat(03-03): create ChapterList component with status badges)
- f914fe4: FOUND (feat(03-03): create ChapterStreamingView with typing cursor effect)
