# Phase 4: Polish

Three targeted improvements that collectively close the remaining structural gaps:

1. **Tiered compression** — replace hard caps in context-assembly with dynamic compression so nothing is permanently thrown away
2. **Continuity Auditor** — a pre-flight contradiction check that can block generation on high-severity conflicts
3. **Model Registry** — replace every hardcoded model string with a user-configurable registry, exposing a settings page so any role can be swapped to any OpenRouter model without touching code

---

## Pre-flight: Audit the Codebase First

Before writing anything, read and report:

1. `src/lib/memory/context-assembly.ts` — identify every hard cap (e.g., `.slice(-5)`, `.slice(-10)`, `3000` char limit, `sliceimiting` of any array). List them all with line numbers.
2. Search for hardcoded model strings across the codebase:
   ```
   grep -r "anthropic/claude\|google/gemini\|openai/\|model_id\|model:" src/ --include="*.ts" | grep -v "node_modules"
   ```
3. Check `user_model_preferences` table usage — how it's currently read in `src/app/api/generate/chapter/route.ts` (already seen: queries for `task_type = 'prose'`, falls back to `anthropic/claude-sonnet-4-5`)
4. Check if a model settings UI exists:
   ```
   grep -r "model.*preference\|model.*settings\|ModelSelect" src/ --include="*.tsx" -l
   ```
5. Check for any existing continuity check logic:
   ```
   grep -r "continuity\|contradiction\|conflict\|audit" src/ --include="*.ts" -l
   ```
6. `supabase/migrations/` — confirm highest migration number

Report all findings before proceeding.

---

## Part A: Tiered Compression

### Goal

Replace the current aggressive hard caps in `context-assembly.ts` with a three-tier system:
- **Recent** (last 5 entries): full detail, no compression
- **Mid-range** (entries 6–20): compressed to key facts only (one line each)
- **Deep history** (entries 21+): accessible via Oracle (Phase 2), not truncated

Nothing is permanently discarded — it's compressed or deferred, not deleted.

### Changes to `src/lib/memory/context-assembly.ts`

Replace the current hard-cap pattern for each array field:

**Timeline** (currently `.slice(-10)`):
```typescript
// Before:
const recentTimeline = memory.timeline.slice(-10)

// After:
const timeline = memory.timeline ?? []
const recentTimeline = timeline.slice(-5)           // full detail
const midTimeline = timeline.slice(-20, -5)          // compress to: "Ch{N} [{storyTime}]: {event}"
const compressedMidTimeline = midTimeline.map(t => `Ch${t.chapterNumber} [${t.storyTime}]: ${t.event}`)
// Pass both to the package; chapter-prompt renders them in separate sub-sections
```

**Thematic development** (currently `.slice(-5)`):
```typescript
const thematic = memory.thematic_development ?? []
const recentThematic = thematic.slice(-5)            // full
const midThematic = thematic.slice(-15, -5)          // compressed: "Ch{N} — {theme}: {development}"
```

**Continuity facts**: don't cap — filter only unresolved (already done), but add a compression pass for facts introduced more than 10 chapters ago: include only `[Ch{N}, {category}] {fact}` without extended context.

**Foreshadowing**: don't cap — filter only unresolved (already done). No change needed.

**Plot threads**: already filtered to active. No cap needed. Fine as-is.

Update `ChapterContextPackage` type to add:
```typescript
compressedMidTimeline?: string[]
compressedMidThematic?: string[]
```

Update `chapter-prompt.ts` to render the compressed mid-range sections with a visual separator ("Older timeline (compressed):").

### Part A Definition of Done
- [ ] All `.slice(-N)` hard caps in `context-assembly.ts` replaced with tiered logic
- [ ] `ChapterContextPackage` type updated
- [ ] `chapter-prompt.ts` renders tiered sections correctly
- [ ] No data is permanently discarded

---

## Part B: Continuity Auditor

### Goal

Before generation, run a fast Haiku pass that checks the upcoming chapter's outline beats against the full set of continuity facts, character states, and plot threads. If it detects a high-severity contradiction, it surfaces it to the author and optionally blocks generation.

### New File: `src/lib/memory/continuity-auditor.ts`

The auditor prompt system message:
> You are a continuity checker for a novel writing system. You will receive the current memory state of a novel project and the outline for the next chapter to be written. Identify any contradictions or continuity risks between the chapter plan and the established facts. Return JSON only.

The auditor prompt:
```
CONTINUITY FACTS:
{unresolvedContinuityFacts}

CHARACTER STATES:
{characterStates}

ACTIVE PLOT THREADS:
{activePlotThreads}

UPCOMING CHAPTER {N} OUTLINE:
Title: {chapterTitle}
Summary: {chapterSummary}
Beats: {chapterBeats}
Featured characters: {featuredCharacters}

Return JSON:
{
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "description": "...",
      "conflictingFact": "...",
      "suggestedResolution": "..."
    }
  ],
  "clearToProceed": boolean
}
```

`clearToProceed` should be `false` if any `high` severity issue exists.

Model: `anthropic/claude-haiku-4-5` (fast, cheap, this runs on every generation)

### Wire Into Chapter Generation Route

In `src/app/api/generate/chapter/route.ts`, between context assembly (step 6) and prompt building (step 7):

```typescript
// Continuity audit (non-blocking by default; blocks on high severity)
const audit = await runContinuityAudit(context, apiKey).catch(() => null)
if (audit && !audit.clearToProceed) {
  return new Response(JSON.stringify({
    error: 'Continuity conflict detected. Review the issues before generating.',
    code: 'continuity_conflict',
    issues: audit.issues,
  }), { status: 409, headers: { 'Content-Type': 'application/json' } })
}
```

Add a `force: true` override (accept it from the request body) so authors can bypass the block if they know what they're doing.

### UI: Continuity Conflict Display

When the chapter generation API returns a `409 continuity_conflict`, show a dialog in the generation UI:
- Lists each high-severity issue with its description and suggested resolution
- "Fix issues first" (closes dialog) vs "Generate anyway" (resends with `force: true`)
- Uses `Dialog` component (already in the codebase per conventions)

### Part B Definition of Done
- [ ] `src/lib/memory/continuity-auditor.ts` created
- [ ] Auditor wired into chapter generation route between assembly and prompt-build
- [ ] `409` response returned for high-severity conflicts
- [ ] `force: true` override accepted in request body
- [ ] Conflict dialog shown in generation UI
- [ ] Auditor failure is non-blocking (catch and continue)

---

## Part C: Model Registry

### Goal

Replace every hardcoded model string with a call to `getModelForRole(userId, role)`. Add a settings page where the author can configure which OpenRouter model handles each role: `prose`, `reviewer`, `planner`, `summarizer`, `validation`, `oracle`, `arc_synthesis`.

### New File: `src/lib/models/registry.ts`

```typescript
export type ModelRole =
  | 'prose'
  | 'reviewer'
  | 'planner'
  | 'summarizer'
  | 'validation'
  | 'oracle'
  | 'arc_synthesis'

export const MODEL_DEFAULTS: Record<ModelRole, string> = {
  prose: 'anthropic/claude-sonnet-4-5',
  reviewer: 'google/gemini-pro-1.5',
  planner: 'anthropic/claude-haiku-4-5',
  summarizer: 'anthropic/claude-haiku-4-5',
  validation: 'anthropic/claude-haiku-4-5',
  oracle: 'google/gemini-pro-1.5',
  arc_synthesis: 'anthropic/claude-sonnet-4-5',
}

export async function getModelForRole(userId: string, role: ModelRole): Promise<string> {
  // Query user_model_preferences for this userId + role
  // Fall back to MODEL_DEFAULTS[role]
}
```

### Replace All Hardcoded Model Strings

Find every hardcoded model string (from the pre-flight grep) and replace with `getModelForRole(userId, role)`. Common locations:
- `src/app/api/generate/chapter/route.ts` — already uses `user_model_preferences` for `prose`, but falls back to a hardcoded string. Replace the fallback with `MODEL_DEFAULTS.prose`.
- Any other API routes that call OpenRouter

### Model Settings UI

Location: `src/app/(dashboard)/settings/` — check what tabs/sections already exist there. Add a "Models" section.

The Models settings section (`src/components/settings/model-settings.tsx`):
- Renders one row per `ModelRole`
- Each row: role label, description of what it does, a text input or dropdown for the model string
- Pre-populated with current preference or the default
- "Save" calls a server action that upserts into `user_model_preferences`
- Includes a note: "Any model available on OpenRouter can be used. Model IDs follow the format `provider/model-name`."

### Part C Definition of Done
- [ ] `src/lib/models/registry.ts` created with `getModelForRole` and `MODEL_DEFAULTS`
- [ ] All hardcoded model strings replaced across the codebase
- [ ] Model settings UI added to the settings page
- [ ] Server action for saving model preferences created
- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx next build` succeeds

---

## Overall Phase 4 Definition of Done

- [ ] All Part A tasks complete (tiered compression)
- [ ] All Part B tasks complete (continuity auditor)
- [ ] All Part C tasks complete (model registry)
- [ ] `npx tsc --noEmit` clean
- [ ] `npx next build` succeeds
