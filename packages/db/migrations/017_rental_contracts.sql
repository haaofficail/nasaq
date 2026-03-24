-- Migration 017: Rental Contracts + Inspections
-- Full rental lifecycle: contracts, asset links, inspections, damage tracking

-- Rental contracts (general purpose — works for equipment, furniture, vehicles, real estate)
CREATE TABLE IF NOT EXISTS rental_contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL,
  contract_number     TEXT,              -- auto-set by trigger or app
  customer_id         UUID,              -- nullable (walk-in)
  customer_name       TEXT,              -- snapshot at time of contract
  customer_phone      TEXT,
  title               TEXT NOT NULL,
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'draft',
    -- draft | active | completed | overdue | cancelled
  value               NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- total contract value
  deposit             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  deposit_returned    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  start_date          DATE,
  end_date            DATE,
  actual_return_date  DATE,
  signed_by           TEXT,
  signed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rc_org_idx    ON rental_contracts (org_id);
CREATE INDEX IF NOT EXISTS rc_status_idx ON rental_contracts (org_id, status);
CREATE INDEX IF NOT EXISTS rc_customer_idx ON rental_contracts (customer_id) WHERE customer_id IS NOT NULL;

-- Sequence for human-readable contract numbers
CREATE SEQUENCE IF NOT EXISTS rental_contract_seq START 1001 INCREMENT 1;

-- Link contract to specific assets/asset types with daily rate
CREATE TABLE IF NOT EXISTS rental_contract_assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL,
  contract_id UUID NOT NULL REFERENCES rental_contracts (id) ON DELETE CASCADE,
  asset_id    UUID,              -- specific asset (nullable if renting a type)
  asset_name  TEXT NOT NULL,     -- snapshot
  quantity    INT  NOT NULL DEFAULT 1,
  daily_rate  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rca_contract_idx ON rental_contract_assets (contract_id);
CREATE INDEX IF NOT EXISTS rca_asset_idx    ON rental_contract_assets (asset_id) WHERE asset_id IS NOT NULL;

-- Rental inspections (pre-rental & post-rental condition records)
CREATE TABLE IF NOT EXISTS rental_inspections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL,
  contract_id         UUID REFERENCES rental_contracts (id) ON DELETE SET NULL,
  asset_id            UUID,
  asset_name          TEXT,
  type                TEXT NOT NULL DEFAULT 'pre_rental',
    -- pre_rental | post_rental | maintenance_check
  condition           TEXT NOT NULL DEFAULT 'good',
    -- excellent | good | fair | poor
  damage_found        BOOLEAN NOT NULL DEFAULT false,
  damage_description  TEXT,
  damage_cost         NUMERIC(12, 2),
  damage_recovered    BOOLEAN NOT NULL DEFAULT false,
  inspector_name      TEXT,
  notes               TEXT,
  photos              JSONB DEFAULT '[]',    -- array of photo URLs
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ri_org_idx      ON rental_inspections (org_id);
CREATE INDEX IF NOT EXISTS ri_contract_idx ON rental_inspections (contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ri_damage_idx   ON rental_inspections (org_id, damage_found) WHERE damage_found = true;
