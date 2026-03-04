---
phase: 05-export-and-billing
plan: 02
subsystem: api
tags: [docx, epub, rtf, export, file-download, next-js]

# Dependency graph
requires:
  - phase: 05-01
    provides: billing database schema and TypeScript types already in place
  - phase: 04
    provides: chapter_checkpoints table with approval_status, chapter_text, chapter_number fields
  - phase: 02
    provides: outlines table with chapters JSON column for chapter title lookup

provides:
  - "Novel export pipeline: chapter assembly + four format builders (DOCX, ePub, RTF, TXT)"
  - "GET /api/export/[projectId] route handler for all formats"
  - "assembleChapters function with auth, project ownership, and include mode filtering"

affects:
  - 05-03 (export UI — will call this route via fetch)

# Tech tracking
tech-stack:
  added:
    - "docx v9.6.0 — DOCX document generation"
    - "epub-gen-memory v1.1.2 — ePub generation from HTML chapter content"
  patterns:
    - "Single GET route handler for all export formats, format selected via query param"
    - "Chapter assembly separated from format building — assembleChapters is format-agnostic"
    - "Buffer-based format builders — all return Buffer for use in Next.js Response"
    - "HTML-escape chapter text before inserting into ePub content (avoid invalid HTML)"
    - "Hand-generated RTF with escapeRtf helper for { } \\ and non-ASCII Unicode escapes"

key-files:
  created:
    - src/lib/export/assemble.ts
    - src/lib/export/docx.ts
    - src/lib/export/epub.ts
    - src/lib/export/rtf.ts
    - src/lib/export/txt.ts
    - src/app/api/export/[projectId]/route.ts

key-decisions:
  - "Manual TOC in DOCX (chapter list as HEADING_2) — avoids Word's Update Field prompt for auto-TOC"
  - "assembleChapters uses (supabase as any) cast pattern matching chapters.ts convention"
  - "Buffer cast to BodyInit required for Next.js Response compatibility with TypeScript strict mode"
  - "epub-gen-memory function signature: epub(options, content) — content is separate second arg, not in options"
  - "force-dynamic on export route to prevent caching of generated files"

patterns-established:
  - "Export route: GET /api/export/[projectId]?format=docx|epub|rtf|txt&include=approved|all&penName=..."
  - "assembleChapters: authenticate -> verify ownership -> fetch outline titles -> fetch checkpoints -> filter -> map to ChapterContent"

requirements-completed: [EXPT-01, EXPT-02, EXPT-03]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 5 Plan 02: Export Pipeline Summary

**Four-format novel export pipeline (DOCX via docx library, ePub via epub-gen-memory, hand-generated RTF for Vellum, plain TXT) with unified GET route at /api/export/[projectId] and shared chapter assembly logic**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T05:53:25Z
- **Completed:** 2026-03-04T05:56:34Z
- **Tasks:** 4
- **Files modified:** 6 created + 2 modified (package.json, package-lock.json)

## Accomplishments

- Chapter assembly function with auth verification, project ownership check, outline title lookup, and approval-status filtering
- DOCX builder using `docx` library: title page, manual TOC, chapter headers, page breaks, inline line break handling
- ePub builder using `epub-gen-memory`: HTML-escaped chapter text, draft markers, per-chapter content
- Hand-generated RTF with proper RTF header, escapeRtf Unicode helper, chapter headings, page breaks
- Plain text builder with title block, TOC, and chapter separators
- Unified export route at `/api/export/[projectId]` with format/include/penName query params, filename slugging, proper Content-Type and Content-Disposition headers

## Task Commits

Each task was committed atomically:

1. **Task 1: Chapter assembly and export type definitions** - `74a4785` (feat)
2. **Task 2: DOCX and ePub format builders** - `16fc8dc` (feat)
3. **Task 3: RTF and TXT hand-generated format builders** - `2350afa` (feat)
4. **Task 4: Unified export API route handler** - `6a730c8` (feat)

## Files Created/Modified

- `src/lib/export/assemble.ts` - ChapterContent/ExportOptions/AssembledBook types; assembleChapters fetches project, outline, and chapter data from Supabase
- `src/lib/export/docx.ts` - buildDocx using docx library: title page, manual TOC, chapters with page breaks
- `src/lib/export/epub.ts` - buildEpub using epub-gen-memory: HTML-escaped content, draft markers
- `src/lib/export/rtf.ts` - buildRtf hand-generated: escapeRtf helper for RTF special chars and Unicode
- `src/lib/export/txt.ts` - buildTxt plain text: title block, TOC, chapter sections
- `src/app/api/export/[projectId]/route.ts` - GET route handler, format switch, filename slug, error handling

## Decisions Made

- Manual TOC in DOCX (list of chapter titles as HEADING_2 paragraphs) instead of Word's auto-TOC field — avoids the "Error! No table of contents entries found" confusion for users (per research pitfall 4)
- epub-gen-memory API: `epub(options, content)` — content array is passed as the second argument, not nested inside the options object
- `Buffer as unknown as BodyInit` cast needed because TypeScript strict mode doesn't accept `Buffer<ArrayBufferLike>` as `BodyInit` in the `new Response()` constructor — this is a well-known Node.js/Next.js type gap
- `force-dynamic` on the export route to prevent Next.js from caching file downloads

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript strict mode Buffer/BodyInit incompatibility**
- **Found during:** Task 4 (Unified export API route handler)
- **Issue:** TypeScript strict mode rejects `Buffer<ArrayBufferLike>` as `BodyInit` in `new Response()` constructor
- **Fix:** Cast `buffer as unknown as BodyInit` in the Response constructor — standard fix for this Node.js/Next.js type gap
- **Files modified:** `src/app/api/export/[projectId]/route.ts`
- **Verification:** `npx tsc --noEmit` passes clean; `npm run build` compiles the route
- **Committed in:** `6a730c8` (Task 4 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type bug)
**Impact on plan:** Single-line cast required for TypeScript compatibility. No scope creep.

## Issues Encountered

None beyond the Buffer type cast above.

## User Setup Required

None — no external service configuration required. The export route uses existing Supabase credentials.

## Next Phase Readiness

- Export backend complete — all four formats build and type-check clean
- Build passes with `/api/export/[projectId]` as a dynamic route
- 05-03 (export UI) can call this route via fetch with format/include/penName query params
- No blockers

---
*Phase: 05-export-and-billing*
*Completed: 2026-03-04*

## Self-Check: PASSED

- All 6 files created and verified on disk
- All 4 task commits verified in git log (74a4785, 16fc8dc, 2350afa, 6a730c8)
- Full type check passes (npx tsc --noEmit)
- npm run build succeeds with /api/export/[projectId] as dynamic route
