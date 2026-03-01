# Phase 2: Guided Intake and Outline - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can go from a blank idea to an approved novel outline with a populated story bible, ready for chapter generation. Covers: intake wizard (INTK-01–04), outline generation and editing (OUTL-01–05), and story bible population (CHAR-01–04).

</domain>

<decisions>
## Implementation Decisions

### Intake flow design
- Decision-driven cards: each step presents 3-5 visual cards to pick from (genre cards, tone cards, etc.) — feels like creative choices, not form-filling
- Two paths at the start: "Build step by step" (card wizard) OR "I already have an idea" (paste premise)
- Premise path is hybrid: user pastes text, AI pre-fills what it can infer (genre, tone, etc.), user confirms/adjusts remaining cards
- Five separate wizard steps: Genre, Themes, Characters, Setting, Tone — each on its own screen
- Back button + progress bar: user can freely navigate forward and back through all steps
- Review screen at the end before generation (INTK-03)

### Outline display and editing
- Two-panel layout hybrid with visual timeline: left panel lists chapters, right panel shows detail for selected chapter, with a visual timeline/node view showing chapter flow and plot arcs
- Beat sheet integration: user selects a known beat sheet during intake (Save the Cat, Romancing the Beat, etc.) — AI uses it to structure the outline
- Beat sheet is switchable on the outline page: user can compare their outline against different beat sheet structures
- Beat sheet beats map to corresponding outline beats, giving a high-level structural overview
- Inline editing: click any text in the detail panel to edit directly (titles, beats, character notes)
- Target length and chapter count: presets offered during intake ("Short novel 50k", "Standard 80k", "Epic 120k"), adjustable on the outline page with regeneration if needed

### Outline regeneration
- Three levels of regeneration, all available:
  1. Full regenerate: replaces entire outline from same intake data
  2. Regenerate with direction: text field for feedback ("Make act 2 more tense") — AI uses intake data + feedback
  3. Per-chapter regenerate: redo individual chapters without losing the rest

### Story bible layout
- Tabbed sections: Characters, Locations, Timeline, World Facts — each tab shows a card grid
- Click a card to see/edit full detail
- Character profiles are tiered: card shows name, role, one-line summary; expanding reveals full profile (appearance, backstory, personality/voice, motivations, relationships, arc)
- Story bible has its own page AND is cross-linked from the outline — character/location names in outline beats are clickable links to their bible entries

### AI generation experience
- Streaming: outline builds live on screen as AI generates — chapters and beats appear in real time
- Multi-step n8n workflow: generation broken into observable steps (e.g., generate structure → expand beats → populate characters) — each step is an n8n node

### Claude's Discretion
- Story bible timing: whether bible is editable before or after outline approval
- Outline version history: whether previous outline versions are kept on regeneration
- Optimal step grouping/order within the five intake steps
- Loading skeleton and transition designs
- Error state handling throughout the flow
- Beat sheet data structure and mapping algorithm

</decisions>

<specifics>
## Specific Ideas

- Beat sheets are a core concept: "Save the Cat," "Romancing the Beat," and similar established story structures should be selectable — the outline page shows how the story maps to the chosen beat sheet
- Custom/imported beat sheets are explicitly deferred to a future version
- The card-based wizard should feel like making creative decisions, not filling out a form
- Streaming outline generation: users watch their story take shape in real time
- The two-panel + timeline hybrid gives both list-scanning and visual story arc overview

</specifics>

<deferred>
## Deferred Ideas

- **AI character headshots**: Use an image generation model to create character portraits from profile data, with regenerate button when profile changes — separate domain (image generation API, cost model, error handling)
- **Custom beat sheet import**: Authors create/import their own beat sheet templates — future enhancement after v1 beat sheet support proves out

</deferred>

---

*Phase: 02-guided-intake-and-outline*
*Context gathered: 2026-03-01*
