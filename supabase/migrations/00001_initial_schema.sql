-- =============================================================================
-- Migration: 00001_initial_schema
-- Description: Full Phase 1 database schema with RLS, triggers, Vault functions,
--              and performance indexes. This single migration establishes all
--              tables needed through Phase 2+ (story_bible seeded here per
--              STATE.md architectural decision).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- user_settings — 1:1 with auth.users
-- Stores per-user application settings including BYOK key reference and tier.
create table if not exists user_settings (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete cascade not null unique,
  openrouter_api_key   text,             -- OpenRouter API key (null = no BYOK key). Server-side only via RLS.
  subscription_tier    text not null default 'none',
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),

  constraint user_settings_subscription_tier_check
    check (subscription_tier in ('none', 'hosted'))
);

-- user_model_preferences — per-task LLM overrides
-- Allows users to choose specific OpenRouter models for outline, prose, editing.
create table if not exists user_model_preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  task_type  text not null,              -- 'outline' | 'prose' | 'editing'
  model_id   text not null,             -- OpenRouter model identifier (e.g. "anthropic/claude-opus-4")
  updated_at timestamptz default now(),

  constraint user_model_preferences_task_type_check
    check (task_type in ('outline', 'prose', 'editing')),

  unique (user_id, task_type)
);

-- projects — novel projects
-- Core entity for the application. story_bible seeded as empty JSONB now
-- for Phase 2 (per STATE.md decision: design story bible schema in Phase 1
-- before any generation code ships to avoid context amnesia pitfall).
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  title         text not null default 'Untitled Novel',
  status        text not null default 'draft',
  genre         text,
  word_count    integer not null default 0,
  chapter_count integer not null default 0,
  chapters_done integer not null default 0,
  story_bible   jsonb not null default '{}'::jsonb,  -- Phase 2 will populate this
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),

  constraint projects_status_check
    check (status in ('draft', 'writing', 'complete'))
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Enable RLS on every table immediately after creation.
-- All policies use (select auth.uid()) — the subquery wrapper is a Supabase
-- performance recommendation that prevents per-row function calls.

alter table user_settings enable row level security;
alter table user_model_preferences enable row level security;
alter table projects enable row level security;

-- user_settings policies
create policy "Users can view own settings"
  on user_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own settings"
  on user_settings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own settings"
  on user_settings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own settings"
  on user_settings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- user_model_preferences policies
create policy "Users can view own model preferences"
  on user_model_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own model preferences"
  on user_model_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own model preferences"
  on user_model_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own model preferences"
  on user_model_preferences for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- projects policies
create policy "Users can view own projects"
  on projects for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own projects"
  on projects for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own projects"
  on projects for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own projects"
  on projects for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Triggers: auto-update updated_at
-- ---------------------------------------------------------------------------

-- Reusable trigger function — attached to all tables with an updated_at column.
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_settings_updated_at
  before update on user_settings
  for each row execute function update_updated_at();

create trigger user_model_preferences_updated_at
  before update on user_model_preferences
  for each row execute function update_updated_at();

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- ---------------------------------------------------------------------------
-- Note: Vault functions removed — Supabase Vault requires a paid plan.
-- API keys are stored directly in user_settings.openrouter_api_key, protected
-- by RLS (only the owning user can read/write) and accessed only via server
-- actions (never exposed to the browser).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Dashboard project list — sorted by updated_at descending (most recently edited first)
create index if not exists projects_user_id_updated_at_idx
  on projects (user_id, updated_at desc);

-- Settings page — load all model preferences for a user in one query
create index if not exists user_model_preferences_user_id_idx
  on user_model_preferences (user_id);
