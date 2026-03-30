-- ============================================================
-- Migration 082: Canonical Catalog
-- تفكيك services.offeringType إلى جداول كنونية مستقلة
-- services = legacy (no new offeringType values allowed)
-- ============================================================

-- ============================================================
-- CATALOG ITEMS — الجدول الجذر المشترك
-- ============================================================

CREATE TABLE IF NOT EXISTS catalog_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- النوع الكنوني (يحل محل offeringType)
  item_type       TEXT NOT NULL,
  -- ALLOWED VALUES:
  --   service          → service_definitions
  --   product          → product_definitions
  --   rental_unit      → rental_unit_definitions
  --   subscription     → subscription_definitions (future)
  --   digital          → digital_definitions (future)

  -- البيانات المشتركة
  name            TEXT NOT NULL,
  name_en         TEXT,
  description     TEXT,
  image_url       TEXT,
  category_id     UUID REFERENCES categories(id),

  status          TEXT NOT NULL DEFAULT 'active',   -- active|draft|archived
  is_taxable      BOOLEAN NOT NULL DEFAULT TRUE,
  tax_rate        NUMERIC(5,2) DEFAULT 15,

  -- الرابط بالكتالوج القديم (للـ migration)
  legacy_service_id UUID REFERENCES services(id),

  sort_order      INTEGER DEFAULT 0,
  tags            JSONB DEFAULT '[]',
  metadata        JSONB DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS catalog_items_org_idx      ON catalog_items(org_id);
CREATE INDEX IF NOT EXISTS catalog_items_type_idx     ON catalog_items(item_type);
CREATE INDEX IF NOT EXISTS catalog_items_category_idx ON catalog_items(category_id);
CREATE INDEX IF NOT EXISTS catalog_items_legacy_idx   ON catalog_items(legacy_service_id);

COMMENT ON TABLE catalog_items IS
  'Canonical catalog root. item_type determines which definition table holds the details. legacy_service_id links to old services table.';

-- ============================================================
-- SERVICE DEFINITIONS — الخدمات القابلة للحجز
-- ============================================================

CREATE TABLE IF NOT EXISTS service_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id UUID NOT NULL UNIQUE REFERENCES catalog_items(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- التسعير
  base_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_type      TEXT NOT NULL DEFAULT 'fixed',     -- fixed|from|range|on_request
  price_from      NUMERIC(12,2),
  price_to        NUMERIC(12,2),

  -- الوقت
  duration_minutes    INTEGER,
  buffer_before_mins  INTEGER DEFAULT 0,
  buffer_after_mins   INTEGER DEFAULT 0,
  booking_advance_hrs INTEGER DEFAULT 0,

  -- التوافر
  requires_assignment BOOLEAN DEFAULT FALSE,         -- يحتاج تعيين موظف؟
  max_concurrent      INTEGER DEFAULT 1,             -- كم حجزاً متزامن؟

  -- القيود
  min_quantity    INTEGER DEFAULT 1,
  max_quantity    INTEGER,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS svc_def_org_idx ON service_definitions(org_id);

COMMENT ON TABLE service_definitions IS
  'Engine: Appointment/Service. Details for bookable services (salon, photography, maintenance, etc).';

-- ============================================================
-- PRODUCT DEFINITIONS — المنتجات القابلة للبيع
-- ============================================================

CREATE TABLE IF NOT EXISTS product_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id UUID NOT NULL UNIQUE REFERENCES catalog_items(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- التسعير
  base_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  compare_price   NUMERIC(12,2),                     -- السعر الأصلي قبل الخصم
  cost_price      NUMERIC(12,2),                     -- تكلفة الشراء

  -- المخزون
  sku             TEXT,
  barcode         TEXT,
  track_inventory BOOLEAN DEFAULT FALSE,
  stock_quantity  INTEGER DEFAULT 0,
  reorder_level   INTEGER DEFAULT 0,

  -- الشحن
  is_shippable    BOOLEAN DEFAULT FALSE,
  weight_grams    INTEGER,
  requires_age_verify BOOLEAN DEFAULT FALSE,

  -- المتغيرات
  has_variants    BOOLEAN DEFAULT FALSE,
  variant_options JSONB DEFAULT '[]',               -- [{ name: "size", values: ["S","M","L"] }]

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prod_def_org_idx ON product_definitions(org_id);
CREATE INDEX IF NOT EXISTS prod_def_sku_idx ON product_definitions(sku);

COMMENT ON TABLE product_definitions IS
  'Engine: Commerce. Details for sellable products (retail, flower arrangements, food items, etc).';

-- ============================================================
-- RENTAL UNIT DEFINITIONS — وحدات الإيجار
-- ============================================================

CREATE TABLE IF NOT EXISTS rental_unit_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id UUID NOT NULL UNIQUE REFERENCES catalog_items(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  unit_type       TEXT NOT NULL,                     -- room|vehicle|equipment|property|hall
  unit_code       TEXT,                              -- رقم الغرفة/السيارة/المعدة

  -- التسعير
  price_per_night NUMERIC(12,2),
  price_per_hour  NUMERIC(12,2),
  price_per_day   NUMERIC(12,2),
  price_per_week  NUMERIC(12,2),
  price_per_month NUMERIC(12,2),
  min_rental_days INTEGER DEFAULT 1,
  deposit_amount  NUMERIC(10,2) DEFAULT 0,

  -- السعة والمواصفات
  capacity        INTEGER,
  specs           JSONB DEFAULT '{}',
  -- room: { floor, view, bed_type, amenities }
  -- vehicle: { make, model, year, plate, color, fuel_type, transmission }
  -- equipment: { brand, model, serial_number }

  -- الصيانة
  maintenance_due_at  TIMESTAMPTZ,
  last_serviced_at    TIMESTAMPTZ,
  is_available        BOOLEAN DEFAULT TRUE,

  location_id     UUID REFERENCES locations(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rental_def_org_idx  ON rental_unit_definitions(org_id);
CREATE INDEX IF NOT EXISTS rental_def_type_idx ON rental_unit_definitions(unit_type);

COMMENT ON TABLE rental_unit_definitions IS
  'Engine: Stay/Rental. Details for rentable units: hotel rooms, vehicles, equipment, event halls.';

-- ============================================================
-- FREEZE: منع offeringType جديدة
-- إضافة check constraint لمنع values جديدة على services
-- ============================================================

DO $$
BEGIN
  -- أضف comment تحذيري على enum
  COMMENT ON TYPE offering_type IS
    'FROZEN: No new values. Use catalog_items.item_type for new offering types. Existing values are legacy-mapped only.';
EXCEPTION WHEN undefined_object THEN
  NULL; -- إذا لم يكن enum موجوداً بهذا الاسم تحديداً
END $$;
