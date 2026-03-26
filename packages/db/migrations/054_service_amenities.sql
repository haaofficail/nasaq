-- Migration 054: Service amenities
-- Adds amenities JSONB array to services table (used by rental, hotel, chalet, camp, apartment types)

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS amenities jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN services.amenities IS 'Array of amenity keys e.g. ["wifi","pool","ac","parking"]';
