-- ============================================================
-- Migration 081: Canonical Booking Tables
-- جداول الحجز الكنونية — تعمل بالتوازي مع bookings (لا تحذفه)
-- bookings = legacy (قراءة فقط من هنا فصاعداً)
-- الجداول الجديدة = canonical write target
-- ============================================================

-- ============================================================
-- ENGINE TYPE: APPOINTMENT
-- الصالون، التصوير، الصيانة، أي خدمة بموعد
-- ============================================================

CREATE TABLE IF NOT EXISTS appointment_bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id),
  booking_ref       UUID REFERENCES bookings(id),        -- رابط الحجز الأصلي (للـ migration)

  booking_number    TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending',      -- pending|confirmed|in_progress|completed|cancelled|no_show
  payment_status    TEXT NOT NULL DEFAULT 'pending',

  -- التوقيت
  start_at          TIMESTAMPTZ NOT NULL,
  end_at            TIMESTAMPTZ,
  duration_minutes  INTEGER,

  -- الموقع
  location_id       UUID REFERENCES locations(id),
  location_note     TEXT,

  -- التعيين
  assigned_user_id  UUID REFERENCES users(id),

  -- المالية
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- بيانات إضافية
  source            TEXT DEFAULT 'dashboard',
  customer_notes    TEXT,
  internal_notes    TEXT,
  question_answers  JSONB DEFAULT '[]',
  rating            INTEGER,
  review_text       TEXT,
  reviewed_at       TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appt_bookings_org_idx       ON appointment_bookings(org_id);
CREATE INDEX IF NOT EXISTS appt_bookings_customer_idx  ON appointment_bookings(customer_id);
CREATE INDEX IF NOT EXISTS appt_bookings_start_at_idx  ON appointment_bookings(start_at);
CREATE INDEX IF NOT EXISTS appt_bookings_ref_idx       ON appointment_bookings(booking_ref);

COMMENT ON TABLE appointment_bookings IS
  'Engine: Appointment. For salons, photography, maintenance, and any time-slot service. Replaces bookings for appointment-type orgs.';

-- ============================================================
-- ENGINE TYPE: STAY
-- الفنادق وتأجير السيارات والإيجار اليومي
-- ============================================================

CREATE TABLE IF NOT EXISTS stay_bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id),
  booking_ref       UUID REFERENCES bookings(id),

  booking_number    TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending',
  payment_status    TEXT NOT NULL DEFAULT 'pending',
  stay_type         TEXT NOT NULL DEFAULT 'hotel',        -- hotel|car_rental|daily_rental

  -- الوحدة المحجوزة
  unit_id           UUID,                                 -- room_id أو vehicle_id حسب الـ stay_type
  unit_type         TEXT,                                 -- room|vehicle|property
  unit_snapshot     JSONB,                                -- snapshot of unit details at booking time

  -- الفترة
  check_in          TIMESTAMPTZ NOT NULL,
  check_out         TIMESTAMPTZ NOT NULL,
  nights            INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM check_out - check_in)::INTEGER
  ) STORED,

  -- التسجيل
  actual_check_in   TIMESTAMPTZ,
  actual_check_out  TIMESTAMPTZ,

  -- الضيوف/السائقون
  guest_count       INTEGER DEFAULT 1,
  driver_name       TEXT,
  driver_license    TEXT,

  -- الموقع
  pickup_location   TEXT,
  dropoff_location  TEXT,

  -- المالية
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,

  source            TEXT DEFAULT 'dashboard',
  customer_notes    TEXT,
  internal_notes    TEXT,
  cancelled_at      TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stay_bookings_org_idx      ON stay_bookings(org_id);
CREATE INDEX IF NOT EXISTS stay_bookings_customer_idx ON stay_bookings(customer_id);
CREATE INDEX IF NOT EXISTS stay_bookings_checkin_idx  ON stay_bookings(check_in);
CREATE INDEX IF NOT EXISTS stay_bookings_unit_idx     ON stay_bookings(unit_id);
CREATE INDEX IF NOT EXISTS stay_bookings_ref_idx      ON stay_bookings(booking_ref);

COMMENT ON TABLE stay_bookings IS
  'Engine: Stay. For hotels (room bookings), car rentals, and daily rentals. Unit = room or vehicle.';

-- ============================================================
-- ENGINE TYPE: TABLE RESERVATION
-- المطاعم والمقاهي وأي حجز طاولة
-- ============================================================

CREATE TABLE IF NOT EXISTS table_reservations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES customers(id),
  booking_ref       UUID REFERENCES bookings(id),

  reservation_number TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending',       -- pending|confirmed|seated|completed|cancelled|no_show

  -- الطاولة
  table_id          UUID,                                  -- restaurant tables
  table_snapshot    JSONB,                                 -- { number, capacity, section }
  covers            INTEGER NOT NULL DEFAULT 1,            -- عدد الأشخاص
  section           TEXT,                                  -- indoor|outdoor|private

  -- التوقيت
  reserved_at       TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER DEFAULT 90,
  seated_at         TIMESTAMPTZ,
  left_at           TIMESTAMPTZ,

  -- الطلب
  pre_order         JSONB DEFAULT '[]',                    -- طلبات مسبقة
  special_requests  TEXT,
  occasion          TEXT,                                  -- birthday|anniversary|business

  -- المالية (اختياري — بعض المطاعم لا تأخذ deposit)
  deposit_amount    NUMERIC(10,2) DEFAULT 0,
  paid_amount       NUMERIC(12,2) DEFAULT 0,

  source            TEXT DEFAULT 'dashboard',
  cancelled_at      TIMESTAMPTZ,
  cancellation_reason TEXT,
  no_show_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS table_res_org_idx       ON table_reservations(org_id);
CREATE INDEX IF NOT EXISTS table_res_customer_idx  ON table_reservations(customer_id);
CREATE INDEX IF NOT EXISTS table_res_at_idx        ON table_reservations(reserved_at);
CREATE INDEX IF NOT EXISTS table_res_table_idx     ON table_reservations(table_id);
CREATE INDEX IF NOT EXISTS table_res_ref_idx       ON table_reservations(booking_ref);

COMMENT ON TABLE table_reservations IS
  'Engine: Table. Restaurant and cafe table reservations with covers, sections, and pre-orders.';

-- ============================================================
-- ENGINE TYPE: EVENT BOOKING
-- الفعاليات، حفلات الأعراس، المؤتمرات
-- ============================================================

CREATE TABLE IF NOT EXISTS event_bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id),
  booking_ref       UUID REFERENCES bookings(id),

  booking_number    TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending',
  payment_status    TEXT NOT NULL DEFAULT 'pending',

  -- الفعالية
  event_type        TEXT,                                  -- wedding|corporate|birthday|conference
  event_name        TEXT,
  event_date        DATE NOT NULL,
  event_start       TIMESTAMPTZ,
  event_end         TIMESTAMPTZ,
  setup_at          TIMESTAMPTZ,
  teardown_at       TIMESTAMPTZ,

  -- الموقع
  location_id       UUID REFERENCES locations(id),
  custom_location   TEXT,
  location_notes    TEXT,

  -- الضيوف
  guest_count       INTEGER,
  confirmed_guests  INTEGER,

  -- الباقة
  package_id        UUID,                                  -- events.id أو packages
  package_snapshot  JSONB,

  -- المالية
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due       NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- التعيين
  assigned_user_id  UUID REFERENCES users(id),

  source            TEXT DEFAULT 'dashboard',
  customer_notes    TEXT,
  internal_notes    TEXT,
  question_answers  JSONB DEFAULT '[]',
  cancelled_at      TIMESTAMPTZ,
  cancellation_reason TEXT,
  refund_amount     NUMERIC(10,2),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_bookings_org_idx      ON event_bookings(org_id);
CREATE INDEX IF NOT EXISTS event_bookings_customer_idx ON event_bookings(customer_id);
CREATE INDEX IF NOT EXISTS event_bookings_date_idx     ON event_bookings(event_date);
CREATE INDEX IF NOT EXISTS event_bookings_ref_idx      ON event_bookings(booking_ref);

COMMENT ON TABLE event_bookings IS
  'Engine: Event. Weddings, corporate events, conferences, birthdays. Full event lifecycle with packages and guest management.';

-- ============================================================
-- BOOKING FACADE VIEW
-- نافذة موحدة تجمع كل أنواع الحجوزات للتقارير
-- ============================================================

CREATE OR REPLACE VIEW v_all_bookings AS
  -- Legacy bookings
  SELECT
    id, org_id, customer_id,
    booking_number,
    status, payment_status,
    'legacy'           AS engine,
    event_date         AS start_at,
    event_end_date     AS end_at,
    total_amount, paid_amount,
    source, created_at
  FROM bookings

  UNION ALL

  -- Appointment bookings
  SELECT
    id, org_id, customer_id,
    booking_number,
    status, payment_status,
    'appointment'      AS engine,
    start_at,
    end_at,
    total_amount, paid_amount,
    source, created_at
  FROM appointment_bookings

  UNION ALL

  -- Stay bookings
  SELECT
    id, org_id, customer_id,
    booking_number,
    status, payment_status,
    'stay'             AS engine,
    check_in           AS start_at,
    check_out          AS end_at,
    total_amount, paid_amount,
    source, created_at
  FROM stay_bookings

  UNION ALL

  -- Table reservations
  SELECT
    id, org_id, customer_id,
    reservation_number AS booking_number,
    status,
    'n/a'              AS payment_status,
    'table'            AS engine,
    reserved_at        AS start_at,
    NULL               AS end_at,
    deposit_amount     AS total_amount,
    paid_amount,
    source, created_at
  FROM table_reservations

  UNION ALL

  -- Event bookings
  SELECT
    id, org_id, customer_id,
    booking_number,
    status, payment_status,
    'event'            AS engine,
    event_start        AS start_at,
    event_end          AS end_at,
    total_amount, paid_amount,
    source, created_at
  FROM event_bookings;

COMMENT ON VIEW v_all_bookings IS
  'Booking Facade: read-only unified view across all booking engines. Use for reporting and dashboards only.';
