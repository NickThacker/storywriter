# Phase 3: Arc Synthesizer

Every 5 chapters, automatically synthesize a narrative arc trajectory for every character who has appeared in the story so far. The Writer model sees where each character has been — not just where they are now. Fixes the "point-in-time blindness" of the current character_states tracker.

This runs as fire-and-forget after chapter completion, so there's zero latency impact on generation.

---

## Pre-flight: Audit the Codebase First

Before writing anything, read and report:

1. `supabase/migrations/` — confirm the highest migration number
2. Check for any existing arc or trajectory logic:
   ```
   grep -r "arc\|trajectory\|synthesis\|character.*history" src/ --include="*.ts" -l
   ```
3. Read `src/lib/memory/context-assembly.ts` — understand the `character_states` structure (it's a `{ [name]: CharacterState }` map in `project_memory`)
4. Read `src/lib/memory/chapter-prompt.ts` — identify where character states are rendered so you know where to inject arc data
5. Check if `chapter_checkpoints` stores anything per-character (look for character-specific fields):
   ```
   grep -r "chapter_checkpoints" src/ --include="*.ts"
   ```
6. Check `src/app/api/` for any post-generation hooks or completion callbacks

Report findings before proceeding.

---

## What to Build

### 1. Migration: `character_arcs` table

Create `supabase/migrations/00011_arc_synthesizer.sql`:

```sql
CREATE TABLE IF NOT EXISTS character_arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,
  arc_summary TEXT NOT NULL,          -- narrative prose: "Idealist → Disillusioned → Cautious Renewal"
  arc_trajectory JSONB NOT NULL,      -- structured: [{ chapter, state, pivot_description }]
  key_moments JSONB NOT NULL DEFAULT '[]', -- [{ chapter, description }] — turning points
  unresolved_threads JSONB NOT NULL DEFAULT '[]', -- things seeded but not paid off
  synthesized_through_chapter INTEGER NOT NULL,
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, character_name)  -- upsert on each synthesis run
);

CREATE INDEX IF NOT EXISTS character_arcs_project_idx
  ON character_arcs(project_id);
```

### 2. Character History Collector

Create `src/lib/arc/collect-character-history.ts`:

For a given `projectId` and `characterName`:
- Query all `chapter_checkpoints` ordered by `chapter_number`, up to the current chapter
- For each checkpoint, extract from the stored `chapter_text` a brief passage (first 500 chars) as a marker
- Also query the `project_memory.character_states[characterName]` at each point — **Note**: `project_memory` only stores current state, not history. So the history must be inferred from checkpoint text + the current character state.
- Return: `{ checkpoints: Array<{ chapterNumber, summary, chapterTextExcerpt }>, currentState: CharacterState }`

### 3. Arc Synthesis Service

Create `src/lib/arc/arc-synthesizer.ts`:

The synthesizer prompt system message:
> You are a narrative analyst specializing in character arc analysis. You will receive chapter summaries and excerpts from a novel featuring a specific character. Identify the character's arc trajectory — how they have changed emotionally, psychologically, and situationally across the story. Return JSON only, no prose or markdown fences.

The synthesizer prompt user message:
```
CHARACTER: {name}
CURRENT STATE: {currentState JSON}

CHAPTER HISTORY:
{for each checkpoint: "Chapter N: {summary}\nExcerpt: {first 300 chars of chapter text}"}

Return JSON:
{
  "arc_summary": "One sentence: the emotional/psychological journey so far",
  "arc_trajectory": [{ "chapter": N, "state": "brief state description", "pivot_description": "what changed" }],
  "key_moments": [{ "chapter": N, "description": "what happened that mattered for this character" }],
  "unresolved_threads": ["things seeded in the character's arc not yet paid off"]
}
```

Model to use: `anthropic/claude-sonnet-4-5` (Sonnet reads all the state diffs, not Haiku — this needs quality). Check `user_model_preferences` for task type `arc_synthesis` first.

Trigger logic:
- Called after a chapter is marked complete
- Only runs if `chapterNumber % 5 === 0` (chapters 5, 10, 15, 20, etc.)
- Runs for every character who appears in `project_memory.character_states`
- Uses `Promise.allSettled` — individual character failures don't block others
- Upserts into `character_arcs` (update if exists, insert if not)

### 4. API Route: `POST /api/arc/[projectId]/synthesize`

Create `src/app/api/arc/[projectId]/synthesize/route.ts`:

- Auth-gate (verify project ownership)
- Accepts `{ chapterNumber }` (optional — defaults to current chapter count)
- Runs synthesis for all characters regardless of `% 5` trigger (manual trigger for on-demand use)
- Returns `{ synthesized: string[], failed: string[], skipped: string[] }`

Also add a fire-and-forget call in the chapter completion flow:
- After a chapter is saved/approved, check `if (chapterNumber % 5 === 0)`
- If true, call the synthesis route without awaiting (fire-and-forget, catch and log errors)

### 5. Inject Arc Data into Chapter Prompt

Modify `src/lib/memory/chapter-prompt.ts`:

Add an optional fifth parameter:
```typescript
characterArcs?: Record<string, CharacterArc> | null
```

In the character states section, after rendering current state, add arc context if available:

```typescript
// In the character map section:
const arc = characterArcs?.[c.name]
if (arc) {
  charLines += `\n- Arc so far: ${arc.arc_summary}`
  if (arc.unresolved_threads?.length) {
    charLines += `\n- Unresolved character threads: ${arc.unresolved_threads.join('; ')}`
  }
}
```

### 6. Wire Arc Data into Context Assembly

Modify `src/lib/memory/context-assembly.ts`:

- After fetching `project_memory`, also query `character_arcs` for the project
- Filter to only the featured characters for this chapter
- Return `characterArcs` as part of the `ChapterContextPackage`

Update `ChapterContextPackage` type in `@/types/project-memory`:
```typescript
characterArcs?: Record<string, CharacterArc> | null
```

### 7. UI: Arc Visualization (Optional but valuable)

Add an "Arc" tab or section in the character management UI (wherever character states are displayed):
- Shows `arc_summary` per character
- Shows `key_moments` as a timeline
- Shows `unresolved_threads` as a checklist
- Shows `synthesized_through_chapter` so the author knows how current the data is
- "Re-synthesize" button that calls the synthesis route manually

---

## Definition of Done

- [ ] Migration `00011_arc_synthesizer.sql` created
- [ ] `src/lib/arc/collect-character-history.ts` created
- [ ] `src/lib/arc/arc-synthesizer.ts` created with Sonnet-based synthesis
- [ ] `POST /api/arc/[projectId]/synthesize` route created and auth-gated
- [ ] Fire-and-forget synthesis triggered on chapter completion at `% 5` intervals
- [ ] `ChapterContextPackage` type updated to include `characterArcs`
- [ ] `context-assembly.ts` queries and returns character arc data
- [ ] `chapter-prompt.ts` injects arc summary and unresolved threads into character section
- [ ] Arc visualization UI added to character management view
- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx next build` succeeds
