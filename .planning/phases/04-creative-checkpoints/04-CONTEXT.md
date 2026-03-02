# Phase 4: Creative Checkpoints - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

After each chapter generates, the workflow pauses for a structured creative decision point. The user reviews the chapter, approves or requests a rewrite, and selects execution-level direction (tone, pacing, character focus) for the next chapter. The approved outline is the immutable source of truth — checkpoints clarify HOW to execute beats, not WHAT happens.

</domain>

<decisions>
## Implementation Decisions

### Checkpoint trigger & gating
- Soft prompt after generation + compression finishes (banner/toast: "Chapter ready — Review checkpoint"), not forced auto-transition
- Soft gating: user CAN generate ahead without completing checkpoints, no skip limit
- Checkpoints accumulate as open items when skipped
- Two-step flow within a checkpoint: Step 1 = read chapter, approve or rewrite. Step 2 = pick direction for next chapter
- Last chapter: approve/rewrite only, then show novel completion summary (word count, chapter count, plot threads resolved vs open)

### Cascading impact on direction changes
- When user changes a prior checkpoint's direction, reset that chapter's status from "approved" back to "checkpoint"
- Downstream chapters flagged as "potentially affected"
- Impact analysis is on-demand (user clicks "Analyze impact"), not automatic — avoids unnecessary API calls
- Full re-read of downstream chapter text using a cheaper analysis model (routed through OpenRouter, separate from prose model)
- Impact analysis generates per-chapter descriptions of what's affected ("Chapter 8 references the ally betrayal from Ch5 — this needs updating")
- Affected flags appear both as badges in the chapter list sidebar AND in a dedicated summary panel
- Direction history: replace only (no version history of past direction choices)

### Direction options
- 2-4 AI-generated options per checkpoint, AI decides count based on story point
- Each option: bold title/hook (1 sentence) + short paragraph (3-4 sentences)
- Outline-anchored: options stay grounded in approved outline beats, no plot divergence
- Custom direction also constrained to execution choices (tone, pacing, focus) — cannot override outline beats
- Custom direction uses guided/structured prompts (tone, pacing, character focus fields)

### Approve vs rewrite UX
- Dedicated checkpoint view (distinct from the reading view)
- Soft approve: approval marks direction as confirmed but prose stays editable
- Rewrite offers guided prompts by default with a free-text "advanced" toggle
- Scene-level rewrites: user can select a section/scene to rewrite while keeping the rest (requires scene boundary detection + context stitching)
- Full chapter rewrite also available as an option

### Checkpoint screen layout
- Expandable panel that slides in alongside the chapter text (chapter remains visible for reference)
- Detailed stats shown: word count, plot threads advanced/resolved, characters featured, foreshadowing planted, continuity notes
- Two-step flow uses in-place panel transition (smooth guided flow from approve to direction selection)
- Direction options displayed as cards (title + paragraph per card, click to select) — consistent with intake wizard's card-based design

### Outline immutability
- The approved outline is the source of truth and does not change after approval
- All checkpoint directions and custom directions operate within the outline's beats
- Changes are limited to execution-level: tone, pacing, character emphasis, scene detail

### Claude's Discretion
- Exact animation/transition timing for the expandable panel
- Scene boundary detection approach for scene-level rewrites
- Specific guided prompt fields for rewrite and custom direction
- Novel completion summary design and content
- How the cheaper analysis model is selected/configured (new task_type or user picks in settings)
- Exact badge/flag design for affected chapters

</decisions>

<specifics>
## Specific Ideas

- Outline as immutable "contract" — checkpoints only adjust execution, never plot structure
- Impact analysis using cheaper model (deepseek, qwen, etc.) for cost efficiency on full chapter re-reads
- Expandable checkpoint panel that keeps chapter text visible — author can reference while making decisions
- Card-based direction options consistent with the intake wizard's existing design language
- Novel completion summary at the last chapter checkpoint — celebrate the milestone

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RewriteDialog` (`src/components/chapters/rewrite-dialog.tsx`): Free-text rewrite modal, can be extended with guided prompts + advanced toggle
- `ApproveDialog` (`src/components/outline/approve-dialog.tsx`): Outline approval pattern with confirmation UI
- `ChapterList` status system: Already defines `'pending' | 'generating' | 'checkpoint' | 'approved'` — "approved" status exists but is never set today
- `StatusBadge` component: Has config for all 4 statuses including approved (green/CheckCircle) — ready to use
- `ProgressBar` component: Already shows chapter progress, could integrate checkpoint completion stats
- Project memory system (`src/types/project-memory.ts`): `PlotThread`, `CharacterState`, `ForeshadowingSeed`, `ContinuityFact`, `StateDiff` — all available for checkpoint stats display
- `CompressionResult` type: Already captures exactly the stats needed for the checkpoint panel (threads, characters, foreshadowing, continuity)
- Card-based selection pattern from intake wizard (`CardPicker` component)

### Established Patterns
- Zustand stores with React Context providers (App Router safe) — checkpoint state would follow this pattern
- OpenRouter BYOK with model selection per `task_type` — could add an "analysis" task type for the cheaper impact model
- Server actions + SSE streaming for generation — rewrite flow already uses `useChapterStream` hook
- Dialog components using shadcn/ui Dialog primitives
- Two-panel layout in ChapterPanel with focus mode collapse

### Integration Points
- `ChapterPanel` (`src/components/chapters/chapter-panel.tsx`): Main orchestrator — checkpoint panel would integrate here
- `deriveChapterList()`: Derives status per chapter — needs to incorporate "approved" and "affected" states
- Post-compression effect (line 132-213): Currently just saves text — checkpoint auto-transition would hook in here
- `handleGenerate`: Currently allows generating any chapter — gating logic would wrap this
- `checkpointMap` state: Already tracks chapter checkpoints — could be extended with direction + approval data

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-creative-checkpoints*
*Context gathered: 2026-03-02*
