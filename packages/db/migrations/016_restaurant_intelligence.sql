-- Migration 016: Restaurant Intelligence
-- Tables: restaurant_tables, table_sessions, loyalty_stamps, menu_item_ingredients

-- Restaurant tables (physical tables in venue)
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL,
  number      TEXT NOT NULL,          -- e.g. "1", "A3", "VIP-1"
  section     TEXT,                   -- e.g. "Ground Floor", "Terrace"
  capacity    INT NOT NULL DEFAULT 4,
  status      TEXT NOT NULL DEFAULT 'available', -- available | occupied | reserved | cleaning
  notes       TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, number)
);
CREATE INDEX IF NOT EXISTS restaurant_tables_org_idx ON restaurant_tables (org_id);
CREATE INDEX IF NOT EXISTS restaurant_tables_status_idx ON restaurant_tables (org_id, status);

-- Table sessions (link an open order to a physical table)
CREATE TABLE IF NOT EXISTS table_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL,
  table_id    UUID NOT NULL REFERENCES restaurant_tables (id) ON DELETE CASCADE,
  order_id    UUID,                   -- online_orders.id (nullable until order created)
  guests      INT  NOT NULL DEFAULT 1,
  waiter_id   UUID,                   -- team_members.id
  seated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at   TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS table_sessions_org_idx    ON table_sessions (org_id);
CREATE INDEX IF NOT EXISTS table_sessions_table_idx  ON table_sessions (table_id);
CREATE INDEX IF NOT EXISTS table_sessions_open_idx   ON table_sessions (org_id, closed_at) WHERE closed_at IS NULL;

-- Loyalty stamps (stamp card per customer per org)
CREATE TABLE IF NOT EXISTS loyalty_stamps (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL,
  customer_id          UUID NOT NULL,
  stamps_count         INT  NOT NULL DEFAULT 0,
  stamps_goal          INT  NOT NULL DEFAULT 10,  -- stamps needed for reward
  free_items_redeemed  INT  NOT NULL DEFAULT 0,
  last_stamp_at        TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, customer_id)
);
CREATE INDEX IF NOT EXISTS loyalty_stamps_org_idx ON loyalty_stamps (org_id);
CREATE INDEX IF NOT EXISTS loyalty_stamps_customer_idx ON loyalty_stamps (customer_id);

-- Menu item ingredients (recipe cost cards)
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL,
  item_id     UUID NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,           -- ingredient name
  quantity    NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unit        TEXT NOT NULL DEFAULT 'g', -- g, kg, ml, l, pcs
  cost        NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- cost per unit
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, name)
);
CREATE INDEX IF NOT EXISTS menu_item_ingredients_item_idx ON menu_item_ingredients (item_id);
CREATE INDEX IF NOT EXISTS menu_item_ingredients_org_idx  ON menu_item_ingredients (org_id);
