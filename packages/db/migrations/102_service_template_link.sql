-- ═══════════════════════════════════════════════════════════════
-- 102: ربط services → event_package_templates
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS template_id UUID
    REFERENCES event_package_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_services_template_id
  ON services(template_id) WHERE template_id IS NOT NULL;
