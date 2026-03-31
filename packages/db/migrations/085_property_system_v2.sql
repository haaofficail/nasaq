-- Migration 085: Property System v2 — Upgrade
-- ============================================================
-- يضيف: أعمدة جديدة على الجداول الموجودة، 12 جدول جديد، enums جديدة
-- ============================================================

-- ============================================================
-- 1. ADD VALUES TO EXISTING ENUMS
-- ============================================================
-- ملاحظة: ALTER TYPE ADD VALUE لا يمكن تشغيله داخل transaction
-- لذلك يجب تشغيل هذه الأوامر منفصلة أو في بداية السكريبت

ALTER TYPE property_expense_category ADD VALUE IF NOT EXISTS 'owners_association';
ALTER TYPE property_expense_category ADD VALUE IF NOT EXISTS 'white_land_fee';

ALTER TYPE lease_reminder_type ADD VALUE IF NOT EXISTS 'document_expiry';
ALTER TYPE lease_reminder_type ADD VALUE IF NOT EXISTS 'construction_delay';
ALTER TYPE lease_reminder_type ADD VALUE IF NOT EXISTS 'construction_budget_exceeded';
ALTER TYPE lease_reminder_type ADD VALUE IF NOT EXISTS 'white_land_fee_due';
ALTER TYPE lease_reminder_type ADD VALUE IF NOT EXISTS 'fal_license_expiry';
ALTER TYPE lease_reminder_type ADD VALUE IF NOT EXISTS 'riyadh_freeze_warning';
ALTER TYPE lease_reminder_type ADD VALUE IF NOT EXISTS 'najiz_execution_eligible';
ALTER TYPE lease_reminder_type ADD VALUE IF NOT EXISTS 'compliance_missing';

-- ============================================================
-- 2. NEW ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE portfolio_type AS ENUM ('invested','land','under_construction','personal','for_sale','mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE management_type AS ENUM ('self_managed','office_managed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE zoning_type AS ENUM ('residential','commercial','mixed','industrial','agricultural');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rer_status AS ENUM ('not_registered','pending','registered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE disposal_status AS ENUM ('free','mortgaged','frozen','disputed','government_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE building_permit_status AS ENUM ('none','active','expired','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assoc_fee_frequency AS ENUM ('monthly','quarterly','annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction_status AS ENUM ('design','permitting','foundation','structure','finishing','handover','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction_project_type AS ENUM ('new_build','renovation','addition','interior_fitout','infrastructure');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction_contract_type AS ENUM ('lump_sum','cost_plus','unit_price','design_build');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE phase_status AS ENUM ('not_started','in_progress','completed','on_hold','delayed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_doc_type AS ENUM ('deed','permit','plan','contract','insurance','tax','utility','safety','completion','civil_defense','building_code','photo','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_valuation_type AS ENUM ('purchase','market','insurance','mortgage','sale');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_listing_status AS ENUM ('draft','active','rented','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_inquiry_status AS ENUM ('new','contacted','viewing_scheduled','negotiating','approved','rejected','rented');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_inquiry_source AS ENUM ('walk_in','phone','whatsapp','website','referral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_sale_type AS ENUM ('full_property','single_unit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_sale_method AS ENUM ('cash','bank_mortgage','installment','developer_finance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_sale_status AS ENUM ('listed','offer_received','negotiating','agreed','deed_transfer','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE management_fee_type AS ENUM ('percentage','fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. NEW SEQUENCES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS property_construction_seq START 1;
CREATE SEQUENCE IF NOT EXISTS property_change_order_seq START 1;

-- ============================================================
-- 4. NEW TABLE: property_owners
-- يجب إنشاؤه قبل properties لأن properties تعتمد عليه بـ FK
-- ============================================================

CREATE TABLE IF NOT EXISTS property_owners (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_name              TEXT NOT NULL,
  owner_national_id       TEXT,
  owner_phone             TEXT,
  owner_email             TEXT,
  owner_iban              TEXT,
  owner_bank_name         TEXT,
  management_fee_type     management_fee_type DEFAULT 'percentage',
  management_fee_percent  NUMERIC(5,2) DEFAULT 7.5,
  management_fee_fixed    NUMERIC(12,2),
  contract_number         TEXT,
  contract_start          DATE,
  contract_end            DATE,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. ALTER EXISTING TABLES — إضافة أعمدة جديدة
-- ============================================================

-- -------------------------------------------------------
-- 5a. properties — الأعمدة الجديدة
-- -------------------------------------------------------

ALTER TABLE properties ADD COLUMN IF NOT EXISTS portfolio_type       portfolio_type;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS management_type      management_type;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_owner_id    UUID REFERENCES property_owners(id) ON DELETE SET NULL;

-- تقييم مالي
ALTER TABLE properties ADD COLUMN IF NOT EXISTS purchase_price            NUMERIC(14,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS purchase_date             DATE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS current_market_value      NUMERIC(14,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_valuation_date       DATE;

-- بيانات الأرض والتخطيط
ALTER TABLE properties ADD COLUMN IF NOT EXISTS plot_number               TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS plan_number               TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS zoning                    zoning_type;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS street_width              NUMERIC(6,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS number_of_streets         INTEGER;

-- الرخصة العقارية (فال)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rer_registered            BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rer_number                TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rer_status                rer_status DEFAULT 'not_registered';

-- حالة التصرف والرهن والتجميد
ALTER TABLE properties ADD COLUMN IF NOT EXISTS disposal_status           disposal_status DEFAULT 'free';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS mortgage_bank             TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS mortgage_amount           NUMERIC(14,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS mortgage_end_date         DATE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS freeze_reason             TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS freeze_date               DATE;

-- تراخيص البناء
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_permit_number    TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_permit_date      DATE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_permit_expiry    DATE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_permit_status    building_permit_status DEFAULT 'none';

-- شهادة الإشغال والدفاع المدني
ALTER TABLE properties ADD COLUMN IF NOT EXISTS occupancy_certificate          BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS occupancy_certificate_date     DATE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS civil_defense_license          TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS civil_defense_license_expiry   DATE;

-- الامتثال لكود البناء
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_code_compliant        BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_inspection_by_authority   DATE;

-- الأراضي البيضاء
ALTER TABLE properties ADD COLUMN IF NOT EXISTS white_land_applicable              BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS white_land_zone                    TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS white_land_fee_rate                NUMERIC(5,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS white_land_estimated_annual_fee    NUMERIC(12,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS white_land_registration_number     TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS white_land_last_payment_date       DATE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS white_land_next_due_date           DATE;

-- اتحاد الملاك
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_owners_association         BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owners_association_name        TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owners_association_fee         NUMERIC(12,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owners_association_fee_frequency  assoc_fee_frequency DEFAULT 'monthly';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS mullak_registered              BOOLEAN DEFAULT FALSE;

-- -------------------------------------------------------
-- 5b. lease_contracts — إضافة حقل تجميد الرياض
-- -------------------------------------------------------

ALTER TABLE lease_contracts ADD COLUMN IF NOT EXISTS riyadh_freeze_applies BOOLEAN DEFAULT FALSE;

-- -------------------------------------------------------
-- 5c. lease_invoices — إضافة QR كود ZATCA
-- -------------------------------------------------------

ALTER TABLE lease_invoices ADD COLUMN IF NOT EXISTS zatca_qr_code TEXT;

-- ============================================================
-- 6. NEW TABLES (12 tables)
-- ============================================================

-- -------------------------------------------------------
-- property_documents — وثائق العقار
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS property_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id   UUID REFERENCES properties(id) ON DELETE CASCADE,
  doc_type      property_doc_type NOT NULL DEFAULT 'other',
  title         TEXT NOT NULL,
  file_url      TEXT,
  expiry_date   DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- property_valuations — تقييمات العقار
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS property_valuations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  valuation_date   DATE NOT NULL,
  valuation_type   property_valuation_type NOT NULL DEFAULT 'market',
  valued_by        TEXT,
  valuation_amount NUMERIC(14,2) NOT NULL,
  notes            TEXT,
  report_url       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- property_construction — مشاريع البناء والإنشاء
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS property_construction (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id                 UUID REFERENCES properties(id) ON DELETE SET NULL,
  project_name                TEXT NOT NULL,
  project_type                construction_project_type NOT NULL DEFAULT 'new_build',
  contractor_name             TEXT,
  contractor_phone            TEXT,
  architect_name              TEXT,
  supervisor_name             TEXT,
  building_permit_number      TEXT,
  permit_date                 DATE,
  permit_expiry               DATE,
  contract_type               construction_contract_type DEFAULT 'lump_sum',
  contract_amount             NUMERIC(14,2),
  total_budget                NUMERIC(14,2),
  actual_spent_to_date        NUMERIC(14,2) DEFAULT 0,
  retention_percentage        NUMERIC(5,2) DEFAULT 10,
  retention_amount            NUMERIC(14,2) DEFAULT 0,
  retention_release_date      DATE,
  estimated_completion_date   DATE,
  actual_completion_date      DATE,
  warranty_end_date           DATE,
  penalty_per_day             NUMERIC(10,2),
  accumulated_penalty         NUMERIC(12,2) DEFAULT 0,
  overall_progress            INTEGER DEFAULT 0,
  status                      construction_status NOT NULL DEFAULT 'design',
  notes                       TEXT,
  attachments                 JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- construction_phases — مراحل البناء
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS construction_phases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  construction_id     UUID NOT NULL REFERENCES property_construction(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  order_index         INTEGER NOT NULL DEFAULT 0,
  status              phase_status NOT NULL DEFAULT 'not_started',
  planned_start_date  DATE,
  planned_end_date    DATE,
  actual_start_date   DATE,
  actual_end_date     DATE,
  progress            INTEGER DEFAULT 0,
  estimated_cost      NUMERIC(14,2),
  actual_cost         NUMERIC(14,2) DEFAULT 0,
  depends_on          UUID,
  description         TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- construction_daily_logs — السجلات اليومية للبناء
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS construction_daily_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  construction_id     UUID NOT NULL REFERENCES property_construction(id) ON DELETE CASCADE,
  log_date            DATE NOT NULL,
  weather             TEXT,
  temperature         INTEGER,
  workers_count       INTEGER DEFAULT 0,
  supervisor_present  BOOLEAN DEFAULT FALSE,
  work_description    TEXT,
  materials_received  JSONB,
  equipment_on_site   JSONB,
  issues              TEXT,
  safety_incidents    TEXT,
  visitor_log         JSONB,
  photos              JSONB,
  logged_by           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- construction_costs — تكاليف البناء
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS construction_costs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  construction_id  UUID NOT NULL REFERENCES property_construction(id) ON DELETE CASCADE,
  phase_id         UUID REFERENCES construction_phases(id) ON DELETE SET NULL,
  cost_date        DATE NOT NULL,
  category         TEXT NOT NULL DEFAULT 'materials',
  description      TEXT NOT NULL,
  vendor           TEXT,
  vendor_phone     TEXT,
  quantity         NUMERIC(12,2),
  unit_price       NUMERIC(12,2),
  total_amount     NUMERIC(14,2) NOT NULL,
  vat_amount       NUMERIC(12,2) DEFAULT 0,
  payment_status   TEXT DEFAULT 'pending',
  payment_method   TEXT,
  cheque_number    TEXT,
  invoice_number   TEXT,
  receipt_url      TEXT,
  approved_by      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- construction_payments — دفعات المقاول
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS construction_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  construction_id       UUID NOT NULL REFERENCES property_construction(id) ON DELETE CASCADE,
  payment_number        INTEGER NOT NULL DEFAULT 1,
  period_start          DATE,
  period_end            DATE,
  completion_percentage INTEGER,
  gross_amount          NUMERIC(14,2) NOT NULL,
  retention_deducted    NUMERIC(12,2) DEFAULT 0,
  previous_payments     NUMERIC(14,2) DEFAULT 0,
  net_payable           NUMERIC(14,2) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft',
  submitted_at          TIMESTAMPTZ,
  approved_at           TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ,
  approved_by           TEXT,
  attachments           JSONB,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- construction_change_orders — أوامر التغيير
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS construction_change_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  construction_id       UUID NOT NULL REFERENCES property_construction(id) ON DELETE CASCADE,
  change_order_number   TEXT NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  reason                TEXT DEFAULT 'owner_request',
  requested_by          TEXT DEFAULT 'owner',
  cost_impact           NUMERIC(12,2) DEFAULT 0,
  time_impact           INTEGER DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'proposed',
  proposed_at           TIMESTAMPTZ,
  reviewed_at           TIMESTAMPTZ,
  approved_at           TIMESTAMPTZ,
  approved_by           TEXT,
  attachments           JSONB,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- property_listings — قوائم إعلانات الإيجار
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS property_listings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id          UUID REFERENCES property_units(id) ON DELETE CASCADE,
  property_id      UUID REFERENCES properties(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  photos           JSONB,
  advertised_rent  NUMERIC(12,2),
  features         JSONB,
  status           property_listing_status NOT NULL DEFAULT 'draft',
  published_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  views            INTEGER DEFAULT 0,
  inquiries_count  INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- property_inquiries — استفسارات المستأجرين المحتملين
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS property_inquiries (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  listing_id              UUID REFERENCES property_listings(id) ON DELETE SET NULL,
  inquirer_name           TEXT NOT NULL,
  inquirer_phone          TEXT NOT NULL,
  inquirer_national_id    TEXT,
  source                  property_inquiry_source DEFAULT 'phone',
  status                  property_inquiry_status NOT NULL DEFAULT 'new',
  scheduled_viewing_date  DATE,
  viewing_notes           TEXT,
  offered_rent            NUMERIC(12,2),
  assigned_to             TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- property_sales — صفقات بيع العقارات
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS property_sales (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id              UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_id                  UUID REFERENCES property_units(id) ON DELETE SET NULL,
  sale_type                property_sale_type NOT NULL DEFAULT 'full_property',
  buyer_name               TEXT NOT NULL,
  buyer_national_id        TEXT,
  buyer_phone              TEXT,
  sale_method              property_sale_method DEFAULT 'cash',
  sale_price               NUMERIC(14,2) NOT NULL,
  deposit_paid             NUMERIC(12,2) DEFAULT 0,
  mortgage_bank            TEXT,
  mortgage_approval_number TEXT,
  installment_plan         JSONB,
  commission_percent       NUMERIC(5,2) DEFAULT 2.5,
  commission_amount        NUMERIC(12,2),
  deed_transfer_date       DATE,
  deed_transfer_number     TEXT,
  status                   property_sale_status NOT NULL DEFAULT 'listed',
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. INDEXES
-- ============================================================

-- property_owners
CREATE INDEX IF NOT EXISTS property_owners_org_id_idx         ON property_owners(org_id);
CREATE INDEX IF NOT EXISTS property_owners_org_active_idx     ON property_owners(org_id, is_active);

-- properties — أعمدة جديدة
CREATE INDEX IF NOT EXISTS properties_org_portfolio_idx       ON properties(org_id, portfolio_type);
CREATE INDEX IF NOT EXISTS properties_org_disposal_idx        ON properties(org_id, disposal_status);
CREATE INDEX IF NOT EXISTS properties_owner_id_idx            ON properties(property_owner_id);
CREATE INDEX IF NOT EXISTS properties_org_rer_idx             ON properties(org_id, rer_status);

-- property_documents
CREATE INDEX IF NOT EXISTS property_documents_org_id_idx      ON property_documents(org_id);
CREATE INDEX IF NOT EXISTS property_documents_property_id_idx ON property_documents(property_id);
CREATE INDEX IF NOT EXISTS property_documents_expiry_idx      ON property_documents(org_id, expiry_date);

-- property_valuations
CREATE INDEX IF NOT EXISTS property_valuations_org_id_idx     ON property_valuations(org_id);
CREATE INDEX IF NOT EXISTS property_valuations_property_id_idx ON property_valuations(property_id);

-- property_construction
CREATE INDEX IF NOT EXISTS property_construction_org_id_idx   ON property_construction(org_id);
CREATE INDEX IF NOT EXISTS property_construction_property_idx ON property_construction(property_id);
CREATE INDEX IF NOT EXISTS property_construction_status_idx   ON property_construction(org_id, status);

-- construction_phases
CREATE INDEX IF NOT EXISTS construction_phases_org_id_idx     ON construction_phases(org_id);
CREATE INDEX IF NOT EXISTS construction_phases_const_id_idx   ON construction_phases(construction_id);

-- construction_daily_logs
CREATE INDEX IF NOT EXISTS construction_logs_org_id_idx       ON construction_daily_logs(org_id);
CREATE INDEX IF NOT EXISTS construction_logs_const_id_idx     ON construction_daily_logs(construction_id);
CREATE INDEX IF NOT EXISTS construction_logs_date_idx         ON construction_daily_logs(construction_id, log_date);

-- construction_costs
CREATE INDEX IF NOT EXISTS construction_costs_org_id_idx      ON construction_costs(org_id);
CREATE INDEX IF NOT EXISTS construction_costs_const_id_idx    ON construction_costs(construction_id);
CREATE INDEX IF NOT EXISTS construction_costs_phase_id_idx    ON construction_costs(phase_id);

-- construction_payments
CREATE INDEX IF NOT EXISTS construction_payments_org_id_idx   ON construction_payments(org_id);
CREATE INDEX IF NOT EXISTS construction_payments_const_id_idx ON construction_payments(construction_id);

-- construction_change_orders
CREATE INDEX IF NOT EXISTS construction_co_org_id_idx         ON construction_change_orders(org_id);
CREATE INDEX IF NOT EXISTS construction_co_const_id_idx       ON construction_change_orders(construction_id);

-- property_listings
CREATE INDEX IF NOT EXISTS property_listings_org_id_idx       ON property_listings(org_id);
CREATE INDEX IF NOT EXISTS property_listings_unit_id_idx      ON property_listings(unit_id);
CREATE INDEX IF NOT EXISTS property_listings_status_idx       ON property_listings(org_id, status);

-- property_inquiries
CREATE INDEX IF NOT EXISTS property_inquiries_org_id_idx      ON property_inquiries(org_id);
CREATE INDEX IF NOT EXISTS property_inquiries_listing_id_idx  ON property_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS property_inquiries_status_idx      ON property_inquiries(org_id, status);

-- property_sales
CREATE INDEX IF NOT EXISTS property_sales_org_id_idx          ON property_sales(org_id);
CREATE INDEX IF NOT EXISTS property_sales_property_id_idx     ON property_sales(property_id);
CREATE INDEX IF NOT EXISTS property_sales_status_idx          ON property_sales(org_id, status);
