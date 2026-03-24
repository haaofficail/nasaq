-- ============================================================
-- Migration 035: Marketplace constraints
-- Adds unique constraint on marketplace_listings(org_id, service_id)
-- to support ON CONFLICT DO NOTHING on duplicate listing attempts.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_listings_org_service_idx
  ON marketplace_listings(org_id, service_id);
