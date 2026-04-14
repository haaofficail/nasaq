-- ============================================================
-- Migration 129: Restore tables dropped by drizzle-kit push
-- يعيد إنشاء الجداول الموجودة في migrations مرقّمة لكن
-- غير موجودة في ملفات schema/index.ts (Drizzle TS).
-- drizzle-kit push حذفها لأنها خارج نطاق الـ schema المُعرَّف.
-- جميع العمليات IF NOT EXISTS — آمنة للتشغيل أكثر من مرة.
-- ============================================================

-- ── من Migration 097: Flower Operating Model ─────────────────────────────────

CREATE TABLE IF NOT EXISTS decor_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'other'
                  CHECK (category IN ('artificial_flowers','stands','backdrops','vases',
                                      'holders','decor','kiosk_equipment','other')),
  code          TEXT,
  location      TEXT,
  status        TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available','reserved','in_use','returned',
                                    'maintenance','damaged')),
  purchase_date DATE,
  purchase_cost NUMERIC(10,2),
  image_url     TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_decor_assets_org_status
  ON decor_assets(org_id, status) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS decor_asset_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES decor_assets(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL,
  movement_type   TEXT NOT NULL
                    CHECK (movement_type IN ('reserved','dispatched','returned',
                                             'damaged','maintenance','repaired','available')),
  reference_id    UUID,
  reference_label TEXT,
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_decor_asset_movements_asset
  ON decor_asset_movements(asset_id, created_at DESC);

CREATE TABLE IF NOT EXISTS decor_asset_maintenance_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              UUID NOT NULL REFERENCES decor_assets(id) ON DELETE CASCADE,
  org_id                UUID NOT NULL,
  maintenance_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  description           TEXT,
  cost                  NUMERIC(10,2),
  performed_by          TEXT,
  next_maintenance_date DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flower_waste_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL,
  variant_id     UUID REFERENCES flower_variants(id),
  batch_id       UUID REFERENCES flower_batches(id),
  quantity_type  TEXT NOT NULL DEFAULT 'stems'
                   CHECK (quantity_type IN ('stems','bunches')),
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  reason         TEXT NOT NULL DEFAULT 'natural_expiry'
                   CHECK (reason IN ('natural_expiry','damage','cutting_waste',
                                     'transfer','other')),
  notes          TEXT,
  recorded_by    UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flower_waste_org_date
  ON flower_waste_logs(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS service_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_number     TEXT NOT NULL,
  type             TEXT NOT NULL
                     CHECK (type IN ('kiosk','newborn_reception','custom_arrangement',
                                     'field_execution','custom_decor')),
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','confirmed','deposit_pending','scheduled',
                                       'preparing','ready','dispatched','in_setup',
                                       'completed_on_site','returned','inspected',
                                       'closed','cancelled')),
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT,
  event_date       DATE,
  event_time       TIME,
  event_location   TEXT,
  description      TEXT,
  notes            TEXT,
  reference_images TEXT[] DEFAULT '{}',
  deposit_amount   NUMERIC(10,2),
  deposit_paid_at  TIMESTAMPTZ,
  total_amount     NUMERIC(10,2),
  team_size        INTEGER DEFAULT 1,
  internal_notes   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_orders_number
  ON service_orders(org_id, order_number);
CREATE INDEX IF NOT EXISTS idx_service_orders_org_status
  ON service_orders(org_id, status, event_date);

CREATE TABLE IF NOT EXISTS service_order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  item_type        TEXT NOT NULL
                     CHECK (item_type IN ('consumable_natural','consumable_product',
                                          'asset','service_fee')),
  variant_id       UUID REFERENCES flower_variants(id),
  asset_id         UUID REFERENCES decor_assets(id),
  description      TEXT NOT NULL,
  quantity         NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit             TEXT DEFAULT 'ساق',
  unit_cost        NUMERIC(10,2) DEFAULT 0,
  subtotal         NUMERIC(10,2) DEFAULT 0,
  is_returned      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decor_asset_reservations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         UUID NOT NULL REFERENCES decor_assets(id) ON DELETE CASCADE,
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  org_id           UUID NOT NULL,
  reserved_from    TIMESTAMPTZ,
  reserved_to      TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'reserved'
                     CHECK (status IN ('reserved','dispatched','returned_ok',
                                       'damaged','missing','maintenance_required')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_decor_asset_reservations_order
  ON decor_asset_reservations(service_order_id);
CREATE INDEX IF NOT EXISTS idx_decor_asset_reservations_asset
  ON decor_asset_reservations(asset_id, status);

CREATE TABLE IF NOT EXISTS material_reservations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id       UUID NOT NULL REFERENCES flower_variants(id),
  batch_id         UUID REFERENCES flower_batches(id),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  org_id           UUID NOT NULL,
  quantity_stems   INTEGER NOT NULL CHECK (quantity_stems > 0),
  status           TEXT NOT NULL DEFAULT 'reserved'
                     CHECK (status IN ('reserved','consumed','released','cancelled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_material_reservations_order
  ON material_reservations(service_order_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_variant
  ON material_reservations(org_id, variant_id, status);

CREATE TABLE IF NOT EXISTS return_inspections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id  UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  org_id            UUID NOT NULL,
  inspected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inspected_by      UUID,
  assets_inspection JSONB DEFAULT '[]',
  materials_waste   JSONB DEFAULT '[]',
  notes             TEXT,
  approved_by       UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── من Migration 100: service_order_staff + FK columns ───────────────────────

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS service_order_staff (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID        NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  org_id           UUID        NOT NULL,
  employee_id      UUID        NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  role             TEXT        NOT NULL DEFAULT 'field_worker',
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (service_order_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_so_customer_id  ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sos_order       ON service_order_staff(service_order_id);
CREATE INDEX IF NOT EXISTS idx_sos_employee    ON service_order_staff(employee_id, org_id);

-- ── من Migration 101: service_id FK ──────────────────────────────────────────

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_so_service_id ON service_orders(service_id);

-- ── من Migration 104: applied_template_id ────────────────────────────────────

-- applied_template_id: بدون FK لأن event_package_templates قد لا تكون موجودة
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS applied_template_id UUID;

CREATE INDEX IF NOT EXISTS idx_service_orders_applied_template
  ON service_orders(applied_template_id) WHERE applied_template_id IS NOT NULL;

-- ── من Migration 110: order_kind ─────────────────────────────────────────────

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS order_kind TEXT NOT NULL DEFAULT 'project'
    CHECK (order_kind IN ('sale', 'booking', 'project'));

CREATE INDEX IF NOT EXISTS idx_service_orders_kind
  ON service_orders(org_id, order_kind);

-- ── من Migration 113: cancellation fields ────────────────────────────────────

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS version             INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at        TIMESTAMPTZ;

-- ── من Migration 115: event_end_date, event_end_time ─────────────────────────

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS event_end_date DATE,
  ADD COLUMN IF NOT EXISTS event_end_time TIME;

-- ── من Migration 126: menu_categories + menu_items ───────────────────────────

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

-- ── من Migration 127: Extended Modules ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_movements (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id     UUID,
  type           TEXT          NOT NULL CHECK (type IN ('in','out','adjustment','transfer')),
  quantity       NUMERIC(12,3) NOT NULL,
  reference_id   UUID,
  reference_type TEXT,
  notes          TEXT,
  performed_by   UUID,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org  ON stock_movements(org_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON stock_movements(org_id, product_id);

CREATE TABLE IF NOT EXISTS asset_allocations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fulfillment_id   UUID,
  booking_id       UUID,
  asset_id         UUID,
  asset_type_id    UUID,
  status           TEXT        NOT NULL DEFAULT 'allocated',
  condition_before TEXT,
  condition_after  TEXT,
  damage_cost      NUMERIC(10,2),
  damage_notes     TEXT,
  notes            TEXT,
  allocated_at     TIMESTAMPTZ,
  picked_at        TIMESTAMPTZ,
  dispatched_at    TIMESTAMPTZ,
  returned_at      TIMESTAMPTZ,
  inspected_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asset_alloc_org         ON asset_allocations(org_id);
CREATE INDEX IF NOT EXISTS idx_asset_alloc_fulfillment ON asset_allocations(fulfillment_id);

CREATE TABLE IF NOT EXISTS fulfillments (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id              UUID        NOT NULL,
  stage                   TEXT        NOT NULL DEFAULT 'reserved'
                            CHECK (stage IN ('reserved','picking','preparation','dispatched','in_use','returned','inspection','completed','maintenance_required')),
  notes                   TEXT,
  created_by              UUID,
  inspection_result       TEXT,
  inspection_notes        TEXT,
  inspection_by           UUID,
  inspection_completed_at TIMESTAMPTZ,
  picking_started_at      TIMESTAMPTZ,
  prepared_at             TIMESTAMPTZ,
  dispatched_at           TIMESTAMPTZ,
  returned_at             TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  reserved_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fulfillments_org     ON fulfillments(org_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_booking ON fulfillments(booking_id);

CREATE TABLE IF NOT EXISTS asset_maintenance_logs (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id         UUID,
  maintenance_type TEXT          NOT NULL,
  description      TEXT,
  cost             NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT          NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','in_progress','completed','cancelled')),
  notes            TEXT,
  started_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asset_maint_logs_org   ON asset_maintenance_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_asset_maint_logs_asset ON asset_maintenance_logs(asset_id);

CREATE TABLE IF NOT EXISTS pos_settings (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID         NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  tax_rate       NUMERIC(5,2) NOT NULL DEFAULT 15,
  currency       TEXT         NOT NULL DEFAULT 'SAR',
  allow_discount BOOLEAN      NOT NULL DEFAULT true,
  receipt_footer TEXT,
  settings       JSONB        NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel         TEXT        NOT NULL DEFAULT 'whatsapp',
  recipient_phone TEXT,
  message_text    TEXT,
  status          TEXT        NOT NULL DEFAULT 'sent',
  category        TEXT,
  provider        TEXT,
  external_id     TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_message_logs_org  ON message_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_sent ON message_logs(org_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS message_settings (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                          UUID        NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  messaging_enabled               BOOLEAN     NOT NULL DEFAULT false,
  send_during_business_hours_only BOOLEAN     NOT NULL DEFAULT false,
  business_hours_start            TEXT        DEFAULT '09:00',
  business_hours_end              TEXT        DEFAULT '21:00',
  daily_limit                     INTEGER     NOT NULL DEFAULT 200,
  reminder_enabled                BOOLEAN     NOT NULL DEFAULT true,
  reminder_hours_before           INTEGER     NOT NULL DEFAULT 24,
  second_reminder_hours           INTEGER,
  follow_up_enabled               BOOLEAN     NOT NULL DEFAULT false,
  follow_up_hours_after           INTEGER     NOT NULL DEFAULT 2,
  notify_owner_new_booking        BOOLEAN     NOT NULL DEFAULT true,
  notify_owner_cancellation       BOOLEAN     NOT NULL DEFAULT true,
  notify_owner_payment            BOOLEAN     NOT NULL DEFAULT false,
  notify_owner_low_stock          BOOLEAN     NOT NULL DEFAULT false,
  notify_staff_assigned_booking   BOOLEAN     NOT NULL DEFAULT true,
  notify_staff_schedule_change    BOOLEAN     NOT NULL DEFAULT true,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type    TEXT        NOT NULL,
  category      TEXT,
  send_to       TEXT        NOT NULL DEFAULT 'customer',
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  title         TEXT,
  message_ar    TEXT        NOT NULL DEFAULT '',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  delay_minutes INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, event_type, send_to)
);
CREATE INDEX IF NOT EXISTS idx_message_templates_org ON message_templates(org_id);

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_phone TEXT        NOT NULL,
  message_text    TEXT,
  template_id     UUID        REFERENCES message_templates(id) ON DELETE SET NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending',
  sent_at         TIMESTAMPTZ,
  error_msg       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_msgs_org    ON scheduled_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_msgs_status ON scheduled_messages(status, scheduled_at);

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  phone        TEXT,
  session_data JSONB       DEFAULT '{}',
  status       TEXT        NOT NULL DEFAULT 'disconnected',
  qr_code      TEXT,
  connected_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_policies (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID        NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  grace_minutes            INTEGER     NOT NULL DEFAULT 5,
  absent_threshold_minutes INTEGER     NOT NULL DEFAULT 60,
  rounding_minutes         INTEGER     NOT NULL DEFAULT 0,
  allow_self_checkin       BOOLEAN     NOT NULL DEFAULT true,
  allow_manual_entries     BOOLEAN     NOT NULL DEFAULT true,
  require_approval         BOOLEAN     NOT NULL DEFAULT false,
  auto_close_open_records  BOOLEAN     NOT NULL DEFAULT false,
  auto_close_hour          INTEGER     NOT NULL DEFAULT 23,
  require_gps              BOOLEAN     NOT NULL DEFAULT false,
  require_qr               BOOLEAN     NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shift_id     UUID,
  user_id      UUID        NOT NULL,
  event_type   TEXT        NOT NULL,
  source       TEXT        NOT NULL DEFAULT 'app',
  performed_by UUID,
  metadata     JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attendance_events_org   ON attendance_events(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_events_shift ON attendance_events(shift_id);

CREATE TABLE IF NOT EXISTS attendance_adjustment_requests (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shift_id            UUID,
  user_id             UUID        NOT NULL,
  requested_by        UUID,
  type                TEXT        NOT NULL DEFAULT 'correction',
  work_date           DATE,
  requested_check_in  TIMESTAMPTZ,
  requested_check_out TIMESTAMPTZ,
  reason              TEXT,
  status              TEXT        NOT NULL DEFAULT 'pending',
  reviewed_by         UUID,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attendance_adj_org ON attendance_adjustment_requests(org_id);

CREATE TABLE IF NOT EXISTS attendance_schedule_days (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID        NOT NULL,
  day_of_week INTEGER     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TEXT        NOT NULL DEFAULT '09:00',
  end_time    TEXT        NOT NULL DEFAULT '17:00',
  is_active   BOOLEAN     NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_attendance_sched_days ON attendance_schedule_days(schedule_id);

CREATE TABLE IF NOT EXISTS bundle_subscriptions (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id        UUID          NOT NULL,
  service_id         UUID,
  bundle_id          UUID,
  start_date         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  end_date           TIMESTAMPTZ,
  status             TEXT          NOT NULL DEFAULT 'active',
  sessions_total     INTEGER       NOT NULL DEFAULT 0,
  sessions_remaining INTEGER       NOT NULL DEFAULT 0,
  amount_paid        NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes              TEXT,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bundle_subs_org      ON bundle_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_bundle_subs_customer ON bundle_subscriptions(org_id, customer_id);

CREATE TABLE IF NOT EXISTS flower_page_configs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  config     JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
