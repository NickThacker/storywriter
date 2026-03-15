-- Update the task_type CHECK constraint on user_model_preferences
-- to include all current model roles (was limited to outline/prose/editing)

ALTER TABLE user_model_preferences
  DROP CONSTRAINT user_model_preferences_task_type_check;

ALTER TABLE user_model_preferences
  ADD CONSTRAINT user_model_preferences_task_type_check
    CHECK (task_type IN (
      'outline', 'prose', 'editing',
      'reviewer', 'planner', 'summarizer',
      'validation', 'oracle', 'arc_synthesis'
    ));
