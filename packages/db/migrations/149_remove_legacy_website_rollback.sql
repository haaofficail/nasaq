-- Rollback for Migration 149: Remove Legacy Website System
-- Date: 2026-04-20
--
-- EMERGENCY USE ONLY — run this only if production is broken after migration 149.
--
-- Prerequisites: _backup_20260420_* tables must still exist.
-- After rollback: redeploy the previous build (before Day 22 changes).

BEGIN;

-- ── 1. Rename messages_inbox back to contact_submissions ──────
-- Only if messages_inbox exists and contact_submissions does not

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages_inbox' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_submissions' AND table_schema = 'public')
  THEN
    ALTER TABLE messages_inbox RENAME TO contact_submissions;
  END IF;
END $$;

-- ── 2. Restore legacy website tables from backups ─────────────

CREATE TABLE IF NOT EXISTS site_pages AS
  SELECT * FROM _backup_20260420_site_pages;

CREATE TABLE IF NOT EXISTS site_config AS
  SELECT * FROM _backup_20260420_site_config;

CREATE TABLE IF NOT EXISTS blog_posts AS
  SELECT * FROM _backup_20260420_blog_posts;

CREATE TABLE IF NOT EXISTS website_templates AS
  SELECT * FROM _backup_20260420_website_templates;

-- ── 3. Re-add legacy capabilities (if they were removed) ─────

INSERT INTO capability_registry (key, name_ar, description_ar, isActive, createdAt)
SELECT 'storefront', 'المتجر الإلكتروني', 'الصفحة العامة للمنشأة', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM capability_registry WHERE key = 'storefront');

INSERT INTO capability_registry (key, name_ar, description_ar, isActive, createdAt)
SELECT 'website', 'الموقع الإلكتروني', 'بناء الموقع الإلكتروني', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM capability_registry WHERE key = 'website');

-- ── 4. Audit log ─────────────────────────────────────────────

INSERT INTO capability_audit_log (capability_key, action, new_value, changed_at)
VALUES (
  'legacy_website_system',
  'migration_149_rollback',
  '{"reason": "emergency rollback", "restored_tables": ["site_pages", "site_config", "blog_posts", "website_templates"], "renamed_back": "messages_inbox -> contact_submissions"}',
  NOW()
);

COMMIT;
