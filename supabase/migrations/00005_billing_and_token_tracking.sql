-- Migration: 00005_billing_and_token_tracking
-- Purpose: Add token usage tracking, billing columns to user_settings,
--          webhook idempotency table, and Stripe subscription tier names.
-- Apply manually in Supabase SQL Editor.

-- -----------------------------------------------------------------------
-- 1. token_usage table — one row per generation request
-- -----------------------------------------------------------------------

create table if not exists token_usage (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade not null,
  project_id        uuid references projects(id) on delete cascade not null,
  chapter_number    integer not null,
  prompt_tokens     integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens      integer not null default 0,
  created_at        timestamptz default now()
);

-- -----------------------------------------------------------------------
-- 2. Extend user_settings with billing columns
-- -----------------------------------------------------------------------

alter table user_settings
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists token_budget_total     integer not null default 0,
  add column if not exists token_budget_remaining integer not null default 0,
  add column if not exists credit_pack_tokens     integer not null default 0,
  add column if not exists billing_period_end     timestamptz;

-- -----------------------------------------------------------------------
-- 3. Update subscription_tier check constraint to include new tier names
-- -----------------------------------------------------------------------

alter table user_settings
  drop constraint if exists user_settings_subscription_tier_check;

alter table user_settings
  add constraint user_settings_subscription_tier_check
    check (subscription_tier in ('none', 'hosted', 'starter', 'writer', 'pro'));

-- -----------------------------------------------------------------------
-- 4. stripe_webhook_events table — idempotency for Stripe webhook handling
-- -----------------------------------------------------------------------

create table if not exists stripe_webhook_events (
  event_id     text primary key,           -- Stripe event ID (evt_xxx)
  processed_at timestamptz default now()
);

-- -----------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------

alter table token_usage enable row level security;
alter table stripe_webhook_events enable row level security;

-- Users can read their own token usage rows.
-- Inserts happen via service role (route handlers use SUPABASE_SERVICE_ROLE_KEY).
create policy "users read own token_usage"
  on token_usage for select
  using ((select auth.uid()) = user_id);

-- stripe_webhook_events: service role only — no user-facing policies.

-- -----------------------------------------------------------------------
-- 6. Indexes
-- -----------------------------------------------------------------------

create index if not exists idx_token_usage_user    on token_usage(user_id);
create index if not exists idx_token_usage_project on token_usage(project_id);
