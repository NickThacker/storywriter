---
phase: 04-creative-checkpoints
plan: 04
subsystem: ui
tags: [openrouter, json-schema, react, checkpoint, impact-analysis, novel-complete]

# Dependency graph
requires:
  - phase: 04-01
    provides: chapter_checkpoints schema, flagAffectedChapters/resetChapterApproval server actions
  - phase: 04-02
    provides: CheckpointPanel shell, CheckpointStepApprove
  - phase: 04-03
    provides: CheckpointStepDirection (extended here), direction_for_next data
provides:
  - Impact analysis route (/api/generate/analyze-impact) — on-demand downstream chapter analysis
  - buildImpactPrompt() with IMPACT_ANALYSIS_SCHEMA for structured JSON generation
  - NovelCompleteSummary component — stats-only celebration for last chapter approval
  - Updated CheckpointPanel — shows NovelCompleteSummary when isLastChapter + approved
  - Updated CheckpointStepDirection — Analyze Impact button with amber result cards
  - Updated chapter-panel.tsx — plotThreadStats computation, updated showCheckpoint logic
affects:
  - Phase 5 export (NovelCompleteSummary is the natural transition point to export)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "analyze-impact route follows compress-chapter pattern: auth → parse → verify → fetch changed chapter checkpoint → fetch downstream chapters with text → fetch outline for titles → get API key + editing model → build prompt → call OpenRouter json_schema → parse → flagAffectedChapters → return"
    - "Analyze Impact button only visible when alreadySaved (direction was previously confirmed) — ensures on-demand only, never automatic"
    - "showCheckpoint logic updated: !isApproved || isLast — keeps panel visible after last chapter approval for NovelCompleteSummary"
    - "plotThreadStats computed from checkpointMap state_diff.newThreads/resolvedThreads across all checkpoints (approximate v1)"

key-files:
  created:
    - src/lib/checkpoint/impact-prompt.ts
    - src/app/api/generate/analyze-impact/route.ts
    - src/components/chapters/novel-complete-summary.tsx
  modified:
    - src/components/chapters/checkpoint-panel.tsx
    - src/components/chapters/checkpoint-step-direction.tsx
    - src/components/chapters/chapter-panel.tsx

key-decisions:
  - "Analyze Impact is on-demand only (user clicks button) — shown only when alreadySaved and a direction is selected; never fires automatically"
  - "NovelCompleteSummary is stats-only for v1 (no AI narrative summary call) — consistent with CONTEXT.md research recommendation"
  - "plotThreadStats computed client-side from checkpointMap state_diff (approximate) — avoids new server action, good enough for v1 display"
  - "showCheckpoint now allows last chapter to remain visible after approval (isLast exemption) — NovelCompleteSummary needs to be reachable"
  - "Impact analysis uses editing model preference (cheaper) — full chapter text is sent so a capable but cost-efficient model is appropriate"

patterns-established:
  - "Amber color scheme for impact results: bg-amber-50/border-amber-200 (light) and bg-amber-500/5/border-amber-500/20 (dark) — consistent warning palette"
  - "AffectedChapterResult interface in checkpoint-step-direction.tsx for local type safety without polluting project-memory types"

requirements-completed:
  - CKPT-01
  - CKPT-04

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 4 Plan 04: Impact Analysis and Novel Completion Summary

**On-demand impact analysis route (cheaper model + full chapter text) with amber per-chapter result cards, and stats-only NovelCompleteSummary celebration for last chapter approval**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-02T22:47:18Z
- **Completed:** 2026-03-02T22:51:07Z
- **Tasks:** 2
- **Files modified:** 6 (2 created in task 1, 4 in task 2)

## Accomplishments

- Impact analysis route handler analyzes downstream chapters (with existing text only) for concrete dependencies on a changed direction; sends full chapter text to the cheaper editing model for thorough analysis
- buildImpactPrompt() uses IMPACT_ANALYSIS_SCHEMA for structured JSON; system message emphasizes concrete-only flagging (no speculative flags)
- NovelCompleteSummary displays chapter count, word count, plot threads resolved/open in a clean 2x2 stat card grid
- CheckpointPanel now shows NovelCompleteSummary when isLastChapter and approval_status is 'approved'
- CheckpointStepDirection extended with Analyze Impact button (only visible when a direction was already saved), impact results render as amber cards with plot thread names
- chapter-panel.tsx updated to compute plotThreadStats from checkpointMap state_diff and pass all new props to CheckpointPanel; showCheckpoint logic updated to keep panel open for last chapter after approval

## Task Commits

1. **Task 1: Impact analysis route handler and prompt builder** — `1c063c0` (feat)
2. **Task 2: NovelCompleteSummary, impact analysis trigger, checkpoint completion** — `82bc2b6` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/checkpoint/impact-prompt.ts` — IMPACT_ANALYSIS_SCHEMA + buildImpactPrompt() with concrete-only analysis system message
- `src/app/api/generate/analyze-impact/route.ts` — Non-streaming structured JSON endpoint; fetches downstream chapters with text, uses editing model, calls flagAffectedChapters server action
- `src/components/chapters/novel-complete-summary.tsx` — Stats celebration: 2x2 card grid (chapters, words, threads resolved, threads open) with Sparkles icon header
- `src/components/chapters/checkpoint-panel.tsx` — NovelCompleteSummary integration (isLastChapter + approved condition); new props: projectTitle, totalWordCount, totalChapters, plotThreadStats
- `src/components/chapters/checkpoint-step-direction.tsx` — Analyze Impact button (on-demand, alreadySaved gate), amber result cards with plot thread names, Zap icon
- `src/components/chapters/chapter-panel.tsx` — plotThreadStats useMemo from checkpointMap; new CheckpointPanel props; updated showCheckpoint to allow last chapter panel after approval

## Decisions Made

- Impact analysis is on-demand only — button visible only when `alreadySaved` is true (user previously confirmed a direction and is now changing it)
- NovelCompleteSummary is stats-only for v1 — no AI narrative summary call (per CONTEXT.md research recommendation to avoid extra latency at emotional completion moment)
- plotThreadStats computed client-side from checkpointMap state_diff (approximate) — total new threads minus resolved threads; sufficient for v1 display, wirable with precise server data in a future enhancement
- showCheckpoint updated: `!isApproved || isLast` — last chapter exempted from the "hide when approved" rule so NovelCompleteSummary is always reachable

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required beyond existing OpenRouter API key.

## Phase 4 Completion

Phase 4 (Creative Checkpoints) is now functionally complete:
- Plan 01: DB schema + server actions for creative checkpoint fields
- Plan 02: CheckpointPanel shell + CheckpointStepApprove + scene-level rewrites
- Plan 03: Direction options endpoint + CheckpointStepDirection Step 2 UI
- Plan 04: Impact analysis route + NovelCompleteSummary + completion integration

The creative control loop is closed. Users can approve chapters, set direction for next chapters, analyze ripple effects of direction changes, and celebrate novel completion.

## Self-Check: PASSED

- src/app/api/generate/analyze-impact/route.ts: FOUND
- src/lib/checkpoint/impact-prompt.ts: FOUND
- src/components/chapters/novel-complete-summary.tsx: FOUND
- Commit 1c063c0 (Task 1): FOUND
- Commit 82bc2b6 (Task 2): FOUND
- TypeScript: compiles with no errors

---
*Phase: 04-creative-checkpoints*
*Completed: 2026-03-02*
