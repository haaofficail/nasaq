-- ── 115: دعم التأجير في طلبات الخدمة + ربط الأصول بمكونات الخدمة ──────────
-- يضيف تاريخ ووقت نهاية الحدث لدعم التأجير (من → إلى)

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS event_end_date DATE,
  ADD COLUMN IF NOT EXISTS event_end_time TIME;

COMMENT ON COLUMN service_orders.event_end_date IS 'تاريخ نهاية التأجير / الفعالية';
COMMENT ON COLUMN service_orders.event_end_time IS 'وقت نهاية التأجير / الفعالية';

-- ── إضافة عمود asset_id لمكونات الخدمة ─────────────────────────────────────
-- يربط مكونات الخدمة بالأصول (طاولات، خشب، ستاندات، فازات، إلخ)

ALTER TABLE service_components
  ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

COMMENT ON COLUMN service_components.asset_id IS 'ربط بأصل معين (طاولة، ستاند، فازة...)';

-- تحديث source_type check constraint لتشمل asset
-- لا يوجد constraint حالي على source_type (نص حر) لذلك لا حاجة لحذفه
