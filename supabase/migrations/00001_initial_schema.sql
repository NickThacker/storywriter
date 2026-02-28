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
  openrouter_vault_id  uuid,             -- Vault UUID for encrypted OpenRouter API key (null = no BYOK key)
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
-- Vault Functions (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
-- These functions run with elevated permissions (as function owner = postgres)
-- so they can access the vault schema. The caller's RLS context does NOT apply
-- inside SECURITY DEFINER functions — access is controlled by the function logic.

-- upsert_user_api_key: Store or replace an OpenRouter API key in Supabase Vault.
-- Returns the Vault UUID for the stored secret.
create or replace function upsert_user_api_key(p_user_id uuid, p_api_key text)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_vault_id          uuid;
  v_existing_vault_id uuid;
begin
  -- Check if this user already has a stored key
  select openrouter_vault_id into v_existing_vault_id
  from user_settings
  where user_id = p_user_id;

  if v_existing_vault_id is not null then
    -- Update the existing secret in Vault (direct table update — vault.update_secret
    -- is not in official docs; direct update is the confirmed approach)
    update vault.secrets
    set secret = p_api_key
    where id = v_existing_vault_id;

    return v_existing_vault_id;
  else
    -- Create a new secret in Vault and store the UUID in user_settings
    v_vault_id := vault.create_secret(
      p_api_key,
      'openrouter_' || p_user_id::text  -- human-readable name for the secret
    );

    -- Store the Vault UUID in user_settings (upsert handles race conditions)
    insert into user_settings (user_id, openrouter_vault_id)
    values (p_user_id, v_vault_id)
    on conflict (user_id)
    do update set openrouter_vault_id = v_vault_id;

    return v_vault_id;
  end if;
end;
$$;

-- get_decrypted_api_key: Retrieve and decrypt an API key by its Vault UUID.
-- Returns null if the secret does not exist (key was never set or was deleted).
-- IMPORTANT: Call this ONLY from server-side code (Server Actions, Route Handlers).
-- The browser must never receive a decrypted key value.
create or replace function get_decrypted_api_key(p_vault_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_decrypted_secret text;
begin
  select decrypted_secret into v_decrypted_secret
  from vault.decrypted_secrets
  where id = p_vault_id;

  return v_decrypted_secret;
end;
$$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Dashboard project list — sorted by updated_at descending (most recently edited first)
create index if not exists projects_user_id_updated_at_idx
  on projects (user_id, updated_at desc);

-- Settings page — load all model preferences for a user in one query
create index if not exists user_model_preferences_user_id_idx
  on user_model_preferences (user_id);
