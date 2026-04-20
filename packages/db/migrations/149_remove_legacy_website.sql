-- Migration 149: Remove Legacy Website System
-- Date: 2026-04-20
--
-- Removes:
--   - site_pages, site_config, blog_posts, website_templates (all empty in production)
--   - Renames contact_submissions → messages_inbox
--   - Removes legacy capability_registry entries for 'storefront' and 'website'
--
-- Must be deployed in the same release as:
--   - packages/db/schema/messages.ts  (pgTable name updated to "messages_inbox")
--   - packages/api/src/routes/storefront-v2.ts (already using messagesInbox)
--   - All legacy websiteApi references removed from dashboard

BEGIN;

-- ── Safety backups ────────────────────────────────────────────
-- Kept for 30 days, then dropped manually

CREATE TABLE _backup_20260420_site_pages AS SELECT * FROM site_pages;
CREATE TABLE _backup_20260420_site_config AS SELECT * FROM site_config;
CREATE TABLE _backup_20260420_blog_posts AS SELECT * FROM blog_posts;
CREATE TABLE _backup_20260420_website_templates AS SELECT * FROM website_templates;
CREATE TABLE _backup_20260420_contact_submissions AS SELECT * FROM contact_submissions;

-- ── 1. Rename contact_submissions → messages_inbox ────────────

ALTER TABLE contact_submissions RENAME TO messages_inbox;

-- ── 2. Drop legacy website tables ────────────────────────────

DROP TABLE IF EXISTS site_pages CASCADE;
DROP TABLE IF EXISTS site_config CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS website_templates CASCADE;

-- ── 3. Remove legacy capabilities ────────────────────────────
-- (no-op if they don't exist — safe either way)

DELETE FROM capability_registry WHERE key IN ('storefront', 'website');

-- ── 4. Audit log ─────────────────────────────────────────────

INSERT INTO capability_audit_log (capability_key, action, new_value, changed_at)
VALUES (
  'legacy_website_system',
  'migration_149_cleanup',
  '{"removed_tables": ["site_pages", "site_config", "blog_posts", "website_templates"], "renamed": "contact_submissions -> messages_inbox", "removed_capabilities": ["storefront", "website"]}',
  NOW()
);

COMMIT;
