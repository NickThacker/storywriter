-- Analysis validations table: stores confidence-scored memory diffs for author review.
-- Changes scoring ≥85 are auto-applied; lower confidence changes are held for approval.

CREATE TABLE IF NOT EXISTS analysis_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  proposed_changes JSONB NOT NULL,    -- full ChapterAnalysis from the AI
  scored_changes JSONB NOT NULL,      -- each change with confidence score + reasoning
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | auto_applied
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS analysis_validations_project_chapter_idx
  ON analysis_validations(project_id, chapter_number);

CREATE INDEX IF NOT EXISTS analysis_validations_status_idx
  ON analysis_validations(project_id, status);
