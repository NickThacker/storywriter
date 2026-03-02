# Phase 3: Chapter Generation - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can generate novel chapters one at a time with real-time streaming prose, manage chapters through a status workflow, edit generated prose inline, and track overall novel progress. This phase delivers the core writing loop: generate, review, edit, approve. Batch generation, export, and collaborative features are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Streaming Experience
- Word-by-word typing effect — tokens appear as if being typed, immersive "watching a writer" feel
- Stop + pause/resume controls — user can pause streaming to read, then resume generation
- Side panel alongside outline — prose streams in a panel next to the chapter list/outline, keeping context visible
- Visible metadata during streaming: live word count, chapter number/title at top, and a progress indicator

### Chapter Management
- Vertical scrollable list — each chapter shows title, status badge, and word count
- Both "Generate Next" button (guided path for sequential generation) and per-chapter "Generate" buttons (for out-of-order generation)
- Rewrite via adjustments dialog — modal where user specifies what to change (tone, pacing, focus) before regenerating; old version is replaced
- Out-of-order generation: AI uses outline beats as a bridge for continuity when earlier chapters are still pending. System must track which chapters exist and reference outline beats for missing chapters to maintain narrative coherence

### Inline Editing
- Rich text editor (WYSIWYG) — bold, italic, headings, formatted text as you edit
- Novel-specific tools: scene break separator (***) and author notes/comments that don't appear in final text
- Auto-save with debounce — changes persist automatically, no save button needed
- Click chapter to open in editor — always editable when viewing, no separate "edit mode" toggle

### Progress Tracking
- Progress displayed in both locations: summary on project dashboard, detailed breakdown on chapter list page
- Key metrics: total word count, target word count, and X/Y chapters completed
- Sidebar navigation showing all novel-writing phases (Intake, Outline, Chapters, etc.) with completion status; current phase highlighted
- Progress bar with milestone markers at 25%, 50%, 75%, and complete

### Claude's Discretion
- Chapter status flow design (will include statuses from success criteria: pending, generating, checkpoint, approved)
- Rich text editor library choice (Tiptap, Slate, etc.)
- Exact spacing, typography, and visual design details
- Error state handling
- Loading skeleton design

</decisions>

<specifics>
## Specific Ideas

- The streaming view should feel like watching a writer at work — the typing effect is key to the experience
- The side panel layout means the user can glance at the outline while prose generates, staying oriented in the story
- Out-of-order generation is a first-class concern: the AI context/memory system must track which chapters are completed vs pending and use outline beats to bridge gaps
- Scene breaks (***) and author notes are novel-writing primitives that should feel native in the editor, not bolted on
- Milestone markers on the progress bar should feel motivating — tangible markers of achievement as the novel comes together

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-chapter-generation*
*Context gathered: 2026-03-01*
