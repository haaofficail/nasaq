-- 045: POS split billing support + invoice parent/child
ALTER TABLE pos_transactions
  ADD COLUMN IF NOT EXISTS parent_transaction_id UUID,
  ADD COLUMN IF NOT EXISTS split_type TEXT;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS parent_invoice_id UUID,
  ADD COLUMN IF NOT EXISTS split_type TEXT,
  ADD COLUMN IF NOT EXISTS split_index INTEGER,
  ADD COLUMN IF NOT EXISTS split_total INTEGER;

CREATE INDEX IF NOT EXISTS pos_tx_parent_idx ON pos_transactions(parent_transaction_id) WHERE parent_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS invoices_parent_idx ON invoices(parent_invoice_id) WHERE parent_invoice_id IS NOT NULL;
