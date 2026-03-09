# Phase 7: Character Creator — Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current intake Step 3 (role/archetype placeholders) with a full character creator where users define named characters with optional detail fields before outline generation. Characters become the canonical source of truth — locked after outline approval, strictly enforced during chapter generation. Solves the problem of AI inventing generic/repetitive character names.

</domain>

<decisions>
## Implementation Decisions

### Character detail depth
- **Name is the only required field** — lowest friction entry point
- Optional fields available for power users: appearance, personality/voice, backstory, arc/trajectory
- Card-based UI — each character gets a card with name prominent, expandable for optional fields
- Minimum 1 character required before outline generation
- Soft warning at 8+ characters ("too many can dilute the story") but no hard cap
- Current role/archetype picker is **removed entirely** — no role dropdown, AI infers roles from context

### AI assistance in character creation
- **"Suggest names" button** — generates 3-5 genre-appropriate names using genre + setting + tone context. User picks or ignores.
- **"Flesh out" button per character** — AI generates backstory/personality/arc suggestions from name + genre context. User can edit or discard.
- **"Suggest cast" button** — bulk generates 3-5 characters fitting the genre/setting. User can keep, edit, or remove each one.
- Both one-at-a-time and bulk generation available — user's choice

### Flow placement & interaction
- **Replaces current Step 3** in intake wizard (after Themes, before Setting)
- **Premise-path users:** AI extracts characters mentioned in the premise and pre-fills character cards. User can edit/add/remove before proceeding.
- **Review step (Step 6):** Shows character summary cards with count. Click to go back and edit.
- **Locked after outline approval** — characters cannot be edited once outline is approved. Edits happen through story bible post-approval.
- Resume behavior: if intake_data has characters, Step 3 shows them pre-filled

### Outline prompt enforcement
- **All user-defined characters must appear in the outline** — AI cannot rename, merge, or skip them
- AI **can add minor/incidental characters** beyond the user's list
- AI-added characters auto-inserted into story bible with `source: 'ai'`
- **Merge strategy:** user-entered fields (name, appearance, backstory, personality) are canonical and never overwritten. AI fills in `arc` and `one_line` from outline generation.
- User data is the source of truth; AI enriches but never replaces

### Chapter generation character lock
- **Strict enforcement** — chapter prompt explicitly lists canonical characters from story bible
- AI must not invent new named characters during prose generation
- This is the critical "lock" that prevents character conflicts downstream

### Claude's Discretion
- Card component design details (spacing, expand/collapse animation)
- Name suggestion algorithm approach
- "Flesh out" prompt engineering
- How premise character extraction works internally
- Error states and loading indicators

</decisions>

<specifics>
## Specific Ideas

- Characters must be "locked" by the time we get to chapter generation and outline — prevents conflicts later
- The generic/repetitive name problem is the primary motivation — each book should have unique characters
- Existing card-based UI patterns in the app should be followed for consistency

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/intake/steps/characters-step.tsx` — current Step 3, will be replaced entirely
- `src/lib/stores/intake-store.ts` — manages wizard state, `characters[]` field already exists (role/archetype/name?)
- `src/lib/validations/intake.ts` — `IntakeData` type with `characters` array
- `src/actions/story-bible.ts` — `seedStoryBibleFromOutline()` handles character creation at approval
- `src/lib/outline/prompt.ts` — "Characters Requested" section in outline prompt, needs enforcement language
- `src/lib/memory/chapter-prompt.ts` — chapter generation prompt, needs character lock enforcement
- Card UI patterns used throughout the app (intake cards, chapter cards)

### Established Patterns
- Intake wizard: 7-step store with path/genre/themes/characters/setting/tone/review
- Premise prefill: `/api/generate/premise-prefill` already auto-fills wizard fields from premise text
- Story bible seeding: `seedStoryBibleFromOutline()` handles merge logic with source tracking
- Character storage: `CharacterRow` type in `database.ts` with source/changelog fields

### Integration Points
- `intake-store.ts` — characters array type needs expanding (name required, optional detail fields)
- `intakeDataSchema` in validations — needs updated character schema
- `outline/prompt.ts` — needs strict "use these characters" instruction block
- `chapter-prompt.ts` — needs "only use story bible characters" enforcement
- `premise-prefill/route.ts` — needs to extract character names from premise
- `story-bible.ts` — merge logic needs to respect user-entered fields as canonical

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-character-creator*
*Context gathered: 2026-03-09*
