-- Migration 126: Menu Tables (menu_categories + menu_items)
-- هذه الجداول كانت موجودة على بعض النسخ بدون migration مسجّل.
-- نستخدم CREATE TABLE IF NOT EXISTS لضمان التوافق.

-- ──────────────────────────────────────────────────────────────
-- menu_categories — تصنيفات قائمة الطعام
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  name_en     TEXT,
  description TEXT,
  image       TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS menu_categories_org_idx ON menu_categories(org_id);

-- ──────────────────────────────────────────────────────────────
-- menu_items — أصناف قائمة الطعام
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id      UUID          REFERENCES menu_categories(id) ON DELETE SET NULL,
  name             TEXT          NOT NULL,
  name_en          TEXT,
  description      TEXT,
  price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url        TEXT,
  is_available     BOOLEAN       NOT NULL DEFAULT true,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  is_popular       BOOLEAN       NOT NULL DEFAULT false,
  preparation_time INTEGER       NOT NULL DEFAULT 10,
  calories         INTEGER,
  sort_order       INTEGER       NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS menu_items_org_idx      ON menu_items(org_id);
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items(org_id, category_id);
CREATE INDEX IF NOT EXISTS menu_items_active_idx   ON menu_items(org_id, is_active);
