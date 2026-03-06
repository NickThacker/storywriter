-- Migration: Story Bible Updates
-- 1. Add source tracking to locations and world_facts (preserves manual edits on re-seed)
-- 2. Add changelog history to all story bible tables
-- Apply manually in Supabase SQL Editor.

-- ── locations: add source ──────────────────────────────────────────────────
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

ALTER TABLE locations
  ADD CONSTRAINT locations_source_check CHECK (source IN ('ai', 'manual'));

-- ── world_facts: add source ────────────────────────────────────────────────
ALTER TABLE world_facts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

ALTER TABLE world_facts
  ADD CONSTRAINT world_facts_source_check CHECK (source IN ('ai', 'manual'));

-- ── changelog jsonb on all 3 story bible tables ────────────────────────────
-- Each entry: { "at": "<ISO>", "by": "ai"|"user", "note": "..." }

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS changelog jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS changelog jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE world_facts
  ADD COLUMN IF NOT EXISTS changelog jsonb NOT NULL DEFAULT '[]'::jsonb;
