-- ============================================================
-- Migration 039: Schema Upgrade — align existing tables with
-- new Drizzle schemas for procurement & events systems.
-- Uses ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS
-- so it is safe to run even if partially applied.
-- ============================================================

-- ============================================================
-- ENUMS (create only if missing)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE po_status AS ENUM (
    'draft','submitted','acknowledged','partially_received','received','cancelled','closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gr_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE supplier_invoice_status AS ENUM (
    'draft','received','matched','approved','paid','disputed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM (
    'draft','published','sold_out','ongoing','completed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_type_status AS ENUM ('active','paused','sold_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_issuance_status AS ENUM ('issued','checked_in','cancelled','transferred');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE seat_status AS ENUM ('available','reserved','sold','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SUPPLIERS — add missing columns
-- ============================================================

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS name_en             TEXT,
  ADD COLUMN IF NOT EXISTS code                TEXT,
  ADD COLUMN IF NOT EXISTS contact_name        TEXT,
  ADD COLUMN IF NOT EXISTS website             TEXT,
  ADD COLUMN IF NOT EXISTS city                TEXT,
  ADD COLUMN IF NOT EXISTS country             TEXT DEFAULT 'SA',
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,
  ADD COLUMN IF NOT EXISTS bank_iban           TEXT,
  ADD COLUMN IF NOT EXISTS currency            TEXT DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS payment_terms_days  INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS total_orders        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent         NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_delivery_days   NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS quality_score       NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS on_time_rate        NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS categories          JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS created_by          UUID REFERENCES users(id);

-- Add status column using the enum (skip if already exists)
DO $$ BEGIN
  ALTER TABLE suppliers ADD COLUMN status supplier_status NOT NULL DEFAULT 'active';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Unique index on (org_id, code) if not present
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_org_code_uidx ON suppliers(org_id, code) WHERE code IS NOT NULL;

-- ============================================================
-- PURCHASE ORDERS — add missing columns
-- ============================================================

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS location_id      UUID REFERENCES locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS expected_delivery TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_delivery   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vat_amount        NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount   NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency          TEXT DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS delivery_address  TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes    TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes    TEXT,
  ADD COLUMN IF NOT EXISTS attachments       JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS approved_by       UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by        UUID REFERENCES users(id);

-- Add supplier_id FK if not already there
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_id_new UUID REFERENCES suppliers(id);
UPDATE purchase_orders SET supplier_id_new = supplier_id WHERE supplier_id_new IS NULL AND supplier_id IS NOT NULL;

-- Rename subtotal (old column 'subtotal' might be different precision — add if not exists)
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS subtotal_new NUMERIC(15,2);
UPDATE purchase_orders SET subtotal_new = COALESCE(subtotal, total_amount) WHERE subtotal_new IS NULL;

-- Use po_status enum for status (add new column, migrate, drop after)
DO $$ BEGIN
  ALTER TABLE purchase_orders ADD COLUMN status_new po_status NOT NULL DEFAULT 'draft';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

UPDATE purchase_orders SET status_new = CASE
  WHEN status = 'pending'   THEN 'submitted'::po_status
  WHEN status = 'received'  THEN 'received'::po_status
  WHEN status = 'cancelled' THEN 'cancelled'::po_status
  ELSE 'draft'::po_status
END WHERE status_new = 'draft' AND status IS NOT NULL;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS po_org_number_uidx  ON purchase_orders(org_id, po_number);
CREATE        INDEX IF NOT EXISTS po_org_supplier_idx  ON purchase_orders(org_id, supplier_id);
CREATE        INDEX IF NOT EXISTS po_org_status_idx    ON purchase_orders(org_id, (status_new::text));

-- ============================================================
-- PURCHASE ORDER ITEMS — add missing columns
-- ============================================================

ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS po_id              UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS item_code          TEXT,
  ADD COLUMN IF NOT EXISTS item_description   TEXT,
  ADD COLUMN IF NOT EXISTS category           TEXT,
  ADD COLUMN IF NOT EXISTS ordered_quantity   NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS unit_price         NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discount           NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price        NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS asset_type_id      UUID,
  ADD COLUMN IF NOT EXISTS flower_variant_id  UUID,
  ADD COLUMN IF NOT EXISTS supply_item_id     UUID,
  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS line_order         INTEGER DEFAULT 0;

-- Populate po_id from purchase_order_id for existing rows
UPDATE purchase_order_items
SET po_id = purchase_order_id
WHERE po_id IS NULL AND purchase_order_id IS NOT NULL;

-- Populate ordered_quantity / unit_price / total_price from old columns
UPDATE purchase_order_items SET
  ordered_quantity = COALESCE(quantity_ordered, quantity),
  unit_price       = unit_cost,
  total_price      = total_cost
WHERE ordered_quantity IS NULL;

CREATE INDEX IF NOT EXISTS po_items_po_id_idx ON purchase_order_items(po_id);

-- ============================================================
-- GOODS RECEIPTS
-- ============================================================

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

-- ============================================================
-- GOODS RECEIPT ITEMS
-- ============================================================

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

CREATE INDEX IF NOT EXISTS gr_items_gr_id_idx   ON goods_receipt_items(gr_id);
CREATE INDEX IF NOT EXISTS gr_items_po_item_idx ON goods_receipt_items(po_item_id);

-- ============================================================
-- SUPPLIER INVOICES
-- ============================================================

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

-- ============================================================
-- EVENTS (new table — separate from old ticket_events)
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,

  name                TEXT NOT NULL,
  name_en             TEXT,
  description         TEXT,
  cover_image         TEXT,

  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,
  doors_open_at       TIMESTAMPTZ,

  venue_name          TEXT,
  venue_address       TEXT,
  venue_city          TEXT,
  venue_map_url       TEXT,

  total_capacity      INTEGER,
  sold_tickets        INTEGER NOT NULL DEFAULT 0,
  reserved_tickets    INTEGER NOT NULL DEFAULT 0,

  min_price           NUMERIC(10,2),
  max_price           NUMERIC(10,2),

  has_seating         BOOLEAN DEFAULT FALSE,
  allow_transfer      BOOLEAN DEFAULT FALSE,
  requires_approval   BOOLEAN DEFAULT FALSE,

  tags                JSONB DEFAULT '[]',
  age_restriction     INTEGER,

  status              event_status NOT NULL DEFAULT 'draft',

  created_by          UUID REFERENCES users(id),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_org_id_idx        ON events(org_id);
CREATE INDEX IF NOT EXISTS events_org_status_idx    ON events(org_id, status);
CREATE INDEX IF NOT EXISTS events_org_starts_at_idx ON events(org_id, starts_at);

-- ============================================================
-- TICKET TYPES — add missing columns to existing table
-- (existing table references ticket_events; we add new columns
--  for events references too)
-- ============================================================

ALTER TABLE ticket_types
  ADD COLUMN IF NOT EXISTS event_id_new       UUID REFERENCES events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS total_quantity     INTEGER,
  ADD COLUMN IF NOT EXISTS sold_quantity      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_quantity  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_per_order      INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS min_per_order      INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sale_starts_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sale_ends_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seat_section_id    UUID,
  ADD COLUMN IF NOT EXISTS sort_order         INTEGER DEFAULT 0;

-- Populate total_quantity from old max_quantity
UPDATE ticket_types SET total_quantity = max_quantity WHERE total_quantity IS NULL AND max_quantity IS NOT NULL;

-- Add ticket_type_status column
DO $$ BEGIN
  ALTER TABLE ticket_types ADD COLUMN tt_status ticket_type_status NOT NULL DEFAULT 'active';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================
-- SEAT SECTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS seat_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  name_en       TEXT,
  color         TEXT,
  row_count     INTEGER,
  seats_per_row INTEGER,
  total_seats   INTEGER,
  sort_order    INTEGER DEFAULT 0,

  position_x    NUMERIC(8,2),
  position_y    NUMERIC(8,2),
  width         NUMERIC(8,2),
  height        NUMERIC(8,2),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seat_sections_event_idx ON seat_sections(event_id);

-- ============================================================
-- SEATS
-- ============================================================

CREATE TABLE IF NOT EXISTS seats (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  section_id            UUID NOT NULL REFERENCES seat_sections(id) ON DELETE CASCADE,

  row                   TEXT NOT NULL,
  number                INTEGER NOT NULL,
  label                 TEXT,

  status                seat_status NOT NULL DEFAULT 'available',

  held_until            TIMESTAMPTZ,
  held_by_customer_id   UUID,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS seats_event_section_row_num_uidx
  ON seats(event_id, section_id, row, number);
CREATE INDEX IF NOT EXISTS seats_event_status_idx ON seats(event_id, status);

-- ============================================================
-- TICKET ISSUANCES
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_issuances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id        UUID NOT NULL REFERENCES ticket_types(id),
  booking_id            UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  seat_id               UUID REFERENCES seats(id) ON DELETE SET NULL,

  ticket_number         TEXT NOT NULL,
  qr_code               TEXT NOT NULL,
  barcode               TEXT,

  attendee_name         TEXT,
  attendee_phone        TEXT,
  attendee_email        TEXT,

  paid_price            NUMERIC(10,2) NOT NULL,
  vat_amount            NUMERIC(10,2) DEFAULT 0,

  checked_in_at         TIMESTAMPTZ,
  checked_in_by         UUID REFERENCES users(id) ON DELETE SET NULL,

  transferred_from_id   UUID,
  transferred_at        TIMESTAMPTZ,

  status                ticket_issuance_status NOT NULL DEFAULT 'issued',

  issued_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ticket_issuances_qr_uidx
  ON ticket_issuances(qr_code);
CREATE UNIQUE INDEX IF NOT EXISTS ticket_issuances_number_uidx
  ON ticket_issuances(org_id, ticket_number);
CREATE INDEX IF NOT EXISTS ticket_issuances_event_idx    ON ticket_issuances(event_id);
CREATE INDEX IF NOT EXISTS ticket_issuances_booking_idx  ON ticket_issuances(booking_id);
CREATE INDEX IF NOT EXISTS ticket_issuances_customer_idx ON ticket_issuances(customer_id);
CREATE INDEX IF NOT EXISTS ticket_issuances_status_idx   ON ticket_issuances(event_id, status);
