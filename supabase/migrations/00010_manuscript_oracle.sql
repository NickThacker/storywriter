-- Oracle cache: stores Gemini long-range manuscript analysis per chapter.
-- Cache key is (project_id, chapter_number, outline_hash) so it invalidates
-- automatically when the outline changes.

CREATE TABLE IF NOT EXISTS oracle_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  outline_hash TEXT NOT NULL,       -- SHA-256 of outline JSON; invalidates on outline change
  chapter_number INTEGER NOT NULL,  -- the chapter this oracle output was generated for
  oracle_output JSONB NOT NULL,     -- structured oracle findings
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, chapter_number, outline_hash)
);

CREATE INDEX IF NOT EXISTS oracle_cache_project_idx
  ON oracle_cache(project_id, chapter_number);
