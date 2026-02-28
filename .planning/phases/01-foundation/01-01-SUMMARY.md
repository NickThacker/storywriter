---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [next.js, supabase, tailwind, shadcn, typescript, postgres, rls, vault, middleware]

# Dependency graph
requires: []
provides:
  - Next.js 16 App Router project with TypeScript and Tailwind CSS v4
  - Supabase browser client (createBrowserClient) for Client Components
  - Supabase server client (createServerClient with cookies) for Server Components and Actions
  - Auth middleware with session refresh and route protection (updateSession)
  - Root middleware.ts with static-asset-safe matcher pattern
  - Database TypeScript types for UserSettings, UserModelPreference, Project
  - Database type with Row/Insert/Update variants for type-safe Supabase queries
  - Vault functions upsert_user_api_key and get_decrypted_api_key (SECURITY DEFINER)
  - Full database schema with RLS (3 tables, 12 policies, 3 triggers, 2 indexes)
  - shadcn/ui components (button, card, badge, input, label, tabs, select, dialog, form, sonner)
  - (auth) route group layout with unauthenticated-only guard
  - (dashboard) route group layout with auth guard and nav bar
  - .env.local.example documenting all required environment variables
affects: [02-auth, 03-n8n, 04-generation, 05-polish]

# Tech tracking
tech-stack:
  added:
    - next@16 (App Router, TypeScript, Tailwind CSS v4)
    - "@supabase/supabase-js@2 — Supabase JS client"
    - "@supabase/ssr — cookie-based SSR auth (replaces deprecated auth-helpers)"
    - react-hook-form@7 — form state management
    - "@hookform/resolvers — zod integration for react-hook-form"
    - zod@4 — schema validation for Server Actions
    - use-debounce — useDebouncedCallback for auto-save
    - shadcn/ui — component library (copies source into project)
    - tailwindcss@4 — utility-first CSS
    - geist — Geist font family
  patterns:
    - Supabase SSR auth with middleware session refresh on every request
    - getUser() not getSession() in server code (security — verifies JWT server-side)
    - Database type generic parameter on createClient for type-safe queries
    - (select auth.uid()) RLS subquery pattern for performance
    - SECURITY DEFINER Postgres functions for Vault access
    - Route groups for layout isolation ((auth) vs (dashboard))
    - Server Actions for auth mutations (not API routes)
    - story_bible as jsonb column seeded in Phase 1 to avoid future migrations

key-files:
  created:
    - middleware.ts — root auth middleware with session refresh and route protection
    - src/lib/supabase/client.ts — browser Supabase client (Client Components only)
    - src/lib/supabase/server.ts — server Supabase client (Server Components, Actions, Route Handlers)
    - src/lib/supabase/middleware.ts — updateSession helper with getUser() auth check
    - src/types/database.ts — TypeScript types for all DB tables plus Database generic type
    - src/app/(auth)/layout.tsx — auth route group layout with unauthenticated-only guard
    - src/app/(dashboard)/layout.tsx — dashboard layout with auth guard and nav bar
    - src/actions/auth.ts — placeholder signOut server action (full impl Plan 02)
    - supabase/migrations/00001_initial_schema.sql — full DB schema with RLS/triggers/Vault
    - .env.local.example — all required environment variables documented
    - src/app/layout.tsx — root layout with Toaster (sonner)
    - src/app/page.tsx — root redirect to /dashboard
    - src/components/ui/ — shadcn components (10 files)
  modified:
    - package.json — all dependencies added
    - tsconfig.json — Next.js TypeScript config
    - tailwind.config.ts — Tailwind content paths
    - src/app/globals.css — shadcn CSS variables

key-decisions:
  - "Used sonner instead of deprecated shadcn toast component (shadcn CLI rejected toast as deprecated)"
  - "Added placeholder dashboard and login pages so build succeeds before Plan 02 auth UI ships"
  - "Seeded story_bible as jsonb column in projects table per STATE.md architectural decision"
  - "Used (select auth.uid()) RLS subquery pattern per Supabase performance recommendation"
  - "Created signOut as placeholder server action in src/actions/auth.ts — full impl deferred to Plan 02"

patterns-established:
  - "Pattern: Supabase SSR — always use getUser() not getSession() in server code"
  - "Pattern: Middleware — imports updateSession from src/lib/supabase/middleware.ts"
  - "Pattern: Database types — Database generic passed to createClient for type safety"
  - "Pattern: RLS — enable immediately after create table, use (select auth.uid()) subquery"
  - "Pattern: Vault — SECURITY DEFINER functions with search_path = public, vault"

requirements-completed: [AUTH-02, PROJ-05]

# Metrics
duration: 5min
completed: 2026-02-28
---

# Phase 1 Plan 01: Foundation Summary

**Next.js 16 + Supabase SSR scaffold with cookie-based auth middleware, full Postgres schema with RLS and Vault functions, and shadcn/ui component library installed**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-28T20:33:55Z
- **Completed:** 2026-02-28T20:39:09Z
- **Tasks:** 3 of 3
- **Files modified:** 33

## Accomplishments

- Next.js 16 App Router project scaffolded with TypeScript, Tailwind CSS v4, all Phase 1 dependencies installed, and shadcn/ui components added
- Supabase browser + server clients configured following @supabase/ssr SSR patterns; root middleware with auth session refresh and unauthenticated redirect to /login
- Complete database schema created: 3 tables (user_settings, user_model_preferences, projects), 12 RLS policies, 3 updated_at triggers, 2 Vault SECURITY DEFINER functions, and 2 performance indexes

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project and install all dependencies** - `2fc8ff0` (feat)
2. **Task 2: Create Supabase clients, auth middleware, route group layouts, and database types** - `85e6ef0` (feat)
3. **Task 3: Create database migration with full schema, RLS policies, Vault functions, and triggers** - `f893fdc` (feat)

## Files Created/Modified

- `middleware.ts` — Root auth middleware importing updateSession; static-asset-safe matcher
- `src/lib/supabase/client.ts` — Browser Supabase client using createBrowserClient
- `src/lib/supabase/server.ts` — Async server client using createServerClient with next/headers cookies()
- `src/lib/supabase/middleware.ts` — updateSession function using getUser() (not getSession())
- `src/types/database.ts` — TypeScript interfaces for UserSettings, UserModelPreference, Project plus Database generic type, ProjectStatus/SubscriptionTier/TaskType union types
- `src/app/layout.tsx` — Root layout with Geist font and Toaster (sonner)
- `src/app/page.tsx` — Root redirect to /dashboard
- `src/app/(auth)/layout.tsx` — Auth layout: redirects authenticated users to /dashboard
- `src/app/(auth)/login/page.tsx` — Placeholder login page (full auth UI in Plan 02)
- `src/app/(dashboard)/layout.tsx` — Dashboard layout: auth guard + nav bar (StoryWriter, Dashboard, Settings, Sign out)
- `src/app/(dashboard)/dashboard/page.tsx` — Placeholder dashboard page (full UI in Plan 02)
- `src/actions/auth.ts` — Placeholder signOut server action (full impl in Plan 02)
- `supabase/migrations/00001_initial_schema.sql` — Full schema: 3 tables, 12 RLS policies, 3 triggers, 2 Vault SECURITY DEFINER functions, 2 indexes
- `.env.local.example` — All required env vars documented with source locations
- `src/components/ui/` — 10 shadcn components: button, card, badge, input, label, tabs, select, dialog, form, sonner
- `package.json` — All project dependencies
- `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `components.json` — Config files

## Decisions Made

- **sonner instead of toast:** shadcn CLI rejected `toast` as deprecated; used `sonner` instead (the current shadcn notification standard). The Toaster in layout.tsx uses `@/components/ui/sonner`.
- **Placeholder pages added:** Build requires routes to exist when the root page redirects. Created minimal placeholder pages for /dashboard and /login — full UI ships in Plan 02.
- **story_bible as jsonb column:** Per STATE.md architectural decision ("Story bible schema must be designed in Phase 1 DB schema before any generation code ships"), the story_bible column is seeded as `jsonb not null default '{}'::jsonb` in Phase 1. Phase 2 planning will decide whether to normalize into separate tables.
- **signOut as placeholder action:** The dashboard layout references signOut to compile. The placeholder is 'use server' compliant but does nothing. Plan 02 will replace it with real Supabase signOut + redirect.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used manual project init instead of create-next-app**
- **Found during:** Task 1 (Scaffold Next.js project)
- **Issue:** `npx create-next-app@latest .` refused to run because the directory contained `.claude/` and `.planning/` from the GSD planning phase
- **Fix:** Initialized manually — ran `npm init -y`, installed all packages individually, created all config files (tsconfig.json, next.config.ts, postcss.config.mjs, tailwind.config.ts) from scratch following Next.js 16 App Router patterns
- **Files modified:** package.json, tsconfig.json, next.config.ts, postcss.config.mjs, tailwind.config.ts
- **Verification:** `npm run build` succeeds; shadcn `init` verified the Next.js framework detection
- **Committed in:** 2fc8ff0 (Task 1 commit)

**2. [Rule 3 - Blocking] Added placeholder pages for build routing**
- **Found during:** Task 2 (Route group layouts)
- **Issue:** The root page.tsx redirects to /dashboard and middleware redirects unauthenticated to /login, but neither route existed yet. Build would succeed but runtime routing would fail with 404s.
- **Fix:** Created minimal placeholder `src/app/(dashboard)/dashboard/page.tsx` and `src/app/(auth)/login/page.tsx` so the build has valid routes for middleware redirects. Full pages ship in Plan 02.
- **Files modified:** src/app/(dashboard)/dashboard/page.tsx, src/app/(auth)/login/page.tsx
- **Verification:** `npm run build` shows /dashboard and /login as valid dynamic routes
- **Committed in:** 85e6ef0 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes were necessary blockers — one prevented scaffolding, one prevented valid runtime routing. No scope creep. The output matches plan spec exactly.

## Issues Encountered

- `npx create-next-app` blocked by existing `.claude/` and `.planning/` directories — resolved by manual initialization (see Deviations)
- shadcn `toast` component deprecated — resolved by using `sonner` (current shadcn notification standard)

## User Setup Required

Before the app can connect to a real Supabase project, you'll need:

1. Create a Supabase project at https://supabase.com/dashboard
2. Enable the Vault extension: Database -> Extensions -> "vault" -> Enable
3. Enable email auth with confirmation: Authentication -> Providers -> Email -> Enable + toggle "Confirm email"
4. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project Settings -> API -> Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Project Settings -> API -> anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings -> API -> service_role key
5. Run the migration `supabase/migrations/00001_initial_schema.sql` in the Supabase SQL editor

## Next Phase Readiness

- Next.js skeleton is ready — `npm run dev` starts, `npm run build` succeeds, TypeScript passes with zero errors
- All Supabase client infrastructure is in place — Plans 02-05 can import from `@/lib/supabase/server` and `@/lib/supabase/client` immediately
- Middleware is active — every request refreshes the auth session; unauthenticated users are redirected to /login
- Database schema is defined and ready to apply — migration SQL is complete with all RLS policies, triggers, and Vault functions
- TypeScript types match the schema — all downstream plans get type-safe Supabase queries
- shadcn/ui components installed — Plan 02 auth forms can use button, card, input, label, tabs, form immediately

---
*Phase: 01-foundation*
*Completed: 2026-02-28*
