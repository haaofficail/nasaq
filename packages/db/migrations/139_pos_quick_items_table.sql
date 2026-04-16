-- 139: Create pos_quick_items table if not exists
-- Needed by: POS module (pos.ts), demo seed

CREATE TABLE IF NOT EXISTS pos_quick_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  category    TEXT,
  color       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pos_quick_items_org_idx ON pos_quick_items(org_id);
CREATE INDEX IF NOT EXISTS pos_quick_items_org_active_idx ON pos_quick_items(org_id, is_active) WHERE is_active = true;
