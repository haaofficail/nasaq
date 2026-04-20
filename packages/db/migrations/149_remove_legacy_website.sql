-- Migration 149: Remove Legacy Website System
-- Date: 2026-04-20
--
-- Removes:
--   - site_pages, site_config, blog_posts, website_templates (all empty in production)
--   - Renames contact_submissions → messages_inbox
--
-- Note: 'storefront' and 'website' keys were NOT in capability_registry at time of migration
-- (verified: SELECT key FROM capability_registry WHERE key IN ('storefront','website') = 0 rows)
--
-- Must be deployed in the same release as:
--   - packages/db/schema/messages.ts  (pgTable name updated to "messages_inbox")
--   - packages/api/src/routes/storefront-v2.ts (already using messagesInbox)
--   - All legacy websiteApi references removed from dashboard
--
-- TODO: Schedule migration 151 (~2026-05-20) to DROP _backup_20260420_* tables
-- Reminder: manual verification required before dropping backups

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

COMMIT;
