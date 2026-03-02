---
phase: 03-chapter-generation
plan: "01"
subsystem: chapter-generation
tags: [streaming, server-actions, sse, hooks, prose]
dependency_graph:
  requires: []
  provides:
    - useChapterStream hook (SSE consumer with pause/stop/resume)
    - saveChapterProse server action
    - getChapterCheckpoints server action
    - updateProjectWordCount server action
    - adjustments support in chapter generation route
  affects:
    - src/app/api/generate/chapter/route.ts
    - src/lib/memory/chapter-prompt.ts
tech_stack:
  added: []
  patterns:
    - AbortController ref pattern for SSE abort management
    - useCallback with no deps for stable abort-safe event handlers
    - supabase as any workaround for PostgREST v12 type incompatibility
    - verifyProjectOwnership helper (local, matches project-memory.ts pattern)
    - Debounce-safe server action (no revalidatePath in saveChapterProse)
key_files:
  created:
    - src/hooks/use-chapter-stream.ts
    - src/actions/chapters.ts
  modified:
    - src/app/api/generate/chapter/route.ts
    - src/lib/memory/chapter-prompt.ts
decisions:
  - saveChapterProse omits revalidatePath to prevent client state reset on debounced auto-save
  - resume() only clears isPaused flag — caller re-triggers startStream for actual stream restart (prevents duplicate streams)
  - startStream always aborts any existing controller first to prevent ReadableStream locked error
  - Full project tsc used for verification (single-file tsc fails on @/ path aliases, which is expected)
metrics:
  duration: "~2 min"
  completed: "2026-03-02"
  tasks: 3
  files_created: 2
  files_modified: 2
---

# Phase 3 Plan 01: Chapter Generation Foundation Summary

**One-liner:** SSE streaming hook with pause/stop/resume, three chapter server actions (save/fetch/wordcount), and rewrite adjustments passthrough via buildChapterPrompt.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create useChapterStream hook | 4982009 | src/hooks/use-chapter-stream.ts |
| 2 | Create chapter server actions | 4a43ff6 | src/actions/chapters.ts |
| 3 | Add adjustments support to chapter generation route | a076eb2 | src/app/api/generate/chapter/route.ts, src/lib/memory/chapter-prompt.ts |

## What Was Built

### Task 1: useChapterStream hook

`src/hooks/use-chapter-stream.ts` exports `useChapterStream()` returning:
- `streamedText`, `isStreaming`, `isPaused`, `error`, `wordCount` state
- `startStream(projectId, chapterNumber, adjustments?)` — POSTs to `/api/generate/chapter`, pipes SSE, accumulates raw prose tokens (not JSON), updates live word count
- `pause()` — aborts controller, sets isPaused=true, preserves streamedText
- `resume()` — clears isPaused (caller re-triggers startStream)
- `stop()` — aborts controller, clears isStreaming and isPaused

Uses `useRef<AbortController | null>` for abort management. Silently returns on AbortError (intentional pause/stop). Mirrors useOutlineStream SSE parsing pattern.

### Task 2: Chapter server actions

`src/actions/chapters.ts` exports three server actions:
- `saveChapterProse(projectId, chapterNumber, text)` — upserts chapter_text into chapter_checkpoints on conflict `project_id,chapter_number`. No revalidatePath (auto-save safe).
- `getChapterCheckpoints(projectId)` — selects all checkpoints ordered by chapter_number ascending.
- `updateProjectWordCount(projectId)` — sums word counts across all checkpoints, counts chapters with non-empty text, updates projects.word_count and projects.chapters_done, then calls revalidatePath.

All three authenticate the user and verify project ownership via local verifyProjectOwnership helper (same pattern as project-memory.ts).

### Task 3: Adjustments support

`GenerateChapterBody` interface in `route.ts` adds optional `adjustments?: string` field. Route extracts it and passes to `buildChapterPrompt(context, adjustments)`.

`buildChapterPrompt` in `chapter-prompt.ts` accepts optional second parameter. When adjustments is a non-empty string, appends a "## Rewrite Adjustments" section to the userMessage with the author's requested changes.

## Verification

- `npx tsc --noEmit` passes cleanly for full project (all 3 tasks)
- useChapterStream exports all documented return values
- chapters.ts exports saveChapterProse, getChapterCheckpoints, updateProjectWordCount
- Route handler accepts adjustments in request body
- buildChapterPrompt appends adjustments section when provided

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- src/hooks/use-chapter-stream.ts: FOUND
- src/actions/chapters.ts: FOUND
- src/app/api/generate/chapter/route.ts: FOUND (modified)
- src/lib/memory/chapter-prompt.ts: FOUND (modified)

Commits exist:
- 4982009: FOUND (feat(03-01): create useChapterStream hook)
- 4a43ff6: FOUND (feat(03-01): create chapter server actions)
- a076eb2: FOUND (feat(03-01): add adjustments support to chapter generation route)
