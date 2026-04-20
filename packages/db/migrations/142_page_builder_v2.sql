-- ═══════════════════════════════════════════════════════════════
-- 142: Page Builder v2 — pages_v2 + page_versions_v2
-- Additive-only: zero impact on existing v1 tables (site_pages, site_config)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. pages_v2 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages_v2 (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant: required on every query
  org_id            UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Page identity
  slug              TEXT        NOT NULL,
  title             TEXT        NOT NULL,
  page_type         TEXT        NOT NULL DEFAULT 'custom',
  -- home | about | contact | services | blog | faq | custom

  -- Status
  status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'published', 'archived')),

  -- Puck content (two copies)
  -- Format: { content: PuckComponent[], root: { props: {} } }
  draft_data        JSONB,
  published_data    JSONB,

  -- SEO
  meta_title        TEXT,
  meta_description  TEXT,
  og_image          TEXT,

  -- Publishing
  published_at      TIMESTAMPTZ,
  published_by      UUID        REFERENCES users(id) ON DELETE SET NULL,

  -- Navigation
  sort_order        INTEGER     NOT NULL DEFAULT 0,
  show_in_navigation BOOLEAN   NOT NULL DEFAULT true,

  -- Audit
  created_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- slug فريد داخل كل منشأة
CREATE UNIQUE INDEX IF NOT EXISTS pages_v2_org_slug_idx
  ON pages_v2(org_id, slug);

-- استعلام سريع على الحالة
CREATE INDEX IF NOT EXISTS pages_v2_org_status_idx
  ON pages_v2(org_id, status);

COMMENT ON TABLE pages_v2 IS 'Page Builder v2 pages — Puck-based visual editor. Independent from v1 site_pages.';
COMMENT ON COLUMN pages_v2.draft_data IS 'Puck editor state { content, root } — مسودة العمل الحالي';
COMMENT ON COLUMN pages_v2.published_data IS 'Puck snapshot at last publish — ما يراه الزوار';

-- ── 2. page_versions_v2 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_versions_v2 (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  page_id         UUID        NOT NULL REFERENCES pages_v2(id) ON DELETE CASCADE,
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- org_id مكرر هنا للفلترة المباشرة بدون JOIN — مبرر معماري

  -- Version tracking
  version_number  INTEGER     NOT NULL,
  label           TEXT,       -- تسمية اختيارية من المستخدم

  -- Full Puck snapshot
  data            JSONB       NOT NULL,

  -- Audit
  change_type     TEXT        NOT NULL DEFAULT 'auto_save'
                              CHECK (change_type IN ('auto_save', 'manual_save', 'publish', 'restore')),
  created_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إصدارات صفحة معينة
CREATE INDEX IF NOT EXISTS page_versions_v2_page_idx
  ON page_versions_v2(page_id);

-- فلترة سريعة بالمنشأة
CREATE INDEX IF NOT EXISTS page_versions_v2_org_idx
  ON page_versions_v2(org_id);

-- رقم الإصدار فريد داخل كل صفحة
CREATE UNIQUE INDEX IF NOT EXISTS page_versions_v2_page_num_idx
  ON page_versions_v2(page_id, version_number);

COMMENT ON TABLE page_versions_v2 IS 'Version history for pages_v2 — يحتفظ بـ 50 نسخة كحد أقصى لكل صفحة (يُطبَّق في API)';
COMMENT ON COLUMN page_versions_v2.org_id IS 'Denormalized for direct org-scoped queries without JOIN — intentional';
