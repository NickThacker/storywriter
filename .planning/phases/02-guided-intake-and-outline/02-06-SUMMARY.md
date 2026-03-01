---
phase: 02-guided-intake-and-outline
plan: 06
subsystem: ui
tags: [react, nextjs, streaming, inline-editing, debounce, beat-sheets, timeline, two-panel, outline]

# Dependency graph
requires:
  - phase: 02-05
    provides: useOutlineStream hook, saveOutline/getOutline/updateOutlineChapter server actions
  - phase: 02-01
    provides: OutlineRow, OutlineChapter types, outlines table schema
  - phase: 02-04
    provides: IntakeData type, intake wizard data flow
  - phase: 02-02
    provides: beat-sheets data with positionPercent for timeline positioning

provides:
  - Full outline viewer/editor at /projects/[id]/outline
  - OutlinePanel: two-panel layout shell (chapter list + chapter detail) with streaming/viewing modes
  - ChapterList: left panel with act grouping, selection state, beat mapping labels
  - ChapterDetail: right panel with inline editing for title, summary, beats, character display
  - InlineEditable: reusable reveal-on-click input component (not contentEditable)
  - OutlineTimeline: horizontal timeline with chapter nodes colored by act, beat labels at positionPercent
  - BeatSheetOverlay: beat-to-chapter mapping grid with switchable beat sheet comparison
  - StreamingView: real-time outline generation display with auto-scrolling

affects:
  - 02-07
  - phase-03

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic local state update for chapter edits: setOutline locally, fire updateOutlineChapter server action, notify on error — no revalidatePath"
    - "InlineEditable: reveal-on-click input/textarea (NOT contentEditable) per research pitfall recommendation"
    - "Debounced auto-save at 600ms via useDebouncedCallback — consistent with PROJ-05 pattern from Phase 1"
    - "Two-panel layout: 35% chapter list / 65% chapter detail with collapsible timeline below"

key-files:
  created:
    - src/app/(dashboard)/projects/[id]/outline/page.tsx
    - src/components/outline/outline-panel.tsx
    - src/components/outline/streaming-view.tsx
    - src/components/outline/chapter-list.tsx
    - src/components/outline/chapter-detail.tsx
    - src/components/outline/inline-editable.tsx
    - src/components/outline/outline-timeline.tsx
    - src/components/outline/beat-sheet-overlay.tsx
  modified: []

key-decisions:
  - "Optimistic chapter edits: setOutline locally then server action — no revalidatePath per research pitfall 6 (avoids selection state reset)"
  - "InlineEditable uses reveal-on-click input (not contentEditable) — avoids React cursor/paste/re-render conflicts"
  - "BeatSheetOverlay beat sheet switching is comparison-only (view-only) — does not regenerate outline"
  - "Timeline uses flex positioning with positionPercent from beat-sheets.ts for beat label placement"
  - "Approve Outline button present in toolbar but disabled — implementation deferred to Plan 07"

patterns-established:
  - "Outline two-panel layout: ChapterList (35%) + ChapterDetail (65%) with collapsible timeline/overlay below"
  - "InlineEditable component: click-to-edit wrapper, view mode shows edit icon on hover, edit mode reveals input"
  - "Beat sheet switching: BeatSheetOverlay accepts onChangeBeatSheet callback, parent manages beatSheetId state"

requirements-completed: [OUTL-02, OUTL-03]

# Metrics
duration: 8min
completed: 2026-03-01
---

# Phase 2 Plan 06: Outline Viewer/Editor UI Summary

**Two-panel outline viewer/editor at /projects/[id]/outline with click-to-edit inline fields, act-colored timeline, switchable beat sheet overlay, and real-time streaming view**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-01T19:29:11Z
- **Completed:** 2026-03-01T19:37:00Z
- **Tasks:** 3
- **Files modified:** 8 (all created)

## Accomplishments
- Full outline page server component with project ownership verification and outline/intake data fetching
- Two-panel client layout: scrollable chapter list (35%) grouped by act with chapter detail panel (65%)
- InlineEditable reusable component using reveal-on-click input pattern — title, summary, and each beat are individually editable
- Optimistic state update for chapter edits with debounced 600ms auto-save via updateOutlineChapter
- Horizontal timeline with chapter nodes colored by act (blue/amber/green) and beat labels at positionPercent positions
- Beat sheet overlay with 4-option dropdown for comparison-only switching, showing beat-to-chapter mappings

## Task Commits

Each task was committed atomically:

1. **Task 1: Create outline page and two-panel layout shell** - `dd29fb9` (feat)
2. **Task 2: Create chapter list, chapter detail, and inline editable components** - `0239d87` (feat)
3. **Task 3: Create beat sheet overlay and outline timeline** - `745e0d6` (feat)

## Files Created/Modified
- `src/app/(dashboard)/projects/[id]/outline/page.tsx` - Server component: auth, project fetch, outline fetch, redirect logic, passes to OutlinePanel
- `src/components/outline/outline-panel.tsx` - Two-panel layout shell: toolbar, chapter list/detail panels, BeatSheetOverlay, collapsible OutlineTimeline, streaming/generation states
- `src/components/outline/streaming-view.tsx` - Real-time generation display: auto-scroll, progress animation, error state with retry
- `src/components/outline/chapter-list.tsx` - Left panel: act-grouped chapter list with selection, beat mapping labels, character tags, act-colored badges
- `src/components/outline/chapter-detail.tsx` - Right panel: InlineEditable title/summary/beats, add/remove beats, character display
- `src/components/outline/inline-editable.tsx` - Reusable click-to-edit wrapper: view/edit modes, input (single line) or textarea (multiline), blur/Enter/Ctrl+Enter save, Escape cancel
- `src/components/outline/outline-timeline.tsx` - Horizontal chapter timeline: act-colored nodes, beat label positioning at positionPercent, clickable to select
- `src/components/outline/beat-sheet-overlay.tsx` - Beat-to-chapter mapping grid with shadcn Select dropdown, fuzzy chapter matching

## Decisions Made
- **Optimistic chapter edits:** Local state updates immediately on edit, server action fires async. No revalidatePath to avoid resetting selectedChapterIndex (per research pitfall 6).
- **InlineEditable approach:** Reveal-on-click input/textarea instead of contentEditable — avoids well-documented React cursor position and paste handling issues.
- **Beat sheet comparison is view-only:** BeatSheetOverlay dropdown changes visualization only. Regeneration with a new beat sheet is a Plan 07 feature.
- **Approve Outline button disabled:** Present in toolbar as a placeholder — full implementation deferred to Plan 07 (approve/regenerate flow).
- **Timeline uses positionPercent:** Beat labels positioned using the existing positionPercent field from beat-sheets.ts, giving accurate percentage-based positioning.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Complete outline UI is in place — Plan 07 can wire up approve/regenerate actions
- InlineEditable component is reusable for any future click-to-edit fields
- useOutlineStream hook already integrated in OutlinePanel — Plan 07 can trigger regeneration by calling startStream
- BeatSheetOverlay already has onChangeBeatSheet callback wired — Plan 07 can extend for regeneration

---
*Phase: 02-guided-intake-and-outline*
*Completed: 2026-03-01*

## Self-Check: PASSED

All created files verified present:
- FOUND: src/app/(dashboard)/projects/[id]/outline/page.tsx
- FOUND: src/components/outline/outline-panel.tsx
- FOUND: src/components/outline/streaming-view.tsx
- FOUND: src/components/outline/chapter-list.tsx
- FOUND: src/components/outline/chapter-detail.tsx
- FOUND: src/components/outline/inline-editable.tsx
- FOUND: src/components/outline/outline-timeline.tsx
- FOUND: src/components/outline/beat-sheet-overlay.tsx

All task commits verified:
- FOUND: dd29fb9 feat(02-06): create outline page and two-panel layout shell
- FOUND: 0239d87 feat(02-06): create chapter list, chapter detail, and inline editable components
- FOUND: 745e0d6 feat(02-06): create beat sheet overlay and outline timeline
