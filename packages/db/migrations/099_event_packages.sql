-- ═══════════════════════════════════════════════════════════════
-- 099: Event Package Templates + Decor Asset Enhancements
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Event Package Templates ──────────────────────────────────
CREATE TABLE IF NOT EXISTS event_package_templates (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT         NOT NULL,
  type         TEXT         NOT NULL DEFAULT 'custom',
  description  TEXT,
  worker_count INT          NOT NULL DEFAULT 2,
  setup_notes  TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT ept_type_check CHECK (
    type IN ('kiosk','reception_table','entrance','wedding','newborn','custom')
  )
);

-- ── 2. Template Items ────────────────────────────────────────────
-- item_type:
--   'asset'              → decor asset (specific or by category)
--   'consumable_natural' → flower variant (stems)
--   'consumable_product' → packaging / supplies (free text)
--   'service_fee'        → labor / transport (free text)

CREATE TABLE IF NOT EXISTS event_package_template_items (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id        UUID          NOT NULL
    REFERENCES event_package_templates(id) ON DELETE CASCADE,
  org_id             UUID          NOT NULL,
  item_type          TEXT          NOT NULL,
  asset_id           UUID          REFERENCES decor_assets(id) ON DELETE SET NULL,
  asset_category     TEXT,
  variant_id         UUID          REFERENCES flower_variants(id) ON DELETE SET NULL,
  description        TEXT          NOT NULL,
  quantity           NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit               TEXT          NOT NULL DEFAULT 'قطعة',
  unit_cost_estimate NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order         INT           NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT epti_type_check CHECK (
    item_type IN ('asset','consumable_natural','consumable_product','service_fee')
  )
);

-- ── 3. Decor Assets: structured location ────────────────────────
ALTER TABLE decor_assets
  ADD COLUMN IF NOT EXISTS location_type TEXT NOT NULL DEFAULT 'warehouse';

-- ── 4. Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ept_org      ON event_package_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_ept_active   ON event_package_templates(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_epti_tmpl    ON event_package_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_da_loc_type  ON decor_assets(org_id, location_type);
