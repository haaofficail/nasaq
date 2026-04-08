-- ============================================================
-- Migration 112: Flower Operational Hardening
-- يضيف: optimistic locking, ربط العميل/الفاتورة/القيد، state machine
-- ============================================================

-- 1) version column for optimistic locking
ALTER TABLE flower_orders ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- 2) customer_id FK for proper CRM linking
ALTER TABLE flower_orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- 3) invoice_id FK for order → invoice traceability
ALTER TABLE flower_orders ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- 4) journal_entry_id to prevent duplicate financial postings
ALTER TABLE flower_orders ADD COLUMN IF NOT EXISTS journal_entry_id UUID;

-- 5) cancelled_at + cancellation_reason for audit trail
ALTER TABLE flower_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE flower_orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 6) refund tracking
ALTER TABLE flower_orders ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE flower_orders ADD COLUMN IF NOT EXISTS refund_method TEXT;
ALTER TABLE flower_orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- 7) paid_amount for pre-delivery payment tracking
ALTER TABLE flower_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE flower_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- 8) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flower_orders_customer_id ON flower_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_flower_orders_invoice_id ON flower_orders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_flower_orders_version ON flower_orders(id, version);
