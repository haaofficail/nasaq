-- ============================================================
-- Migration 155: Create missing flower shop core tables
-- الجداول كانت موجودة في DB لكنها غائبة من migrations الرسمية.
-- آمن: CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS
-- ============================================================

-- ── 1. flower_packages (الباقات والتنسيقات) ──────────────────
CREATE TABLE IF NOT EXISTS flower_packages (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  slug                 TEXT        NOT NULL,
  description          TEXT,
  image                TEXT,
  category_tag         TEXT        NOT NULL DEFAULT 'general',
  base_price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  components           JSONB       NOT NULL DEFAULT '[]',
  linked_to_inventory  BOOLEAN     NOT NULL DEFAULT false,
  is_active            BOOLEAN     NOT NULL DEFAULT true,
  -- حقول هوامش التكلفة (migration 096)
  items_breakdown      JSONB                DEFAULT '[]',
  calculated_cost      NUMERIC(10,2),
  cost_updated_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flower_packages_org    ON flower_packages(org_id);
CREATE INDEX IF NOT EXISTS idx_flower_packages_active ON flower_packages(org_id) WHERE is_active = true;

-- ── 2. flower_orders (طلبات البيع) ───────────────────────────
CREATE TABLE IF NOT EXISTS flower_orders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_number     TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','preparing','ready',
                                       'out_for_delivery','delivered','cancelled',
                                       'delivery_failed','returned')),
  customer_name    TEXT,
  customer_phone   TEXT,
  customer_id      UUID        REFERENCES customers(id) ON DELETE SET NULL,
  items            JSONB       NOT NULL DEFAULT '[]',
  addons           JSONB                DEFAULT '[]',
  selections       JSONB                DEFAULT '{}',
  subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee     NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_type    TEXT,
  delivery_address JSONB,
  delivery_date    DATE,
  delivery_time    TIMESTAMPTZ,
  gift_message     TEXT,
  packaging        TEXT        NOT NULL DEFAULT 'bouquet',
  packaging_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  recipient_name   TEXT,
  recipient_phone  TEXT,
  is_surprise      BOOLEAN     NOT NULL DEFAULT false,
  order_type       TEXT        NOT NULL DEFAULT 'direct'
                     CHECK (order_type IN ('direct','delivery','gift','pickup','custom')),
  notes            TEXT,
  payment_method   TEXT        NOT NULL DEFAULT 'cash'
                     CHECK (payment_method IN ('cash','card','mada','bank_transfer','online','deferred')),
  paid_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status   TEXT        NOT NULL DEFAULT 'unpaid'
                     CHECK (payment_status IN ('unpaid','partial','paid','refunded')),
  -- financial linkage (migration 117)
  invoice_id       UUID        REFERENCES invoices(id) ON DELETE SET NULL,
  journal_entry_id UUID,
  -- audit fields (migration 117)
  version          INT         NOT NULL DEFAULT 1,
  cancelled_at     TIMESTAMPTZ,
  cancellation_reason TEXT,
  refund_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_method    TEXT,
  refunded_at      TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flower_orders_org         ON flower_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_flower_orders_status      ON flower_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_flower_orders_customer    ON flower_orders(org_id, customer_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flower_orders_delivered   ON flower_orders(org_id, status, delivered_at)
  WHERE status = 'delivered';
CREATE INDEX IF NOT EXISTS idx_flower_orders_customer_id ON flower_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_flower_orders_invoice_id  ON flower_orders(invoice_id);

-- ── 3. flower_builder_items (كتالوج التغليف/الهدايا/التوصيل) ─
CREATE TABLE IF NOT EXISTS flower_builder_items (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('packaging','gift','card','delivery')),
  name       TEXT        NOT NULL,
  name_en    TEXT,
  price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  icon       TEXT,
  image      TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flower_builder_items_org ON flower_builder_items(org_id);
