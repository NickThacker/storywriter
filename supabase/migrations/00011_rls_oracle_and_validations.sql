-- 00011_rls_oracle_and_validations.sql
-- Add RLS to oracle_cache and analysis_validations, which were created without it.
-- Pattern matches project_memory: owner-scoped via projects.user_id subquery.

-- ── oracle_cache ─────────────────────────────────────────────────────────────

ALTER TABLE oracle_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own oracle cache"
  ON oracle_cache FOR ALL
  TO authenticated
  USING (
    (SELECT auth.uid()) = (SELECT user_id FROM projects WHERE id = project_id)
  )
  WITH CHECK (
    (SELECT auth.uid()) = (SELECT user_id FROM projects WHERE id = project_id)
  );

-- ── analysis_validations ─────────────────────────────────────────────────────

ALTER TABLE analysis_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own analysis validations"
  ON analysis_validations FOR ALL
  TO authenticated
  USING (
    (SELECT auth.uid()) = (SELECT user_id FROM projects WHERE id = project_id)
  )
  WITH CHECK (
    (SELECT auth.uid()) = (SELECT user_id FROM projects WHERE id = project_id)
  );
