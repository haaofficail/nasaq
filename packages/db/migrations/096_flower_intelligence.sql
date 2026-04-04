-- ============================================================
-- Migration 096: Flower Intelligence Layer
-- ذكاء محل الورد — مناسبات، هوامش، تنبيهات خسارة
-- ============================================================

-- ── مناسبات الورد المخصصة للمنشأة ────────────────────────
CREATE TABLE IF NOT EXISTS flower_occasions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name_ar          TEXT NOT NULL,
  name_en          TEXT,
  icon             TEXT NOT NULL DEFAULT 'star',
  color            TEXT NOT NULL DEFAULT 'rose',    -- rose/pink/amber/green/violet/blue
  date_month       INTEGER NOT NULL CHECK (date_month BETWEEN 1 AND 12),
  date_day         INTEGER NOT NULL CHECK (date_day BETWEEN 1 AND 31),
  is_system        BOOLEAN NOT NULL DEFAULT FALSE,  -- مناسبة نظامية (لا تحذف)
  lead_days        INTEGER NOT NULL DEFAULT 14,     -- نُنبّه قبل X يوم
  sales_multiplier NUMERIC(4,2) NOT NULL DEFAULT 2.0, -- ضعف المبيعات المتوقع
  stock_increase_pct INTEGER NOT NULL DEFAULT 50,   -- نسبة زيادة المخزون الموصى
  notes            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flower_occasions_org
  ON flower_occasions(org_id, date_month, date_day) WHERE is_active = TRUE;

-- ── هوامش التنسيقات الحقيقية ──────────────────────────────
-- نضيف حقول تتبع التكلفة على flower_packages (جدول التنسيقات)
ALTER TABLE flower_packages
  ADD COLUMN IF NOT EXISTS items_breakdown JSONB DEFAULT '[]',
  -- [{variantId, variantName, qty, unitCost}]
  ADD COLUMN IF NOT EXISTS calculated_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cost_updated_at TIMESTAMPTZ;

-- ── تحسين أداء استعلامات العملاء ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_flower_orders_customer
  ON flower_orders(org_id, customer_phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flower_orders_delivered
  ON flower_orders(org_id, status, delivered_at)
  WHERE status = 'delivered';
