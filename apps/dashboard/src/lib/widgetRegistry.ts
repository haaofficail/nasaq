/**
 * Widget Registry
 *
 * Single source of truth for all widget gating rules.
 * Every widget that exists in the system is registered here
 * with its full context requirements.
 *
 * ProfileDashboard runs passesContextGate() before rendering
 * any widget — no widget renders without passing this check.
 */

export interface WidgetGatingRules {
  // ALL of these capabilities must be present ([] = no requirement)
  requiredCapabilities: string[];
  // org.businessType must be in this list ([] = all business types)
  allowedBusinessTypes: string[];
  // org.operatingProfile must be in this list ([] = all profiles)
  allowedOperatingProfiles: string[];
}

export interface WidgetContextGate extends WidgetGatingRules {
  id: string;
}

/**
 * Registry entry for each widget ID.
 * IDs must match the `id` field in DashboardProfile.widgets arrays.
 */
export const WIDGET_REGISTRY: Record<string, WidgetContextGate> = {

  // ──────────────────────────────────────────────────────────
  // Universal widgets — available to all business types
  // Only require the capability that their data depends on
  // ──────────────────────────────────────────────────────────
  "booking-status": {
    id: "booking-status",
    requiredCapabilities: ["bookings"],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
  },
  "recent-bookings": {
    id: "recent-bookings",
    requiredCapabilities: ["bookings"],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
  },
  "top-services": {
    id: "top-services",
    requiredCapabilities: ["catalog"],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
  },
  "staff-availability": {
    id: "staff-availability",
    requiredCapabilities: ["attendance"],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
  },
  "inventory-alert": {
    id: "inventory-alert",
    requiredCapabilities: ["inventory"],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
  },

  // ──────────────────────────────────────────────────────────
  // FLORIST-ONLY widgets — MUST NOT render for other business types
  // ──────────────────────────────────────────────────────────
  "flower-stock": {
    id: "flower-stock",
    requiredCapabilities: ["floral"],
    allowedBusinessTypes: ["flower_shop", "flowers"],
    allowedOperatingProfiles: [],
  },
  "expiring-batches-widget": {
    id: "expiring-batches-widget",
    requiredCapabilities: ["floral"],
    allowedBusinessTypes: ["flower_shop", "flowers"],
    allowedOperatingProfiles: [],
  },
  "flower-orders-widget": {
    id: "flower-orders-widget",
    requiredCapabilities: ["floral"],
    allowedBusinessTypes: ["flower_shop", "flowers"],
    allowedOperatingProfiles: [],
  },

  // ──────────────────────────────────────────────────────────
  // HOTEL-ONLY widget
  // ──────────────────────────────────────────────────────────
  "room-status": {
    id: "room-status",
    requiredCapabilities: ["hotel"],
    allowedBusinessTypes: ["hotel"],
    allowedOperatingProfiles: [],
  },

  // ──────────────────────────────────────────────────────────
  // CAR RENTAL-ONLY widget
  // ──────────────────────────────────────────────────────────
  "fleet-status": {
    id: "fleet-status",
    requiredCapabilities: ["car_rental"],
    allowedBusinessTypes: ["car_rental"],
    allowedOperatingProfiles: [],
  },

  // ──────────────────────────────────────────────────────────
  // BEAUTY & WELLNESS — salon/barber/spa only
  // ──────────────────────────────────────────────────────────
  "today-schedule": {
    id: "today-schedule",
    requiredCapabilities: ["bookings"],
    allowedBusinessTypes: ["salon", "barber", "spa", "fitness"],
    allowedOperatingProfiles: [],
  },

  // ──────────────────────────────────────────────────────────
  // ONLINE ORDERS widget — restaurant/food/delivery only
  // ──────────────────────────────────────────────────────────
  "online-orders-widget": {
    id: "online-orders-widget",
    requiredCapabilities: ["online_orders"],
    allowedBusinessTypes: ["restaurant", "cafe", "bakery", "catering"],
    allowedOperatingProfiles: [],
  },
};

/**
 * Check whether a widget should render given the current org context and user role.
 *
 * Rules (ALL must pass):
 * 1. businessType is in allowedBusinessTypes (or list is empty)
 * 2. operatingProfile is in allowedOperatingProfiles (or list is empty)
 * 3. ALL requiredCapabilities are present in org capabilities
 *
 * If the widget ID is not in the registry → ALLOW (safe default for unknown widgets
 * avoids silently hiding legitimately new widgets during rollout).
 */
export function passesContextGate(
  widgetId: string,
  ctx: {
    businessType: string;
    operatingProfile: string;
    capabilities: string[];
  }
): boolean {
  const gate = WIDGET_REGISTRY[widgetId];
  if (!gate) return true; // unknown widget → allow (fail-open for new widgets)

  if (
    gate.allowedBusinessTypes.length > 0 &&
    !gate.allowedBusinessTypes.includes(ctx.businessType)
  ) {
    return false;
  }

  if (
    gate.allowedOperatingProfiles.length > 0 &&
    !gate.allowedOperatingProfiles.includes(ctx.operatingProfile)
  ) {
    return false;
  }

  if (gate.requiredCapabilities.some((cap) => !ctx.capabilities.includes(cap))) {
    return false;
  }

  return true;
}
