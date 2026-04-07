-- ── 110: order_kind — تصنيف الطلب (sale | booking | project) ──────────────────
-- يُستخدم لعرض التفاصيل المناسبة في واجهة الطلب

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS order_kind TEXT NOT NULL DEFAULT 'project'
    CHECK (order_kind IN ('sale', 'booking', 'project'));

CREATE INDEX IF NOT EXISTS idx_service_orders_kind
  ON service_orders(org_id, order_kind);
