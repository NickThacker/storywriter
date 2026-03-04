---
phase: 05-export-and-billing
plan: 03
subsystem: ui
tags: [export, dialog, radix-ui, download, chapters, next-js]

# Dependency graph
requires:
  - phase: 05-02
    provides: GET /api/export/[projectId] route with format/include/penName query params

provides:
  - "ExportDialog client component with format picker, chapter filter, pen name input, and anchor-based download"
  - "Chapters page project-level header with project title and export button"

affects:
  - 05-04 (billing gating — export dialog is the UI trigger that will be gated)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Anchor-based file download: create anchor, set href to API route, click programmatically, remove anchor"
    - "Toggle-button group pattern for single-select (no radio-group dependency needed)"
    - "Page-level project header wrapping ChapterPanel for project-scoped actions"

key-files:
  created:
    - src/components/export/export-dialog.tsx
  modified:
    - src/app/(dashboard)/projects/[id]/chapters/page.tsx
    - src/components/chapters/chapter-panel.tsx

key-decisions:
  - "Anchor-based download (create anchor, set href, click) instead of window.location.href — avoids navigation away from app"
  - "Button-group toggle pattern for format/include selection — avoids @radix-ui/react-radio-group (not installed)"
  - "Project-level header added to chapters page.tsx, not inside ChapterPanel — keeps project-scoped actions separate from chapter-scoped UI"
  - "ChapterPanel height changed from calc(100vh - 64px - 64px) to h-full — respects flex container from page wrapper"

patterns-established:
  - "ExportDialog: self-contained client component accepting projectId, projectTitle, userName props"
  - "Project actions in chapters page header row (project title + action buttons) above the chapter panel"

requirements-completed: [EXPT-01, EXPT-02, EXPT-03]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 5 Plan 03: Export Dialog UI Summary

**ExportDialog client component with 4-format picker (DOCX/ePub/RTF/TXT), approved-only vs all chapters filter, editable pen name, and anchor-based download — integrated into the chapters page project header**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T05:59:20Z
- **Completed:** 2026-03-04T06:02:11Z
- **Tasks:** 2
- **Files modified:** 1 created + 2 modified

## Accomplishments

- ExportDialog client component with Radix Dialog, format toggle buttons (DOCX, ePub, RTF, TXT), chapter inclusion filter (approved-only or all with [DRAFT] markers), editable pen name field
- Anchor-based download that constructs `/api/export/{projectId}?format=...&include=...&penName=...` and triggers browser file download
- Loading state on export button; dialog closes after triggering download
- Chapters page updated with project-level header row (project title + Export button) above the ChapterPanel
- ChapterPanel height refactored from hard-coded `calc(100vh - 64px - 64px)` to `h-full` to correctly fill flex container

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ExportDialog component** - `d56383f` (feat)
2. **Task 2: Integrate ExportDialog into chapters page header** - `202ff4f` (feat)

## Files Created/Modified

- `src/components/export/export-dialog.tsx` - ExportDialog with format picker, chapter filter, pen name input, anchor download
- `src/app/(dashboard)/projects/[id]/chapters/page.tsx` - Added project-level header with project title and ExportDialog; userName derived from auth metadata
- `src/components/chapters/chapter-panel.tsx` - Changed height from calc() to h-full for proper flex container fill

## Decisions Made

- Anchor-based download (`document.createElement('a')` + `.click()`) rather than `window.location.href` — avoids navigating away from the SPA while still triggering browser file download
- Button-group toggle pattern (Tailwind styled buttons with active state) for format and include selection instead of `@radix-ui/react-radio-group`, which is not in the project's package.json
- ExportDialog placed in a new project-level header in `chapters/page.tsx` (server component), not inside `ChapterPanel` (client component) — keeps project-scoped actions cleanly separated from the chapter management UI
- `ChapterPanel` height updated to `h-full` from `calc(100vh - 64px - 64px)` since it now lives inside a `flex-1 overflow-hidden` container that correctly propagates height

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated ChapterPanel height from hard-coded calc() to h-full**
- **Found during:** Task 2 (Integrate ExportDialog into chapters page header)
- **Issue:** ChapterPanel used `height: calc(100vh - 64px - 64px)` which assumes it directly fills the viewport minus two navbars. Wrapping it in a new flex container in page.tsx made that calculation incorrect (double-subtracting).
- **Fix:** Changed `style={{ height: 'calc(100vh - 64px - 64px)' }}` to `className="flex h-full flex-col"` so it fills whatever height its parent flex container provides
- **Files modified:** `src/components/chapters/chapter-panel.tsx`
- **Verification:** `npx tsc --noEmit` passes; `npm run build` succeeds
- **Committed in:** `202ff4f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - height calc bug)
**Impact on plan:** Required fix for correct layout when page-level header wrapper is introduced. No scope creep.

## Issues Encountered

None beyond the height calc fix above.

## User Setup Required

None — no external service configuration required. The export dialog calls the existing `/api/export/[projectId]` route built in Plan 02.

## Next Phase Readiness

- Export UI complete — users can open the dialog, select format, filter chapters, edit pen name, and download
- 05-04 (billing) can gate the export action by adding a check in ExportDialog or the API route
- No blockers

---
*Phase: 05-export-and-billing*
*Completed: 2026-03-04*

## Self-Check: PASSED

- `src/components/export/export-dialog.tsx` — FOUND
- `src/app/(dashboard)/projects/[id]/chapters/page.tsx` — FOUND (contains ExportDialog)
- `.planning/phases/05-export-and-billing/05-03-SUMMARY.md` — FOUND
- Commit `d56383f` (Task 1: ExportDialog component) — FOUND
- Commit `202ff4f` (Task 2: chapters page integration) — FOUND
- `npx tsc --noEmit` — PASSED (no errors)
- `npm run build` — PASSED
