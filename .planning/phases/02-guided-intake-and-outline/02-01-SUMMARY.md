---
phase: 02-guided-intake-and-outline
plan: 01
subsystem: database
tags: [supabase, postgresql, typescript, zustand, rls, migrations]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: projects table, update_updated_at() trigger function, RLS policy pattern
provides:
  - Normalized story bible schema — characters, locations, world_facts, outlines tables with RLS
  - TypeScript types for all story bible tables — CharacterRow, LocationRow, WorldFactRow, OutlineRow
  - OutlineChapter interface for structured chapter data
  - Zustand installed and available for intake wizard state management
  - intake_data jsonb column on projects for wizard answer storage
affects:
  - 02-guided-intake-and-outline (all remaining plans depend on these tables and types)
  - 03-prose-generation (character/location/world_facts feed selective context injection)

# Tech tracking
tech-stack:
  added: [zustand@5.0.11 (pre-installed, verified)]
  patterns:
    - RLS via subquery to projects.user_id for all story bible tables (owner-scoped)
    - Row/Insert/Update TypeScript variant pattern extended to Phase 2 tables
    - source column (ai/manual) on characters tracks edit origin to protect manual edits on regen
    - previous_chapters JSONB snapshot on outlines preserves data before regeneration

key-files:
  created:
    - supabase/migrations/00002_story_bible_tables.sql
  modified:
    - src/types/database.ts

key-decisions:
  - "Normalized tables (not JSONB) for characters/locations/world_facts — enables selective context injection in Phase 3"
  - "characters.source ('ai'|'manual') tracks edit origin — prevents outline regeneration from overwriting manual user edits"
  - "outlines.previous_chapters stores snapshot before regeneration — data preserved now, restore UI deferred"
  - "One outline per project enforced via unique constraint on outlines.project_id"
  - "RLS via subquery to projects.user_id — same Supabase performance pattern as 00001 migration"
  - "intake_data added to projects table (not a separate table) — wizard answers scoped to project naturally"

patterns-established:
  - "Story bible RLS: all 4 tables use owner-scoped policy via (select auth.uid()) = (select user_id from projects where id = project_id)"
  - "TypeScript Row/Insert/Update pattern: Row types with all columns, Insert Omits id/timestamps with optional overrides, Update is Partial Omit of immutable fields"

requirements-completed: [CHAR-03, CHAR-04]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 2 Plan 01: Story Bible Schema and Types Summary

**Four normalized story bible tables (characters, locations, world_facts, outlines) with RLS, TypeScript types, and Zustand installed — data foundation for all Phase 2 CRUD and Phase 3 context injection**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T19:07:28Z
- **Completed:** 2026-03-01T19:09:34Z
- **Tasks:** 3
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Migration 00002 creates characters, locations, world_facts, outlines tables with all columns, RLS policies, updated_at triggers, and project_id indexes
- TypeScript types added: 6 enum types, 5 Row interfaces (including OutlineChapter), 4 Insert types, 4 Update types, 4 Database table entries, 4 convenience aliases
- Zustand 5.0.11 confirmed installed and importable; no install needed (was pre-existing in package.json)
- ProjectRow extended with `intake_data: Record<string, unknown> | null` field

## Task Commits

Each task was committed atomically:

1. **Task 1: Create story bible database migration** - `f8f2bdb` (feat)
2. **Task 2: Update TypeScript types and Database type for new tables** - `1335549` (feat)
3. **Task 3: Install Zustand dependency** - no commit needed (zustand was pre-installed at `^5.0.11`)

## Files Created/Modified

- `supabase/migrations/00002_story_bible_tables.sql` - Normalized story bible schema: characters, locations, world_facts, outlines tables with RLS, triggers, indexes, plus intake_data column on projects
- `src/types/database.ts` - Extended with CharacterRole, CharacterSource, WorldFactCategory, OutlineStatus, BeatSheetId, NovelLength enums; CharacterRow, LocationRow, WorldFactRow, OutlineRow, OutlineChapter types; Insert/Update variants; Database type updated to 7 tables; Phase 2 convenience aliases

## Decisions Made

- **Normalized vs JSONB:** Chose normalized tables for characters/locations/world_facts over JSONB. Enables selective context injection in Phase 3 (pass only relevant characters per chapter) instead of dumping the full story bible into every prompt.
- **characters.source column:** Tracks whether each character record originated from AI generation ('ai') or was manually edited ('manual'). Allows outline regeneration to skip overwriting manual edits.
- **outlines.previous_chapters:** JSONB snapshot of chapters array taken before regeneration. Data is preserved immediately; restore UI is a deferred enhancement.
- **One outline per project:** Enforced by `unique` constraint on `outlines.project_id`. Simplifies all outline queries — no need to track "current" outline.
- **intake_data on projects:** Added as column to projects table rather than a separate table. Wizard answers are naturally project-scoped; no join needed.

## Deviations from Plan

None - plan executed exactly as written.

Note: Zustand was already present in package.json at `^5.0.11` from prior work. Task 3 verification passed (importable); no install or commit was needed.

## Issues Encountered

None.

## User Setup Required

**Run migration in Supabase SQL editor.** The migration file `supabase/migrations/00002_story_bible_tables.sql` must be applied to your Supabase project:

1. Open Supabase Dashboard > SQL Editor
2. Paste and run the contents of `supabase/migrations/00002_story_bible_tables.sql`
3. Verify 4 new tables appear in Table Editor: characters, locations, world_facts, outlines

No additional environment variables required.

## Next Phase Readiness

- Story bible schema is fully defined — all Phase 2 CRUD plans can proceed
- TypeScript types are complete — components and server actions can import and use immediately
- Zustand is available for the intake wizard store (Plan 02-02)
- Database type now includes all 7 tables, resolving the open schema question from STATE.md

---
*Phase: 02-guided-intake-and-outline*
*Completed: 2026-03-01*
