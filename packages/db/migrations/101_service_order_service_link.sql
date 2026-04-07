-- ═══════════════════════════════════════════════════════════════
-- 101: Link service_orders → services catalog
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_so_service_id ON service_orders(service_id);
