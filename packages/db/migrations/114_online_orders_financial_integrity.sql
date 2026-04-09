-- ═══════════════════════════════════════════════════════════════
-- 114: Online Orders Financial Integrity
-- Adds journal_entry_id so financial postings can be tracked
-- and reversed on cancellation (matching flower_orders / work_orders).
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE online_orders
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_online_orders_journal
  ON online_orders(journal_entry_id) WHERE journal_entry_id IS NOT NULL;
