-- فهارس pos_transactions لتسريع استعلامات اليوم والإحصاءات
-- pos/today و pos/stats يفلتران على (org_id, created_at) وكانا يعملان بـ table scan

CREATE INDEX IF NOT EXISTS pos_tx_org_date_idx
  ON pos_transactions(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pos_tx_org_status_idx
  ON pos_transactions(org_id, status);
