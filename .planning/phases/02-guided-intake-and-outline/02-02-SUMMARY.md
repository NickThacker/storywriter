---
phase: 02-guided-intake-and-outline
plan: 02
subsystem: intake-wizard
tags: [data, zustand, components, card-picker, beat-sheets]
dependency_graph:
  requires: []
  provides:
    - src/lib/data/genres.ts
    - src/lib/data/themes.ts
    - src/lib/data/tones.ts
    - src/lib/data/settings.ts
    - src/lib/data/lengths.ts
    - src/lib/data/beat-sheets.ts
    - src/lib/stores/intake-store.ts
    - src/components/intake/intake-store-provider.tsx
    - src/components/intake/card-picker.tsx
  affects:
    - Phase 02 Plan 03 (wizard pages consume all of these)
tech_stack:
  added:
    - zustand (vanilla store + React Context pattern)
  patterns:
    - Vanilla Zustand store with createStore for App Router safety
    - React Context + useRef provider pattern (avoids SSR singleton leak)
    - Static data compiled into client bundle (not DB records)
    - Lucide icon string-name lookup map for bundle efficiency
key_files:
  created:
    - src/lib/data/genres.ts
    - src/lib/data/themes.ts
    - src/lib/data/tones.ts
    - src/lib/data/settings.ts
    - src/lib/data/lengths.ts
    - src/lib/data/beat-sheets.ts
    - src/lib/stores/intake-store.ts
    - src/components/intake/intake-store-provider.tsx
    - src/components/intake/card-picker.tsx
  modified: []
decisions:
  - "Zustand vanilla createStore (not create shorthand) used for App Router SSR safety — avoids global singleton hydration mismatch"
  - "No Zustand persist middleware — wizard state is ephemeral per session, committed to DB on submit"
  - "TOTAL_STEPS = 7: path, genre, themes, characters, setting, tone+beatSheet+length, review"
  - "Icon rendering via static ICON_MAP lookup (not dynamic imports) — keeps bundle predictable and tree-shakeable"
  - "CardOption interface defined in genres.ts and imported via type — single source of truth"
metrics:
  duration: "~2 min"
  completed_date: "2026-03-01"
  tasks_completed: 3
  tasks_total: 3
  files_created: 9
  files_modified: 0
---

# Phase 02 Plan 02: Intake Store, Data, and CardPicker Summary

**One-liner:** Static wizard data (5 categories, 4 beat sheets), vanilla Zustand intake store with React Context provider, and reusable CardPicker component for all card-based selection steps.

## What Was Built

### Task 1 — Static Data Files (commit: f3b898c)

Six static data files defining all creative options for the wizard:

- `genres.ts` — 5 genres (fantasy, romance, thriller, sci-fi, literary) with Lucide icon names
- `themes.ts` — 5 multi-selectable themes (redemption, power, identity, love-loss, survival)
- `tones.ts` — 4 tones (dark, hopeful, witty, lyrical)
- `settings.ts` — 5 settings (urban, historical, secondary-world, rural, space)
- `lengths.ts` — 3 length presets with word count and default chapter count as `const` for type narrowing
- `beat-sheets.ts` — 4 beat sheet structures (Save the Cat 15 beats, Three-Act 7 beats, Hero's Journey 12 beats, Romancing the Beat 8 beats), each beat tagged with act (1/2/3) and positionPercent

All data is compiled into the client bundle — no DB round trips for these static choices.

### Task 2 — Zustand Store and Provider (commit: ebe574e)

`src/lib/stores/intake-store.ts`:
- Vanilla `createStore` (not `create` shorthand) — required for App Router
- Full `IntakeState` with all wizard fields and typed actions
- Navigation: `nextStep`, `prevStep`, `goToStep` (all clamped to [0, TOTAL_STEPS-1])
- `hydrateFromPrefill` for server-side draft data injection (premise path)
- No persist middleware — ephemeral state only

`src/components/intake/intake-store-provider.tsx`:
- `'use client'` component with React Context holding the store instance
- `useRef` ensures single store instance per component mount
- `IntakeStoreProvider` accepts optional `initialState` prop for hydrating from server data
- `useIntakeStore<T>(selector)` hook with descriptive error if called outside provider

### Task 3 — CardPicker Component (commit: efaa789)

`src/components/intake/card-picker.tsx`:
- Responsive grid: 1 col mobile, 2 or 3 cols on md+
- Single-select (default) and multi-select modes
- Selected state: `border-primary bg-primary/5` with check indicator
- Multi-select: outlined checkbox badge (top-right); single-select: filled circle badge
- Lucide icon rendered from string name via `ICON_MAP` lookup — covers all 19 icons used in static data
- Accessible: `<button>` elements with `aria-pressed` for keyboard navigation
- `transition-colors` for smooth visual feedback

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Created
- [x] src/lib/data/genres.ts
- [x] src/lib/data/themes.ts
- [x] src/lib/data/tones.ts
- [x] src/lib/data/settings.ts
- [x] src/lib/data/lengths.ts
- [x] src/lib/data/beat-sheets.ts
- [x] src/lib/stores/intake-store.ts
- [x] src/components/intake/intake-store-provider.tsx
- [x] src/components/intake/card-picker.tsx

### Commits
- [x] f3b898c — feat(02-02): create static data files for all wizard options
- [x] ebe574e — feat(02-02): create Zustand intake store and context provider
- [x] efaa789 — feat(02-02): create reusable CardPicker component

### TypeScript
- [x] `npx tsc --noEmit` passes with zero errors

## Self-Check: PASSED
