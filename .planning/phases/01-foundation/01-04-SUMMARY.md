---
phase: 01-foundation
plan: 04
subsystem: dashboard
tags: [next.js, supabase, server-actions, zod, react-hook-form, shadcn, dashboard, crud]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: Supabase server client, database types, shadcn components, route group layouts
  - phase: 01-foundation/01-02
    provides: Auth server actions, session/user management patterns

provides:
  - Dashboard Server Component fetching user projects with auth guard
  - ProjectGrid responsive card layout (1/2/3 columns)
  - ProjectCard with title, status badge, genre, word count, timeAgo, progress bar, delete menu
  - EmptyState with 3 example cards and Start Your Novel CTA
  - CreateProjectDialog with react-hook-form + zod + useActionState
  - DeleteProjectDialog with useTransition pending state and confirmation
  - createProject server action (validates, inserts, revalidates)
  - deleteProject server action (auth check, RLS-enforced delete, revalidates)
  - updateProject server action (validates, updates — auto-save ready)
  - createProjectSchema and updateProjectSchema Zod v4 schemas

affects: [02-editor, 03-n8n, 04-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component dashboard page with auth guard using getUser()
    - useActionState (React 19) for server action response handling in client dialogs
    - react-hook-form + zodResolver for client-side validation with requestSubmit() bridge to server action form
    - useTransition for pending state on non-form server action calls (deleteProject)
    - supabase as any cast pattern for PostgREST v12 type incompatibility (consistent with Plan 02)
    - timeAgo() small utility function for relative time formatting (no library)
    - Responsive CSS grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

key-files:
  created:
    - src/lib/validations/project.ts — createProjectSchema and updateProjectSchema (Zod v4)
    - src/actions/projects.ts — createProject, deleteProject, updateProject server actions
    - src/components/dashboard/project-grid.tsx — Responsive card grid with New Project header
    - src/components/dashboard/project-card.tsx — Project card with all dashboard fields and delete menu
    - src/components/dashboard/empty-state.tsx — Welcome state with 3 example cards and CTA
    - src/components/dashboard/create-project-dialog.tsx — Create project dialog with form
    - src/components/dashboard/delete-project-dialog.tsx — Delete confirmation dialog
  modified:
    - src/app/(dashboard)/dashboard/page.tsx — Full implementation replacing Plan 01 placeholder

key-decisions:
  - "supabase as any cast used in dashboard page and projects actions — PostgREST v12 type incompatibility with hand-written Database type (same pattern as Plan 02 signUp action)"
  - "Delete menu uses three-dot button inside card Link — e.preventDefault()+stopPropagation() prevents card navigation when opening delete dialog"
  - "updateProject validates before auth check — catches malformed input before hitting DB; auth check still happens before any mutation"
  - "EmptyState is a Server Component (no 'use client') — example cards are static; CreateProjectDialog inside it is a client component boundary"

patterns-established:
  - "Pattern: Server action form bridge — react-hook-form validates client-side, formRef.current.requestSubmit() triggers the actual action form submission"
  - "Pattern: Auto-save target — updateProject server action exported and ready; debounced client callers can import it directly"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 1 Plan 04: Dashboard Summary

**Project dashboard with responsive card grid, guided empty state with example cards, and full CRUD (create/delete/auto-save) via server actions and React 19 dialogs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T20:51:30Z
- **Completed:** 2026-02-28T20:53:47Z
- **Tasks:** 2 of 2
- **Files modified:** 8

## Accomplishments

- Server action layer for project CRUD: createProject, deleteProject, and updateProject (auto-save target) — all authenticated with getUser(), all revalidate /dashboard on mutation
- Full dashboard UI: responsive grid (1/2/3 col), project cards with title/status badge/genre/word count/timeAgo/progress bar, create and delete dialogs
- Guided empty state for new users showing 3 dimmed example project cards with a "Start Your Novel" CTA

## Task Commits

Each task was committed atomically:

1. **Task 1: Create project server actions and validation schemas** - `e451eec` (feat)
2. **Task 2: Build dashboard page, project cards, empty state, and CRUD dialogs** - `b0e151e` (feat)

## Files Created/Modified

- `src/lib/validations/project.ts` — createProjectSchema (title min/max/trim, optional genre) and updateProjectSchema (all fields partial + typed)
- `src/actions/projects.ts` — Three server actions: createProject, deleteProject, updateProject. All use getUser() auth check. All call revalidatePath('/dashboard').
- `src/app/(dashboard)/dashboard/page.tsx` — Server Component: getUser() auth guard, query projects ordered by updated_at desc, renders EmptyState or ProjectGrid
- `src/components/dashboard/project-grid.tsx` — Client Component: 1/2/3 column responsive grid, New Project header button
- `src/components/dashboard/project-card.tsx` — Client Component: Card with title, status badge (gray/blue/outline), genre tag, word count (toLocaleString), timeAgo(), progress bar, three-dot delete menu
- `src/components/dashboard/empty-state.tsx` — Server Component: welcome heading, subtitle, 3 dimmed example cards, "Start Your Novel" CTA dialog trigger
- `src/components/dashboard/create-project-dialog.tsx` — Client Component: shadcn Dialog, react-hook-form + zodResolver, genre Select with 9 options, useActionState binding to createProject, closes on success
- `src/components/dashboard/delete-project-dialog.tsx` — Client Component: shadcn Dialog, "Are you sure?" confirmation, Cancel + Delete (destructive) buttons, useTransition for pending state

## Decisions Made

- **`supabase as any` cast pattern:** The hand-written Database type from Plan 01 is incompatible with PostgREST v12 type inference. Used the same `(supabase as any).from(...)` workaround established in Plan 02, with ESLint disable comments. Runtime behavior is correct; types are enforced via separate select result typing.
- **Three-dot menu inside card Link:** Used `e.preventDefault()` + `e.stopPropagation()` on the button click to prevent the card navigation when opening the delete dialog. This avoids making the card non-navigable or adding a separate list view.
- **requestSubmit bridge pattern:** react-hook-form validates client-side (for UX), then `formRef.current.requestSubmit()` triggers the real `<form action={formAction}>` submission so the server action receives a real FormData object.
- **EmptyState as Server Component:** The example cards are purely static data. No client state needed. Only CreateProjectDialog inside is a client boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 `z.record()` requires two arguments**
- **Found during:** Task 1 (validation schemas)
- **Issue:** `z.record(z.unknown())` is Zod v3 API. Zod v4 requires explicit key schema: `z.record(z.string(), z.unknown())`
- **Fix:** Updated `updateProjectSchema` story_bible field to `z.record(z.string(), z.unknown())`
- **Files modified:** src/lib/validations/project.ts
- **Verification:** `npx tsc --noEmit` passes

**2. [Rule 1 - Bug] PostgREST v12 `as any` insert/update pattern**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** `.from('projects').insert({...} as any)` resolves the chained `.select('id').single()` return type to `{ data: never }`, making `data.id` a type error
- **Fix:** Cast `supabase` itself as `any` instead of the insert argument: `(supabase as any).from('projects').insert({...}).select('id').single()` — then cast result type explicitly
- **Files modified:** src/actions/projects.ts
- **Verification:** `npx tsc --noEmit` passes

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes were necessary for TypeScript compilation. No scope creep. The dashboard matches the plan spec exactly.

## Self-Check: PASSED

- All created files exist on disk
- Task commits e451eec and b0e151e verified in git log
- Build passes: `npm run build` succeeds with all 8 routes
- TypeScript passes: `npx tsc --noEmit` exits clean

---
*Phase: 01-foundation*
*Completed: 2026-02-28*
