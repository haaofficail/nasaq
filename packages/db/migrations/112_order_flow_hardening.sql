-- Migration 112: Order Flow Hardening
-- Adds version column for optimistic locking + journal_entry_id for idempotent financial posting
-- on all order tables that were missing these critical fields.

-- ── flower_orders ─────────────────────────────────────────────────────────────
ALTER TABLE flower_orders
  ADD COLUMN IF NOT EXISTS version          INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID    REFERENCES journal_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_flower_orders_journal
  ON flower_orders(journal_entry_id) WHERE journal_entry_id IS NOT NULL;

-- ── online_orders ─────────────────────────────────────────────────────────────
ALTER TABLE online_orders
  ADD COLUMN IF NOT EXISTS version          INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID    REFERENCES journal_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_online_orders_journal
  ON online_orders(journal_entry_id) WHERE journal_entry_id IS NOT NULL;

-- ── work_orders ───────────────────────────────────────────────────────────────
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS version          INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID    REFERENCES journal_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_journal
  ON work_orders(journal_entry_id) WHERE journal_entry_id IS NOT NULL;

-- ── service_orders (journal_entry_id exists, add version) ─────────────────────
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
