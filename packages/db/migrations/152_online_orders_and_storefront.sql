-- ═══════════════════════════════════════════════════════════════
-- 152: online_orders table + storefront product columns
--
-- أ) ينشئ جدول online_orders الذي يفتقده الإنتاج رغم وجود
--    migrations 090/112/114 (طُبِّقت عبر --baseline بدون SQL)
-- ب) يضيف أعمدة المتجر الإلكتروني إلى inventory_products
-- ج) يضيف order_id إلى payment_transactions لربط الدفع بالطلب
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- أ) online_orders
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS online_orders (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_number        TEXT        NOT NULL,
  order_type          TEXT        NOT NULL DEFAULT 'delivery',
  customer_name       TEXT        NOT NULL,
  customer_phone      TEXT        NOT NULL,
  customer_email      TEXT,
  delivery_address    JSONB       NOT NULL DEFAULT '{}',
  items               JSONB       NOT NULL DEFAULT '[]',
  subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method      TEXT        NOT NULL DEFAULT 'cash_on_delivery',
  status              TEXT        NOT NULL DEFAULT 'pending',
  payment_status      TEXT        NOT NULL DEFAULT 'unpaid',
  confirmed_at        TIMESTAMPTZ,
  preparing_at        TIMESTAMPTZ,
  ready_at            TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  version             INTEGER     NOT NULL DEFAULT 1,
  journal_entry_id    UUID        REFERENCES journal_entries(id) ON DELETE SET NULL,
  coupon_code         TEXT,
  coupon_discount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE online_orders ADD CONSTRAINT chk_online_orders_payment_status
    CHECK (payment_status IN ('unpaid','paid','partially_paid','refunded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_online_orders_org      ON online_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_status   ON online_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_online_orders_journal  ON online_orders(journal_entry_id) WHERE journal_entry_id IS NOT NULL;

-- unique constraint for upsert (session_id per org)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='abandoned_carts' AND constraint_name='abandoned_carts_org_session_unique'
  ) THEN
    ALTER TABLE abandoned_carts
      ADD CONSTRAINT abandoned_carts_org_session_unique UNIQUE (org_id, session_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- ب) inventory_products — أعمدة المتجر الإلكتروني
-- ملاحظة: ينشئ الجدول إذا لم يكن موجوداً (حماية من --baseline)
-- الجدول أُنشئ أصلاً في migration 133 لكنه طُبِّق بـ baseline في بعض البيئات
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_products (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name           TEXT          NOT NULL,
  name_en        TEXT,
  sku            TEXT,
  barcode        TEXT,
  category       TEXT,
  unit           TEXT          NOT NULL DEFAULT 'قطعة',
  unit_cost      NUMERIC(15,4) NOT NULL DEFAULT 0,
  cost_price     NUMERIC(15,4) NOT NULL DEFAULT 0,
  selling_price  NUMERIC(15,4) NOT NULL DEFAULT 0,
  current_stock  NUMERIC(15,4) NOT NULL DEFAULT 0,
  min_stock      NUMERIC(15,4) NOT NULL DEFAULT 0,
  max_stock      NUMERIC(15,4),
  notes          TEXT,
  image_url      TEXT,
  is_active      BOOLEAN       NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_products_org      ON inventory_products(org_id);
CREATE INDEX IF NOT EXISTS idx_inv_products_barcode  ON inventory_products(org_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_products_sku      ON inventory_products(org_id, sku)     WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_products_category ON inventory_products(org_id, category);

ALTER TABLE inventory_products
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS images           JSONB       NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_store_visible BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_sort_order INTEGER     NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_inventory_products_store
  ON inventory_products(org_id, is_store_visible, store_sort_order)
  WHERE is_store_visible = true;

-- ─────────────────────────────────────────────────────────────
-- ج) payment_transactions — ربط الدفع بالطلب
-- ─────────────────────────────────────────────────────────────
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES online_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order
  ON payment_transactions(order_id) WHERE order_id IS NOT NULL;
