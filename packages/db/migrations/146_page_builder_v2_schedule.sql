-- Migration 146: Page Builder v2 — Schedule Publishing
-- Day 19: Auto-save + Publish Flow
-- Adds scheduled_at for future publish scheduling

ALTER TABLE pages_v2
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Index for efficient cron job queries (find pages due to be published)
CREATE INDEX IF NOT EXISTS pages_v2_scheduled_at_idx
  ON pages_v2 (scheduled_at)
  WHERE scheduled_at IS NOT NULL;
