-- ============================================================
-- 049: Add transfer_name to invoice_payments
--      + Add paidAt to invoices (if missing)
-- ============================================================

ALTER TABLE invoice_payments
  ADD COLUMN IF NOT EXISTS transfer_name TEXT;

-- Ensure paidAt column exists on invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
