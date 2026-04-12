-- Migration 008: Add profile_icon column to profiles table
-- Stores the user's selected Lucide icon name (e.g. "Cat", "Rocket") for their profile avatar.
-- NULL means use initials (default behaviour).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_icon TEXT;
