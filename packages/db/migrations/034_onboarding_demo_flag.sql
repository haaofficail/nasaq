-- ============================================================
-- Migration 034: Onboarding demo flag
-- Adds is_demo column to services + customers to support
-- the in-dashboard onboarding wizard demo data seeder.
-- ============================================================

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for fast bulk delete during demo clear
CREATE INDEX IF NOT EXISTS services_org_demo_idx  ON services(org_id, is_demo)  WHERE is_demo = TRUE;
CREATE INDEX IF NOT EXISTS customers_org_demo_idx ON customers(org_id, is_demo) WHERE is_demo = TRUE;
