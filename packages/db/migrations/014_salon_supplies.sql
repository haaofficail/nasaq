-- Migration 014: Salon Supplies — consumable materials tracking
-- مستلزمات الصالون: تتبع المواد الاستهلاكية كالصبغات والكريمات

CREATE TABLE IF NOT EXISTS salon_supplies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  unit            TEXT NOT NULL DEFAULT 'piece',
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_quantity    NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_per_unit   NUMERIC(10,2),
  supplier_id     UUID,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS salon_supplies_org_idx
  ON salon_supplies(org_id);

CREATE INDEX IF NOT EXISTS salon_supplies_active_category_idx
  ON salon_supplies(org_id, is_active, category);

-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS salon_supply_adjustments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supply_id   UUID NOT NULL REFERENCES salon_supplies(id) ON DELETE CASCADE,
  delta       NUMERIC(10,2) NOT NULL,
  reason      TEXT NOT NULL DEFAULT 'manual',
  notes       TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS salon_supply_adj_supply_idx
  ON salon_supply_adjustments(supply_id);

CREATE INDEX IF NOT EXISTS salon_supply_adj_org_idx
  ON salon_supply_adjustments(org_id);
