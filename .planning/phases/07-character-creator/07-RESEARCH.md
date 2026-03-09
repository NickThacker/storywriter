# Phase 7: Character Creator - Research

**Researched:** 2026-03-09
**Domain:** Intake wizard UI enhancement + prompt engineering + story bible integration
**Confidence:** HIGH

## Summary

Phase 7 replaces the existing role/archetype picker (Step 3 of the intake wizard) with a full character creator featuring card-based UI, AI-assisted name/detail generation, and premise-based character extraction. The implementation surface is well-scoped: one UI component rewrite, one new API route for AI character assistance, modifications to the premise-prefill route, adjustments to the outline prompt for strict character enforcement, and a character lock instruction added to the chapter prompt.

The existing codebase already has all the necessary infrastructure: the `CharacterRow` type in the database has fields for `appearance`, `backstory`, `personality`, `voice`, `motivations`, and `arc`. The `seedStoryBibleFromOutline()` function already handles manual vs AI source tracking with merge logic that preserves user-entered data. The intake store already has a `characters` array. The primary work is upgrading the character type in the intake store from `{ role, archetype, name? }` to a richer schema with optional detail fields, building the card UI, adding AI assistance endpoints, and tightening prompt enforcement.

**Primary recommendation:** Keep the implementation focused on three layers: (1) intake store + validation schema upgrade, (2) character creator UI with AI assist, (3) prompt enforcement in outline and chapter generation. No database migration needed -- the `characters` table already has all required columns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Name is the only required field -- lowest friction entry point
- Optional fields available for power users: appearance, personality/voice, backstory, arc/trajectory
- Card-based UI -- each character gets a card with name prominent, expandable for optional fields
- Minimum 1 character required before outline generation
- Soft warning at 8+ characters ("too many can dilute the story") but no hard cap
- Current role/archetype picker is removed entirely -- no role dropdown, AI infers roles from context
- "Suggest names" button -- generates 3-5 genre-appropriate names using genre + setting + tone context
- "Flesh out" button per character -- AI generates backstory/personality/arc suggestions from name + genre context
- "Suggest cast" button -- bulk generates 3-5 characters fitting the genre/setting
- Replaces current Step 3 in intake wizard (after Themes, before Setting)
- Premise-path users: AI extracts characters from premise, pre-fills cards
- Review step (Step 6): Shows character summary cards with count, click to go back
- Locked after outline approval -- edits happen through story bible post-approval
- All user-defined characters must appear in the outline -- AI cannot rename, merge, or skip them
- AI can add minor/incidental characters beyond the user's list
- AI-added characters auto-inserted into story bible with source: 'ai'
- User-entered fields are canonical and never overwritten by AI (merge strategy)
- Strict chapter generation enforcement -- chapter prompt lists canonical characters, AI must not invent new named characters

### Claude's Discretion
- Card component design details (spacing, expand/collapse animation)
- Name suggestion algorithm approach
- "Flesh out" prompt engineering
- How premise character extraction works internally
- Error states and loading indicators

### Deferred Ideas (OUT OF SCOPE)
- None
</user_constraints>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 15.x | Page routing, API routes, server actions | Already used throughout |
| Zustand (vanilla) | 5.x | Intake store state management | Project pattern: vanilla stores with React Context providers |
| Zod | 3.x | Validation schemas for intake data | Already used in `src/lib/validations/intake.ts` |
| Supabase | 2.x | Database (characters table already exists) | Already used for all data storage |
| OpenRouter API | - | AI calls for name suggestion, flesh out, suggest cast | Already used for all AI generation |
| Lucide React | - | Icons for character cards | Already used throughout UI |
| shadcn/ui components | - | Button, Badge, Dialog, Input | Already installed and used |

### No New Dependencies Needed
This phase requires zero new packages. All functionality builds on existing infrastructure.

## Architecture Patterns

### Existing Patterns to Follow

**Pattern 1: Intake Store (Zustand vanilla)**
The intake store at `src/lib/stores/intake-store.ts` uses `createStore` from `zustand/vanilla` with React Context providers. The character array needs its type upgraded but the store pattern stays identical.

Current type: `{ role: string; archetype: string; name?: string }[]`
New type needs: `{ name: string; appearance?: string; personality?: string; backstory?: string; arc?: string }[]`

Key: `role` and `archetype` fields are REMOVED (user decision). AI infers roles during outline generation.

**Pattern 2: AI Generation API Routes**
All AI calls go through Next.js API routes under `src/app/api/generate/`. They follow a consistent pattern:
1. Authenticate via Supabase
2. Get API key from user_settings
3. Get model via `getModelForRole(userId, role)`
4. Call OpenRouter with system + user messages
5. Parse response, return JSON

The character AI assistance (suggest names, flesh out, suggest cast) should follow this exact pattern. Use `planner` model role (currently `anthropic/claude-sonnet-4`) for all character assistance calls since they are lightweight planning tasks.

**Pattern 3: Premise Prefill**
The existing `premise-prefill/route.ts` already extracts characters from premise text but only extracts `{ role, archetype, name? }`. This needs to be upgraded to extract actual character names and optionally appearance/personality when mentioned in the premise.

**Pattern 4: Story Bible Seeding**
`seedStoryBibleFromOutline()` in `src/actions/story-bible.ts` already has the exact merge logic needed:
- Manual characters (source: 'manual'): only fills null fields from AI
- AI characters (source: 'ai'): full update with changelog
- New characters: insert with source: 'ai'

The phase needs to ensure intake characters become `source: 'manual'` entries in the characters table at outline approval time, BEFORE AI outline characters are merged in. This means `seedStoryBibleFromOutline` needs a pre-step that inserts intake characters first.

### Recommended File Structure
```
src/
  components/intake/steps/
    characters-step.tsx          # REWRITE: card-based character creator
  lib/
    validations/intake.ts        # UPDATE: new character schema
  stores/
    intake-store.ts              # UPDATE: new character type + actions
  app/api/generate/
    character-assist/route.ts    # NEW: AI name suggestion, flesh out, suggest cast
  lib/outline/
    prompt.ts                    # UPDATE: strict character enforcement language
  lib/memory/
    chapter-prompt.ts            # UPDATE: character lock enforcement
  actions/
    story-bible.ts               # UPDATE: pre-seed intake characters before outline merge
```

### Integration Points (Critical Path)

1. **Intake store type change** -- `characters` array type changes from `{ role, archetype, name? }` to `{ name, appearance?, personality?, backstory?, arc? }`. This cascades to:
   - `src/lib/validations/intake.ts` (Zod schema)
   - `src/lib/outline/prompt.ts` (character rendering in prompt)
   - `src/app/api/generate/premise-prefill/route.ts` (extraction format)
   - `src/components/intake/steps/review-screen.tsx` (display in review)
   - `src/actions/story-bible.ts` (seeding from intake data)

2. **Premise prefill upgrade** -- The existing prompt in `premise-prefill/route.ts` asks for `characters: [{ role, archetype, name? }]`. This needs to change to extract actual names and details from the premise text. The `PrefillResult` interface and its validation logic need updating.

3. **Outline prompt enforcement** -- Currently `buildOutlinePrompt()` renders characters as `- role named "name" (archetype)`. This needs to change to render by name with details and add strict enforcement: "You MUST include all listed characters. Do not rename, merge, or omit any."

4. **Chapter prompt character lock** -- `buildChapterPrompt()` system message needs: "Use ONLY characters established in the story bible. Do not introduce new named characters."

5. **Story bible pre-seeding** -- Before `seedStoryBibleFromOutline()` processes AI characters, intake characters must be inserted as `source: 'manual'` rows. This ensures the merge logic correctly preserves user data.

### Anti-Patterns to Avoid
- **Don't store characters in intake_data AND characters table simultaneously** -- intake_data.characters is the pre-outline source of truth; characters table is post-outline. The seeding step bridges them.
- **Don't add a role/archetype dropdown** -- User decision explicitly removes this. AI infers roles from context.
- **Don't make the API route streaming** -- Character assistance responses are small JSON payloads (names, short descriptions). Standard request/response is appropriate.
- **Don't create a separate migration** -- The characters table already has all needed columns (name, appearance, backstory, personality, voice, motivations, arc, role, one_line, source, changelog).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Character name validation | Custom name parser | Simple `name.trim()` with min length 1 | Names are free-form; no need to validate format |
| AI response parsing | Custom streaming parser | Standard `response_format: { type: 'json_object' }` | Character assist responses are small, non-streaming |
| Expand/collapse animation | CSS keyframe animations | Tailwind `transition-all` + conditional `max-height`/`opacity` | Consistent with existing UI patterns |
| Character deduplication | Custom diffing logic | Simple name comparison (case-insensitive) | Warn on duplicates, don't auto-merge |

## Common Pitfalls

### Pitfall 1: Intake Store Type Breakage
**What goes wrong:** Changing the characters array type breaks all consumers that reference `role` or `archetype` fields.
**Why it happens:** The old type `{ role, archetype, name? }` is used in 5+ files.
**How to avoid:** Update all consumers in a single plan. Search for `.role` and `.archetype` on character objects across the codebase. Key files: `intake.ts` (validation), `prompt.ts` (outline), `premise-prefill/route.ts`, `review-screen.tsx`, `story-bible.ts`.
**Warning signs:** TypeScript compilation errors after store type change.

### Pitfall 2: Premise Prefill Backward Compatibility
**What goes wrong:** Existing projects with old-format intake_data break when loaded.
**Why it happens:** Old `intake_data.characters` have `{ role, archetype, name? }` format; new code expects `{ name, ... }`.
**How to avoid:** Add a migration/normalization step in `hydrateFromPrefill` that converts old format to new: if character has `role` but no `name`, use `role` as a placeholder or skip. The intake store's hydration function already handles partial data.
**Warning signs:** Characters step showing empty cards for old projects.

### Pitfall 3: Outline Character Enforcement Too Strict
**What goes wrong:** AI refuses to generate outline because it can't work with user's character choices.
**Why it happens:** Overly rigid enforcement language in the prompt.
**How to avoid:** Use firm but flexible language: "You MUST include all listed characters. You MAY add additional minor characters as needed for the story. Do not rename or omit any user-defined character." Allow AI creative freedom around the constraints.
**Warning signs:** AI returning errors or empty outlines when given unusual character combinations.

### Pitfall 4: Character Seeding Order in Story Bible
**What goes wrong:** User-defined character details get overwritten by AI-generated outline data.
**Why it happens:** `seedStoryBibleFromOutline()` processes outline characters, but if intake characters haven't been inserted as `source: 'manual'` first, the function creates them as `source: 'ai'` and they lose canonical status.
**How to avoid:** Insert intake characters as `source: 'manual'` rows BEFORE calling `seedStoryBibleFromOutline()`. The existing merge logic then correctly preserves manual fields and only fills nulls from AI data.
**Warning signs:** User-entered appearance/backstory disappearing after outline approval.

### Pitfall 5: Chapter Lock Being Too Absolute
**What goes wrong:** Chapter generation fails or produces awkward prose because it can't mention any unnamed characters (waiter, taxi driver, etc.).
**Why it happens:** Overly strict "no new characters" instruction.
**How to avoid:** Differentiate between named characters (must be from story bible) and unnamed functional characters (waiter, guard, passerby). The lock should say: "All NAMED characters must come from the story bible below. You may include unnamed functional characters (e.g., 'the waiter', 'a guard') as needed for scenes."
**Warning signs:** Awkward prose where every minor interaction character is absent.

## Code Examples

### Character Type in Intake Store
```typescript
// New character type for intake (replaces { role, archetype, name? })
export interface IntakeCharacter {
  name: string           // REQUIRED -- only mandatory field
  appearance?: string    // optional
  personality?: string   // optional
  backstory?: string     // optional
  arc?: string           // optional
}
```

### Updated Intake Validation Schema
```typescript
// src/lib/validations/intake.ts
characters: z.array(
  z.object({
    name: z.string().min(1, 'Character name is required'),
    appearance: z.string().optional(),
    personality: z.string().optional(),
    backstory: z.string().optional(),
    arc: z.string().optional(),
  })
),
```

### Character Assist API Route Pattern
```typescript
// src/app/api/generate/character-assist/route.ts
// Handles three actions: suggest-names, flesh-out, suggest-cast
// Uses getModelForRole(userId, 'planner') for all calls

interface CharacterAssistRequest {
  action: 'suggest-names' | 'flesh-out' | 'suggest-cast'
  genre?: string
  setting?: string
  tone?: string
  themes?: string[]
  // For flesh-out: the character to expand
  character?: { name: string; appearance?: string; personality?: string }
  // For suggest-names: how many
  count?: number
  // Existing characters to avoid duplicates
  existingCharacters?: string[]
}
```

### Outline Prompt Character Section (Updated)
```typescript
// In buildOutlinePrompt():
const characterLines = intakeData.characters
  .map((c) => {
    const details: string[] = []
    if (c.appearance) details.push(`Appearance: ${c.appearance}`)
    if (c.personality) details.push(`Personality: ${c.personality}`)
    if (c.backstory) details.push(`Backstory: ${c.backstory}`)
    if (c.arc) details.push(`Arc: ${c.arc}`)
    const detailStr = details.length > 0 ? `\n  ${details.join('\n  ')}` : ''
    return `- ${c.name}${detailStr}`
  })
  .join('\n')

// Enforcement block added to user message:
const characterEnforcement = intakeData.characters.length > 0
  ? `\n\nCHARACTER RULES:
- You MUST include ALL characters listed above in the outline. Do not rename, merge, or omit any.
- User-provided details (appearance, personality, backstory) are CANONICAL -- reflect them faithfully.
- You MAY add additional minor/incidental characters as the story requires.
- For each character, generate a one_line summary and arc trajectory.`
  : ''
```

### Chapter Prompt Character Lock
```typescript
// Added to buildChapterPrompt() system message:
const characterLock = `
IMPORTANT -- Character rules:
- Use ONLY named characters from the story bible / character states listed below.
- Do NOT introduce new named characters that are not in the story bible.
- Unnamed functional characters (e.g., "the waiter", "a security guard") are acceptable for scene needs.
- Character names, appearances, and personalities must match their story bible entries exactly.`
```

### Pre-seeding Intake Characters Before Outline Merge
```typescript
// In the outline approval flow, before seedStoryBibleFromOutline():
async function preseedIntakeCharacters(
  projectId: string,
  intakeCharacters: IntakeCharacter[]
): Promise<void> {
  const supabase = await createClient()
  for (const char of intakeCharacters) {
    // Check if already exists (e.g., from a previous approval)
    const { data: existing } = await supabase
      .from('characters')
      .select('id')
      .eq('project_id', projectId)
      .eq('name', char.name)
      .maybeSingle()

    if (!existing) {
      await supabase.from('characters').insert({
        project_id: projectId,
        name: char.name,
        appearance: char.appearance ?? null,
        backstory: char.backstory ?? null,
        personality: char.personality ?? null,
        source: 'manual',
        changelog: [{ at: new Date().toISOString(), by: 'user', note: 'Created from intake wizard' }],
      })
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Role/archetype picker (5 fixed roles) | Free-form named characters with optional details | This phase | Characters are unique per story, not generic archetypes |
| Characters optional in intake | Minimum 1 character required | This phase | Every story starts with at least one named character |
| AI invents all character names | User defines names, AI enriches details | This phase | Prevents generic/repetitive AI naming |
| No character enforcement in prompts | Strict canonical character rules | This phase | Story bible becomes single source of truth |

## Open Questions

1. **Premise character extraction format**
   - What we know: premise-prefill currently returns `{ role, archetype, name? }`. Needs to return `{ name, appearance?, personality?, backstory? }`.
   - What's unclear: How well will AI extract character NAMES (not just roles) from short premise text?
   - Recommendation: Prompt should ask for actual names mentioned in the premise. If only roles are described ("a detective"), generate a placeholder like "unnamed detective" and let the user rename.

2. **Backward compatibility with existing projects**
   - What we know: Old projects have `intake_data.characters` in `{ role, archetype, name? }` format.
   - What's unclear: How many existing projects exist and whether they'll hit the intake page again.
   - Recommendation: Add a normalization function that converts old format. If character has `name`, keep it and drop role/archetype. If no `name`, use the role as placeholder name. Run this in `hydrateFromPrefill`.

3. **When exactly to pre-seed intake characters into story bible**
   - What we know: Must happen before `seedStoryBibleFromOutline()` so merge logic treats them as `source: 'manual'`.
   - What's unclear: Should this happen at outline generation start or at outline approval?
   - Recommendation: At outline approval (same transaction as `seedStoryBibleFromOutline`), because the user might still be editing characters between generation and approval.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all integration files (intake-store.ts, intake.ts, prompt.ts, chapter-prompt.ts, story-bible.ts, premise-prefill/route.ts, review-screen.tsx, database.ts, registry.ts)
- CONTEXT.md user decisions from discussion phase

### Secondary (MEDIUM confidence)
- Project MEMORY.md for architecture patterns and previous phase decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing infrastructure
- Architecture: HIGH - follows established patterns exactly, all integration points mapped
- Pitfalls: HIGH - identified from direct code reading, cascade effects are concrete
- Prompt engineering: MEDIUM - enforcement language needs real-world testing with AI models

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no external dependencies changing)
