-- فرض uniqueness على transaction_number داخل نفس المنشأة
-- يمنع التكرار عند retry الشبكة (idempotency)

CREATE UNIQUE INDEX IF NOT EXISTS pos_tx_num_org_uidx
  ON pos_transactions(org_id, transaction_number);
