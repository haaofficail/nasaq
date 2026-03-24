-- Migration 043: invoice_payments table + source_type on invoices

-- Add source_type to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';

-- invoice_payments: track partial/multiple payments per invoice
CREATE TABLE IF NOT EXISTS invoice_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount       NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reference    TEXT,
  notes        TEXT,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoice_payments_invoice_idx ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS invoice_payments_org_idx ON invoice_payments(org_id);
