-- ═══════════════════════════════════════════════════════════════
-- 145: Page Builder v2 — SEO fields (Day 18)
--
-- Adds SEO management columns to pages_v2:
--   canonical_url  — canonical URL override
--   schema_type    — structured data type (Article/Product/Service/Organization)
--   robots_index   — true = index, false = noindex (default: true)
--   robots_follow  — true = follow, false = nofollow (default: true)
--
-- All columns are additive (nullable/defaulted) — zero breaking changes.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE pages_v2
  ADD COLUMN IF NOT EXISTS canonical_url    TEXT,
  ADD COLUMN IF NOT EXISTS schema_type      TEXT,
  ADD COLUMN IF NOT EXISTS robots_index     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS robots_follow    BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN pages_v2.canonical_url IS 'Canonical URL override — empty = use page URL';
COMMENT ON COLUMN pages_v2.schema_type   IS 'JSON-LD schema type: Article | Product | Service | Organization';
COMMENT ON COLUMN pages_v2.robots_index  IS 'true = index (default), false = noindex';
COMMENT ON COLUMN pages_v2.robots_follow IS 'true = follow (default), false = nofollow';
