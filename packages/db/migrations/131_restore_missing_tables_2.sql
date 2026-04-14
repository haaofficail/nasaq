-- ============================================================
-- Migration 131: Restore more tables dropped by drizzle-kit push
-- الجداول الموجودة في migrations مرقّمة لكن غير موجودة في schema TS.
-- جميع العمليات IF NOT EXISTS — آمنة للتشغيل أكثر من مرة.
-- ============================================================

-- ── من Migration 093: Contracts ──────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE contract_type AS ENUM ('lease','service','vendor','employment','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM ('draft','active','expired','terminated','renewed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contract_payment_terms AS ENUM ('monthly','quarterly','annual','one_time');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contract_payment_status AS ENUM ('pending','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS contracts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_number      TEXT NOT NULL,
  contract_type        contract_type NOT NULL DEFAULT 'other',
  title                TEXT NOT NULL,
  party_name           TEXT NOT NULL,
  party_id_number      TEXT,
  party_phone          TEXT,
  party_email          TEXT,
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL,
  value                NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency             TEXT NOT NULL DEFAULT 'SAR',
  payment_terms        contract_payment_terms NOT NULL DEFAULT 'monthly',
  status               contract_status NOT NULL DEFAULT 'draft',
  auto_renew           BOOLEAN NOT NULL DEFAULT FALSE,
  renewal_notice_days  INTEGER NOT NULL DEFAULT 30,
  linked_entity_type   TEXT,
  linked_entity_id     UUID,
  notes                TEXT,
  terms_and_conditions TEXT,
  created_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  signed_at            TIMESTAMPTZ,
  terminated_at        TIMESTAMPTZ,
  termination_reason   TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id     UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  due_date        DATE NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  status          contract_payment_status NOT NULL DEFAULT 'pending',
  paid_at         TIMESTAMPTZ,
  payment_method  TEXT,
  reference       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id  UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  file_type    TEXT,
  file_size    INTEGER,
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_org_id   ON contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status   ON contracts(org_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(org_id, end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_number   ON contracts(org_id, contract_number);
CREATE INDEX IF NOT EXISTS idx_contract_payments_org ON contract_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_contract_payments_cid ON contract_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_cid ON contract_documents(contract_id);

-- ── من Migration 016: Restaurant Tables, Sections, Ingredients ───────────────

CREATE TABLE IF NOT EXISTS restaurant_sections (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL,
  name       TEXT        NOT NULL,
  name_en    TEXT,
  capacity   INT         NOT NULL DEFAULT 20,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  sort_order INT         NOT NULL DEFAULT 0,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, name)
);
CREATE INDEX IF NOT EXISTS restaurant_sections_org_idx ON restaurant_sections(org_id);

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL,
  number     TEXT        NOT NULL,
  section    TEXT,
  capacity   INT         NOT NULL DEFAULT 4,
  status     TEXT        NOT NULL DEFAULT 'available',
  notes      TEXT,
  sort_order INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, number)
);
CREATE INDEX IF NOT EXISTS restaurant_tables_org_idx    ON restaurant_tables(org_id);
CREATE INDEX IF NOT EXISTS restaurant_tables_status_idx ON restaurant_tables(org_id, status);

CREATE TABLE IF NOT EXISTS table_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL,
  table_id   UUID        NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  order_id   UUID,
  guests     INT         NOT NULL DEFAULT 1,
  waiter_id  UUID,
  seated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at  TIMESTAMPTZ,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS table_sessions_org_idx   ON table_sessions(org_id);
CREATE INDEX IF NOT EXISTS table_sessions_table_idx ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS table_sessions_open_idx  ON table_sessions(org_id, closed_at) WHERE closed_at IS NULL;

CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID          NOT NULL,
  item_id    UUID          NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name       TEXT          NOT NULL,
  quantity   NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit       TEXT          NOT NULL DEFAULT 'g',
  cost       NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, name)
);
CREATE INDEX IF NOT EXISTS menu_item_ingredients_item_idx ON menu_item_ingredients(item_id);
CREATE INDEX IF NOT EXISTS menu_item_ingredients_org_idx  ON menu_item_ingredients(org_id);

-- ── من Migration 018: Restaurant Booking Config ───────────────────────────────

CREATE TABLE IF NOT EXISTS restaurant_booking_config (
  org_id                   UUID    PRIMARY KEY,
  min_guests               INT     NOT NULL DEFAULT 1,
  max_guests               INT     NOT NULL DEFAULT 12,
  slot_duration_min        INT     NOT NULL DEFAULT 60,
  advance_booking_days     INT     NOT NULL DEFAULT 30,
  min_notice_hours         INT     NOT NULL DEFAULT 2,
  waitlist_enabled         BOOLEAN NOT NULL DEFAULT false,
  auto_confirm             BOOLEAN NOT NULL DEFAULT false,
  special_requests_enabled BOOLEAN NOT NULL DEFAULT true,
  max_concurrent_per_slot  INT     NOT NULL DEFAULT 5,
  turnover_time_min        INT     NOT NULL DEFAULT 15,
  deposit_required         BOOLEAN NOT NULL DEFAULT false,
  deposit_amount           NUMERIC(12,2) DEFAULT 0,
  cancellation_hours       INT     NOT NULL DEFAULT 24,
  notes                    TEXT,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── من Migration 017: Rental Contracts ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS rental_contracts (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID          NOT NULL,
  contract_number     TEXT,
  customer_id         UUID,
  customer_name       TEXT,
  customer_phone      TEXT,
  title               TEXT          NOT NULL,
  notes               TEXT,
  status              TEXT          NOT NULL DEFAULT 'draft',
  value               NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit             NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_returned    NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date          DATE,
  end_date            DATE,
  actual_return_date  DATE,
  signed_by           TEXT,
  signed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rc_org_idx      ON rental_contracts(org_id);
CREATE INDEX IF NOT EXISTS rc_status_idx   ON rental_contracts(org_id, status);
CREATE INDEX IF NOT EXISTS rc_customer_idx ON rental_contracts(customer_id) WHERE customer_id IS NOT NULL;
CREATE SEQUENCE IF NOT EXISTS rental_contract_seq START 1001 INCREMENT 1;

CREATE TABLE IF NOT EXISTS rental_contract_assets (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID          NOT NULL,
  contract_id UUID          NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
  asset_id    UUID,
  asset_name  TEXT          NOT NULL,
  quantity    INT           NOT NULL DEFAULT 1,
  daily_rate  NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rca_contract_idx ON rental_contract_assets(contract_id);

CREATE TABLE IF NOT EXISTS rental_inspections (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID          NOT NULL,
  contract_id        UUID          REFERENCES rental_contracts(id) ON DELETE SET NULL,
  asset_id           UUID,
  asset_name         TEXT,
  type               TEXT          NOT NULL DEFAULT 'pre_rental',
  condition          TEXT          NOT NULL DEFAULT 'good',
  damage_found       BOOLEAN       NOT NULL DEFAULT false,
  damage_description TEXT,
  damage_cost        NUMERIC(12,2),
  damage_recovered   BOOLEAN       NOT NULL DEFAULT false,
  inspector_name     TEXT,
  notes              TEXT,
  photos             JSONB         DEFAULT '[]',
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ri_org_idx      ON rental_inspections(org_id);
CREATE INDEX IF NOT EXISTS ri_contract_idx ON rental_inspections(contract_id) WHERE contract_id IS NOT NULL;

-- ── من Migration 052/053: WhatsApp ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  trigger_event TEXT        NOT NULL DEFAULT 'booking_confirmed',
  message_body  TEXT        NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  language      TEXT        NOT NULL DEFAULT 'ar',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS whatsapp_templates_org_id_idx ON whatsapp_templates(org_id);

CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mode                 TEXT        NOT NULL DEFAULT 'api',
  status               TEXT        NOT NULL DEFAULT 'disconnected',
  phone_number         TEXT,
  display_name         TEXT,
  api_phone_id         TEXT,
  api_access_token     TEXT,
  api_webhook_verify   TEXT,
  session_id           TEXT,
  qr_code              TEXT,
  messages_sent        INTEGER     NOT NULL DEFAULT 0,
  last_activity        TIMESTAMPTZ,
  error_message        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_org ON whatsapp_connections(org_id);

-- ── من Migration 024: Service Sub-Tables ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_pricing (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id          UUID          NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
  pricing_mode        TEXT          NOT NULL DEFAULT 'fixed',
  base_price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency            TEXT          NOT NULL DEFAULT 'SAR',
  vat_inclusive       BOOLEAN       NOT NULL DEFAULT TRUE,
  deposit_percent     NUMERIC(5,2)  NOT NULL DEFAULT 30,
  cancellation_policy JSONB         NOT NULL DEFAULT '{}',
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS service_pricing_org_idx ON service_pricing(org_id);

CREATE TABLE IF NOT EXISTS service_timing (
  id                     UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id             UUID    NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
  duration_minutes       INTEGER NOT NULL DEFAULT 60,
  buffer_before_minutes  INTEGER NOT NULL DEFAULT 0,
  buffer_after_minutes   INTEGER NOT NULL DEFAULT 0,
  setup_minutes          INTEGER NOT NULL DEFAULT 0,
  teardown_minutes       INTEGER NOT NULL DEFAULT 0,
  min_advance_hours      INTEGER,
  max_advance_days       INTEGER,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS service_timing_org_idx ON service_timing(org_id);

CREATE TABLE IF NOT EXISTS service_visibility (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id          UUID    NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
  is_bookable         BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible_in_pos   BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible_online   BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  assignment_mode     TEXT    NOT NULL DEFAULT 'open',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS service_visibility_org_idx ON service_visibility(org_id);

CREATE TABLE IF NOT EXISTS service_delivery (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id       UUID          NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
  has_delivery     BOOLEAN       NOT NULL DEFAULT FALSE,
  allows_pickup    BOOLEAN       NOT NULL DEFAULT FALSE,
  allows_in_venue  BOOLEAN       NOT NULL DEFAULT FALSE,
  delivery_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS service_delivery_org_idx ON service_delivery(org_id);

-- ── من Migration 092: Menu Modifiers ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS menu_modifier_groups (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  menu_item_id   UUID        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  selection_type TEXT        NOT NULL DEFAULT 'single',
  is_required    BOOLEAN     NOT NULL DEFAULT false,
  min_select     INT         NOT NULL DEFAULT 0,
  max_select     INT         NOT NULL DEFAULT 1,
  sort_order     INT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_menu_modifier_groups_item ON menu_modifier_groups(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_modifier_groups_org  ON menu_modifier_groups(org_id);

CREATE TABLE IF NOT EXISTS menu_modifiers (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id     UUID          NOT NULL REFERENCES menu_modifier_groups(id) ON DELETE CASCADE,
  name         TEXT          NOT NULL,
  price_delta  NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_default   BOOLEAN       NOT NULL DEFAULT false,
  is_available BOOLEAN       NOT NULL DEFAULT true,
  sort_order   INT           NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_menu_modifiers_group ON menu_modifiers(group_id);
CREATE INDEX IF NOT EXISTS idx_menu_modifiers_org   ON menu_modifiers(org_id);

-- ── من Migration 099: Event Package Templates ────────────────────────────────

CREATE TABLE IF NOT EXISTS event_package_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  type         TEXT        NOT NULL DEFAULT 'custom'
               CHECK (type IN ('kiosk','reception_table','entrance','wedding','newborn','custom')),
  description  TEXT,
  worker_count INT         NOT NULL DEFAULT 2,
  setup_notes  TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ept_org    ON event_package_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_ept_active ON event_package_templates(org_id, is_active);

CREATE TABLE IF NOT EXISTS event_package_template_items (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id        UUID          NOT NULL REFERENCES event_package_templates(id) ON DELETE CASCADE,
  org_id             UUID          NOT NULL,
  item_type          TEXT          NOT NULL
                     CHECK (item_type IN ('asset','consumable_natural','consumable_product','service_fee')),
  asset_id           UUID          REFERENCES decor_assets(id) ON DELETE SET NULL,
  asset_category     TEXT,
  variant_id         UUID          REFERENCES flower_variants(id) ON DELETE SET NULL,
  description        TEXT          NOT NULL,
  quantity           NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit               TEXT          NOT NULL DEFAULT 'قطعة',
  unit_cost_estimate NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order         INT           NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_epti_tmpl ON event_package_template_items(template_id);
