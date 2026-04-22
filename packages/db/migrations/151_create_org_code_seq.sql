-- Migration 151: Create org_code_seq
-- Date: 2026-04-22
--
-- Fixes: registration fails with "relation org_code_seq does not exist"
-- The sequence is used in auth.ts and admin.ts to generate NSQ-XXXX codes
-- but was never created in any migration.
--
-- Start at 101 to leave room and avoid collisions with backfilled orgs (1-35 range).

BEGIN;

CREATE SEQUENCE IF NOT EXISTS org_code_seq START 101 INCREMENT 1;

-- Backfill existing orgs that have NULL org_code
UPDATE organizations
SET org_code = 'NSQ-' || LPAD(CAST(nextval('org_code_seq') AS TEXT), 4, '0')
WHERE org_code IS NULL;

COMMIT;
