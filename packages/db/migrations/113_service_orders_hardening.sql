-- ═══════════════════════════════════════════════════════════════
-- 113: Service Orders Hardening — version + cancel tracking
-- Brings service_orders to same level as flower/work/online orders
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS version            INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at       TIMESTAMPTZ;
