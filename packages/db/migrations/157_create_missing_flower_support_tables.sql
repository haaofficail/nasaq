-- ============================================================
-- Migration 157: Create missing flower support tables & columns
-- يحل 5 أخطاء SRV_INTERNAL في نظام الزهور:
--   1. relation "flower_disposal_rules" does not exist
--   2. relation "flower_occasions" does not exist
--   3. column b.disposal_discount_pct does not exist
--   4. column "total_orders" does not exist (flower_packages)
-- آمن: IF NOT EXISTS + ADD COLUMN IF NOT EXISTS
-- ============================================================

-- ── 1. flower_disposal_rules ──────────────────────────────
CREATE TABLE IF NOT EXISTS flower_disposal_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL DEFAULT 'قاعدة تصريف',
  min_age_days     INTEGER NOT NULL DEFAULT 0,
  max_age_days     INTEGER NOT NULL DEFAULT 999,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  auto_apply       BOOLEAN NOT NULL DEFAULT TRUE,
  show_as_sale     BOOLEAN NOT NULL DEFAULT TRUE,
  display_label_ar TEXT NOT NULL DEFAULT 'عرض خاص',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flower_disposal_rules_org_id_idx ON flower_disposal_rules(org_id);

-- ── 2. flower_occasions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS flower_occasions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name_ar             TEXT NOT NULL,
  name_en             TEXT,
  icon                TEXT NOT NULL DEFAULT 'star',
  color               TEXT NOT NULL DEFAULT 'rose',
  date_month          INTEGER NOT NULL CHECK (date_month BETWEEN 1 AND 12),
  date_day            INTEGER NOT NULL CHECK (date_day BETWEEN 1 AND 31),
  lead_days           INTEGER NOT NULL DEFAULT 14,
  sales_multiplier    NUMERIC(4,2) NOT NULL DEFAULT 2.0,
  stock_increase_pct  NUMERIC(5,2) NOT NULL DEFAULT 50,
  notes               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flower_occasions_org_id_idx ON flower_occasions(org_id);

-- ── 3. إضافة أعمدة التصريف لـ flower_batches ─────────────
ALTER TABLE flower_batches
  ADD COLUMN IF NOT EXISTS disposal_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disposal_label_ar      TEXT,
  ADD COLUMN IF NOT EXISTS disposal_applied_at    TIMESTAMPTZ;

-- ── 4. إضافة عمود total_orders لـ flower_packages ─────────
ALTER TABLE flower_packages
  ADD COLUMN IF NOT EXISTS total_orders INTEGER NOT NULL DEFAULT 0;
