-- ============================================================
-- 057 — Composite Indexes للأداء
-- يحسّن أداء الـ queries الأكثر شيوعاً في كل منشأة
-- جميع الـ indexes تستخدم لتجنب قفل الجدول
-- ============================================================

-- bookings: أكثر query شيوعاً — فلترة بالمنشأة + ترتيب بالتاريخ
CREATE INDEX IF NOT EXISTS bookings_org_created_idx
  ON bookings (organization_id, created_at DESC);

-- bookings: فلترة بالحالة (pending/confirmed/completed/cancelled)
CREATE INDEX IF NOT EXISTS bookings_org_status_idx
  ON bookings (organization_id, status);

-- customers: قائمة عملاء المنشأة مرتبة بالإضافة
CREATE INDEX IF NOT EXISTS customers_org_created_idx
  ON customers (organization_id, created_at DESC);

-- assets: أصول المنشأة مفلترة بالحالة
CREATE INDEX IF NOT EXISTS assets_org_status_idx
  ON assets (organization_id, status);

-- assets: أصول المنشأة مرتبة بالإضافة
CREATE INDEX IF NOT EXISTS assets_org_created_idx
  ON assets (organization_id, created_at DESC);

-- maintenance_tasks: مهام الصيانة بالمنشأة والحالة
CREATE INDEX IF NOT EXISTS maintenance_tasks_org_status_idx
  ON maintenance_tasks (organization_id, status);

-- services: خدمات المنشأة النشطة
CREATE INDEX IF NOT EXISTS services_org_active_idx
  ON services (organization_id, is_active);

-- sessions: token lookup — أهم index في النظام (كل request يمر به)
-- تأكد أنه موجود (قد يكون موجوداً من migration سابق)
CREATE INDEX IF NOT EXISTS sessions_token_idx
  ON sessions (token);
