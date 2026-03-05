---
phase: 06-author-onboarding-and-voice-analysis
plan: 01
subsystem: data-layer
tags: [database, typescript, npm, migration, author-persona]
dependency_graph:
  requires: []
  provides: [author_personas table schema, AuthorPersonaRow types, pdf/doc parsing packages]
  affects: [all Phase 6 plans]
tech_stack:
  added: [mammoth@1.11.0, pdf-parse@2.4.5, pdfkit@0.17.2, "@types/pdfkit"]
  patterns: [Supabase RLS policies with auth.uid(), TypeScript Database generic type pattern]
key_files:
  created:
    - supabase/migrations/00006_author_personas.sql
  modified:
    - next.config.ts
    - src/types/database.ts
    - package.json
decisions:
  - "@types/mammoth does not exist on npm registry — mammoth ships its own types inline"
  - "voice_onboarding_dismissed added to UserSettingsInsert as optional (has DB default false)"
  - "author_personas added to Database.public.Tables for full PostgREST type safety"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-05"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 3
---

# Phase 06 Plan 01: Foundation — DB Schema, Types, and Packages Summary

Author persona foundation: `author_personas` Supabase table with RLS, TypeScript interfaces mirroring DB schema, and native Node module packages (mammoth/pdf-parse/pdfkit) configured for Next.js server-external bundling.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install npm packages and configure next.config.ts | b32dfbd | next.config.ts, package.json |
| 2 | Create database migration 00006_author_personas.sql | 4781a49 | supabase/migrations/00006_author_personas.sql |
| 3 | Add AuthorPersonaRow TypeScript types to database.ts | 1837882 | src/types/database.ts |

## What Was Built

### Database Migration (`00006_author_personas.sql`)
- `author_personas` table: one row per user, all four voice persona fields nullable (style_descriptors JSONB, thematic_preferences JSONB, voice_description text, raw_guidance_text text)
- Wizard resume state fields: `wizard_step` (integer, default 1), `analysis_complete` (boolean, default false)
- RLS with three policies (select, insert, update) using `(select auth.uid()) = user_id`
- `updated_at` trigger reusing `update_updated_at()` function from initial schema
- `user_settings` extended with `voice_onboarding_dismissed boolean not null default false`
- Index on `user_id` for fast lookups

**NOTE FOR HUMAN: Migration must be applied manually in Supabase SQL Editor before any Phase 6 features work.**

### TypeScript Types (`src/types/database.ts`)
- `StyleDescriptors` interface: sentence_length, rhythm, diction_level, pov_preference
- `ThematicPreferences` interface: tone, pacing, dialogue_ratio, dark_light_theme
- `AuthorPersonaRow` interface mirroring DB columns exactly
- `AuthorPersonaInsert` and `AuthorPersonaUpdate` utility types
- `AuthorPersona` convenience alias
- `voice_onboarding_dismissed: boolean` added to `UserSettingsRow` and `UserSettingsInsert`
- `author_personas` entry added to `Database.public.Tables`

### Next.js Configuration (`next.config.ts`)
- `serverExternalPackages: ['pdfkit', 'pdf-parse', 'mammoth']` prevents bundler from attempting to bundle native Node modules

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @types/mammoth does not exist**
- **Found during:** Task 1
- **Issue:** `npm install --save-dev @types/mammoth` returned 404 — the package does not exist
- **Fix:** Skipped @types/mammoth (mammoth ships its own TypeScript declarations inline). Installed only @types/pdfkit as planned.
- **Files modified:** package.json
- **Commit:** b32dfbd

## Verification

All success criteria met:
- `npm list mammoth pdf-parse pdfkit` shows all three installed
- `next.config.ts` has `serverExternalPackages: ['pdfkit', 'pdf-parse', 'mammoth']`
- `supabase/migrations/00006_author_personas.sql` contains: author_personas table, voice_onboarding_dismissed, RLS policies, trigger, index
- `src/types/database.ts` exports `AuthorPersonaRow`, `AuthorPersonaInsert`, `AuthorPersonaUpdate`
- `npx tsc --noEmit` passes with zero errors

## Self-Check: PASSED

- FOUND: supabase/migrations/00006_author_personas.sql
- FOUND: src/types/database.ts
- FOUND: next.config.ts
- FOUND: commit b32dfbd (packages + next.config)
- FOUND: commit 4781a49 (migration)
- FOUND: commit 1837882 (TypeScript types)
