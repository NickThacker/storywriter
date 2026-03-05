-- Migration: 00006_author_personas
-- Adds author_personas table and extends user_settings for voice onboarding

-- Create author_personas table
create table if not exists author_personas (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade not null unique,
  -- Four persona fields (all nullable — partially populated during analysis)
  style_descriptors     jsonb,    -- { sentence_length, rhythm, diction_level, pov_preference }
  thematic_preferences  jsonb,    -- { tone, pacing, dialogue_ratio, dark_light_theme }
  voice_description     text,     -- AI-generated prose paragraph summarizing the author's voice
  raw_guidance_text     text,     -- Editable free-form AI instruction text injected into prompts
  -- Wizard resume state
  wizard_step           integer not null default 1,      -- 1, 2, or 3
  analysis_complete     boolean not null default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Enable RLS
alter table author_personas enable row level security;

-- Policies
create policy "Users can view own persona"
  on author_personas for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own persona"
  on author_personas for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own persona"
  on author_personas for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Extend user_settings with onboarding dismissed flag
alter table user_settings
  add column if not exists voice_onboarding_dismissed boolean not null default false;

-- updated_at trigger (reuses update_updated_at() function defined in 00001_initial_schema.sql)
create trigger author_personas_updated_at
  before update on author_personas
  for each row execute function update_updated_at();

-- Index for fast user lookups
create index if not exists author_personas_user_id_idx on author_personas(user_id);
