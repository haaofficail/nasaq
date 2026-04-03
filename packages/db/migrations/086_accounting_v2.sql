-- ============================================================
-- Migration 086: Accounting V2 — Cost Centers, Fixed Assets,
-- Vendors, Procurement, Bank Reconciliation, Budgets
-- ============================================================

-- ============================================================
-- New Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE cost_center_type AS ENUM ('branch','department','project','property','vehicle','employee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fixed_asset_category AS ENUM ('land','building','vehicle','furniture','equipment','computer','machinery','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fixed_asset_status AS ENUM ('active','disposed','sold','fully_depreciated','maintenance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE depreciation_method AS ENUM ('straight_line','declining_balance','units_of_production');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vendor_status AS ENUM ('active','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE purchase_order_status AS ENUM ('draft','sent','confirmed','partial_received','received','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE purchase_invoice_status AS ENUM ('pending','partial','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE purchase_payment_method AS ENUM ('cash','bank_transfer','cheque');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE budget_status AS ENUM ('draft','active','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- cost_centers (must exist before journal_entry_lines FK)
-- ============================================================

CREATE TABLE IF NOT EXISTS cost_centers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code           TEXT        NOT NULL,
  name           TEXT        NOT NULL,
  name_en        TEXT,
  parent_id      UUID        REFERENCES cost_centers(id) ON DELETE SET NULL,
  type           cost_center_type NOT NULL,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cost_centers_org_code_idx  ON cost_centers(org_id, code);
CREATE        INDEX IF NOT EXISTS cost_centers_org_id_idx    ON cost_centers(org_id);
CREATE        INDEX IF NOT EXISTS cost_centers_parent_id_idx ON cost_centers(parent_id);

-- ============================================================
-- Modify chart_of_accounts — add new columns
-- ============================================================

ALTER TABLE chart_of_accounts
  ADD COLUMN IF NOT EXISTS currency        TEXT    NOT NULL DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS is_bank_account BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bank_name       TEXT,
  ADD COLUMN IF NOT EXISTS bank_iban       TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch     TEXT,
  ADD COLUMN IF NOT EXISTS is_cash_account BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS budget_amount   NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS notes           TEXT;

-- ============================================================
-- Modify journal_entry_lines — add cost_center_id FK
-- ============================================================

ALTER TABLE journal_entry_lines
  ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS jel_cost_center_idx ON journal_entry_lines(cost_center_id);

-- ============================================================
-- fixed_assets — الأصول الثابتة
-- ============================================================

CREATE TABLE IF NOT EXISTS fixed_assets (
  id                       UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_code               TEXT             NOT NULL,
  name                     TEXT             NOT NULL,
  name_en                  TEXT,
  description              TEXT,
  category                 fixed_asset_category NOT NULL,
  account_id               UUID             REFERENCES chart_of_accounts(id),
  depreciation_account_id  UUID             REFERENCES chart_of_accounts(id),
  expense_account_id       UUID             REFERENCES chart_of_accounts(id),
  cost_center_id           UUID             REFERENCES cost_centers(id) ON DELETE SET NULL,
  purchase_date            DATE,
  purchase_price           NUMERIC(15,2),
  purchase_invoice         TEXT,
  vendor_name              TEXT,
  warranty_end_date        DATE,
  useful_life_months       INTEGER,
  salvage_value            NUMERIC(15,2)    DEFAULT 0,
  depreciation_method      depreciation_method DEFAULT 'straight_line',
  monthly_depreciation     NUMERIC(15,2)    DEFAULT 0,
  accumulated_depreciation NUMERIC(15,2)    DEFAULT 0,
  net_book_value           NUMERIC(15,2)    DEFAULT 0,
  status                   fixed_asset_status DEFAULT 'active',
  disposal_date            DATE,
  disposal_price           NUMERIC(15,2),
  disposal_reason          TEXT,
  location                 TEXT,
  assigned_to              TEXT,
  serial_number            TEXT,
  barcode                  TEXT,
  photos                   JSONB,
  notes                    TEXT,
  created_at               TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE        INDEX IF NOT EXISTS fa_org_id_idx     ON fixed_assets(org_id);
CREATE        INDEX IF NOT EXISTS fa_org_status_idx ON fixed_assets(org_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS fa_org_code_idx   ON fixed_assets(org_id, asset_code);

-- ============================================================
-- asset_depreciation_entries — قيود استهلاك الأصول
-- ============================================================

CREATE TABLE IF NOT EXISTS asset_depreciation_entries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id          UUID        NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  journal_entry_id  UUID        REFERENCES journal_entries(id),
  depreciation_date DATE        NOT NULL,
  amount            NUMERIC(15,2) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ade_asset_id_idx  ON asset_depreciation_entries(asset_id);
CREATE INDEX IF NOT EXISTS ade_org_date_idx  ON asset_depreciation_entries(org_id, depreciation_date);

-- ============================================================
-- vendors — الموردون
-- ============================================================

CREATE TABLE IF NOT EXISTS vendors (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                    TEXT        NOT NULL,
  contact_person          TEXT,
  phone                   TEXT,
  email                   TEXT,
  vat_number              TEXT,
  commercial_registration TEXT,
  bank_name               TEXT,
  iban                    TEXT,
  address                 TEXT,
  city                    TEXT,
  category                TEXT,
  rating                  INTEGER,
  notes                   TEXT,
  is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vendors_org_id_idx ON vendors(org_id);

-- ============================================================
-- purchase_orders — أوامر الشراء
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id                     UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 UUID                  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_number              TEXT                  NOT NULL,
  vendor_id              UUID                  REFERENCES vendors(id),
  cost_center_id         UUID                  REFERENCES cost_centers(id) ON DELETE SET NULL,
  order_date             DATE                  NOT NULL,
  expected_delivery_date DATE,
  delivered_date         DATE,
  status                 purchase_order_status DEFAULT 'draft',
  subtotal               NUMERIC(15,2)         DEFAULT 0,
  vat_amount             NUMERIC(15,2)         DEFAULT 0,
  total_amount           NUMERIC(15,2)         DEFAULT 0,
  notes                  TEXT,
  approved_by            UUID                  REFERENCES users(id),
  created_by             UUID                  REFERENCES users(id),
  created_at             TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE        INDEX IF NOT EXISTS po_org_id_idx     ON purchase_orders(org_id);
CREATE        INDEX IF NOT EXISTS po_org_status_idx ON purchase_orders(org_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS po_org_number_idx ON purchase_orders(org_id, po_number);

-- ============================================================
-- purchase_order_items — بنود أوامر الشراء
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_id             UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  description       TEXT          NOT NULL,
  quantity          NUMERIC(10,2) DEFAULT 1,
  unit_price        NUMERIC(15,2) NOT NULL,
  total_price       NUMERIC(15,2) NOT NULL,
  vat_rate          NUMERIC(5,2)  DEFAULT 15,
  received_quantity NUMERIC(10,2) DEFAULT 0,
  account_id        UUID          REFERENCES chart_of_accounts(id),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS poi_po_id_idx ON purchase_order_items(po_id);

-- ============================================================
-- purchase_invoices — فواتير الشراء
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id              UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID                     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number  TEXT                     NOT NULL,
  vendor_id       UUID                     REFERENCES vendors(id),
  po_id           UUID                     REFERENCES purchase_orders(id),
  invoice_date    DATE                     NOT NULL,
  due_date        DATE,
  subtotal        NUMERIC(15,2)            NOT NULL DEFAULT 0,
  vat_amount      NUMERIC(15,2)            NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2)            NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(15,2)            NOT NULL DEFAULT 0,
  status          purchase_invoice_status  DEFAULT 'pending',
  zatca_qr_code   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pinv_org_id_idx     ON purchase_invoices(org_id);
CREATE INDEX IF NOT EXISTS pinv_org_status_idx ON purchase_invoices(org_id, status);
CREATE INDEX IF NOT EXISTS pinv_vendor_id_idx  ON purchase_invoices(vendor_id);

-- ============================================================
-- purchase_payments — مدفوعات الموردين
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_payments (
  id               UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID                     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id       UUID                     REFERENCES purchase_invoices(id),
  vendor_id        UUID                     REFERENCES vendors(id),
  amount           NUMERIC(15,2)            NOT NULL,
  method           purchase_payment_method  DEFAULT 'bank_transfer',
  cheque_number    TEXT,
  bank_reference   TEXT,
  paid_at          TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  approved_by      TEXT,
  notes            TEXT,
  journal_entry_id UUID                     REFERENCES journal_entries(id),
  created_at       TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ppay_org_id_idx     ON purchase_payments(org_id);
CREATE INDEX IF NOT EXISTS ppay_invoice_id_idx ON purchase_payments(invoice_id);

-- ============================================================
-- bank_transactions — حركات البنك
-- ============================================================

CREATE TABLE IF NOT EXISTS bank_transactions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bank_account_id     UUID        REFERENCES chart_of_accounts(id),
  transaction_date    DATE        NOT NULL,
  value_date          DATE,
  description         TEXT        NOT NULL,
  reference           TEXT,
  debit_amount        NUMERIC(15,2) DEFAULT 0,
  credit_amount       NUMERIC(15,2) DEFAULT 0,
  balance             NUMERIC(15,2),
  is_reconciled       BOOLEAN     NOT NULL DEFAULT FALSE,
  reconciled_with_id  UUID,
  import_batch        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bt_org_id_idx         ON bank_transactions(org_id);
CREATE INDEX IF NOT EXISTS bt_org_account_idx    ON bank_transactions(org_id, bank_account_id);
CREATE INDEX IF NOT EXISTS bt_org_reconciled_idx ON bank_transactions(org_id, is_reconciled);

-- ============================================================
-- budgets — الموازنات
-- ============================================================

CREATE TABLE IF NOT EXISTS budgets (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT          NOT NULL,
  period_start DATE          NOT NULL,
  period_end   DATE          NOT NULL,
  status       budget_status DEFAULT 'draft',
  notes        TEXT,
  created_by   UUID          REFERENCES users(id),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS budgets_org_id_idx ON budgets(org_id);

-- ============================================================
-- budget_lines — سطور الموازنة
-- ============================================================

CREATE TABLE IF NOT EXISTS budget_lines (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  budget_id        UUID          NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id       UUID          REFERENCES chart_of_accounts(id),
  cost_center_id   UUID          REFERENCES cost_centers(id) ON DELETE SET NULL,
  month            DATE          NOT NULL,
  budget_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  variance_percent NUMERIC(8,2)  DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bl_budget_id_idx   ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS bl_org_account_idx ON budget_lines(org_id, account_id);

-- ============================================================
-- Sequences for auto-generated codes
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS cost_center_seq   START 1;
CREATE SEQUENCE IF NOT EXISTS fixed_asset_seq   START 1;
CREATE SEQUENCE IF NOT EXISTS purchase_order_seq START 1;
CREATE SEQUENCE IF NOT EXISTS budget_seq        START 1;
