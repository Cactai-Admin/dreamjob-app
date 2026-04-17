ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS google_drive_root_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS google_drive_root_folder_url TEXT;
