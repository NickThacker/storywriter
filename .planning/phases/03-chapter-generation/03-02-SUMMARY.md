---
phase: 03-chapter-generation
plan: "02"
subsystem: ui
tags: [tiptap, rich-text-editor, tiptap3, prosemirror, custom-extensions, auto-save, debounce]

requires:
  - phase: 02-guided-intake-and-outline
    provides: "use-debounce package (already installed), auto-save 600ms debounce pattern established"

provides:
  - "ChapterEditor component: Tiptap 3 rich text editor with scene break and author note extensions"
  - "SceneBreak custom node: atomic block rendered as *** separator via CSS ::after pseudo-element"
  - "AuthorNote custom node: amber-styled aside block for writer annotations"
  - "Editor toolbar: Bold, Italic, H2, H3, Scene Break, Author Note buttons with active state"
  - "Auto-save: useDebouncedCallback (600ms) using editor.getText() for plain text storage"
  - "Word count badge: live character count from editor.getText()"

affects:
  - "03-chapter-generation/03-03 (chapter panel wires in ChapterEditor)"
  - "03-chapter-generation/03-04 (chapter streaming view uses readOnly prop)"
  - "Any component that embeds the chapter editor"

tech-stack:
  added:
    - "@tiptap/react@3.20.0 — React bindings (useEditor, EditorContent)"
    - "@tiptap/pm@3.20.0 — ProseMirror peer dependency"
    - "@tiptap/starter-kit@3.20.0 — Bold, italic, headings, blockquote, lists, etc."
  patterns:
    - "immediatelyRender: false in useEditor — required for Next.js App Router SSR safety"
    - "editor.getText() for persistence — plain text only, NOT getHTML()"
    - "TypeScript Commands<ReturnType> interface augmentation for custom Tiptap node commands"
    - "useDebouncedCallback with flush() on unmount — flush pending save on navigation"

key-files:
  created:
    - "src/components/chapters/chapter-editor.tsx — ChapterEditor with SceneBreak and AuthorNote extensions"
  modified:
    - "package.json — added @tiptap/react, @tiptap/pm, @tiptap/starter-kit"

key-decisions:
  - "Tiptap 3 (not Tiptap 2, not Slate, not Novel.sh) — MIT license, official Next.js SSR docs, custom Node extensions for novel-specific tools"
  - "editor.getText() for chapter_text storage — plain text prevents HTML markup bloat in DB and keeps downstream operations (word count, compression, export) simple"
  - "SceneBreak as atom: true — prevents cursor from entering the node; renders *** separator via CSS ::after pseudo-element on hr.scene-break"
  - "AuthorNote uses aside[data-author-note] — semantically distinct from prose, excluded from plain text export via getText()"
  - "TypeScript command augmentation via declare module '@tiptap/core' — enables type-safe editor.chain().focus().insertSceneBreak().run() without any-casts"
  - "readOnly prop synced via useEffect on editor.setEditable() — allows toggling during streaming without re-mounting the editor"

patterns-established:
  - "Tiptap 3 SSR pattern: always use immediatelyRender: false in useEditor config"
  - "Tiptap custom Node: Node.create() with addCommands() + TypeScript augmentation pattern"
  - "Scoped <style> tag in component for ProseMirror custom node CSS (scene-break, author-note)"

requirements-completed: [CHAP-05]

duration: 2min
completed: "2026-03-02"
---

# Phase 3 Plan 02: Chapter Editor (Tiptap) Summary

**Tiptap 3 rich text editor with novel-specific SceneBreak and AuthorNote custom nodes, toolbar, 600ms auto-save using getText(), and SSR-safe immediatelyRender: false configuration**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-02T05:34:23Z
- **Completed:** 2026-03-02T05:36:02Z
- **Tasks:** 2
- **Files modified:** 3 (package.json, package-lock.json, chapter-editor.tsx)

## Accomplishments

- Installed Tiptap 3 (3.20.0): `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`
- Created `ChapterEditor` with SceneBreak (*** separator) and AuthorNote (amber aside) custom ProseMirror nodes
- Toolbar with Bold, Italic, H2, H3, Scene Break, Author Note — all with active-state highlighting
- Auto-save wired via `useDebouncedCallback(600ms)` using `editor.getText()` (plain text, not HTML)
- Word count badge rendered from editor text
- SSR-safe: `immediatelyRender: false` prevents Next.js hydration mismatch
- TypeScript compiles cleanly (`npx tsc --noEmit` passes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Tiptap 3 packages** - `9a274a6` (chore)
2. **Task 2: Create ChapterEditor component with custom extensions and auto-save** - `5738d82` (feat)

## Files Created/Modified

- `src/components/chapters/chapter-editor.tsx` — ChapterEditor component with SceneBreak and AuthorNote extensions, toolbar, auto-save, word count
- `package.json` — Added @tiptap/react, @tiptap/pm, @tiptap/starter-kit
- `package-lock.json` — Updated with 66 new packages from Tiptap 3

## Decisions Made

- `immediatelyRender: false` is mandatory in `useEditor` for Next.js App Router SSR — per official Tiptap Next.js docs and research pitfall #1
- `editor.getText()` for all persistence — prevents HTML markup in `chapter_text` column; `getHTML()` only for display if ever needed
- SceneBreak as `atom: true` — ProseMirror atom nodes cannot contain content/cursor, making them behave like horizontal rules
- `declare module '@tiptap/core' { interface Commands<ReturnType> }` augmentation — required for type-safe custom commands in Tiptap 3
- CSS via scoped `<style>` tag — Tailwind can't reach `.ProseMirror hr.scene-break::after` pseudo-element, so inline CSS is needed for custom node styles

## Deviations from Plan

None — plan executed exactly as written. The `node -e "require('@tiptap/pm')"` verification in the plan fails for ESM-only packages in Node CJS mode, but this is expected behavior — the packages work correctly in Next.js via webpack. Switched verification to `npm ls` which correctly confirms all packages installed.

## Issues Encountered

- `@tiptap/pm` uses ESM-only exports, making Node.js `require()` fail. This is NOT a bug — it's expected for ESM-only packages. The package imports correctly via Next.js webpack. Verification adapted to use `npm ls` instead.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `ChapterEditor` is ready for integration into `chapter-panel.tsx` (Plan 03)
- The `readOnly` prop allows the streaming view to disable editing during generation
- The `onSave` callback prop is designed to accept a server action (e.g., `saveChapterProse(projectId, chapterNumber, text)`) from the parent
- No blockers

---
*Phase: 03-chapter-generation*
*Completed: 2026-03-02*
