-- migration 120: salon monitoring events table
-- جدول خفيف لتخزين أحداث المراقبة القابلة للاستعلام
-- يُمكّن ملخص المراقبة من عرض: رفض التعارض، فشل المخزون، أخطاء DB

CREATE TABLE IF NOT EXISTS salon_monitoring_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  booking_id  UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sme_org_type_idx    ON salon_monitoring_events (org_id, event_type);
CREATE INDEX IF NOT EXISTS sme_org_created_idx ON salon_monitoring_events (org_id, created_at);
