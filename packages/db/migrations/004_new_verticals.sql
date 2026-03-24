-- ============================================================
-- Migration 004: New Verticals + Offering Type + Integrations
-- Run: psql $DATABASE_URL -f 004_new_verticals.sql
-- ============================================================

-- 1. offering_type enum (new)
DO $$ BEGIN
  CREATE TYPE offering_type AS ENUM (
    'service', 'product', 'package', 'rental',
    'room_booking', 'vehicle_rental', 'subscription',
    'digital_product', 'add_on', 'reservation', 'extra_charge'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add offering_type column to services table
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS offering_type offering_type NOT NULL DEFAULT 'service';

-- ============================================================
-- HOTEL SCHEMA
-- ============================================================

-- 3. room_status enum
DO $$ BEGIN
  CREATE TYPE room_status AS ENUM (
    'available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'out_of_service'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. hotel_reservation_status enum
DO $$ BEGIN
  CREATE TYPE hotel_reservation_status AS ENUM (
    'pending', 'confirmed', 'checked_in', 'checked_out',
    'cancelled', 'no_show', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. housekeeping_task_status enum
DO $$ BEGIN
  CREATE TYPE housekeeping_task_status AS ENUM (
    'pending', 'in_progress', 'completed', 'inspected', 'issue_reported'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. room_types table
CREATE TABLE IF NOT EXISTS room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  cover_image TEXT,
  images JSONB DEFAULT '[]',
  max_occupancy INTEGER NOT NULL DEFAULT 2,
  max_adults INTEGER,
  max_children INTEGER,
  bed_configuration TEXT,
  area_sqm NUMERIC(8,2),
  price_per_night NUMERIC(10,2) NOT NULL,
  weekend_price_per_night NUMERIC(10,2),
  amenities JSONB DEFAULT '[]',
  smoking_allowed BOOLEAN DEFAULT FALSE,
  pets_allowed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS room_types_org_idx ON room_types(org_id);

-- 7. room_units table
CREATE TABLE IF NOT EXISTS room_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  room_number TEXT NOT NULL,
  floor INTEGER,
  building TEXT,
  status room_status NOT NULL DEFAULT 'available',
  price_override NUMERIC(10,2),
  notes_for_staff TEXT,
  last_cleaned_at TIMESTAMPTZ,
  last_inspected_at TIMESTAMPTZ,
  images JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS room_units_org_idx ON room_units(org_id);
CREATE INDEX IF NOT EXISTS room_units_type_idx ON room_units(room_type_id);

-- 8. hotel_reservations table
CREATE TABLE IF NOT EXISTS hotel_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
  room_unit_id UUID REFERENCES room_units(id) ON DELETE SET NULL,
  customer_id UUID,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  guest_id_number TEXT,
  guest_nationality TEXT,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  check_in_date TIMESTAMPTZ NOT NULL,
  check_out_date TIMESTAMPTZ NOT NULL,
  nights INTEGER NOT NULL,
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,
  price_per_night NUMERIC(10,2) NOT NULL,
  total_room_cost NUMERIC(10,2) NOT NULL,
  extra_services_cost NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  status hotel_reservation_status NOT NULL DEFAULT 'pending',
  source TEXT DEFAULT 'direct',
  channel_reservation_id TEXT,
  extra_services JSONB DEFAULT '[]',
  special_requests TEXT,
  internal_notes TEXT,
  assigned_staff_id UUID,
  invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hotel_reservations_org_idx ON hotel_reservations(org_id);
CREATE INDEX IF NOT EXISTS hotel_reservations_dates_idx ON hotel_reservations(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS hotel_reservations_room_idx ON hotel_reservations(room_unit_id);

-- 9. housekeeping_logs table
CREATE TABLE IF NOT EXISTS housekeeping_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  room_unit_id UUID NOT NULL REFERENCES room_units(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES hotel_reservations(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL DEFAULT 'cleaning',
  priority TEXT NOT NULL DEFAULT 'normal',
  status housekeeping_task_status NOT NULL DEFAULT 'pending',
  assigned_to_id UUID,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  issues TEXT,
  photos JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS housekeeping_org_idx ON housekeeping_logs(org_id);
CREATE INDEX IF NOT EXISTS housekeeping_room_idx ON housekeeping_logs(room_unit_id);

-- 10. hotel_seasonal_pricing table
CREATE TABLE IF NOT EXISTS hotel_seasonal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  price_per_night NUMERIC(10,2) NOT NULL,
  min_nights INTEGER DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hotel_seasonal_pricing_org_idx ON hotel_seasonal_pricing(org_id);

-- ============================================================
-- CAR RENTAL SCHEMA
-- ============================================================

-- 11. vehicle_status enum
DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM (
    'available', 'reserved', 'rented', 'maintenance', 'inspection', 'out_of_service'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 12. car_rental_status enum
DO $$ BEGIN
  CREATE TYPE car_rental_status AS ENUM (
    'pending', 'confirmed', 'picked_up', 'returned', 'cancelled', 'no_show', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 13. inspection_type enum
DO $$ BEGIN
  CREATE TYPE inspection_type AS ENUM (
    'pre_rental', 'post_rental', 'routine', 'damage'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 14. vehicle_categories table
CREATE TABLE IF NOT EXISTS vehicle_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  image TEXT,
  price_per_day NUMERIC(10,2) NOT NULL,
  price_per_week NUMERIC(10,2),
  price_per_month NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'SAR',
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  min_rental_days INTEGER DEFAULT 1,
  max_rental_days INTEGER,
  min_driver_age INTEGER DEFAULT 21,
  mileage_limit INTEGER,
  extra_mileage_rate NUMERIC(8,2),
  insurance_included BOOLEAN DEFAULT FALSE,
  fuel_policy TEXT DEFAULT 'full_to_full',
  features JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicle_categories_org_idx ON vehicle_categories(org_id);

-- 15. vehicle_units table
CREATE TABLE IF NOT EXISTS vehicle_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES vehicle_categories(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  plate_number TEXT,
  vin TEXT,
  mileage INTEGER DEFAULT 0,
  status vehicle_status NOT NULL DEFAULT 'available',
  insurance_expiry TIMESTAMPTZ,
  registration_expiry TIMESTAMPTZ,
  daily_rate_override NUMERIC(10,2),
  internal_notes TEXT,
  images JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicle_units_org_idx ON vehicle_units(org_id);
CREATE INDEX IF NOT EXISTS vehicle_units_category_idx ON vehicle_units(category_id);

-- 16. car_rental_reservations table
CREATE TABLE IF NOT EXISTS car_rental_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES vehicle_categories(id) ON DELETE SET NULL,
  vehicle_unit_id UUID REFERENCES vehicle_units(id) ON DELETE SET NULL,
  customer_id UUID,
  driver_name TEXT NOT NULL,
  driver_phone TEXT,
  driver_email TEXT,
  driver_id_number TEXT,
  driver_license TEXT,
  driver_age INTEGER,
  pickup_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ NOT NULL,
  rental_days INTEGER NOT NULL,
  pickup_location_id UUID,
  return_location_id UUID,
  pickup_location_note TEXT,
  return_location_note TEXT,
  actual_pickup TIMESTAMPTZ,
  actual_return TIMESTAMPTZ,
  pickup_mileage INTEGER,
  return_mileage INTEGER,
  daily_rate NUMERIC(10,2) NOT NULL,
  total_rental_cost NUMERIC(10,2) NOT NULL,
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  deposit_returned BOOLEAN DEFAULT FALSE,
  extra_charges NUMERIC(10,2) DEFAULT 0,
  extra_charges_notes TEXT,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  deposit_paid BOOLEAN DEFAULT FALSE,
  status car_rental_status NOT NULL DEFAULT 'pending',
  add_ons JSONB DEFAULT '[]',
  source TEXT DEFAULT 'direct',
  special_requests TEXT,
  internal_notes TEXT,
  assigned_staff_id UUID,
  invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS car_rental_reservations_org_idx ON car_rental_reservations(org_id);
CREATE INDEX IF NOT EXISTS car_rental_reservations_dates_idx ON car_rental_reservations(pickup_date, return_date);
CREATE INDEX IF NOT EXISTS car_rental_reservations_vehicle_idx ON car_rental_reservations(vehicle_unit_id);

-- 17. vehicle_inspections table
CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vehicle_unit_id UUID NOT NULL REFERENCES vehicle_units(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES car_rental_reservations(id) ON DELETE SET NULL,
  inspection_type inspection_type NOT NULL,
  inspected_by UUID,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mileage_at_inspection INTEGER,
  fuel_level TEXT,
  exterior_condition TEXT DEFAULT 'good',
  interior_condition TEXT DEFAULT 'good',
  tires_condition TEXT DEFAULT 'good',
  has_damage BOOLEAN DEFAULT FALSE,
  damage_description TEXT,
  damage_photos JSONB DEFAULT '[]',
  damage_charge_amount NUMERIC(10,2),
  notes TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicle_inspections_org_idx ON vehicle_inspections(org_id);
CREATE INDEX IF NOT EXISTS vehicle_inspections_vehicle_idx ON vehicle_inspections(vehicle_unit_id);

-- ============================================================
-- INTEGRATIONS SCHEMA
-- ============================================================

-- 18. integration_type enum
DO $$ BEGIN
  CREATE TYPE integration_type AS ENUM (
    'booking_channel', 'food_delivery', 'last_mile', 'messaging',
    'payments', 'calendar', 'automation', 'ota', 'analytics', 'custom_webhook'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 19. integration_status enum
DO $$ BEGIN
  CREATE TYPE integration_status AS ENUM (
    'active', 'inactive', 'error', 'pending_setup', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 20. sync_job_status enum
DO $$ BEGIN
  CREATE TYPE sync_job_status AS ENUM (
    'queued', 'running', 'completed', 'failed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 21. integration_configs table
CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  provider_id TEXT NOT NULL,
  integration_name TEXT,
  integration_type integration_type NOT NULL,
  credentials JSONB DEFAULT '{}',
  entity_mappings JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  status integration_status NOT NULL DEFAULT 'pending_setup',
  last_sync_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS integration_configs_org_idx ON integration_configs(org_id);
CREATE INDEX IF NOT EXISTS integration_configs_provider_idx ON integration_configs(provider_id);

-- 22. webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_config_id UUID REFERENCES integration_configs(id) ON DELETE SET NULL,
  direction TEXT NOT NULL,
  provider_id TEXT,
  event_type TEXT,
  headers JSONB DEFAULT '{}',
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  internal_entity_type TEXT,
  internal_entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhook_logs_org_idx ON webhook_logs(org_id);
CREATE INDEX IF NOT EXISTS webhook_logs_created_idx ON webhook_logs(created_at);

-- 23. sync_jobs table
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_config_id UUID REFERENCES integration_configs(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status sync_job_status NOT NULL DEFAULT 'queued',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_summary TEXT,
  triggered_by TEXT DEFAULT 'scheduler',
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sync_jobs_org_idx ON sync_jobs(org_id);
