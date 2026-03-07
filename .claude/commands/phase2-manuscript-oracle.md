# Phase 2: Manuscript Oracle

Before each chapter is generated, feed the full accumulated manuscript text to a long-context model (Gemini via OpenRouter) and extract: specific callbacks to seed, contradiction risks, unresolved motifs, and setup/payoff opportunities. Inject this oracle output as a new section in the Writer's prompt.

The key insight: Gemini 1.5 Pro has a 2M token context window. A 100k-word novel is ~130k tokens. You fit the whole manuscript twice over, which means you skip pgvector entirely for long-range recall.

---

## Pre-flight: Audit the Codebase First

Before writing anything, read and report:

1. `supabase/migrations/` — confirm the highest migration number so you use the correct next number
2. Check if a manuscript cache or full-text store already exists:
   ```
   grep -r "manuscript\|full_text\|chapter_archive\|oracle" src/ --include="*.ts" -l
   ```
3. Check what's in `chapter_checkpoints` — specifically whether `chapter_text` is stored per chapter (it is, based on `context-assembly.ts` reading `chapter_text` from it)
4. Read `src/lib/memory/chapter-prompt.ts` — identify the `sections` array where you'll inject the Oracle section
5. Check `src/app/api/` for any existing oracle or retrieval routes

Report findings. If `chapter_checkpoints.chapter_text` exists per chapter, you don't need a separate archive table — you'll query directly from there.

---

## What to Build

### 1. Migration: `oracle_cache` table

Create `supabase/migrations/00010_manuscript_oracle.sql`:

```sql
CREATE TABLE IF NOT EXISTS oracle_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  outline_hash TEXT NOT NULL,  -- SHA-256 of the outline JSON; cache invalidates on outline change
  chapter_number INTEGER NOT NULL,  -- which chapter this oracle output is for
  oracle_output JSONB NOT NULL,  -- structured oracle findings
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, chapter_number, outline_hash)
);

CREATE INDEX IF NOT EXISTS oracle_cache_project_idx
  ON oracle_cache(project_id, chapter_number);
```

### 2. Manuscript Assembly Utility

Create `src/lib/oracle/assemble-manuscript.ts`:

- Query all `chapter_checkpoints` for the project, ordered by `chapter_number`, up to `chapterNumber - 1`
- Concatenate chapter texts with clear delimiters: `\n\n--- CHAPTER {N} ---\n\n{text}`
- Return the full string and a count of chapters included
- This is plain text concatenation — no AI involved, no summarization

### 3. Outline Hash Utility

Create `src/lib/oracle/outline-hash.ts`:

- Accept the outline JSON object
- Return a SHA-256 hex string (use Node's built-in `crypto.createHash('sha256')`)
- Used as the cache key so oracle output regenerates only when the outline actually changes

### 4. Oracle Query Service

Create `src/lib/oracle/oracle-query.ts`:

The oracle prompt system message:
> You are a manuscript analyst for a novel writing system. You will receive the full text of a novel-in-progress and the outline beat for the upcoming chapter. Your job is to surface specific, actionable intelligence to help the writer maintain long-range coherence. Return JSON only — no prose, no markdown fences.

The oracle prompt user message structure:
```
FULL MANUSCRIPT SO FAR:
{manuscript text}

UPCOMING CHAPTER {N} OUTLINE:
{chapter summary, beats, featured characters}

Return a JSON object with:
{
  "callbacks": [...],          // specific passages/details from earlier chapters worth echoing
  "contradictionRisks": [...], // things established earlier that could conflict with upcoming beats
  "unresolvedMotifs": [...],   // recurring images/themes that could be reinforced
  "setupPayoffs": [...],       // foreshadowed elements that could pay off here
  "characterMoments": [...]    // character history moments relevant to this chapter's featured chars
}
```

The model to use: check `user_model_preferences` for task type `oracle`. Fall back to `google/gemini-pro-1.5` (available on OpenRouter). Use the user's stored OpenRouter API key (same pattern as the chapter route — retrieve from `user_settings.openrouter_api_key`).

Cache logic:
1. Compute `outlineHash`
2. Check `oracle_cache` for `(project_id, chapter_number, outline_hash)` — if hit, return cached `oracle_output`
3. If miss: assemble manuscript, call Gemini, parse JSON response, insert into `oracle_cache`, return result

### 5. API Route: `POST /api/oracle/[projectId]/query`

Create `src/app/api/oracle/[projectId]/query/route.ts`:

- Auth-gate (same pattern as chapter route — verify project ownership)
- Accepts `{ chapterNumber }`
- Calls the oracle query service
- Returns `{ oracleOutput, cached: boolean, chaptersAnalyzed: number }`
- This route can be called before generation or on-demand from the UI

### 6. Inject Oracle Output into Chapter Prompt

Modify `src/lib/memory/chapter-prompt.ts`:

The `buildChapterPrompt` function currently accepts `(context, adjustments?, persona?)`. Add an optional fourth parameter:

```typescript
oracleOutput?: OracleOutput | null
```

Add a new section to the `sections` array when `oracleOutput` is present:

```typescript
if (oracleOutput) {
  const oLines: string[] = []
  if (oracleOutput.callbacks?.length) {
    oLines.push(`**Callbacks worth echoing:**\n${oracleOutput.callbacks.map(c => `- ${c}`).join('\n')}`)
  }
  if (oracleOutput.contradictionRisks?.length) {
    oLines.push(`**Contradiction risks:**\n${oracleOutput.contradictionRisks.map(r => `- ${r}`).join('\n')}`)
  }
  if (oracleOutput.unresolvedMotifs?.length) {
    oLines.push(`**Unresolved motifs:**\n${oracleOutput.unresolvedMotifs.map(m => `- ${m}`).join('\n')}`)
  }
  if (oracleOutput.setupPayoffs?.length) {
    oLines.push(`**Setup/payoff opportunities:**\n${oracleOutput.setupPayoffs.map(s => `- ${s}`).join('\n')}`)
  }
  if (oracleOutput.characterMoments?.length) {
    oLines.push(`**Character history relevant to this chapter:**\n${oracleOutput.characterMoments.map(m => `- ${m}`).join('\n')}`)
  }
  sections.push(`## Manuscript Oracle — Long-Range Context\n${oLines.join('\n\n')}`)
}
```

### 7. Wire Into Chapter Generation Route

In `src/app/api/generate/chapter/route.ts`, before building the prompt (step 7):

- Call the oracle query service with `{ projectId, chapterNumber, apiKey }`
- Fail-open: if oracle fails or times out, log the error and continue with `oracleOutput = null`
- Pass `oracleOutput` to `buildChapterPrompt`

### 8. UI: Oracle Status Indicator

In the chapter generation UI, show a small indicator ("Oracle: Analyzing manuscript..." / "Oracle: Ready (cached)" / "Oracle: Unavailable") so the author knows whether long-range context was included.

---

## Definition of Done

- [ ] Migration `00010_manuscript_oracle.sql` created
- [ ] `src/lib/oracle/assemble-manuscript.ts` created
- [ ] `src/lib/oracle/outline-hash.ts` created
- [ ] `src/lib/oracle/oracle-query.ts` created with cache logic
- [ ] `POST /api/oracle/[projectId]/query` route created and auth-gated
- [ ] `buildChapterPrompt` updated to accept and render `oracleOutput`
- [ ] Chapter generation route calls oracle before building prompt
- [ ] Oracle failure is non-blocking (fail-open)
- [ ] Oracle status indicator visible in generation UI
- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx next build` succeeds
