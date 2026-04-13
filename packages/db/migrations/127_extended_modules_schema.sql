-- ============================================================
-- Migration 127: Extended Modules Schema
-- جداول الوحدات الموسّعة — كانت في bootstrap فقط، الآن في migrations
-- ============================================================

-- ── Inventory: حركات المخزون ────────────────────────────────────────────────
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

-- ── Fulfillments: تخصيص الأصول للحجوزات ──────────────────────────────────────
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

-- ── Fulfillments: تنفيذ الحجوزات (مراحل) ───────────────────────────────────
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

-- ── Asset Maintenance Logs: سجل صيانة الأصول ───────────────────────────────
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

-- ── POS: إعدادات نقطة البيع ─────────────────────────────────────────────────
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

-- ── Messaging: سجلات الرسائل ────────────────────────────────────────────────
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

-- ── Messaging: إعدادات الرسائل ──────────────────────────────────────────────
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

-- ── Messaging: قوالب الرسائل ─────────────────────────────────────────────────
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

-- ── Messaging: الرسائل المجدولة ──────────────────────────────────────────────
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

-- ── WhatsApp: جلسات الاتصال ──────────────────────────────────────────────────
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

-- ── Attendance: سياسة الحضور ─────────────────────────────────────────────────
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

-- ── Attendance: أحداث الحضور ──────────────────────────────────────────────────
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

-- ── Attendance: طلبات تعديل الحضور ───────────────────────────────────────────
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

-- ── Attendance: أيام جداول الحضور ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_schedule_days (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID        NOT NULL,
  day_of_week INTEGER     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TEXT        NOT NULL DEFAULT '09:00',
  end_time    TEXT        NOT NULL DEFAULT '17:00',
  is_active   BOOLEAN     NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_attendance_sched_days ON attendance_schedule_days(schedule_id);

-- ── Bundles: اشتراكات الباقات ────────────────────────────────────────────────
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

-- ── Flower: إعدادات صفحة الورد ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flower_page_configs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  config     JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
