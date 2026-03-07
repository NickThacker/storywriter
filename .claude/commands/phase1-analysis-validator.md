# Phase 1: Analysis Validator

Add a confidence-scoring validation layer to every project_memory write. Before any tracker update is committed, a second Haiku pass scores each proposed change. Low-confidence changes are flagged for author review instead of being written as ground truth.

This is the highest-priority phase — every subsequent phase depends on the trackers being trustworthy.

---

## Pre-flight: Audit the Codebase First

Before writing a single line of code, read these files and report what you find:

1. `supabase/migrations/` — list all files, identify the highest migration number
2. `src/lib/memory/context-assembly.ts` — already read; note the fields read from `project_memory`
3. Search for any file that writes to `project_memory`:
   ```
   grep -r "project_memory" src/ --include="*.ts" -l
   ```
4. Search for any existing validation or confidence logic:
   ```
   grep -r "confidence\|validator\|validate\|analysis_valid" src/ --include="*.ts" -l
   ```
5. Check `src/app/api/` for any existing memory-update route:
   ```
   ls src/app/api/
   ```

Report findings before proceeding. If any part of this already exists, integrate with it rather than overwriting.

---

## What to Build

### 1. Migration: `analysis_validations` table

Create `supabase/migrations/00009_analysis_validator.sql`:

```sql
CREATE TABLE IF NOT EXISTS analysis_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  proposed_changes JSONB NOT NULL,   -- the full proposed memory diff
  scored_changes JSONB NOT NULL,     -- each change with confidence score + reasoning
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | auto_applied
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS analysis_validations_project_id_idx
  ON analysis_validations(project_id, chapter_number);
```

### 2. Confidence Scoring Service

Create `src/lib/memory/analysis-validator.ts`:

```typescript
/**
 * Confidence buckets:
 *   85+  → auto-apply, log only
 *   60–84 → apply but flag in UI for author awareness  
 *   35–59 → block, require author approval before applying
 *   0–34  → hard reject, do not apply under any circumstances
 */
```

The service must:
- Accept a `projectId`, `chapterNumber`, and `proposedChanges` object (the same shape that gets written to `project_memory`)
- Call OpenRouter with the **Haiku** model (`anthropic/claude-haiku-4-5` — check `user_model_preferences` for a `validation` task type first, fall back to Haiku)
- The Haiku prompt receives: the current `project_memory` state, the chapter outline for this chapter, and the proposed diff
- Return a scored diff: each change gets `{ field, proposed, confidence: number, reasoning: string, decision: 'auto_apply' | 'flag' | 'block' | 'reject' }`
- Insert a row into `analysis_validations` with status `pending` if any items are `block` or `reject`, `auto_applied` if all are 85+

The Haiku system prompt for scoring:
> You are a continuity validator for a novel writing system. You will receive the current memory state of a novel project and a proposed set of changes from an analysis pass. For each proposed change, score your confidence (0–100) that the change is accurate, consistent with established facts, and not a hallucination or premature resolution. Return JSON only.

### 3. API Route: `POST /api/memory/validate`

Create `src/app/api/memory/validate/route.ts`:

- Auth-gate (same pattern as chapter route)
- Accepts `{ projectId, chapterNumber, proposedChanges }`
- Calls the validator service
- Returns the scored diff and a `validationId`
- Auto-applies changes with confidence 85+ immediately to `project_memory`
- Stores the full record in `analysis_validations`

### 4. API Route: `POST /api/memory/validate/[validationId]/resolve`

Allows the author to approve or reject blocked items:
- `{ decisions: { [changeKey]: 'approve' | 'reject' } }`
- Applies approved changes to `project_memory`
- Updates `analysis_validations` status to `approved` or `rejected`
- Sets `resolved_at`

### 5. UI: Validation Review Panel

Location: wherever chapter generation results are displayed (check `src/components/` for a chapter editor or generation panel).

Add a `ValidationReviewPanel` component (`src/components/memory/validation-review-panel.tsx`):
- Shows only when there are `pending` validations for the current project
- Lists each flagged change with its confidence score and reasoning
- Approve / Reject buttons per item
- "Approve All" shortcut
- Uses `sonner` for success/error toasts
- Uses `Dialog` for confirmation on bulk reject

### 6. Wire Into Chapter Generation

In `src/app/api/generate/chapter/route.ts`, the current flow ends by streaming the chapter. After generation completes (or as a post-generation hook), the analysis of the new chapter's impact on memory should run through the validator. 

Look for where `project_memory` is updated after chapter generation. If it's a separate route or action, wrap that update path with the validator before the write.

---

## Definition of Done

- [ ] Migration `00009_analysis_validator.sql` created
- [ ] `src/lib/memory/analysis-validator.ts` created with confidence scoring logic
- [ ] `POST /api/memory/validate` route created and auth-gated
- [ ] `POST /api/memory/validate/[validationId]/resolve` route created
- [ ] `ValidationReviewPanel` component created
- [ ] Panel appears in the chapter generation UI when pending validations exist
- [ ] Auto-apply works for 85+ confidence items without UI interruption
- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx next build` succeeds
