-- ═══════════════════════════════════════════════════════════════
-- 112: Order Flow Hardening — State Machine + Financial Integrity
-- Converts order flow from CRUD to an operational order system
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. flower_orders — journal_entry_id + payment_status + timestamps + cancel tracking + version
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE flower_orders
  ADD COLUMN IF NOT EXISTS journal_entry_id   UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status     TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS confirmed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version            INTEGER NOT NULL DEFAULT 1;

-- Enforce valid payment_status values at DB level
DO $$ BEGIN
  ALTER TABLE flower_orders ADD CONSTRAINT chk_flower_orders_payment_status
    CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid', 'refunded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_flower_orders_journal ON flower_orders(journal_entry_id) WHERE journal_entry_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 2. work_orders — journal_entry_id + payment_status + timestamps + cancel tracking + version
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS journal_entry_id   UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status     TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS confirmed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS diagnosing_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waiting_parts_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS in_progress_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version            INTEGER NOT NULL DEFAULT 1;

-- Enforce valid payment_status values at DB level
DO $$ BEGIN
  ALTER TABLE work_orders ADD CONSTRAINT chk_work_orders_payment_status
    CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid', 'refunded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_work_orders_journal ON work_orders(journal_entry_id) WHERE journal_entry_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 3. online_orders — payment_status + timestamps + cancel tracking + version
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE online_orders
  ADD COLUMN IF NOT EXISTS payment_status     TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS confirmed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preparing_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version            INTEGER NOT NULL DEFAULT 1;

-- Enforce valid payment_status values at DB level
DO $$ BEGIN
  ALTER TABLE online_orders ADD CONSTRAINT chk_online_orders_payment_status
    CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid', 'refunded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
