-- Migration 066: Add setup status tracking to school settings
ALTER TABLE school_settings
  ADD COLUMN IF NOT EXISTS setup_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS school_gender TEXT,
  ADD COLUMN IF NOT EXISTS setup_step   INTEGER NOT NULL DEFAULT 0;
