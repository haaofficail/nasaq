-- ============================================================
-- Migration 038: Procurement & Suppliers System
-- نظام المشتريات والموردين — أوامر الشراء والاستلام والفواتير
-- ============================================================

-- Enums
CREATE TYPE supplier_status AS ENUM (
  'active', 'inactive', 'blacklisted'
);

CREATE TYPE po_status AS ENUM (
  'draft', 'submitted', 'acknowledged',
  'partially_received', 'received', 'cancelled', 'closed'
);

CREATE TYPE gr_status AS ENUM (
  'pending', 'approved', 'rejected'
);

CREATE TYPE supplier_invoice_status AS ENUM (
  'draft', 'received', 'matched', 'approved', 'paid', 'disputed'
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name                TEXT NOT NULL,
  name_en             TEXT,
  code                TEXT,

  contact_name        TEXT,
  phone               TEXT,
  email               TEXT,
  website             TEXT,

  address             TEXT,
  city                TEXT,
  country             TEXT DEFAULT 'SA',

  tax_number          TEXT,
  bank_name           TEXT,
  bank_iban           TEXT,
  currency            TEXT DEFAULT 'SAR',
  payment_terms_days  INTEGER DEFAULT 30,

  total_orders        INTEGER DEFAULT 0,
  total_spent         NUMERIC(15,2) DEFAULT 0,
  avg_delivery_days   NUMERIC(5,1),
  quality_score       NUMERIC(3,1),
  on_time_rate        NUMERIC(5,2),

  categories          JSONB DEFAULT '[]',
  notes               TEXT,

  status              supplier_status NOT NULL DEFAULT 'active',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_org_code_uidx  ON suppliers(org_id, code) WHERE code IS NOT NULL;
CREATE        INDEX IF NOT EXISTS suppliers_org_status_idx ON suppliers(org_id, status);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id         UUID NOT NULL REFERENCES suppliers(id),
  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,

  po_number           TEXT NOT NULL,
  reference_number    TEXT,

  order_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_delivery   TIMESTAMPTZ,
  actual_delivery     TIMESTAMPTZ,

  subtotal            NUMERIC(15,2) NOT NULL,
  vat_amount          NUMERIC(15,2) DEFAULT 0,
  discount_amount     NUMERIC(15,2) DEFAULT 0,
  total_amount        NUMERIC(15,2) NOT NULL,
  paid_amount         NUMERIC(15,2) DEFAULT 0,
  currency            TEXT DEFAULT 'SAR',

  delivery_address    TEXT,
  delivery_notes      TEXT,
  notes               TEXT,
  internal_notes      TEXT,
  attachments         JSONB DEFAULT '[]',

  status              po_status NOT NULL DEFAULT 'draft',
  created_by          UUID NOT NULL REFERENCES users(id),
  approved_by         UUID REFERENCES users(id),
  approved_at         TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS po_org_number_uidx    ON purchase_orders(org_id, po_number);
CREATE        INDEX IF NOT EXISTS po_org_supplier_idx   ON purchase_orders(org_id, supplier_id);
CREATE        INDEX IF NOT EXISTS po_org_status_idx     ON purchase_orders(org_id, status);
CREATE        INDEX IF NOT EXISTS po_org_date_idx       ON purchase_orders(org_id, order_date);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id               UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  item_name           TEXT NOT NULL,
  item_code           TEXT,
  item_description    TEXT,
  category            TEXT,
  unit                TEXT DEFAULT 'unit',

  ordered_quantity    NUMERIC(10,3) NOT NULL,
  received_quantity   NUMERIC(10,3) DEFAULT 0,

  unit_price          NUMERIC(10,2) NOT NULL,
  discount            NUMERIC(5,2) DEFAULT 0,
  total_price         NUMERIC(15,2) NOT NULL,

  asset_type_id       UUID,
  flower_variant_id   UUID,
  supply_item_id      UUID,

  notes               TEXT,
  line_order          INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS po_items_po_id_idx ON purchase_order_items(po_id);

-- Goods Receipts
CREATE TABLE IF NOT EXISTS goods_receipts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_id         UUID NOT NULL REFERENCES purchase_orders(id),
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  location_id   UUID REFERENCES locations(id) ON DELETE SET NULL,

  gr_number     TEXT NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by   UUID NOT NULL REFERENCES users(id),

  notes         TEXT,
  attachments   JSONB DEFAULT '[]',

  status        gr_status NOT NULL DEFAULT 'pending',
  approved_by   UUID REFERENCES users(id),
  approved_at   TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS gr_org_number_uidx ON goods_receipts(org_id, gr_number);
CREATE        INDEX IF NOT EXISTS gr_po_id_idx       ON goods_receipts(po_id);
CREATE        INDEX IF NOT EXISTS gr_org_date_idx    ON goods_receipts(org_id, received_at);

-- Goods Receipt Items
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_id               UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_item_id          UUID NOT NULL REFERENCES purchase_order_items(id),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  received_quantity   NUMERIC(10,3) NOT NULL,
  accepted_quantity   NUMERIC(10,3) NOT NULL,
  rejected_quantity   NUMERIC(10,3) DEFAULT 0,
  rejection_reason    TEXT,

  quality_notes       TEXT,
  expiry_date         TIMESTAMPTZ,

  stock_updated       BOOLEAN DEFAULT FALSE,

  line_order          INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS gr_items_gr_id_idx    ON goods_receipt_items(gr_id);
CREATE INDEX IF NOT EXISTS gr_items_po_item_idx  ON goods_receipt_items(po_item_id);

-- Supplier Invoices
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  po_id           UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  gr_id           UUID REFERENCES goods_receipts(id) ON DELETE SET NULL,

  invoice_number  TEXT NOT NULL,
  invoice_date    TIMESTAMPTZ NOT NULL,
  due_date        TIMESTAMPTZ,

  subtotal        NUMERIC(15,2) NOT NULL,
  vat_amount      NUMERIC(15,2) DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL,
  paid_amount     NUMERIC(15,2) DEFAULT 0,
  currency        TEXT DEFAULT 'SAR',

  notes           TEXT,
  attachments     JSONB DEFAULT '[]',

  status          supplier_invoice_status NOT NULL DEFAULT 'received',
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS sup_inv_org_number_uidx
  ON supplier_invoices(org_id, supplier_id, invoice_number);
CREATE INDEX IF NOT EXISTS sup_inv_org_supplier_idx ON supplier_invoices(org_id, supplier_id);
CREATE INDEX IF NOT EXISTS sup_inv_org_status_idx   ON supplier_invoices(org_id, status);
CREATE INDEX IF NOT EXISTS sup_inv_due_date_idx     ON supplier_invoices(org_id, due_date);
