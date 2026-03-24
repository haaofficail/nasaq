-- Migration 012: Add is_active soft-delete to service_media
-- Eliminates the last hard delete on business data in uploads.ts

ALTER TABLE service_media
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS service_media_active_idx
  ON service_media(service_id, is_active);
