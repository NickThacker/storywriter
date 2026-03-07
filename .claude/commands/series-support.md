# Series Support

Extend the project model to support multi-book series. Individual books maintain their own `project_memory`, but a shared `series_memory` layer sits above them — capturing what is permanently true about the world, as distinct from what was book-specific. The Oracle can optionally read prior volumes.

This phase is architecturally independent of Phases 1–4 and can be run in any order.

---

## Pre-flight: Audit the Codebase First

Before writing anything, read and report:

1. `supabase/migrations/` — confirm the highest migration number
2. Check the current `projects` table structure — does it have any series-related columns?
   ```
   grep -r "series\|volume\|book_number" src/ --include="*.ts" -l
   ```
3. Read `src/lib/memory/context-assembly.ts` — identify the full return structure so you know where to inject series context
4. Read `src/lib/memory/chapter-prompt.ts` — identify the end of the `sections` array where Series Context will be injected as the final section
5. Check the projects listing UI (`src/app/(dashboard)/projects/`) to understand how projects are currently displayed, so you can add series grouping without breaking it
6. Check if there's a project creation flow you'll need to extend with series assignment

Report findings before proceeding.

---

## What to Build

### 1. Migrations

Create `supabase/migrations/00012_series_support.sql`:

```sql
-- Series table
CREATE TABLE IF NOT EXISTS series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  world_rules JSONB NOT NULL DEFAULT '{}',   -- permanent world facts
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS series_user_id_idx ON series(user_id);

-- Link projects to series
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS volume_number INTEGER;

CREATE INDEX IF NOT EXISTS projects_series_id_idx ON projects(series_id);

-- Series memory: what persists between volumes
CREATE TABLE IF NOT EXISTS series_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  permanent_facts JSONB NOT NULL DEFAULT '[]',         -- facts that are true across all volumes
  permanent_character_states JSONB NOT NULL DEFAULT '{}', -- character truths that carry forward
  world_events JSONB NOT NULL DEFAULT '[]',            -- major events that shaped the world
  recurring_motifs JSONB NOT NULL DEFAULT '[]',        -- series-level themes/motifs
  promoted_from_volume INTEGER,                        -- which volume's close last updated this
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(series_id)
);

-- Volume close audit log
CREATE TABLE IF NOT EXISTS volume_close_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  volume_number INTEGER NOT NULL,
  close_summary TEXT NOT NULL,     -- what Sonnet determined was permanent vs book-specific
  permanent_promotions JSONB NOT NULL DEFAULT '[]',  -- what got promoted to series_memory
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. Series Management Server Actions

Create `src/lib/actions/series-actions.ts`:

- `createSeries({ title, description, genre })` — inserts into `series`, initializes `series_memory`
- `assignProjectToSeries({ projectId, seriesId, volumeNumber })` — updates `projects.series_id` and `projects.volume_number`
- `getSeriesProjects(seriesId)` — returns all projects in a series ordered by `volume_number`
- `getSeriesMemory(seriesId)` — returns the `series_memory` row

### 3. Volume Close Service

Create `src/lib/series/volume-close.ts`:

The Volume Close is a Sonnet call that runs when the author marks a book as complete. It reads the entire completed `project_memory` and decides what from it is permanently true for the world vs. what was book-specific.

Volume Close system prompt:
> You are a series continuity manager for a multi-book fiction series. A volume has just been completed. Your job is to decide what from this book's memory should be promoted to the permanent series memory (things that will be true in all future volumes) versus what was specific to this book's events. Be conservative — only promote facts that are clearly world-defining or character-defining at the series level. Return JSON only.

Volume Close user message:
```
COMPLETED VOLUME: {volumeNumber} — "{projectTitle}"

CURRENT PROJECT MEMORY:
{full project_memory JSON}

CHAPTER SUMMARIES (all chapters):
{all chapter checkpoint summaries concatenated}

EXISTING SERIES MEMORY (what's already permanent):
{series_memory JSON}

Return JSON:
{
  "close_summary": "One paragraph: what this volume established at the series level",
  "promote_to_permanent_facts": [...],
  "promote_to_permanent_characters": { "CharacterName": { state summary } },
  "promote_to_world_events": [...],
  "promote_to_motifs": [...],
  "book_specific_only": [...]  // things that stay in project_memory, not promoted
}
```

Model: `anthropic/claude-sonnet-4-5` (quality matters here — this is the ground truth for future volumes)

After Sonnet returns, merge the promotions into `series_memory` and insert a `volume_close_log` row.

### 4. API Routes

**`POST /api/series`** — create a new series
**`GET /api/series`** — list user's series
**`POST /api/series/[seriesId]/close-volume`** — trigger Volume Close for a completed project
  - Accepts `{ projectId }`
  - Runs the Volume Close service
  - Returns the `close_summary` and `permanent_promotions`

### 5. Inject Series Context into Chapter Assembly

Modify `src/lib/memory/context-assembly.ts`:

After fetching `project_memory`, check if the project has a `series_id`. If so:
- Query `series_memory` for that series
- Query `projects` for prior volumes (lower `volume_number`) to get their titles

Return `seriesContext` as part of `ChapterContextPackage`:
```typescript
seriesContext?: {
  seriesTitle: string
  volumeNumber: number
  permanentFacts: string[]
  permanentCharacterStates: Record<string, unknown>
  worldEvents: string[]
  priorVolumes: Array<{ title: string; volumeNumber: number }>
} | null
```

### 6. Inject Series Context into Chapter Prompt

Modify `src/lib/memory/chapter-prompt.ts`:

Add `seriesContext` as an optional parameter. Inject as the **last** section (after timeline, before rewrite adjustments):

```typescript
if (seriesContext) {
  const scLines: string[] = [
    `This is Volume ${seriesContext.volumeNumber} of the "${seriesContext.seriesTitle}" series.`,
  ]
  if (seriesContext.priorVolumes.length > 0) {
    scLines.push(`Prior volumes: ${seriesContext.priorVolumes.map(v => `Vol ${v.volumeNumber}: "${v.title}"`).join(', ')}`)
  }
  if (seriesContext.permanentFacts.length > 0) {
    scLines.push(`Permanent world facts:\n${seriesContext.permanentFacts.map(f => `- ${f}`).join('\n')}`)
  }
  if (seriesContext.worldEvents.length > 0) {
    scLines.push(`Series-level events:\n${seriesContext.worldEvents.map(e => `- ${e}`).join('\n')}`)
  }
  sections.push(`## Series Context\n${scLines.join('\n\n')}`)
}
```

### 7. Oracle Series Mode (Optional, Opt-in)

In the Oracle query service (Phase 2), add an optional `includeSeriesVolumes: boolean` flag. When true:
- For each prior completed volume, fetch all `chapter_checkpoints` and concatenate into the manuscript text
- Prepend with a clear volume delimiter: `\n\n=== VOLUME {N}: "{title}" ===\n\n`
- This is expensive (multiple full manuscripts) — make it opt-in per-chapter via a UI toggle

### 8. UI: Series Management

**Series creation/assignment**: In the project settings or a new "Series" section in settings:
- Create new series or assign project to existing series
- Set volume number
- View all books in the series

**Volume Close button**: In the project UI (wherever project status/completion is managed):
- "Close Volume" button — triggers the Volume Close API
- Shows a confirmation dialog with the `close_summary` Sonnet produced
- Shows what was promoted to series memory
- Requires explicit confirmation before committing

**Series memory viewer**: Read-only view of current `series_memory` showing permanent facts, characters, and world events.

---

## Definition of Done

- [ ] Migration `00012_series_support.sql` created (series, series_memory, volume_close_log; projects columns)
- [ ] `src/lib/actions/series-actions.ts` created with CRUD actions
- [ ] `src/lib/series/volume-close.ts` created with Sonnet-based close logic
- [ ] Series API routes created and auth-gated
- [ ] `ChapterContextPackage` type updated with `seriesContext`
- [ ] `context-assembly.ts` queries series memory when project has `series_id`
- [ ] `chapter-prompt.ts` injects Series Context section
- [ ] Series management UI added to settings
- [ ] Volume Close button and confirmation dialog in project UI
- [ ] Series memory viewer implemented
- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx next build` succeeds
