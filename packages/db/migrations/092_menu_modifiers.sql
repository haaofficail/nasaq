-- ============================================================
-- Migration 092: Menu Modifier Groups (تخصيص أصناف القائمة)
-- يدعم: الحجم (اختيار واحد)، الإضافات (اختيار متعدد)، درجة الحلاوة...
-- ============================================================

-- مجموعة التخصيص (مثال: "الحجم"، "الإضافات"، "درجة الحلاوة")
CREATE TABLE IF NOT EXISTS menu_modifier_groups (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  menu_item_id    UUID        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,           -- "الحجم" / "الإضافات"
  selection_type  TEXT        NOT NULL DEFAULT 'single',  -- 'single' | 'multiple'
  is_required     BOOLEAN     NOT NULL DEFAULT false,
  min_select      INT         NOT NULL DEFAULT 0,
  max_select      INT         NOT NULL DEFAULT 1,
  sort_order      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- خيارات التخصيص (مثال: صغير 0ر.س / وسط +2ر.س / كبير +5ر.س)
CREATE TABLE IF NOT EXISTS menu_modifiers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id     UUID        NOT NULL REFERENCES menu_modifier_groups(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  price_delta  NUMERIC(10,2) NOT NULL DEFAULT 0,  -- 0 = مجاني، >0 = إضافة سعر
  is_default   BOOLEAN     NOT NULL DEFAULT false,
  is_available BOOLEAN     NOT NULL DEFAULT true,
  sort_order   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_modifier_groups_item ON menu_modifier_groups(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_modifier_groups_org  ON menu_modifier_groups(org_id);
CREATE INDEX IF NOT EXISTS idx_menu_modifiers_group      ON menu_modifiers(group_id);
CREATE INDEX IF NOT EXISTS idx_menu_modifiers_org        ON menu_modifiers(org_id);
