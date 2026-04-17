ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS preferred_ai_provider TEXT,
  ADD COLUMN IF NOT EXISTS preferred_ai_model TEXT;
