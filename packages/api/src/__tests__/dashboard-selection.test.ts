/**
 * Dashboard selection logic tests
 * Run: node --experimental-vm-modules --test src/__tests__/dashboard-selection.test.ts
 * (requires Node 18+, no additional deps)
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { deriveDashboardProfile } from "../lib/org-context.js";
import { getBusinessDefaults } from "../lib/helpers.js";

// ============================================================
// deriveDashboardProfile — core selection logic
// ============================================================
describe("deriveDashboardProfile: florist profiles", () => {
  test("flower_shop + florist_kosha → flower_kosha", () => {
    assert.equal(deriveDashboardProfile("flower_shop", "florist_kosha", []), "flower_kosha");
  });
  test("flower_shop + florist_contract_supply → flower_wholesale", () => {
    assert.equal(deriveDashboardProfile("flower_shop", "florist_contract_supply", []), "flower_wholesale");
  });
  test("flower_shop + florist_retail → flower_shop", () => {
    assert.equal(deriveDashboardProfile("flower_shop", "florist_retail", []), "flower_shop");
  });
  test("flower_shop + kosha + flower_master caps → flower_full", () => {
    assert.equal(deriveDashboardProfile("flower_shop", "general", ["kosha", "flower_master"]), "flower_full");
  });
  test("flower_shop + kosha cap only → flower_kosha", () => {
    assert.equal(deriveDashboardProfile("flower_shop", "general", ["kosha"]), "flower_kosha");
  });
  test("flower_shop + flower_master cap only → flower_wholesale", () => {
    assert.equal(deriveDashboardProfile("flower_shop", "general", ["flower_master"]), "flower_wholesale");
  });
});

describe("deriveDashboardProfile: non-florist must NEVER get florist profile", () => {
  test("restaurant → restaurant, not flower_shop", () => {
    const result = deriveDashboardProfile("restaurant", "restaurant_dine_in", []);
    assert.equal(result, "restaurant");
    assert.notEqual(result, "flower_shop");
    assert.notEqual(result, "flower_kosha");
    assert.notEqual(result, "flower_wholesale");
    assert.notEqual(result, "flower_full");
  });
  test("salon → salon, not flower_shop", () => {
    const result = deriveDashboardProfile("salon", "salon_in_branch", []);
    assert.ok(!/flower/.test(result));
  });
  test("hotel → hotel, not flower_shop", () => {
    const result = deriveDashboardProfile("hotel", "hotel_standard", ["hotel"]);
    assert.equal(result, "hotel");
    assert.ok(!/flower/.test(result));
  });
  test("digital_services → digital_services, not flower_shop", () => {
    const result = deriveDashboardProfile("digital_services", "digital_projects", []);
    assert.equal(result, "digital_services");
    assert.ok(!/flower/.test(result));
  });
  test("unknown businessType → default, not flower_shop", () => {
    const result = deriveDashboardProfile("unknown_biz", "general", []);
    assert.equal(result, "default");
    assert.ok(!/flower/.test(result));
  });
  test("maintenance → services, not flower_shop", () => {
    const result = deriveDashboardProfile("maintenance", "field_service", []);
    assert.equal(result, "services");
    assert.ok(!/flower/.test(result));
  });
});

describe("deriveDashboardProfile: food & beverage", () => {
  test("restaurant + delivery profile → restaurant_delivery", () => {
    assert.equal(deriveDashboardProfile("restaurant", "restaurant_delivery", ["online_orders"]), "restaurant_delivery");
  });
  test("restaurant + cloud kitchen → restaurant_delivery", () => {
    assert.equal(deriveDashboardProfile("restaurant", "restaurant_cloud_kitchen", ["online_orders"]), "restaurant_delivery");
  });
  test("cafe → cafe", () => {
    assert.equal(deriveDashboardProfile("cafe", "restaurant_dine_in", []), "cafe");
  });
  test("bakery → bakery", () => {
    assert.equal(deriveDashboardProfile("bakery", "restaurant_dine_in", []), "bakery");
  });
  test("catering → catering", () => {
    assert.equal(deriveDashboardProfile("catering", "restaurant_catering", []), "catering");
  });
});

describe("deriveDashboardProfile: events & digital", () => {
  test("event_organizer + event_full_planning profile → event_organizer", () => {
    assert.equal(deriveDashboardProfile("event_organizer", "event_full_planning", []), "event_organizer");
  });
  test("event_organizer businessType → event_organizer", () => {
    assert.equal(deriveDashboardProfile("event_organizer", "general", []), "event_organizer");
  });
  test("events_vendor → events", () => {
    assert.equal(deriveDashboardProfile("events_vendor", "general", []), "events");
  });
  test("digital_services + digital_projects profile → digital_services", () => {
    assert.equal(deriveDashboardProfile("digital_services", "digital_projects", []), "digital_services");
  });
  test("agency → digital_services", () => {
    assert.equal(deriveDashboardProfile("agency", "general", []), "digital_services");
  });
  test("marketing → digital_services", () => {
    assert.equal(deriveDashboardProfile("marketing", "general", []), "digital_services");
  });
});

describe("deriveDashboardProfile: generic services fallback", () => {
  test("services → services", () => {
    assert.equal(deriveDashboardProfile("services", "general", []), "services");
  });
  test("medical → services", () => {
    assert.equal(deriveDashboardProfile("medical", "general", []), "services");
  });
  test("construction → services", () => {
    assert.equal(deriveDashboardProfile("construction", "general", []), "services");
  });
  test("other → default", () => {
    assert.equal(deriveDashboardProfile("other", "general", []), "default");
  });
  test("completely unknown type → default", () => {
    assert.equal(deriveDashboardProfile("xyzzy", "general", []), "default");
  });
});

// ============================================================
// getBusinessDefaults — coverage for all major types
// ============================================================
describe("getBusinessDefaults: all major types have explicit defaults", () => {
  const typesRequiringExplicitDefaults = [
    "flower_shop", "restaurant", "cafe", "bakery", "catering",
    "salon", "barber", "spa", "fitness",
    "hotel", "car_rental", "rental",
    "events", "event_organizer", "events_vendor",
    "photography", "retail", "digital_services",
    "marketing", "agency", "maintenance", "services", "medical",
  ];

  for (const bt of typesRequiringExplicitDefaults) {
    test(`${bt} has explicit defaults (not general fallback)`, () => {
      const defaults = getBusinessDefaults(bt);
      assert.notEqual(defaults.operatingProfile, "general",
        `${bt} should have a specific operatingProfile, got 'general'`);
      assert.ok(defaults.enabledCapabilities.length >= 4,
        `${bt} should have at least 4 enabled capabilities`);
    });
  }
});

describe("getBusinessDefaults: capability safety", () => {
  test("flower_shop has floral capability", () => {
    const d = getBusinessDefaults("flower_shop");
    assert.ok(d.enabledCapabilities.includes("floral"));
  });
  test("hotel has hotel capability", () => {
    const d = getBusinessDefaults("hotel");
    assert.ok(d.enabledCapabilities.includes("hotel"));
  });
  test("car_rental has car_rental capability", () => {
    const d = getBusinessDefaults("car_rental");
    assert.ok(d.enabledCapabilities.includes("car_rental"));
  });
  test("digital_services has contracts capability", () => {
    const d = getBusinessDefaults("digital_services");
    assert.ok(d.enabledCapabilities.includes("contracts"));
  });
  test("restaurant has pos capability", () => {
    const d = getBusinessDefaults("restaurant");
    assert.ok(d.enabledCapabilities.includes("pos"));
  });
});

// ============================================================
// passesContextGate — widget gating logic
// Tests the contract of the gating algorithm:
//   businessType + operatingProfile + capabilities → widget visible or not
// This mirrors apps/dashboard/src/lib/widgetRegistry.ts exactly.
// ============================================================

/** Minimal inline replica of passesContextGate for API-side testing */
type WidgetGate = { requiredCapabilities: string[]; allowedBusinessTypes: string[]; allowedOperatingProfiles: string[] };
const WIDGET_REGISTRY: Record<string, WidgetGate> = {
  "weekly-chart":             { requiredCapabilities: ["bookings"],      allowedBusinessTypes: [],                               allowedOperatingProfiles: [] },
  "booking-status":           { requiredCapabilities: ["bookings"],      allowedBusinessTypes: [],                               allowedOperatingProfiles: [] },
  "recent-bookings":          { requiredCapabilities: ["bookings"],      allowedBusinessTypes: [],                               allowedOperatingProfiles: [] },
  "top-services":             { requiredCapabilities: ["catalog"],       allowedBusinessTypes: [],                               allowedOperatingProfiles: [] },
  "staff-availability":       { requiredCapabilities: ["attendance"],    allowedBusinessTypes: [],                               allowedOperatingProfiles: [] },
  "inventory-alert":          { requiredCapabilities: ["inventory"],     allowedBusinessTypes: [],                               allowedOperatingProfiles: [] },
  "flower-stock":             { requiredCapabilities: ["floral"],        allowedBusinessTypes: ["flower_shop", "flowers"],        allowedOperatingProfiles: [] },
  "expiring-batches-widget":  { requiredCapabilities: ["floral"],        allowedBusinessTypes: ["flower_shop", "flowers"],        allowedOperatingProfiles: [] },
  "flower-orders-widget":     { requiredCapabilities: ["floral"],        allowedBusinessTypes: ["flower_shop", "flowers"],        allowedOperatingProfiles: [] },
  "room-status":              { requiredCapabilities: ["hotel"],         allowedBusinessTypes: ["hotel"],                         allowedOperatingProfiles: [] },
  "fleet-status":             { requiredCapabilities: ["car_rental"],    allowedBusinessTypes: ["car_rental"],                    allowedOperatingProfiles: [] },
  "online-orders-widget":     { requiredCapabilities: ["online_orders"], allowedBusinessTypes: ["restaurant","cafe","bakery","catering"], allowedOperatingProfiles: [] },
};

function passesContextGate(widgetId: string, ctx: { businessType: string; operatingProfile: string; capabilities: string[] }): boolean {
  const gate = WIDGET_REGISTRY[widgetId];
  if (!gate) return true;
  if (gate.allowedBusinessTypes.length > 0 && !gate.allowedBusinessTypes.includes(ctx.businessType)) return false;
  if (gate.allowedOperatingProfiles.length > 0 && !gate.allowedOperatingProfiles.includes(ctx.operatingProfile)) return false;
  if (gate.requiredCapabilities.some((cap) => !ctx.capabilities.includes(cap))) return false;
  return true;
}

describe("passesContextGate: universal widgets pass for any business type", () => {
  const ctx = { businessType: "salon", operatingProfile: "salon_in_branch", capabilities: ["bookings", "catalog"] };
  test("weekly-chart passes for salon with bookings cap", () => {
    assert.ok(passesContextGate("weekly-chart", ctx));
  });
  test("top-services passes for salon with catalog cap", () => {
    assert.ok(passesContextGate("top-services", ctx));
  });
  test("unknown widget ID → allow (fail-open)", () => {
    assert.ok(passesContextGate("new-widget-not-in-registry-yet", ctx));
  });
});

describe("passesContextGate: universal widgets blocked without required capability", () => {
  const ctx = { businessType: "salon", operatingProfile: "salon_in_branch", capabilities: [] };
  test("weekly-chart blocked — no bookings cap", () => {
    assert.equal(passesContextGate("weekly-chart", ctx), false);
  });
  test("staff-availability blocked — no attendance cap", () => {
    assert.equal(passesContextGate("staff-availability", ctx), false);
  });
  test("inventory-alert blocked — no inventory cap", () => {
    assert.equal(passesContextGate("inventory-alert", ctx), false);
  });
});

describe("passesContextGate: florist widgets NEVER render for non-florist", () => {
  const floristWidgets = ["flower-stock", "expiring-batches-widget", "flower-orders-widget"];
  const nonFloristTypes = ["restaurant", "salon", "hotel", "car_rental", "digital_services", "retail", "photography"];

  for (const widgetId of floristWidgets) {
    for (const businessType of nonFloristTypes) {
      test(`${widgetId} blocked for ${businessType}`, () => {
        const ctx = { businessType, operatingProfile: "general", capabilities: ["bookings", "floral"] };
        assert.equal(passesContextGate(widgetId, ctx), false, `${widgetId} must NOT render for ${businessType}`);
      });
    }
  }

  test("flower-stock passes for flower_shop with floral cap", () => {
    const ctx = { businessType: "flower_shop", operatingProfile: "florist_retail", capabilities: ["floral"] };
    assert.ok(passesContextGate("flower-stock", ctx));
  });

  test("flower-stock blocked for flower_shop without floral cap", () => {
    const ctx = { businessType: "flower_shop", operatingProfile: "florist_retail", capabilities: [] };
    assert.equal(passesContextGate("flower-stock", ctx), false);
  });
});

describe("passesContextGate: specialty widgets gated correctly", () => {
  test("room-status passes for hotel with hotel cap", () => {
    const ctx = { businessType: "hotel", operatingProfile: "hotel_standard", capabilities: ["hotel"] };
    assert.ok(passesContextGate("room-status", ctx));
  });
  test("room-status blocked for restaurant even with hotel cap", () => {
    const ctx = { businessType: "restaurant", operatingProfile: "general", capabilities: ["hotel"] };
    assert.equal(passesContextGate("room-status", ctx), false);
  });
  test("fleet-status passes for car_rental with car_rental cap", () => {
    const ctx = { businessType: "car_rental", operatingProfile: "car_rental_daily", capabilities: ["car_rental"] };
    assert.ok(passesContextGate("fleet-status", ctx));
  });
  test("fleet-status blocked for rental without car_rental cap", () => {
    const ctx = { businessType: "rental", operatingProfile: "rental_equipment", capabilities: ["assets"] };
    assert.equal(passesContextGate("fleet-status", ctx), false);
  });
  test("online-orders-widget passes for restaurant with online_orders cap", () => {
    const ctx = { businessType: "restaurant", operatingProfile: "restaurant_delivery", capabilities: ["online_orders"] };
    assert.ok(passesContextGate("online-orders-widget", ctx));
  });
  test("online-orders-widget blocked for salon even with online_orders cap", () => {
    const ctx = { businessType: "salon", operatingProfile: "salon_in_branch", capabilities: ["online_orders"] };
    assert.equal(passesContextGate("online-orders-widget", ctx), false);
  });
});
