-- Migration 020: New service type taxonomy
-- Current enum values: reservation, product, digital, rental, package, ticket
-- New values to add: appointment, execution, field_service, event_rental,
--                    product_shipping, food_order, add_on, project
-- Note: PostgreSQL does not support removing enum values; old values are kept
--       but Zod validation prevents new records from using them.

-- 1. Add new enum values
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'appointment';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'execution';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'field_service';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'event_rental';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'product_shipping';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'food_order';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'add_on';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'project';

-- 2. Migrate existing records to new canonical types
UPDATE services SET service_type = 'appointment'      WHERE service_type = 'reservation';
UPDATE services SET service_type = 'project'          WHERE service_type = 'digital';
UPDATE services SET service_type = 'product'          WHERE service_type = 'ticket';
-- rental, product, package → unchanged
