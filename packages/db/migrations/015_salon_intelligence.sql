-- Migration 015: Salon Intelligence Layer
-- بطاقة الجمال الذكية + وصفات الخدمات + ملاحظات الزيارة

-- ----------------------------------------------------------------
-- 1. Client Beauty Profile (extend customers via separate table)
-- بطاقة الجمال لكل عميل: نوع الشعر، الحساسيات، الفورمولا
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS client_beauty_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- شعر
  hair_type       TEXT,    -- straight | wavy | curly | coily
  hair_texture    TEXT,    -- fine | medium | thick | coarse
  hair_condition  TEXT,    -- healthy | damaged | color_treated | bleached | dry | oily
  natural_color   TEXT,    -- نبذة: "بني داكن طبيعي"
  current_color   TEXT,    -- اللون الحالي

  -- بشرة
  skin_type       TEXT,    -- normal | oily | dry | combination | sensitive
  skin_concerns   TEXT[],  -- acne | pigmentation | aging | redness | ...

  -- تنبيهات طبية
  allergies       TEXT,    -- "حساسية من أوكسيجين 40 والكيراتين"
  sensitivities   TEXT,    -- "بشرة حساسة عند الفروة"
  medical_notes   TEXT,    -- ملاحظات طبية أخرى

  -- تفضيلات
  preferred_staff_id UUID, -- موظف مفضل
  preferences     TEXT,    -- "تفضل التجفيف بدون فرد"
  avoid_notes     TEXT,    -- "تجنب ألوان الرماد"

  -- Metadata
  last_formula    TEXT,    -- آخر فورمولا استُخدمت (اختصار سريع)
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(org_id, customer_id)
);

CREATE INDEX IF NOT EXISTS cbp_org_customer_idx
  ON client_beauty_profiles(org_id, customer_id);

-- ----------------------------------------------------------------
-- 2. Visit Notes (per booking)
-- ملاحظات الزيارة: الفورمولا، المنتجات، الصور، الموعد القادم
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS visit_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  staff_id        UUID,    -- الموظف الذي نفّذ الخدمة
  service_id      UUID,    -- الخدمة المنفذة

  -- الفورمولا (للصالونات)
  formula         TEXT,    -- مثال: "لوريال 7.1 + أوكسيجين 20 | نسبة 1:1 | 35 دقيقة"
  products_used   TEXT[],  -- ["لوريال 7.1", "أوكسيجين 20", "ماسك البروتين"]
  processing_time INTEGER, -- وقت التأثير بالدقائق

  -- الملاحظات المهنية
  technique       TEXT,    -- "بالوناج من المنتصف" | "قصة لاير طويلة"
  result_notes    TEXT,    -- "النتيجة رائعة، العميلة سعيدة"
  private_notes   TEXT,    -- ملاحظات داخلية (لا تظهر للعميل)

  -- التوصيات
  recommended_products TEXT[], -- منتجات أوصت بها المختصة
  next_visit_in   INTEGER, -- بعد كم أسبوع يُنصح بالزيارة
  next_visit_date DATE,    -- تاريخ محدد للزيارة القادمة

  -- ملف مرئي
  before_photo_url TEXT,
  after_photo_url  TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vn_booking_idx    ON visit_notes(booking_id);
CREATE INDEX IF NOT EXISTS vn_customer_idx   ON visit_notes(org_id, customer_id);
CREATE INDEX IF NOT EXISTS vn_staff_idx      ON visit_notes(org_id, staff_id);

-- ----------------------------------------------------------------
-- 3. Service Supply Recipes
-- وصفة استهلاك المستلزمات لكل خدمة
-- عند إتمام الحجز → خصم تلقائي من مخزون المستلزمات
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS service_supply_recipes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  supply_id   UUID NOT NULL REFERENCES salon_supplies(id) ON DELETE CASCADE,
  quantity    NUMERIC(10,2) NOT NULL DEFAULT 1,
  notes       TEXT,

  UNIQUE(service_id, supply_id)
);

CREATE INDEX IF NOT EXISTS ssr_service_idx ON service_supply_recipes(service_id);
CREATE INDEX IF NOT EXISTS ssr_supply_idx  ON service_supply_recipes(supply_id);
