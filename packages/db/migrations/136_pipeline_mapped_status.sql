-- ============================================================
-- Migration 136: Workflow Engine — mapped_status + is_skippable
-- يربط مراحل خط الأنابيب بقيم enum الحجز لتفعيل محرك تدفق العمل
-- ============================================================

ALTER TABLE booking_pipeline_stages
  ADD COLUMN IF NOT EXISTS mapped_status   TEXT,
  ADD COLUMN IF NOT EXISTS is_skippable    BOOLEAN NOT NULL DEFAULT TRUE;

-- فهرس لتسريع بحث المحرك عن المرحلة بحسب القيمة المقابلة
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_mapped
  ON booking_pipeline_stages(org_id, mapped_status)
  WHERE mapped_status IS NOT NULL;
