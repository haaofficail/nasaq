-- ============================================================
-- Migration 005: Flower Master Data System
-- Run: PGPASSWORD=Nasaq_DB_2026@secure psql -h 127.0.0.1 -U nasaq_user -d nasaq -f 005_flower_master.sql
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE flower_type AS ENUM (
    'rose', 'tulip', 'lily', 'orchid', 'carnation',
    'baby_rose', 'hydrangea', 'peony', 'sunflower',
    'gypsophila', 'chrysanthemum'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flower_color AS ENUM (
    'red', 'pink', 'white', 'yellow', 'orange', 'purple',
    'lavender', 'peach', 'coral', 'burgundy', 'cream',
    'bi_color', 'mixed', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flower_origin AS ENUM (
    'netherlands', 'ecuador', 'kenya', 'colombia', 'ethiopia',
    'local_saudi', 'local_uae', 'turkey', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flower_grade AS ENUM (
    'premium_plus', 'premium', 'grade_a', 'grade_b', 'grade_c'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flower_size AS ENUM (
    'xs', 'small', 'medium', 'large', 'xl'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bloom_stage AS ENUM (
    'bud', 'semi_open', 'open', 'full_bloom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flower_quality_status AS ENUM (
    'fresh', 'good', 'acceptable', 'expiring', 'expired', 'damaged'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. FLOWER_VARIANTS
-- هوية فريدة: (flower_type + color + origin + grade + size + bloom_stage)
-- ============================================================

CREATE TABLE IF NOT EXISTS flower_variants (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flower_type              flower_type NOT NULL,
  color                    flower_color NOT NULL,
  origin                   flower_origin NOT NULL,
  grade                    flower_grade NOT NULL,
  size                     flower_size NOT NULL,
  bloom_stage              bloom_stage NOT NULL,
  display_name_ar          TEXT,
  display_name_en          TEXT,
  base_price_per_stem      NUMERIC(10,2) NOT NULL DEFAULT 0,
  origin_price_multiplier  NUMERIC(5,3)  NOT NULL DEFAULT 1.000,
  grade_price_multiplier   NUMERIC(5,3)  NOT NULL DEFAULT 1.000,
  shelf_life_days          INTEGER NOT NULL DEFAULT 7,
  notes_ar                 TEXT,
  notes_en                 TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (flower_type, color, origin, grade, size, bloom_stage)
);

CREATE INDEX IF NOT EXISTS flower_variants_type_idx   ON flower_variants(flower_type);
CREATE INDEX IF NOT EXISTS flower_variants_origin_idx ON flower_variants(origin);
CREATE INDEX IF NOT EXISTS flower_variants_grade_idx  ON flower_variants(grade);

-- ============================================================
-- 3. FLOWER_BATCHES
-- دُفعات المخزون — FEFO على expiry_estimated
-- ============================================================

CREATE TABLE IF NOT EXISTS flower_batches (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  variant_id           UUID NOT NULL REFERENCES flower_variants(id),
  location_id          UUID REFERENCES locations(id) ON DELETE SET NULL,
  batch_number         TEXT NOT NULL,
  supplier_id          UUID,
  quantity_received    INTEGER NOT NULL DEFAULT 0,
  quantity_remaining   INTEGER NOT NULL DEFAULT 0,
  unit_cost            NUMERIC(10,2) NOT NULL DEFAULT 0,
  received_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_estimated     TIMESTAMPTZ NOT NULL,
  current_bloom_stage  bloom_stage NOT NULL DEFAULT 'bud',
  quality_status       flower_quality_status NOT NULL DEFAULT 'fresh',
  notes                TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flower_batches_org_idx     ON flower_batches(org_id);
CREATE INDEX IF NOT EXISTS flower_batches_variant_idx ON flower_batches(variant_id);
-- Critical FEFO index: oldest expiry picked first
CREATE INDEX IF NOT EXISTS flower_batches_fefo_idx    ON flower_batches(org_id, variant_id, expiry_estimated ASC)
  WHERE is_active = TRUE AND quantity_remaining > 0;
CREATE INDEX IF NOT EXISTS flower_batches_quality_idx ON flower_batches(org_id, quality_status);

-- ============================================================
-- 4. FLOWER_VARIANT_PRICING
-- تسعير المنظمة لكل variant
-- ============================================================

CREATE TABLE IF NOT EXISTS flower_variant_pricing (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  variant_id                 UUID NOT NULL REFERENCES flower_variants(id),
  price_per_stem             NUMERIC(10,2) NOT NULL,
  cost_per_stem              NUMERIC(10,2),
  markup_percent             NUMERIC(5,2),
  origin_multiplier_override NUMERIC(5,3),
  grade_multiplier_override  NUMERIC(5,3),
  effective_from             TIMESTAMPTZ,
  effective_to               TIMESTAMPTZ,
  is_active                  BOOLEAN NOT NULL DEFAULT TRUE,
  notes                      TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flower_pricing_org_idx ON flower_variant_pricing(org_id);
-- Partial unique: one active price per variant per org
CREATE UNIQUE INDEX IF NOT EXISTS flower_pricing_active_idx
  ON flower_variant_pricing(org_id, variant_id)
  WHERE is_active = TRUE;

-- ============================================================
-- 5. FLOWER_SUBSTITUTIONS
-- البدائل المقبولة مع درجة التوافق
-- ============================================================

CREATE TABLE IF NOT EXISTS flower_substitutions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  primary_variant_id       UUID NOT NULL REFERENCES flower_variants(id),
  substitute_variant_id    UUID NOT NULL REFERENCES flower_variants(id),
  grade_direction          TEXT NOT NULL DEFAULT 'same',  -- 'up' | 'same' | 'down'
  compatibility_score      INTEGER NOT NULL DEFAULT 7 CHECK (compatibility_score BETWEEN 1 AND 10),
  price_adjustment_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_auto_allowed          BOOLEAN NOT NULL DEFAULT FALSE,
  notes                    TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, primary_variant_id, substitute_variant_id)
);

CREATE INDEX IF NOT EXISTS flower_subs_org_idx     ON flower_substitutions(org_id);
CREATE INDEX IF NOT EXISTS flower_subs_primary_idx ON flower_substitutions(primary_variant_id);

-- ============================================================
-- 6. FLOWER_RECIPE_COMPONENTS
-- مكونات الوصفة — ربط variant بخدمة أو تنسيق
-- ============================================================

CREATE TABLE IF NOT EXISTS flower_recipe_components (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  variant_id               UUID NOT NULL REFERENCES flower_variants(id),
  service_id               UUID,
  package_ref              TEXT,   -- 'service' | 'arrangement' | 'bundle'
  quantity                 NUMERIC(8,1) NOT NULL DEFAULT 1,
  unit                     TEXT NOT NULL DEFAULT 'ساق',
  is_optional              BOOLEAN NOT NULL DEFAULT FALSE,
  substitution_variant_ids TEXT[] DEFAULT '{}',
  show_to_customer         BOOLEAN NOT NULL DEFAULT TRUE,
  customer_label_ar        TEXT,
  sort_order               INTEGER NOT NULL DEFAULT 0,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flower_recipe_org_idx     ON flower_recipe_components(org_id);
CREATE INDEX IF NOT EXISTS flower_recipe_service_idx ON flower_recipe_components(service_id);
CREATE INDEX IF NOT EXISTS flower_recipe_variant_idx ON flower_recipe_components(variant_id);

-- ============================================================
-- 7. SEED — Global Variant Defaults
-- الأسعار الأساسية ومضاعفات المنشأ والدرجة للاستخدام كمرجع
-- هذه قيم عالمية (ليست خاصة بأي منظمة)
-- ============================================================

-- Origin multipliers: update on flower_variants when created via API
-- Grade multipliers reference table (informational — enforced in API logic):
-- premium_plus: 1.500
-- premium:      1.200
-- grade_a:      1.000
-- grade_b:      0.800
-- grade_c:      0.650

-- Origin shelf life adjustments (days added/subtracted from variant base):
-- netherlands: +2 (cold chain maintained)
-- ecuador:     +1
-- kenya:       +0
-- colombia:    +0
-- local_saudi: -1 (shorter cold chain)
-- local_uae:   -1
-- ethiopia:    +0
-- turkey:      +0
