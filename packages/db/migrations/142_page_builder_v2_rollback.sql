-- ═══════════════════════════════════════════════════════════════
-- 142 ROLLBACK: Page Builder v2
-- يُشغَّل فقط في حالة طوارئ — يحذف جداول v2 بالكامل
-- v1 (site_pages, site_config) لا تتأثر أبداً
--
-- Usage:
--   psql $DATABASE_URL -f 142_page_builder_v2_rollback.sql
-- ═══════════════════════════════════════════════════════════════

-- الترتيب مهم: page_versions_v2 أولاً (FK على pages_v2)
DROP TABLE IF EXISTS page_versions_v2;
DROP TABLE IF EXISTS pages_v2;

-- حذف السجل من جدول الـ migrations حتى يمكن إعادة التطبيق
DELETE FROM _nasaq_migrations WHERE filename = '142_page_builder_v2.sql';
