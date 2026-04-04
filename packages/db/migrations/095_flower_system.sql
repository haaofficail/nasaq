-- ============================================================
-- Migration 095: Flower Shop Full System
-- نظام محل الورد المتكامل
-- ============================================================

-- ── قواعد التصريف الذكي ────────────────────────────────────
CREATE TABLE IF NOT EXISTS flower_disposal_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  min_age_days     INTEGER NOT NULL DEFAULT 0,
  max_age_days     INTEGER NOT NULL DEFAULT 999,   -- -1 = unlimited, stored as 999
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  auto_apply       BOOLEAN NOT NULL DEFAULT TRUE,
  show_as_sale     BOOLEAN NOT NULL DEFAULT TRUE,  -- يعرض للعميل كـ "عرض خاص"
  display_label_ar TEXT NOT NULL DEFAULT 'عرض خاص',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flower_disposal_rules_org
  ON flower_disposal_rules(org_id) WHERE is_active = TRUE;

-- ── تطبيق الخصم على الدفعات ────────────────────────────────
-- نضيف عمود discount_percent و discount_label على flower_batches
ALTER TABLE flower_batches
  ADD COLUMN IF NOT EXISTS disposal_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disposal_label_ar     TEXT,
  ADD COLUMN IF NOT EXISTS disposal_applied_at   TIMESTAMPTZ;

-- ── باقة اليوم المحفوظة ──────────────────────────────────
CREATE TABLE IF NOT EXISTS flower_today_bundles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bundle_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  name_ar         TEXT NOT NULL DEFAULT 'باقة اليوم',
  composition     JSONB NOT NULL DEFAULT '[]',  -- [{variantId, qty, batchId}]
  original_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  is_sold         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_flower_today_bundles_date
  ON flower_today_bundles(org_id, bundle_date) WHERE is_sold = FALSE;

-- ── موردو الورد (تمديد جدول suppliers العام) ────────────
-- نضيف حقول خاصة بمحل الورد على جدول suppliers الموجود
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS flower_specialty     TEXT,   -- 'ورود / تولب / ليلية'
  ADD COLUMN IF NOT EXISTS flower_origin        TEXT,   -- 'هولندا / كينيا / إكوادور'
  ADD COLUMN IF NOT EXISTS quality_score        NUMERIC(4,2),  -- 0-10
  ADD COLUMN IF NOT EXISTS last_delivery_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_purchases      NUMERIC(15,2) NOT NULL DEFAULT 0;

-- ── ربط الدفعات بالموردين ───────────────────────────────
ALTER TABLE flower_batches
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_flower_batches_supplier
  ON flower_batches(org_id, supplier_id) WHERE supplier_id IS NOT NULL;

-- ── إضافة حقول التوصيل والهدية على flower_orders ───────
ALTER TABLE flower_orders
  ADD COLUMN IF NOT EXISTS recipient_name    TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone   TEXT,
  ADD COLUMN IF NOT EXISTS is_surprise       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS delivery_fee      NUMERIC(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_time     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_name       TEXT,
  ADD COLUMN IF NOT EXISTS driver_phone      TEXT,
  ADD COLUMN IF NOT EXISTS order_type        TEXT NOT NULL DEFAULT 'regular', -- regular/gift/delivery/pickup
  ADD COLUMN IF NOT EXISTS payment_method    TEXT NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS preparing_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatched_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at      TIMESTAMPTZ;

-- إضافة status "preparing" | "out_for_delivery" إذا لم تكن موجودة
DO $$ BEGIN
  ALTER TABLE flower_orders ALTER COLUMN status TYPE TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
