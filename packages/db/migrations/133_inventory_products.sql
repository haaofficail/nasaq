-- ============================================================
-- Migration 133: إنشاء جدول inventory_products
-- جدول المخزون المستقل (منفصل عن catalog_items / product_definitions)
-- مستخدم في: routes/inventory.ts, lib/barcode.ts, routes/fulfillments.ts
-- ============================================================

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
  cost_price     NUMERIC(15,4) NOT NULL DEFAULT 0,   -- alias used in accounting
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
