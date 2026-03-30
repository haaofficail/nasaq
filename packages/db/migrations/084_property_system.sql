-- Migration 084: Property Management System

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE property_type AS ENUM ('residential','commercial','mixed','land','industrial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE unit_type AS ENUM ('apartment','office','shop','warehouse','studio','parking','room','villa','duplex','penthouse');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE unit_status AS ENUM ('vacant','occupied','reserved','maintenance','under_renovation','sold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE furnishing_type AS ENUM ('unfurnished','semi_furnished','fully_furnished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lease_contract_type AS ENUM ('monthly','quarterly','semi_annual','annual','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lease_payment_frequency AS ENUM ('monthly','quarterly','semi_annual','annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deposit_status AS ENUM ('pending','paid','partial','returned','deducted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ejar_status AS ENUM ('not_submitted','pending','documented','rejected','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lease_contract_status AS ENUM ('draft','pending_signature','active','expired','terminated','renewed','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lease_invoice_status AS ENUM ('draft','pending','sent','paid','partial','overdue','cancelled','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lease_payment_method AS ENUM ('cash','bank_transfer','cheque','ejar_sadad','mada','visa','apple_pay','stc_pay','tabby','tamara','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lease_payment_source AS ENUM ('direct','via_ejar','online_portal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_expense_category AS ENUM ('maintenance','insurance','government_fees','municipality','utilities','management_fee','marketing','legal','renovation','cleaning','security','elevator','garden','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_maintenance_category AS ENUM ('plumbing','electrical','ac_heating','painting','carpentry','structural','appliance','pest_control','elevator','parking','roof_leak','water_heater','intercom','general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_maintenance_priority AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_maintenance_status AS ENUM ('reported','reviewed','quoted','approved','assigned','in_progress','completed','verified','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_inspection_type AS ENUM ('move_in','move_out','periodic','pre_renovation','post_renovation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inspection_overall_rating AS ENUM ('excellent','good','fair','poor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE maintenance_reporter_type AS ENUM ('tenant','manager','inspector','owner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lease_reminder_type AS ENUM ('invoice_upcoming','invoice_overdue','contract_expiring','contract_renewal','maintenance_scheduled','inspection_due','ejar_not_documented','deposit_return','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lease_reminder_channel AS ENUM ('whatsapp','sms','email','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lease_reminder_status AS ENUM ('pending','sent','delivered','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS property_contract_seq START 1;
CREATE SEQUENCE IF NOT EXISTS property_invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS property_payment_seq START 1;
CREATE SEQUENCE IF NOT EXISTS property_expense_seq START 1;
CREATE SEQUENCE IF NOT EXISTS property_maintenance_seq START 1;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS properties (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  type                property_type NOT NULL DEFAULT 'residential',
  address             TEXT,
  city                TEXT,
  district            TEXT,
  postal_code         TEXT,
  location_lat        NUMERIC(10,7),
  location_lng        NUMERIC(10,7),
  total_units         INTEGER DEFAULT 0,
  total_floors        INTEGER,
  build_year          INTEGER,
  plot_area_sqm       NUMERIC(12,2),
  built_area_sqm      NUMERIC(12,2),
  license_number      TEXT,
  deed_number         TEXT,
  owner_name          TEXT,
  owner_national_id   TEXT,
  cover_image_url     TEXT,
  notes               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_units (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number           TEXT NOT NULL,
  floor                 INTEGER,
  type                  unit_type NOT NULL DEFAULT 'apartment',
  area_sqm              NUMERIC(10,2),
  bedrooms              INTEGER DEFAULT 0,
  bathrooms             INTEGER DEFAULT 0,
  living_rooms          INTEGER DEFAULT 0,
  has_balcony           BOOLEAN DEFAULT FALSE,
  has_kitchen           BOOLEAN DEFAULT FALSE,
  has_maid_room         BOOLEAN DEFAULT FALSE,
  has_pool              BOOLEAN DEFAULT FALSE,
  monthly_rent          NUMERIC(12,2),
  yearly_rent           NUMERIC(12,2),
  deposit_amount        NUMERIC(12,2),
  electricity_meter     TEXT,
  water_meter           TEXT,
  gas_meter             TEXT,
  status                unit_status NOT NULL DEFAULT 'vacant',
  furnishing            furnishing_type DEFAULT 'unfurnished',
  amenities             JSONB,
  photos                JSONB,
  last_inspection_date  DATE,
  notes                 TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id               UUID REFERENCES customers(id) ON DELETE SET NULL,
  national_id               TEXT,
  iqama_number              TEXT,
  nationality               TEXT,
  passport_number           TEXT,
  company_name              TEXT,
  commercial_registration   TEXT,
  vat_number                TEXT,
  emergency_contact_name    TEXT,
  emergency_contact_phone   TEXT,
  emergency_relation        TEXT,
  bank_name                 TEXT,
  iban                      TEXT,
  notes                     TEXT,
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lease_contracts (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_number           TEXT NOT NULL,
  property_id               UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_id                   UUID REFERENCES property_units(id) ON DELETE SET NULL,
  tenant_id                 UUID REFERENCES tenants(id) ON DELETE SET NULL,
  start_date                DATE NOT NULL,
  end_date                  DATE NOT NULL,
  contract_type             lease_contract_type NOT NULL DEFAULT 'annual',
  rent_amount               NUMERIC(12,2) NOT NULL,
  payment_frequency         lease_payment_frequency NOT NULL DEFAULT 'monthly',
  deposit_amount            NUMERIC(12,2) DEFAULT 0,
  deposit_status            deposit_status DEFAULT 'pending',
  deposit_returned_amount   NUMERIC(12,2),
  deposit_deduction_reason  TEXT,
  includes_electricity      BOOLEAN DEFAULT FALSE,
  includes_water            BOOLEAN DEFAULT FALSE,
  includes_ac               BOOLEAN DEFAULT FALSE,
  includes_internet         BOOLEAN DEFAULT FALSE,
  includes_parking          BOOLEAN DEFAULT FALSE,
  parking_spots             INTEGER DEFAULT 0,
  ejar_contract_number      TEXT,
  ejar_status               ejar_status DEFAULT 'not_submitted',
  ejar_documented_at        TIMESTAMPTZ,
  ejar_expires_at           TIMESTAMPTZ,
  ejar_notes                TEXT,
  auto_renew                BOOLEAN DEFAULT TRUE,
  renewal_notice_days       INTEGER DEFAULT 60,
  renewed_from_id           UUID,
  renewal_rent_increase     NUMERIC(5,2) DEFAULT 0,
  status                    lease_contract_status NOT NULL DEFAULT 'draft',
  termination_reason        TEXT,
  termination_date          DATE,
  terminated_by             TEXT,
  attachments               JSONB,
  internal_notes            TEXT,
  created_by                UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lease_invoices (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id                 UUID NOT NULL REFERENCES lease_contracts(id) ON DELETE CASCADE,
  invoice_number              TEXT NOT NULL,
  period_start                DATE NOT NULL,
  period_end                  DATE NOT NULL,
  period_label                TEXT,
  rent_amount                 NUMERIC(12,2) NOT NULL,
  service_charge              NUMERIC(12,2) DEFAULT 0,
  parking_fee                 NUMERIC(12,2) DEFAULT 0,
  other_charges               NUMERIC(12,2) DEFAULT 0,
  other_charges_description   TEXT,
  subtotal                    NUMERIC(12,2) NOT NULL,
  vat_rate                    NUMERIC(5,2) DEFAULT 0,
  vat_amount                  NUMERIC(12,2) DEFAULT 0,
  total_amount                NUMERIC(12,2) NOT NULL,
  status                      lease_invoice_status NOT NULL DEFAULT 'draft',
  due_date                    DATE NOT NULL,
  paid_at                     TIMESTAMPTZ,
  paid_amount                 NUMERIC(12,2) DEFAULT 0,
  reminder_sent_at            TIMESTAMPTZ,
  overdue_notice_sent_at      TIMESTAMPTZ,
  second_reminder_sent_at     TIMESTAMPTZ,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lease_payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id              UUID REFERENCES lease_invoices(id) ON DELETE SET NULL,
  contract_id             UUID NOT NULL REFERENCES lease_contracts(id) ON DELETE CASCADE,
  receipt_number          TEXT NOT NULL,
  amount                  NUMERIC(12,2) NOT NULL,
  method                  lease_payment_method NOT NULL DEFAULT 'cash',
  payment_source          lease_payment_source DEFAULT 'direct',
  cheque_number           TEXT,
  cheque_date             DATE,
  bank_name               TEXT,
  transfer_reference      TEXT,
  gateway_transaction_id  TEXT,
  paid_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by             TEXT,
  approved_by             TEXT,
  notes                   TEXT,
  receipt_url             TEXT,
  is_reconciled           BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_expenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id           UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_id               UUID REFERENCES property_units(id) ON DELETE SET NULL,
  contract_id           UUID REFERENCES lease_contracts(id) ON DELETE SET NULL,
  expense_number        TEXT NOT NULL,
  category              property_expense_category NOT NULL DEFAULT 'maintenance',
  description           TEXT NOT NULL,
  amount                NUMERIC(12,2) NOT NULL,
  vat_amount            NUMERIC(12,2) DEFAULT 0,
  paid_to               TEXT,
  paid_to_phone         TEXT,
  paid_at               DATE,
  payment_method        TEXT,
  receipt_url           TEXT,
  charge_to_owner       BOOLEAN DEFAULT TRUE,
  charge_to_tenant      BOOLEAN DEFAULT FALSE,
  is_recurring          BOOLEAN DEFAULT FALSE,
  recurring_frequency   TEXT,
  approved_by           TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_maintenance (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id         UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_id             UUID REFERENCES property_units(id) ON DELETE SET NULL,
  contract_id         UUID REFERENCES lease_contracts(id) ON DELETE SET NULL,
  ticket_number       TEXT NOT NULL,
  reported_by         maintenance_reporter_type DEFAULT 'tenant',
  reporter_name       TEXT,
  reporter_phone      TEXT,
  category            property_maintenance_category NOT NULL DEFAULT 'general',
  title               TEXT NOT NULL,
  description         TEXT,
  photos              JSONB,
  priority            property_maintenance_priority NOT NULL DEFAULT 'normal',
  status              property_maintenance_status NOT NULL DEFAULT 'reported',
  assigned_to         TEXT,
  assigned_company    TEXT,
  assigned_phone      TEXT,
  estimated_cost      NUMERIC(12,2),
  quoted_cost         NUMERIC(12,2),
  approved_cost       NUMERIC(12,2),
  actual_cost         NUMERIC(12,2),
  scheduled_date      DATE,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  completion_photos   JSONB,
  tenant_rating       INTEGER,
  tenant_feedback     TEXT,
  warranty_days       INTEGER,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_inspections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id         UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_id             UUID REFERENCES property_units(id) ON DELETE SET NULL,
  contract_id         UUID REFERENCES lease_contracts(id) ON DELETE SET NULL,
  type                property_inspection_type NOT NULL DEFAULT 'periodic',
  inspection_date     DATE NOT NULL,
  inspected_by        TEXT,
  condition           JSONB,
  overall_rating      inspection_overall_rating,
  general_notes       TEXT,
  photos              JSONB,
  tenant_signature    TEXT,
  manager_signature   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lease_reminders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id       UUID REFERENCES lease_contracts(id) ON DELETE CASCADE,
  invoice_id        UUID REFERENCES lease_invoices(id) ON DELETE SET NULL,
  reminder_type     lease_reminder_type NOT NULL,
  channel           lease_reminder_channel DEFAULT 'whatsapp',
  recipient         TEXT,
  recipient_phone   TEXT,
  recipient_email   TEXT,
  message           TEXT,
  sent_at           TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  status            lease_reminder_status NOT NULL DEFAULT 'pending',
  scheduled_for     TIMESTAMPTZ,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS properties_org_id_idx         ON properties(org_id);
CREATE INDEX IF NOT EXISTS properties_org_type_idx       ON properties(org_id, type);
CREATE INDEX IF NOT EXISTS properties_org_active_idx     ON properties(org_id, is_active);

CREATE INDEX IF NOT EXISTS property_units_org_id_idx     ON property_units(org_id);
CREATE INDEX IF NOT EXISTS property_units_property_id_idx ON property_units(property_id);
CREATE INDEX IF NOT EXISTS property_units_org_status_idx ON property_units(org_id, status);

CREATE INDEX IF NOT EXISTS tenants_org_id_idx            ON tenants(org_id);
CREATE INDEX IF NOT EXISTS tenants_org_customer_idx      ON tenants(org_id, customer_id);

CREATE INDEX IF NOT EXISTS lease_contracts_org_id_idx    ON lease_contracts(org_id);
CREATE INDEX IF NOT EXISTS lease_contracts_org_status_idx ON lease_contracts(org_id, status);
CREATE INDEX IF NOT EXISTS lease_contracts_unit_id_idx   ON lease_contracts(unit_id);
CREATE INDEX IF NOT EXISTS lease_contracts_tenant_id_idx ON lease_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS lease_contracts_org_ejar_idx  ON lease_contracts(org_id, ejar_status);

CREATE INDEX IF NOT EXISTS lease_invoices_org_id_idx     ON lease_invoices(org_id);
CREATE INDEX IF NOT EXISTS lease_invoices_contract_id_idx ON lease_invoices(contract_id);
CREATE INDEX IF NOT EXISTS lease_invoices_org_status_idx ON lease_invoices(org_id, status);
CREATE INDEX IF NOT EXISTS lease_invoices_org_due_date_idx ON lease_invoices(org_id, due_date);

CREATE INDEX IF NOT EXISTS lease_payments_org_id_idx     ON lease_payments(org_id);
CREATE INDEX IF NOT EXISTS lease_payments_contract_id_idx ON lease_payments(contract_id);
CREATE INDEX IF NOT EXISTS lease_payments_invoice_id_idx ON lease_payments(invoice_id);

CREATE INDEX IF NOT EXISTS property_expenses_org_id_idx  ON property_expenses(org_id);
CREATE INDEX IF NOT EXISTS property_expenses_property_id_idx ON property_expenses(property_id);
CREATE INDEX IF NOT EXISTS property_expenses_org_category_idx ON property_expenses(org_id, category);

CREATE INDEX IF NOT EXISTS property_maintenance_org_id_idx ON property_maintenance(org_id);
CREATE INDEX IF NOT EXISTS property_maintenance_property_id_idx ON property_maintenance(property_id);
CREATE INDEX IF NOT EXISTS property_maintenance_org_status_idx ON property_maintenance(org_id, status);
CREATE INDEX IF NOT EXISTS property_maintenance_org_priority_idx ON property_maintenance(org_id, priority);

CREATE INDEX IF NOT EXISTS property_inspections_org_id_idx ON property_inspections(org_id);
CREATE INDEX IF NOT EXISTS property_inspections_unit_id_idx ON property_inspections(unit_id);
CREATE INDEX IF NOT EXISTS property_inspections_contract_id_idx ON property_inspections(contract_id);

CREATE INDEX IF NOT EXISTS lease_reminders_org_id_idx    ON lease_reminders(org_id);
CREATE INDEX IF NOT EXISTS lease_reminders_contract_id_idx ON lease_reminders(contract_id);
CREATE INDEX IF NOT EXISTS lease_reminders_org_status_idx ON lease_reminders(org_id, status);
