-- ── 115: دعم التأجير في طلبات الخدمة ───────────────────────────────
-- يضيف تاريخ ووقت نهاية الحدث لدعم التأجير (من → إلى)

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS event_end_date DATE,
  ADD COLUMN IF NOT EXISTS event_end_time TIME;

COMMENT ON COLUMN service_orders.event_end_date IS 'تاريخ نهاية التأجير / الفعالية';
COMMENT ON COLUMN service_orders.event_end_time IS 'وقت نهاية التأجير / الفعالية';
