-- =============================================================================
-- Migration: 00002_story_bible_tables
-- Description: Normalized story bible schema for Phase 2 — characters, locations,
--              world_facts, and outlines tables with RLS, triggers, and indexes.
--              Also adds intake_data column to projects for wizard answer storage.
--
-- Design decisions:
--   - Normalized tables (not JSONB) enable selective context injection in Phase 3
--   - characters.source tracks 'ai' | 'manual' origin to protect manual edits on regen
--   - outlines.previous_chapters stores snapshot before regeneration (no restore UI yet)
--   - outlines has unique constraint on project_id (one outline per project)
--   - RLS uses subquery to projects.user_id (same pattern as migration 00001)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extend projects table
-- ---------------------------------------------------------------------------

-- intake_data stores wizard answers for outline regeneration and reference.
-- Nullable — populated when user completes the intake wizard.
alter table projects add column if not exists intake_data jsonb;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- characters — normalized character records per project
create table if not exists characters (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade not null,
  name         text not null,
  role         text not null,                       -- 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  one_line     text,                                -- card-level summary
  appearance   text,
  backstory    text,
  personality  text,
  voice        text,
  motivations  text,
  arc          text,
  source       text not null default 'ai',          -- 'ai' | 'manual' — tracks origin, protects manual edits on regen
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),

  constraint characters_role_check
    check (role in ('protagonist', 'antagonist', 'supporting', 'minor')),

  constraint characters_source_check
    check (source in ('ai', 'manual'))
);

-- locations — places referenced in the story
create table if not exists locations (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade not null,
  name         text not null,
  description  text,
  significance text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- world_facts — lore, rules, timeline entries, and relationships
create table if not exists world_facts (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade not null,
  category     text not null,                       -- 'timeline' | 'rule' | 'lore' | 'relationship'
  fact         text not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),

  constraint world_facts_category_check
    check (category in ('timeline', 'rule', 'lore', 'relationship'))
);

-- outlines — one outline per project (enforced by unique constraint on project_id)
-- chapters stores the full structured outline as a JSONB array of chapter objects.
-- previous_chapters is a snapshot taken before regeneration (data preserved, no restore UI yet).
create table if not exists outlines (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid references projects(id) on delete cascade not null unique,
  beat_sheet_id      text not null,                 -- 'save-the-cat' | 'three-act' | 'heros-journey' | 'romancing-the-beat'
  target_length      text not null,                 -- 'short' | 'standard' | 'epic'
  chapter_count      integer not null,
  chapters           jsonb not null default '[]'::jsonb,
  previous_chapters  jsonb,                         -- snapshot before last regeneration
  status             text not null default 'draft', -- 'draft' | 'approved'
  approved_at        timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),

  constraint outlines_beat_sheet_check
    check (beat_sheet_id in ('save-the-cat', 'three-act', 'heros-journey', 'romancing-the-beat')),

  constraint outlines_target_length_check
    check (target_length in ('short', 'standard', 'epic')),

  constraint outlines_status_check
    check (status in ('draft', 'approved'))
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Enable RLS on all 4 new tables immediately.
-- Policies use a subquery to projects.user_id so each row check is scoped
-- to the project owner — same pattern as migration 00001.

alter table characters enable row level security;
alter table locations enable row level security;
alter table world_facts enable row level security;
alter table outlines enable row level security;

-- characters: owner-scoped for all operations
create policy "Users can manage own project characters"
  on characters for all
  to authenticated
  using (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  )
  with check (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  );

-- locations: owner-scoped for all operations
create policy "Users can manage own project locations"
  on locations for all
  to authenticated
  using (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  )
  with check (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  );

-- world_facts: owner-scoped for all operations
create policy "Users can manage own project world facts"
  on world_facts for all
  to authenticated
  using (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  )
  with check (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  );

-- outlines: owner-scoped for all operations
create policy "Users can manage own project outlines"
  on outlines for all
  to authenticated
  using (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  )
  with check (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  );

-- ---------------------------------------------------------------------------
-- Triggers: auto-update updated_at
-- ---------------------------------------------------------------------------
-- update_updated_at() function is already defined in migration 00001.

create trigger characters_updated_at
  before update on characters
  for each row execute function update_updated_at();

create trigger locations_updated_at
  before update on locations
  for each row execute function update_updated_at();

create trigger world_facts_updated_at
  before update on world_facts
  for each row execute function update_updated_at();

create trigger outlines_updated_at
  before update on outlines
  for each row execute function update_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- project_id indexes for all story bible tables — primary lookup pattern is
-- "give me all [characters/locations/world_facts] for this project".

create index if not exists characters_project_id_idx
  on characters (project_id);

create index if not exists locations_project_id_idx
  on locations (project_id);

create index if not exists world_facts_project_id_idx
  on world_facts (project_id);
