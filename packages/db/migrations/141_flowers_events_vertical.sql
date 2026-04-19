-- ═══════════════════════════════════════════════════════════════
-- 141: Flowers & Events Vertical
-- Additive-only: no existing columns removed or renamed
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Extend asset_types: inventoryType + unitLabel ─────────────
ALTER TABLE asset_types
  ADD COLUMN IF NOT EXISTS inventory_type TEXT NOT NULL DEFAULT 'asset',
  ADD COLUMN IF NOT EXISTS unit_label     TEXT;

COMMENT ON COLUMN asset_types.inventory_type IS 'asset = reusable event item (kosha frame, stand); consumable = fresh flowers, wrapping';
COMMENT ON COLUMN asset_types.unit_label     IS 'display unit label for flowers_events: ربطة، غصن، فازة، رول تغليف';

-- ── 2. flower_reservations — reserve batches before deduction ────
CREATE TABLE IF NOT EXISTS flower_reservations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_order_id UUID        REFERENCES service_orders(id) ON DELETE SET NULL,
  booking_id       UUID        REFERENCES bookings(id)       ON DELETE SET NULL,
  variant_id       UUID        NOT NULL REFERENCES flower_variants(id),
  batch_id         UUID        REFERENCES flower_batches(id) ON DELETE SET NULL,
  quantity         INTEGER     NOT NULL CHECK (quantity > 0),
  source_type      TEXT        NOT NULL DEFAULT 'service_order',
  source_id        UUID        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'reserved'
                               CHECK (status IN ('reserved','released','deducted')),
  reserved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at      TIMESTAMPTZ,
  deducted_at      TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flower_reservations_org_status_idx
  ON flower_reservations(org_id, status);
CREATE INDEX IF NOT EXISTS flower_reservations_service_order_idx
  ON flower_reservations(service_order_id) WHERE service_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS flower_reservations_variant_status_idx
  ON flower_reservations(variant_id, status);
CREATE INDEX IF NOT EXISTS flower_reservations_batch_idx
  ON flower_reservations(batch_id) WHERE batch_id IS NOT NULL;

-- ── 3. Bootstrap flowers_events orgs: set dashboard_profile ──────
UPDATE organizations
SET
  dashboard_profile      = 'flowers_events',
  enabled_capabilities   = '["bookings","customers","catalog","media","inventory","floral","pos","website","service_orders","assets"]'::jsonb,
  service_delivery_modes = '["at_customer_location","on_site","delivery","pickup"]'::jsonb
WHERE business_type = 'flowers_events'
  AND (dashboard_profile IS NULL OR dashboard_profile IN ('default','general'));
