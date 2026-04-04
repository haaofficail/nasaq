import { eq, or, and, isNull } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { organizations, organizationCapabilityOverrides, businessVocabulary, planCapabilities } from "@nasaq/db/schema";
import { getBusinessDefaults } from "./helpers";

// ============================================================
// ORG CONTEXT RESOLVER
// Single source of truth for all org-level decisions:
//   businessType → operatingProfile → capabilities → dashboardProfile → vocabulary
// ============================================================

export interface OrgContext {
  orgId: string;
  orgCode: string | null;
  businessType: string;
  operatingProfile: string;
  serviceDeliveryModes: string[];
  capabilities: string[];        // merged: base + overrides
  dashboardProfile: string;
  vocabulary: Record<string, string>;  // termKey → valueAr
  plan: string;
}

// Simple in-memory TTL cache (per-process, refreshes every 5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { ctx: OrgContext; expiresAt: number }>();

export async function resolveOrgContext(orgId: string): Promise<OrgContext | null> {
  const now = Date.now();
  const cached = cache.get(orgId);
  if (cached && cached.expiresAt > now) return cached.ctx;

  // 1. Load org base fields
  const [org] = await db
    .select({
      orgCode: organizations.orgCode,
      businessType: organizations.businessType,
      operatingProfile: organizations.operatingProfile,
      serviceDeliveryModes: organizations.serviceDeliveryModes,
      enabledCapabilities: organizations.enabledCapabilities,
      dashboardProfile: organizations.dashboardProfile,
      plan: organizations.plan,
      isActive: organizations.isActive,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org || !org.isActive) return null;

  const businessType = org.businessType ?? "general";
  const operatingProfile = org.operatingProfile ?? "general";

  // 2. Decision chain: businessType → plan → operatingProfile → org stored caps → overrides
  //    Step 1: derive default capabilities from businessType
  const typeDefaults = getBusinessDefaults(businessType);
  const defaultCaps = new Set<string>(typeDefaults.enabledCapabilities);

  //    Step 2: plan capabilities (authoritative — from plan_capabilities table)
  const planCaps = await db
    .select({ capabilityKey: planCapabilities.capabilityKey })
    .from(planCapabilities)
    .where(and(eq(planCapabilities.planCode, org.plan ?? "basic"), eq(planCapabilities.enabled, true)));
  for (const cap of planCaps) defaultCaps.add(cap.capabilityKey);

  //    Step 3: apply operatingProfile additions on top of businessType + plan defaults
  const profileAdditions = getProfileCapabilityAdditions(businessType, operatingProfile);
  for (const cap of profileAdditions) defaultCaps.add(cap);

  //    Step 4: merge with org-stored enabledCapabilities (backward compat cache — still honored)
  const storedCaps = (org.enabledCapabilities as string[]) ?? [];
  for (const cap of storedCaps) defaultCaps.add(cap);

  //    Step 5: apply organization_capability_overrides (force-on / force-off)
  const overrides = await db
    .select({ capabilityKey: organizationCapabilityOverrides.capabilityKey, enabled: organizationCapabilityOverrides.enabled })
    .from(organizationCapabilityOverrides)
    .where(eq(organizationCapabilityOverrides.orgId, orgId));

  let capabilities = Array.from(defaultCaps);
  for (const override of overrides) {
    if (override.enabled && !capabilities.includes(override.capabilityKey)) {
      capabilities.push(override.capabilityKey);
    } else if (!override.enabled) {
      capabilities = capabilities.filter(c => c !== override.capabilityKey);
    }
  }

  // 3. Load vocabulary (global for businessType + org-specific overrides, org wins)
  const vocabRows = await db
    .select({ termKey: businessVocabulary.termKey, valueAr: businessVocabulary.valueAr, orgId: businessVocabulary.orgId })
    .from(businessVocabulary)
    .where(
      // global defaults for this businessType OR org-specific overrides
      or(
        and(eq(businessVocabulary.businessType, businessType), isNull(businessVocabulary.orgId)),
        eq(businessVocabulary.orgId, orgId)
      )
    );

  const vocabulary: Record<string, string> = {};
  // First pass: globals (no orgId)
  for (const row of vocabRows) {
    if (!row.orgId) vocabulary[row.termKey] = row.valueAr;
  }
  // Second pass: org-specific wins
  for (const row of vocabRows) {
    if (row.orgId === orgId) vocabulary[row.termKey] = row.valueAr;
  }

  // 4. Derive dashboardProfile from businessType + operatingProfile + capabilities
  // Treat "default" stored explicitly the same as NULL — let deriveDashboardProfile run for known business types.
  // This prevents admin-set "default" from blocking proper profile selection for restaurants, cafés, salons, etc.
  const storedProfile = (org.dashboardProfile && org.dashboardProfile !== "default") ? org.dashboardProfile : null;
  const dashboardProfile = storedProfile ?? deriveDashboardProfile(businessType, operatingProfile, capabilities);

  const ctx: OrgContext = {
    orgId,
    orgCode: org.orgCode ?? null,
    businessType,
    operatingProfile,
    serviceDeliveryModes: (org.serviceDeliveryModes as string[]) ?? [],
    capabilities,
    dashboardProfile,
    vocabulary,
    plan: org.plan ?? "basic",
  };

  cache.set(orgId, { ctx, expiresAt: now + CACHE_TTL_MS });
  return ctx;
}

/**
 * Invalidate the cached context for an org — call after org settings update
 */
export function invalidateOrgContext(orgId: string): void {
  cache.delete(orgId);
}

/**
 * Check if an org has a capability enabled (uses cache)
 */
export async function orgHasCapability(orgId: string, capability: string): Promise<boolean> {
  const ctx = await resolveOrgContext(orgId);
  if (!ctx) return false;
  return ctx.capabilities.includes(capability);
}

/**
 * Returns additional capabilities unlocked by a specific operatingProfile
 * on top of the businessType defaults. Enables profile-level specialization.
 */
function getProfileCapabilityAdditions(businessType: string, operatingProfile: string): string[] {
  const additions: Record<string, string[]> = {
    // Flower shop profiles
    florist_kosha:            ["kosha", "contracts", "floral"],
    florist_contract_supply:  ["flower_master", "inventory", "suppliers", "contracts"],
    florist_hybrid:           ["kosha", "floral", "inventory"],
    florist_events:           ["kosha", "contracts", "attendance"],
    // Salon / beauty profiles
    salon_home_service:       ["delivery", "schedules"],
    salon_spa:                ["inventory", "pos"],
    // Restaurant profiles
    restaurant_delivery:      ["delivery", "online_orders"],
    restaurant_cloud_kitchen: ["delivery", "online_orders"],
    restaurant_catering:      ["contracts", "inventory"],
    restaurant_hybrid:        ["delivery", "online_orders", "pos"],
    // Hotel profiles
    hotel_apartments:         ["contracts"],
    hotel_resort:             ["inventory", "pos"],
    hotel_hybrid:             ["contracts", "pos"],
    // Car rental profiles
    car_rental_long_term:     ["contracts"],
    car_rental_chauffeur:     ["schedules", "attendance"],
    // Rental profiles
    rental_equipment:         ["assets", "contracts"],
    rental_furniture:         ["assets", "contracts", "delivery"],
    rental_venues:            ["contracts", "attendance"],
    rental_hybrid:            ["assets", "contracts", "inventory"],
    rental_event_based:       ["assets", "contracts", "attendance"],
    rental_warehouse:         ["assets", "inventory", "suppliers"],
    // Events profiles
    events_full:              ["inventory", "contracts", "attendance", "kosha"],
    events_decor:             ["inventory", "kosha"],
    event_full_planning:      ["inventory", "contracts", "attendance"],
    event_coordination:       ["contracts", "schedules"],
    event_production:         ["inventory", "attendance", "assets"],
    event_hybrid:             ["inventory", "contracts", "attendance", "assets"],
    // Events vendor profiles
    events_vendor_rental:     ["assets", "contracts"],
    events_vendor_decor:      ["inventory", "kosha"],
    events_vendor_catering:   ["inventory", "contracts", "pos"],
    events_vendor_media:      ["media", "contracts"],
    events_vendor_hybrid:     ["assets", "inventory", "contracts"],
    // Digital / creative profiles
    digital_projects:         ["contracts"],
    digital_subscriptions:    ["contracts"],
    digital_agency:           ["contracts", "attendance"],
    digital_freelance:        ["contracts"],
    digital_hybrid:           ["contracts", "attendance", "inventory"],
    // Photography profiles
    photography_studio:       ["media", "contracts"],
    photography_events:       ["contracts", "attendance"],
    // Retail profiles
    retail_standard:          ["inventory", "pos"],
    retail_pro:               ["inventory", "pos", "accounting"],
    omnichannel_selling:      ["inventory", "online_orders", "pos", "website"],
    wholesale_distribution:   ["inventory", "suppliers", "contracts", "accounting"],
    b2b_sales:                ["contracts", "accounting"],
    // Field service profiles
    field_service:            ["attendance", "schedules"],
    appointments:             ["schedules"],
    projects:                 ["contracts", "attendance"],
    subscription_service:     ["contracts"],
    hybrid:                   ["schedules", "contracts"],
    // Real estate profiles
    real_estate_rental:       ["contracts", "assets"],
  };
  return additions[operatingProfile] ?? [];
}

/**
 * Derive dashboard profile key from businessType + operatingProfile + capabilities.
 * Capabilities can override the profile (e.g. kosha capability → flower_kosha dashboard).
 * Falls back to businessType, then "default".
 * Exported for unit testing.
 */
export function deriveDashboardProfile(businessType: string, operatingProfile: string, capabilities: string[]): string {
  // Capability-based overrides (highest priority — explicit feature enables a specific profile)
  if (businessType === "flower_shop" || businessType === "flowers") {
    if (capabilities.includes("kosha") && capabilities.includes("flower_master")) return "flower_full";
    if (capabilities.includes("kosha"))         return "flower_kosha";
    if (capabilities.includes("flower_master")) return "flower_wholesale";
  }
  if (capabilities.includes("hotel"))      return "hotel";
  if (capabilities.includes("car_rental")) return "car_rental";
  if (capabilities.includes("online_orders") && businessType === "restaurant") return "restaurant_delivery";

  // Profile map: operatingProfile → dashboardProfile key
  const profileMap: Record<string, string> = {
    // Flower shop
    florist_retail:            "flower_shop",
    florist_kosha:             "flower_kosha",
    florist_contract_supply:   "flower_wholesale",
    florist_hybrid:            "flower_shop",
    florist_events:            "flower_kosha",
    // Salon / beauty
    salon_in_branch:           "salon",
    salon_home_service:        "salon_home",
    salon_spa:                 "spa",
    salon_hybrid:              "salon",
    // Restaurant
    restaurant_dine_in:        "restaurant",
    restaurant_takeaway:       "restaurant",
    restaurant_hybrid:         "restaurant",
    restaurant_delivery:       "restaurant_delivery",
    restaurant_cloud_kitchen:  "restaurant_delivery",
    restaurant_catering:       "catering",
    // Hotel
    hotel_standard:            "hotel",
    hotel_apartments:          "hotel",
    hotel_resort:              "hotel",
    hotel_hybrid:              "hotel",
    // Car rental
    car_rental_daily:          "car_rental",
    car_rental_long_term:      "car_rental",
    car_rental_chauffeur:      "car_rental",
    // Rental
    rental_equipment:          "rental",
    rental_furniture:          "rental",
    rental_venues:             "rental",
    rental_event_based:        "rental",
    rental_warehouse:          "rental",
    rental_hybrid:             "rental",
    rental_daily:              "rental",
    // Events
    events_full:               "events",
    events_decor:              "events",
    events_catering_only:      "catering",
    event_full_planning:       "event_organizer",
    event_coordination:        "event_organizer",
    event_production:          "event_organizer",
    event_hybrid:              "event_organizer",
    // Events vendor
    events_vendor_rental:      "events",
    events_vendor_decor:       "events",
    events_vendor_catering:    "catering",
    events_vendor_media:       "photography",
    events_vendor_hybrid:      "events",
    // Digital
    digital_projects:          "digital_services",
    digital_subscriptions:     "digital_services",
    digital_agency:            "digital_services",
    digital_freelance:         "digital_services",
    digital_hybrid:            "digital_services",
    // Photography
    photography_studio:        "photography",
    photography_events:        "photography",
    // Retail
    retail_standard:           "retail",
    retail_pro:                "retail_pro",
    omnichannel_selling:       "retail_pro",
    wholesale_distribution:    "retail_pro",
    b2b_sales:                 "retail",
    b2c_sales:                 "retail",
    // Field / appointments / projects
    field_service:             "services",
    appointments:              "services",
    projects:                  "services",
    subscription_service:      "services",
    hybrid:                    "services",
    // Workshop / repair
    workshop_repair:           "workshop",
    workshop_service:          "workshop",
    // Real estate
    real_estate_rental:        "real_estate",
  };

  if (operatingProfile !== "general" && profileMap[operatingProfile]) {
    return profileMap[operatingProfile];
  }

  // Fall back to businessType → dashboardProfile key mapping
  // ALL remaining types map to "default" unless explicitly listed here.
  // NEVER fallback to florist, hotel, or rental for unrelated business types.
  const typeMap: Record<string, string> = {
    flower_shop:      "flower_shop",
    flowers:          "flower_shop",
    salon:            "salon",
    barber:           "barber",
    spa:              "spa",
    fitness:          "fitness",
    hotel:            "hotel",
    car_rental:       "car_rental",
    rental:           "rental",
    restaurant:       "restaurant",
    cafe:             "cafe",
    bakery:           "bakery",
    catering:         "catering",
    events:           "events",
    event_organizer:  "event_organizer",
    events_vendor:    "events",
    photography:      "photography",
    printing:         "retail",
    retail:           "retail",
    store:            "retail",
    digital_services: "digital_services",
    marketing:        "digital_services",
    agency:           "digital_services",
    technology:       "digital_services",
    maintenance:      "maintenance",
    workshop:         "workshop",
    real_estate:      "real_estate",
    laundry:          "workshop",
    tailoring:        "workshop",
    services:         "services",
    medical:          "services",
    education:        "services",
    construction:     "services",
    logistics:        "services",
    // Everything else → safe generic fallback
  };

  return typeMap[businessType] ?? "default";
}
