-- ============================================================
-- 050: Barcode support
--      - Add barcode field to services (catalog)
--      - Add barcode field to inventory_products
--      - Unique indexes per org
-- ============================================================

-- Services catalog barcode
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS services_org_barcode_idx
  ON services (org_id, barcode)
  WHERE barcode IS NOT NULL;

-- Inventory products barcode
ALTER TABLE inventory_products
  ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS inv_products_org_barcode_idx
  ON inventory_products (org_id, barcode)
  WHERE barcode IS NOT NULL;
