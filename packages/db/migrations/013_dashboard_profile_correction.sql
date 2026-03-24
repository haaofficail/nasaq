-- ============================================================
-- Migration 013: Dashboard Profile Data Correction
-- Re-derives dashboard_profile for all orgs where it is still
-- "default" (never explicitly set) so the backend cache starts
-- with the correct value on next resolveOrgContext() call.
--
-- This is a safe, idempotent update — it only touches orgs
-- whose dashboard_profile = 'default', which is the column
-- default for all pre-existing orgs.
--
-- orgs that had dashboard_profile explicitly set by an admin
-- override are left untouched.
-- ============================================================

-- 1. Map businessType + operatingProfile → correct dashboard_profile
--    for every business type that has a known non-default profile.
UPDATE organizations
SET dashboard_profile = CASE
  -- Flower shop profiles
  WHEN business_type IN ('flower_shop','flowers') AND operating_profile = 'florist_kosha'           THEN 'flower_kosha'
  WHEN business_type IN ('flower_shop','flowers') AND operating_profile = 'florist_contract_supply' THEN 'flower_wholesale'
  WHEN business_type IN ('flower_shop','flowers') AND operating_profile = 'florist_events'          THEN 'flower_kosha'
  WHEN business_type IN ('flower_shop','flowers')                                                   THEN 'flower_shop'
  -- Beauty
  WHEN business_type IN ('salon','fitness')  AND operating_profile = 'salon_home_service' THEN 'salon_home'
  WHEN business_type = 'spa'                                                               THEN 'spa'
  WHEN business_type = 'barber'                                                            THEN 'barber'
  WHEN business_type IN ('salon','fitness')                                                THEN 'salon'
  -- Food & Beverage
  WHEN business_type = 'restaurant' AND operating_profile IN ('restaurant_delivery','restaurant_cloud_kitchen') THEN 'restaurant_delivery'
  WHEN business_type = 'restaurant' AND operating_profile = 'restaurant_catering'         THEN 'catering'
  WHEN business_type = 'restaurant'                                                        THEN 'restaurant'
  WHEN business_type = 'cafe'                                                              THEN 'cafe'
  WHEN business_type = 'bakery'                                                            THEN 'bakery'
  WHEN business_type = 'catering'                                                          THEN 'catering'
  -- Hospitality
  WHEN business_type = 'hotel'                                                             THEN 'hotel'
  WHEN business_type = 'car_rental'                                                        THEN 'car_rental'
  WHEN business_type = 'rental'                                                            THEN 'rental'
  -- Events
  WHEN business_type = 'event_organizer' OR operating_profile IN
       ('event_full_planning','event_coordination','event_production','event_hybrid')       THEN 'event_organizer'
  WHEN business_type IN ('events','events_vendor')                                         THEN 'events'
  -- Retail
  WHEN business_type IN ('retail','store','printing') AND operating_profile IN
       ('retail_pro','omnichannel_selling','wholesale_distribution')                        THEN 'retail_pro'
  WHEN business_type IN ('retail','store','printing')                                      THEN 'retail'
  -- Digital / Creative
  WHEN business_type IN ('digital_services','marketing','agency','technology')             THEN 'digital_services'
  -- Photography
  WHEN business_type = 'photography'                                                       THEN 'photography'
  -- Generic services (maintenance, medical, etc.)
  WHEN business_type IN ('maintenance','workshop','real_estate','laundry',
                          'services','medical','education','construction','logistics')      THEN 'services'
  -- All others remain default
  ELSE 'default'
END
WHERE dashboard_profile = 'default';

-- 2. Sanity check: clear any stale TTL-cached context by bumping updated_at
--    (the API cache uses a 5-minute TTL so this is self-healing, but bumping
--    updated_at ensures the next settings API call sees fresh data)
UPDATE organizations
SET updated_at = NOW()
WHERE dashboard_profile != 'default'
  AND updated_at < NOW() - INTERVAL '1 day';
