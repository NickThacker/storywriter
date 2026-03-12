-- Migration 00013: Switch from token-based billing to project-based billing.
-- New tiers: 'project' (one-time), 'author' (subscription), 'studio' (subscription).
-- Adds project_credits for one-time Project purchases and per-project access tracking.

-- 1. Add project_credits column to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS project_credits integer NOT NULL DEFAULT 0;

-- 2. Update subscription_tier constraint to new tier values
-- First drop the old constraint, then add the new one
ALTER TABLE user_settings
  DROP CONSTRAINT IF EXISTS user_settings_subscription_tier_check;

ALTER TABLE user_settings
  ADD CONSTRAINT user_settings_subscription_tier_check
    CHECK (subscription_tier IN ('none', 'author', 'studio'));

-- Reset any legacy tier values to 'none'
UPDATE user_settings
SET subscription_tier = 'none'
WHERE subscription_tier NOT IN ('none', 'author', 'studio');

-- 3. Add billing columns to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS credit_expires_at timestamptz;

ALTER TABLE projects
  ADD CONSTRAINT projects_billing_type_check
    CHECK (billing_type IN ('subscription', 'credit'));
