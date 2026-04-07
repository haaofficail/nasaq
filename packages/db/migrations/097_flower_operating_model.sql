-- ============================================================
-- Migration 097: Flower Operating Model
-- نموذج تشغيل محل الورد الكامل
-- ============================================================

-- ── 1. تتبع البنشات في دفعات الورد الطبيعي ────────────────
ALTER TABLE flower_batches
  ADD COLUMN IF NOT EXISTS bunches_received   INTEGER,
  ADD COLUMN IF NOT EXISTS stems_per_bunch    INTEGER,
  ADD COLUMN IF NOT EXISTS cost_per_bunch     NUMERIC(10,2);

COMMENT ON COLUMN flower_batches.bunches_received IS 'عدد البنشات المستلمة من المورد';
COMMENT ON COLUMN flower_batches.stems_per_bunch  IS 'عدد السيقان في البنش — يمكن تجاوز القيمة الافتراضية للصنف';
COMMENT ON COLUMN flower_batches.cost_per_bunch   IS 'تكلفة البنش الواحد المدفوعة للمورد';

-- ── 2. الأصول الصناعية القابلة لإعادة الاستخدام ──────────
CREATE TABLE IF NOT EXISTS decor_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'other'
                  CHECK (category IN ('artificial_flowers','stands','backdrops','vases',
                                      'holders','decor','kiosk_equipment','other')),
  code          TEXT,
  location      TEXT,
  status        TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available','reserved','in_use','returned',
                                    'maintenance','damaged')),
  purchase_date DATE,
  purchase_cost NUMERIC(10,2),
  image_url     TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_decor_assets_org_status
  ON decor_assets(org_id, status) WHERE is_active = TRUE;

-- ── 3. سجل حركة الأصول ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS decor_asset_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES decor_assets(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL,
  movement_type   TEXT NOT NULL
                    CHECK (movement_type IN ('reserved','dispatched','returned',
                                             'damaged','maintenance','repaired','available')),
  reference_id    UUID,          -- service_order_id إن وجد
  reference_label TEXT,          -- "طلب رقم SO-2025-001"
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_decor_asset_movements_asset
  ON decor_asset_movements(asset_id, created_at DESC);

-- ── 4. سجل صيانة الأصول ────────────────────────────────────
CREATE TABLE IF NOT EXISTS decor_asset_maintenance_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              UUID NOT NULL REFERENCES decor_assets(id) ON DELETE CASCADE,
  org_id                UUID NOT NULL,
  maintenance_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  description           TEXT,
  cost                  NUMERIC(10,2),
  performed_by          TEXT,
  next_maintenance_date DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. سجل هدر الورد الطبيعي ──────────────────────────────
CREATE TABLE IF NOT EXISTS flower_waste_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL,
  variant_id     UUID REFERENCES flower_variants(id),
  batch_id       UUID REFERENCES flower_batches(id),
  quantity_type  TEXT NOT NULL DEFAULT 'stems'
                   CHECK (quantity_type IN ('stems','bunches')),
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  reason         TEXT NOT NULL DEFAULT 'natural_expiry'
                   CHECK (reason IN ('natural_expiry','damage','cutting_waste',
                                     'transfer','other')),
  notes          TEXT,
  recorded_by    UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flower_waste_org_date
  ON flower_waste_logs(org_id, created_at DESC);

-- ── 6. طلبات الخدمة الميدانية (كوشة، استقبال مولود، إلخ) ──
CREATE TABLE IF NOT EXISTS service_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_number     TEXT NOT NULL,
  type             TEXT NOT NULL
                     CHECK (type IN ('kiosk','newborn_reception','custom_arrangement',
                                     'field_execution','custom_decor')),
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','confirmed','deposit_pending','scheduled',
                                       'preparing','ready','dispatched','in_setup',
                                       'completed_on_site','returned','inspected',
                                       'closed','cancelled')),
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT,
  event_date       DATE,
  event_time       TIME,
  event_location   TEXT,
  description      TEXT,
  notes            TEXT,
  reference_images TEXT[] DEFAULT '{}',
  deposit_amount   NUMERIC(10,2),
  deposit_paid_at  TIMESTAMPTZ,
  total_amount     NUMERIC(10,2),
  team_size        INTEGER DEFAULT 1,
  internal_notes   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_orders_number
  ON service_orders(org_id, order_number);
CREATE INDEX IF NOT EXISTS idx_service_orders_org_status
  ON service_orders(org_id, status, event_date);

-- ── 7. بنود طلب الخدمة ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  item_type        TEXT NOT NULL
                     CHECK (item_type IN ('consumable_natural','consumable_product',
                                          'asset','service_fee')),
  variant_id       UUID REFERENCES flower_variants(id),
  asset_id         UUID REFERENCES decor_assets(id),
  description      TEXT NOT NULL,
  quantity         NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit             TEXT DEFAULT 'ساق',
  unit_cost        NUMERIC(10,2) DEFAULT 0,
  subtotal         NUMERIC(10,2) DEFAULT 0,
  is_returned      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 8. حجوزات الأصول ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS decor_asset_reservations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         UUID NOT NULL REFERENCES decor_assets(id) ON DELETE CASCADE,
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  org_id           UUID NOT NULL,
  reserved_from    TIMESTAMPTZ,
  reserved_to      TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'reserved'
                     CHECK (status IN ('reserved','dispatched','returned_ok',
                                       'damaged','missing','maintenance_required')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_decor_asset_reservations_order
  ON decor_asset_reservations(service_order_id);
CREATE INDEX IF NOT EXISTS idx_decor_asset_reservations_asset
  ON decor_asset_reservations(asset_id, status);

-- ── 9. حجوزات المواد الطبيعية ──────────────────────────────
CREATE TABLE IF NOT EXISTS material_reservations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id       UUID NOT NULL REFERENCES flower_variants(id),
  batch_id         UUID REFERENCES flower_batches(id),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  org_id           UUID NOT NULL,
  quantity_stems   INTEGER NOT NULL CHECK (quantity_stems > 0),
  status           TEXT NOT NULL DEFAULT 'reserved'
                     CHECK (status IN ('reserved','consumed','released','cancelled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_material_reservations_order
  ON material_reservations(service_order_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_variant
  ON material_reservations(org_id, variant_id, status);

-- ── 10. فحص المرتجعات بعد التنفيذ ─────────────────────────
CREATE TABLE IF NOT EXISTS return_inspections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  org_id           UUID NOT NULL,
  inspected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inspected_by     UUID,
  assets_inspection JSONB DEFAULT '[]',
  -- [{assetId, assetName, status: returned_ok|damaged|missing|maintenance_required, notes}]
  materials_waste  JSONB DEFAULT '[]',
  -- [{variantId, variantName, qty_wasted, reason}]
  notes            TEXT,
  approved_by      UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
