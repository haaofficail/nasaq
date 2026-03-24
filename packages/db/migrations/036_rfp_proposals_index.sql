-- ============================================================
-- Migration 036: RFP proposals index
-- Adds unique constraint to prevent duplicate proposals
-- and org_id index for fast "my proposals" queries.
-- ============================================================

-- Prevent same org from submitting two proposals on the same RFP
CREATE UNIQUE INDEX IF NOT EXISTS rfp_proposals_org_rfp_uidx
  ON rfp_proposals(rfp_id, org_id);

-- Fast lookup of all proposals by org
CREATE INDEX IF NOT EXISTS rfp_proposals_org_id_idx
  ON rfp_proposals(org_id);
