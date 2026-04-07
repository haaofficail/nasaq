-- Migration 107: Add image fields + delivery zones to flower builder system

-- Image for builder catalog items (packaging, gifts, cards)
ALTER TABLE flower_builder_items
  ADD COLUMN IF NOT EXISTS image TEXT;

-- Image for flower inventory items
ALTER TABLE flower_inventory
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Delivery zones stored in page config JSONB (no extra columns needed)
-- config JSONB already stores everything — already correct schema
