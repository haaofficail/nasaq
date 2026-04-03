-- Migration 090: Fix restaurant_tables and online_orders schema divergence
-- The production DB had an older schema for these tables (created before migration 016).
-- Migration 016 used CREATE TABLE IF NOT EXISTS so it skipped the table since it existed.
-- This migration bridges the gap.

-- ──────────────────────────────────────────────────────────────
-- restaurant_tables: rename old columns, add missing columns
-- ──────────────────────────────────────────────────────────────

-- Add `number` column (equivalent to old `name`) if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_tables' AND column_name = 'number'
  ) THEN
    ALTER TABLE restaurant_tables ADD COLUMN number TEXT;
    -- Copy from old `name` column if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'restaurant_tables' AND column_name = 'name'
    ) THEN
      UPDATE restaurant_tables SET number = name;
    END IF;
    ALTER TABLE restaurant_tables ALTER COLUMN number SET NOT NULL;
    ALTER TABLE restaurant_tables ALTER COLUMN number SET DEFAULT '';
  END IF;
END $$;

-- Add `capacity` column (equivalent to old `seats`) if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_tables' AND column_name = 'capacity'
  ) THEN
    ALTER TABLE restaurant_tables ADD COLUMN capacity INTEGER NOT NULL DEFAULT 4;
    -- Copy from old `seats` column if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'restaurant_tables' AND column_name = 'seats'
    ) THEN
      UPDATE restaurant_tables SET capacity = seats;
    END IF;
  END IF;
END $$;

-- Add `sort_order` if missing
ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Add `updated_at` if missing
ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add unique constraint on (org_id, number) if not already there
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'restaurant_tables'
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%number%'
  ) THEN
    -- Drop the old unique constraint on (org_id, name) if it exists
    ALTER TABLE restaurant_tables
      DROP CONSTRAINT IF EXISTS restaurant_tables_org_id_name_key;
    -- Add unique on (org_id, number)
    ALTER TABLE restaurant_tables
      ADD CONSTRAINT restaurant_tables_org_number_unique UNIQUE (org_id, number);
  END IF;
END $$;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS restaurant_tables_org_idx    ON restaurant_tables (org_id);
CREATE INDEX IF NOT EXISTS restaurant_tables_status_idx ON restaurant_tables (org_id, status);

-- ──────────────────────────────────────────────────────────────
-- table_sessions: add missing columns
-- ──────────────────────────────────────────────────────────────

-- Add seated_at if missing (production has it but ensure it has default)
ALTER TABLE table_sessions
  ADD COLUMN IF NOT EXISTS seated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ──────────────────────────────────────────────────────────────
-- online_orders: add missing updated_at column
-- ──────────────────────────────────────────────────────────────

ALTER TABLE online_orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ──────────────────────────────────────────────────────────────
-- restaurant_booking_config: ensure table exists for booking settings
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_booking_config (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  min_guests               INTEGER NOT NULL DEFAULT 1,
  max_guests               INTEGER NOT NULL DEFAULT 12,
  slot_duration_min        INTEGER NOT NULL DEFAULT 60,
  advance_booking_days     INTEGER NOT NULL DEFAULT 30,
  min_notice_hours         INTEGER NOT NULL DEFAULT 2,
  waitlist_enabled         BOOLEAN NOT NULL DEFAULT false,
  auto_confirm             BOOLEAN NOT NULL DEFAULT false,
  special_requests_enabled BOOLEAN NOT NULL DEFAULT true,
  max_concurrent_per_slot  INTEGER NOT NULL DEFAULT 5,
  turnover_time_min        INTEGER NOT NULL DEFAULT 15,
  deposit_required         BOOLEAN NOT NULL DEFAULT false,
  deposit_amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  cancellation_hours       INTEGER NOT NULL DEFAULT 24,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- restaurant_sections: ensure table exists
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_sections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  name_en    TEXT,
  capacity   INTEGER NOT NULL DEFAULT 20,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS restaurant_sections_org_idx ON restaurant_sections (org_id);

-- ──────────────────────────────────────────────────────────────
-- menu_item_ingredients: ensure table exists (for cost cards)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id  UUID NOT NULL,
  name     TEXT NOT NULL,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit     TEXT NOT NULL DEFAULT 'g',
  cost     NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, name)
);

CREATE INDEX IF NOT EXISTS menu_item_ingredients_org_idx  ON menu_item_ingredients (org_id);
CREATE INDEX IF NOT EXISTS menu_item_ingredients_item_idx ON menu_item_ingredients (item_id);

-- ──────────────────────────────────────────────────────────────
-- loyalty_stamps: ensure table exists (for cafe loyalty)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_stamps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL,
  stamps_count        INTEGER NOT NULL DEFAULT 0,
  stamps_goal         INTEGER NOT NULL DEFAULT 10,
  free_items_redeemed INTEGER NOT NULL DEFAULT 0,
  last_stamp_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, customer_id)
);

CREATE INDEX IF NOT EXISTS loyalty_stamps_org_idx      ON loyalty_stamps (org_id);
CREATE INDEX IF NOT EXISTS loyalty_stamps_customer_idx ON loyalty_stamps (customer_id);
