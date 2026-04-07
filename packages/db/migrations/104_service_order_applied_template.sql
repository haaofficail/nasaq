-- Migration 104: تتبع القالب المُطبَّق على طلب الخدمة
-- applied_template_id = القالب الذي طُبِّق فعلياً عند إنشاء الطلب أو عبر apply-package
-- يختلف عن services.template_id (القالب الافتراضي للخدمة) —
--   هذا هو ما طُبِّق بالفعل على هذا الطلب تحديداً.

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS applied_template_id UUID
    REFERENCES event_package_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_orders_applied_template
  ON service_orders(applied_template_id) WHERE applied_template_id IS NOT NULL;
