-- Migration 121: add must_change_password flag to users
-- Used to force password change on first login after admin sends temp credentials

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
