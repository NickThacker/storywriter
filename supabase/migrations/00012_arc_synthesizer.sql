-- ─────────────────────────────────────────────────────────────────────────────
-- 00012_arc_synthesizer.sql
-- Character arc synthesis — stores AI-generated arc analysis per character.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_arcs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  character_name            text NOT NULL,
  arc_summary               text NOT NULL DEFAULT '',
  arc_trajectory            jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_moments               jsonb NOT NULL DEFAULT '[]'::jsonb,
  unresolved_threads        jsonb NOT NULL DEFAULT '[]'::jsonb,
  synthesized_through_chapter integer NOT NULL DEFAULT 0,
  model_used                text NOT NULL DEFAULT '',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, character_name)
);

CREATE INDEX IF NOT EXISTS character_arcs_project_id_idx ON character_arcs (project_id);

ALTER TABLE character_arcs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own character arcs" ON character_arcs;

CREATE POLICY "Users can manage own character arcs"
  ON character_arcs
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.uid()) = (SELECT user_id FROM projects WHERE id = project_id)
  )
  WITH CHECK (
    (SELECT auth.uid()) = (SELECT user_id FROM projects WHERE id = project_id)
  );
