-- Migration 103: إضافة asset_category لبنود طلبات الخدمة
-- يسمح بتسجيل تصنيف الأصل المطلوب من القالب (blueprint)
-- بدون ربط بـ instance محدد من المخزون

ALTER TABLE service_order_items
  ADD COLUMN IF NOT EXISTS asset_category TEXT;

-- index للبحث/التجميع حسب تصنيف الأصل
CREATE INDEX IF NOT EXISTS idx_service_order_items_asset_category
  ON service_order_items(asset_category) WHERE asset_category IS NOT NULL;
