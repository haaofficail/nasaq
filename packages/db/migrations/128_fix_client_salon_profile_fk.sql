-- Migration 128: Fix client_salon_profile FK to CASCADE
-- The old seed wrote to client_salon_profile (a legacy table not in the Drizzle schema).
-- The correct table is client_beauty_profiles (ON DELETE CASCADE).
-- This migration changes the org_id FK on the legacy table to CASCADE so that
-- deleting an org auto-cleans orphaned rows — no pre-deletion needed.
-- Wrapped in DO $$ to be a no-op if the table doesn't exist (e.g. local dev).

DO $$ BEGIN
  ALTER TABLE client_salon_profile
    DROP CONSTRAINT IF EXISTS client_salon_profile_org_id_fkey;

  ALTER TABLE client_salon_profile
    ADD CONSTRAINT client_salon_profile_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
