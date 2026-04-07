-- ═══════════════════════════════════════════════════════════════
-- 100: Service Order Integration — Customer, Finance, Staff
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Link service orders to customers table ────────────────────
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- ── 2. Link service orders to journal entries ─────────────────────
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL;

-- ── 3. Staff assignment for service orders ────────────────────────
CREATE TABLE IF NOT EXISTS service_order_staff (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID        NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  org_id           UUID        NOT NULL,
  employee_id      UUID        NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  role             TEXT        NOT NULL DEFAULT 'field_worker',
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(service_order_id, employee_id)
);

-- ── 4. Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_so_customer_id  ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sos_order       ON service_order_staff(service_order_id);
CREATE INDEX IF NOT EXISTS idx_sos_employee    ON service_order_staff(employee_id, org_id);
