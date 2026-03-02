-- 00004_checkpoint_extensions.sql
-- Phase 4: Creative Checkpoint extensions to chapter_checkpoints.
-- Adds approval status, direction options, selected direction, and impact tracking.
-- Apply manually in Supabase SQL Editor.

alter table chapter_checkpoints
  add column if not exists approval_status text not null default 'draft'
    check (approval_status in ('draft', 'approved')),
  add column if not exists direction_options jsonb,
  add column if not exists selected_direction jsonb,
  add column if not exists direction_for_next text,
  add column if not exists affected boolean not null default false,
  add column if not exists impact_description text;

-- Index for fast "find all affected chapters" queries
create index if not exists idx_chapter_checkpoints_affected
  on chapter_checkpoints(project_id, affected)
  where affected = true;
