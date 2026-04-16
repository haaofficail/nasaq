-- 138: Create pos_transactions table if not exists
-- Needed by: POS module (pos.ts), demo seed

CREATE TABLE IF NOT EXISTS pos_transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  transaction_number   TEXT NOT NULL,
  type                 TEXT NOT NULL DEFAULT 'sale',   -- sale | refund | exchange

  customer_id          UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name        TEXT NOT NULL DEFAULT 'زائر',
  customer_phone       TEXT,

  items                JSONB NOT NULL DEFAULT '[]',

  subtotal             NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_type        TEXT,                            -- fixed | percentage | null
  discount_value       NUMERIC(12,2) DEFAULT 0,
  discount_amount      NUMERIC(12,2) DEFAULT 0,
  tax_percent          NUMERIC(5,2)  DEFAULT 15,
  tax_amount           NUMERIC(12,2) DEFAULT 0,
  total_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,

  payments             JSONB NOT NULL DEFAULT '[]',
  change_amount        NUMERIC(12,2) DEFAULT 0,

  notes                TEXT,
  sold_by              UUID REFERENCES users(id) ON DELETE SET NULL,
  sold_by_name         TEXT,
  status               TEXT NOT NULL DEFAULT 'completed',

  invoice_id           UUID,                            -- linked invoice (set after invoice creation)

  -- split billing (migration 045)
  parent_transaction_id UUID,
  split_type           TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pos_transactions_org_number_uq UNIQUE (org_id, transaction_number)
);

CREATE INDEX IF NOT EXISTS pos_transactions_org_idx        ON pos_transactions(org_id);
CREATE INDEX IF NOT EXISTS pos_transactions_org_date_idx   ON pos_transactions(org_id, created_at);
CREATE INDEX IF NOT EXISTS pos_transactions_org_status_idx ON pos_transactions(org_id, status);
CREATE INDEX IF NOT EXISTS pos_transactions_customer_idx   ON pos_transactions(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS pos_tx_parent_idx               ON pos_transactions(parent_transaction_id) WHERE parent_transaction_id IS NOT NULL;
