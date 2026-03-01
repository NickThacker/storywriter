---
phase: 02-guided-intake-and-outline
plan: 08
subsystem: ui
tags: [react, nextjs, supabase, react-hook-form, zod, use-debounce, shadcn, story-bible]

# Dependency graph
requires:
  - phase: 02-guided-intake-and-outline
    provides: "02-01: characters, locations, world_facts tables with RLS; CharacterRow, LocationRow, WorldFactRow TypeScript types"
provides:
  - Story bible page at /projects/[id]/story-bible with tabbed layout
  - CRUD server actions for characters, locations, world facts
  - CharacterCard with tiered expand/collapse display and auto-save CharacterDetail editor
  - LocationCard with inline expand/collapse and auto-save
  - WorldFactsList with inline click-to-edit and grouped/timeline display modes
  - AddEntityDialog for creating characters, locations, world facts
affects:
  - 03-prose-generation (story bible data feeds context injection)
  - any plan that adds story bible seeding from outline generation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Auto-save via useDebouncedCallback (600ms) calling upsertCharacter/upsertLocation server actions
    - Tiered display pattern — card shows name/role/one-line, expanding reveals full profile editor
    - Inline click-to-edit for world facts (no separate form, stateful per item)
    - Server Component data fetching + Client Component for interactivity (BibleTabs)
    - useTransition for delete operations to show pending state without blocking UI

key-files:
  created:
    - src/actions/story-bible.ts
    - src/app/(dashboard)/projects/[id]/story-bible/page.tsx
    - src/components/story-bible/bible-tabs.tsx
    - src/components/story-bible/character-card.tsx
    - src/components/story-bible/character-detail.tsx
    - src/components/story-bible/location-card.tsx
    - src/components/story-bible/add-entity-dialog.tsx
  modified:
    - src/components/story-bible/world-facts-list.tsx

key-decisions:
  - "Dialog (not AlertDialog/Sheet) used for confirmations and expanded character view — only Dialog available in current UI library"
  - "Character delete uses Dialog confirmation consistent with existing delete-project-dialog.tsx pattern"
  - "CharacterCard expands inline (not a side panel/sheet) — Sheet component not installed"
  - "WorldFactsList filterCategory typed as WorldFactCategory (not string) for stricter typing — aligns with linter enforcement"

patterns-established:
  - "upsertCharacter/upsertLocation/upsertWorldFact: ownership verified via project.user_id before any mutation"
  - "deleteCharacter/deleteLocation/deleteWorldFact: fetch entity first, then verify ownership, then delete"
  - "All story bible mutations revalidate /projects/[id]/story-bible path"

requirements-completed: [CHAR-01, CHAR-02, CHAR-03]

# Metrics
duration: 7min
completed: 2026-03-01
---

# Phase 2 Plan 08: Story Bible Page Summary

**Tabbed story bible page at /projects/[id]/story-bible with CRUD for characters, locations, and world facts — auto-save profile editing, tiered card display, and inline world fact editing**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-01T19:13:30Z
- **Completed:** 2026-03-01T19:20:52Z
- **Tasks:** 4
- **Files modified:** 8 (7 created, 1 modified)

## Accomplishments

- Complete story bible page at `/projects/[id]/story-bible` with server-side data fetching and ownership verification
- 6 CRUD server actions for characters, locations, world facts — all authenticated with project ownership checks
- Tiered character display: collapsed card shows name/role/one-line summary, expanded reveals 9-field profile editor with auto-save
- AddEntityDialog supports all three entity types with Zod validation, loading states, and sonner error toasts
- WorldFactsList renders grouped by category (for World Facts tab) or as numbered sequence (for Timeline tab)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create story bible CRUD server actions** - `31eea36` (feat)
2. **Task 2: Create story bible page and tabbed layout** - `de5f743` (feat)
3. **Task 3: Create character card, character detail, location card, world facts list** - `2628b98` (feat)
4. **Task 4: Create add entity dialog** - `3f77334` (feat)

## Files Created/Modified

- `src/actions/story-bible.ts` - Server actions: upsertCharacter, deleteCharacter, upsertLocation, deleteLocation, upsertWorldFact, deleteWorldFact
- `src/app/(dashboard)/projects/[id]/story-bible/page.tsx` - Story bible server page; fetches characters/locations/world_facts, passes to BibleTabs
- `src/components/story-bible/bible-tabs.tsx` - Tabbed layout with Characters, Locations, Timeline, World Facts tabs; count badges; Add buttons
- `src/components/story-bible/character-card.tsx` - Tiered card: collapsed=name+role+one-line, expanded=CharacterDetail inline
- `src/components/story-bible/character-detail.tsx` - Full profile editor with 9 fields, auto-save via useDebouncedCallback (600ms), delete dialog
- `src/components/story-bible/location-card.tsx` - Expand/collapse card with auto-save for name, description, significance
- `src/components/story-bible/world-facts-list.tsx` - Click-to-edit facts; grouped by category or numbered timeline view
- `src/components/story-bible/add-entity-dialog.tsx` - Unified dialog for creating characters (source: 'manual'), locations, world facts

## Decisions Made

- **Dialog not Sheet/AlertDialog:** The shadcn Sheet and AlertDialog components are not installed in this project. Used Dialog consistently for all confirmations, matching the existing delete-project-dialog.tsx pattern.
- **Inline expansion:** CharacterCard expands inline within the card grid (not a side panel). Sheet is not available, and this keeps the editing experience in-context.
- **WorldFactCategory filterCategory type:** Typed as `WorldFactCategory | undefined` instead of `string` for stricter type safety — aligned with what the linter enforced on the existing stub.
- **No AlertDialog:** Delete confirmations use Dialog with Cancel/Delete buttons — same UX pattern as the dashboard's delete project flow.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod enum type inference with react-hook-form resolver**
- **Found during:** Task 4 (AddEntityDialog implementation)
- **Issue:** `z.enum([...]).default('value')` creates an optional inferred type in Zod v4, which TypeScript rejects when passed to `zodResolver` since the resolver expects the non-optional type
- **Fix:** Removed `.default()` from enum schemas; set defaults in `useForm({ defaultValues: ... })` instead
- **Files modified:** `src/components/story-bible/add-entity-dialog.tsx`
- **Verification:** `npx tsc --noEmit` passes with no new errors
- **Committed in:** `3f77334` (Task 4 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type bug)
**Impact on plan:** Minor fix, no scope change. All plan requirements delivered as specified.

## Issues Encountered

A linter/formatter was actively reverting files between writes and commits. The `add-entity-dialog.tsx` file was repeatedly reset to a stub by an automated tool during plan execution. Mitigated by reading files before writing (required by tools) and committing quickly after TypeScript verification passed.

## User Setup Required

None — no new external service configuration required. Story bible tables were created in Plan 02-01 migration.

## Next Phase Readiness

- Complete story bible at `/projects/[id]/story-bible` — all CHAR requirements (CHAR-01, CHAR-02, CHAR-03) satisfied
- Server actions are ready for seedStoryBibleFromOutline to be added in Plan 02-07 (outline approval flow)
- Character/location/world_facts CRUD is solid foundation for Phase 3 context injection

## Self-Check: PASSED

All created files verified on disk. All task commits verified in git log.

- FOUND: src/actions/story-bible.ts
- FOUND: src/app/(dashboard)/projects/[id]/story-bible/page.tsx
- FOUND: src/components/story-bible/bible-tabs.tsx
- FOUND: src/components/story-bible/character-card.tsx
- FOUND: src/components/story-bible/character-detail.tsx
- FOUND: src/components/story-bible/location-card.tsx
- FOUND: src/components/story-bible/world-facts-list.tsx
- FOUND: src/components/story-bible/add-entity-dialog.tsx
- FOUND commit: 31eea36
- FOUND commit: de5f743
- FOUND commit: 2628b98
- FOUND commit: 3f77334

---
*Phase: 02-guided-intake-and-outline*
*Completed: 2026-03-01*
