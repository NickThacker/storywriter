---
phase: 04-creative-checkpoints
plan: 02
subsystem: checkpoint-ui
tags: [checkpoint, approval, rewrite, scene-detection, ui]
dependency_graph:
  requires:
    - 04-01
  provides:
    - checkpoint-panel-ui
    - scene-level-rewrite
    - chapter-approval-flow
  affects:
    - chapter-generation-ux
tech_stack:
  added: []
  patterns:
    - optimistic-update-with-rollback
    - guided-mode-with-advanced-toggle
    - slide-in-panel-layout
    - scene-boundary-detection
key_files:
  created:
    - src/components/chapters/checkpoint-panel.tsx
    - src/components/chapters/checkpoint-step-approve.tsx
    - src/lib/checkpoint/scene-utils.ts
  modified:
    - src/components/chapters/chapter-panel.tsx
    - src/components/chapters/chapter-list.tsx
    - src/components/chapters/rewrite-dialog.tsx
decisions:
  - "showCheckpoint computed via useMemo combining showStreamingView + approval_status + editingChapter — avoids recalculating on every render"
  - "handleSceneRewrite declared after selectedCheckpoint to satisfy TypeScript block-scoped var rule (not before-declaration use)"
  - "scene-level prompt approach: AI instructed to rewrite only the selected scene in-place; stitchScenes available for v2 post-generation safety net"
  - "SCENE_BREAK_PATTERN.lastIndex reset to 0 before exec loop (module-level regex with /g flag requires manual reset)"
metrics:
  duration: "5 minutes"
  completed_date: "2026-03-02"
  tasks_completed: 3
  files_changed: 6
---

# Phase 04 Plan 02: Checkpoint Panel UI Summary

Checkpoint panel UI with slide-in layout, chapter approval flow, guided rewrite dialog, and scene-level rewrite support using scene boundary detection.

## What Was Built

### CheckpointPanel (src/components/chapters/checkpoint-panel.tsx)
Two-step shell that slides in alongside chapter text (45% width) when a chapter is unapproved. Step indicator bar shows progress through Step 1 (approve/rewrite) and Step 2 (direction selection, placeholder for Plan 03). Handles approve-and-continue vs approve-final-chapter branching.

### CheckpointStepApprove (src/components/chapters/checkpoint-step-approve.tsx)
Step 1 of the checkpoint: displays a 2-column stats grid (word count, characters featured, threads advanced/resolved/new, foreshadowing planted, continuity facts, continuity notes count) extracted from the checkpoint's `state_diff` field. Approve & Continue and Request Rewrite buttons. Continuity notes rendered as bordered left-line list items.

### scene-utils.ts (src/lib/checkpoint/scene-utils.ts)
Scene boundary detection via regex matching `\n\n(*** | --- | * * *)\n\n`. Returns `DetectedScene[]` with index, label (first sentence truncated to 80 chars), startOffset/endOffset for stitching, and full scene text. Returns `null` when fewer than 2 scenes detected (graceful fallback). `stitchScenes` replaces a single scene using char offsets while preserving break markers.

### ChapterPanel updates (src/components/chapters/chapter-panel.tsx)
- Post-compression toast: `toast.success('Chapter ready — Review checkpoint', { action: { label: 'Review', onClick: ... }, duration: 8000 })` — fires after checkpoint map is updated (Pitfall 1 fix: map updated before generatingChapter cleared)
- `deriveChapterList`: uses `approval_status ?? 'draft'` to emit `'approved'` status; adds `isAffected` field from checkpoint.affected
- Slide-in layout: main content transitions between 55%/100% width, checkpoint panel transitions between 45%/0 width + opacity
- `handleApprove`: optimistic update + rollback on server error via `approveChapter` server action
- `handleDirectionSaved`: updates `direction_for_next` in local checkpoint map
- `handleGenerate`: reads `checkpointMap.get(chapterNumber - 1)?.direction_for_next` and prepends to adjustments
- `handleSceneRewrite`: builds scene-specific adjustments string with scene text and "rewrite only Scene N" instruction

### RewriteDialog updates (src/components/chapters/rewrite-dialog.tsx)
- Guided mode (default): tone, pacing, character focus text inputs; assembled into newline-separated adjustments string
- Advanced toggle: switches to original free-text textarea
- Scene scope selector: only shown when `detectScenes(chapterText)` returns results; radio group for Full Chapter / Selected Scene
- Scene list: clickable rows with primary ring on selected scene; submit label changes to "Rewrite Scene"
- `onSceneRewrite` optional callback; falls back to `onRewrite` for full chapter
- All fields reset on dialog close

### ChapterList updates (src/components/chapters/chapter-list.tsx)
- `isAffected: boolean` added to `ChapterListItem` interface
- Amber `AlertTriangle` "Affected" badge renders alongside status badge when `isAffected` is true

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript: block-scoped variable used before declaration**
- **Found during:** Task 1 TypeScript verification
- **Issue:** `handleSceneRewrite` referenced `selectedCheckpoint` in its dependency array and closure, but `selectedCheckpoint` was declared 60+ lines later in the same function. TypeScript (strict mode) caught this as TS2448.
- **Fix:** Moved `handleSceneRewrite` to after the `selectedCheckpoint` declaration, removing the eslint-disable comment that was no longer needed.
- **Files modified:** src/components/chapters/chapter-panel.tsx
- **Commit:** 830c274 (fixed inline before final commit)

**2. [Rule 1 - Bug] Module-level regex with /g flag needs lastIndex reset**
- **Found during:** Task 3 implementation review
- **Issue:** `SCENE_BREAK_PATTERN` is a module-level constant regex with the `/g` flag. When `exec()` is called in a loop, `lastIndex` persists across calls to `detectScenes`. Subsequent calls to `detectScenes` would start matching from the wrong position.
- **Fix:** Added `SCENE_BREAK_PATTERN.lastIndex = 0` before the `while` loop in `detectScenes`.
- **Files modified:** src/lib/checkpoint/scene-utils.ts
- **Commit:** 7020457

## Self-Check: PASSED

All 6 key files exist on disk. All 3 task commits found in git log:
- 830c274: ChapterPanel updates
- 79504ca: CheckpointPanel + CheckpointStepApprove
- 7020457: scene-utils + RewriteDialog + chapter-list
