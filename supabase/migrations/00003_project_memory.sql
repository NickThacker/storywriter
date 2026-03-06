-- 00003_project_memory.sql
-- Project Memory System — three-layer context tracking for chapter generation.
--
-- Layer 1: identity (stable project identity from intake/outline)
-- Layer 2: cumulative trackers (timeline, plot_threads, character_states, etc.)
-- Layer 3: per-chapter checkpoints (chapter_checkpoints table)
--
-- Designed for token-efficient context assembly (~10k tokens at ch30 of 40).

-- ─────────────────────────────────────────────────────
-- project_memory: one row per project (all layers in JSONB)
-- ─────────────────────────────────────────────────────

create table if not exists project_memory (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  identity jsonb not null default '{}'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  plot_threads jsonb not null default '[]'::jsonb,
  character_states jsonb not null default '{}'::jsonb,
  continuity_facts jsonb not null default '[]'::jsonb,
  foreshadowing jsonb not null default '[]'::jsonb,
  thematic_development jsonb not null default '[]'::jsonb,
  last_checkpoint_chapter integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_memory_project_id_key unique (project_id)
);

-- RLS: owner-scoped via projects.user_id subquery
alter table project_memory enable row level security;

create policy "Users can manage own project memory"
  on project_memory for all
  to authenticated
  using (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  )
  with check (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  );

-- Auto-update updated_at
create trigger project_memory_updated_at
  before update on project_memory
  for each row
  execute function update_updated_at();

-- Index on project_id for fast lookups
create index if not exists idx_project_memory_project_id
  on project_memory(project_id);


-- ─────────────────────────────────────────────────────
-- chapter_checkpoints: one row per chapter per project
-- ─────────────────────────────────────────────────────

create table if not exists chapter_checkpoints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  chapter_number integer not null,
  summary text not null default '',
  state_diff jsonb not null default '{}'::jsonb,
  continuity_notes jsonb not null default '[]'::jsonb,
  chapter_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapter_checkpoints_project_chapter_key unique (project_id, chapter_number)
);

-- RLS: owner-scoped via projects.user_id subquery
alter table chapter_checkpoints enable row level security;

create policy "Users can manage own chapter checkpoints"
  on chapter_checkpoints for all
  to authenticated
  using (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  )
  with check (
    (select auth.uid()) = (select user_id from projects where id = project_id)
  );

-- Auto-update updated_at
create trigger chapter_checkpoints_updated_at
  before update on chapter_checkpoints
  for each row
  execute function update_updated_at();

-- Index on project_id for fast lookups
create index if not exists idx_chapter_checkpoints_project_id
  on chapter_checkpoints(project_id);

-- Composite index for common query pattern: get checkpoint for specific chapter
create index if not exists idx_chapter_checkpoints_project_chapter
  on chapter_checkpoints(project_id, chapter_number);
