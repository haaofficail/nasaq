import { Context } from "hono";
import { z, ZodSchema } from "zod";

/**
 * Get organization ID from request context.
 * Must be set by authMiddleware before calling this.
 * Header fallback is ONLY allowed in local dev (NODE_ENV=development + DEV_AUTH_BYPASS=true).
 */
export function getOrgId(c: Context): string {
  const orgIdFromContext = c.get("orgId");
  if (orgIdFromContext) return orgIdFromContext as string;

  // Dev-only bypass — requires both flags to prevent accidental production exposure
  const isDevBypass =
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_BYPASS === "true";

  if (isDevBypass) {
    const devOrgId = c.req.header("X-Org-Id");
    if (devOrgId) return devOrgId;
  }

  throw new Error("Missing org ID — request not authenticated");
}

/**
 * Get authenticated user ID from request context.
 * Must be set by authMiddleware before calling this.
 * Header fallback is ONLY allowed in local dev (NODE_ENV=development + DEV_AUTH_BYPASS=true).
 */
export function getUserId(c: Context): string | null {
  const user = c.get("user") as { id: string } | null;
  if (user?.id) return user.id;

  const isDevBypass =
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_BYPASS === "true";

  if (isDevBypass) {
    return c.req.header("X-User-Id") || null;
  }

  return null;
}

/**
 * Validate request body against Zod schema
 */
export async function validateBody<T>(c: Context, schema: ZodSchema<T>): Promise<T | null> {
  try {
    const body = await c.req.json();
    const parsed = schema.parse(body);
    return parsed;
  } catch (err) {
    if (err instanceof z.ZodError) {
      c.res = new Response(
        JSON.stringify({
          error: "Validation failed",
          details: err.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
      return null;
    }
    throw err;
  }
}

/**
 * Generate URL slug from Arabic or English text
 */
export function generateSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")            // spaces to hyphens
    .replace(/[^\u0621-\u064Aa-z0-9-]/g, "") // keep Arabic, English, numbers, hyphens
    .replace(/-+/g, "-")             // collapse multiple hyphens
    .replace(/^-|-$/g, "");          // trim hyphens
}

/**
 * Generate a human-readable booking number using crypto random (collision-resistant)
 */
export function generateBookingNumber(prefix: string = "NSQ"): string {
  const year = new Date().getFullYear();
  // Use crypto.getRandomValues for a 6-char base-36 suffix (~2.17B combinations)
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const random = arr[0].toString(36).padStart(6, "0").substring(0, 6).toUpperCase();
  return `${prefix}-${year}-${random}`;
}

/**
 * Strip internal/immutable fields from a request body before use in UPDATE SET.
 * Prevents orgId overwrite, id tampering, and timestamp injection.
 */
export function stripBody(body: Record<string, unknown>): Record<string, unknown> {
  const { orgId: _o, id: _i, createdAt: _c, updatedAt: _u, deletedAt: _d, ...safe } = body;
  return safe;
}

/**
 * Pagination helper
 */
export function getPagination(c: Context) {
  const page = Math.max(1, parseInt(c.req.query("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "20")));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Get default operatingProfile, serviceDeliveryModes, enabledCapabilities from businessType
 * Called on org creation to ensure capability gates work from day one
 */
export function getBusinessDefaults(businessType: string) {
  const defaults: Record<string, { operatingProfile: string; serviceDeliveryModes: string[]; enabledCapabilities: string[] }> = {
    flower_shop:  { operatingProfile: "florist_retail",        serviceDeliveryModes: ["on_site","delivery","pickup"],               enabledCapabilities: ["bookings","customers","catalog","media","inventory","floral","pos","website"] },
    restaurant:   { operatingProfile: "restaurant_dine_in",    serviceDeliveryModes: ["on_site","delivery","pickup"],               enabledCapabilities: ["bookings","customers","catalog","media","pos","website","schedules"] },
    cafe:         { operatingProfile: "restaurant_dine_in",    serviceDeliveryModes: ["on_site","delivery","pickup"],               enabledCapabilities: ["bookings","customers","catalog","media","pos","website","schedules"] },
    bakery:       { operatingProfile: "restaurant_dine_in",    serviceDeliveryModes: ["on_site","delivery","pickup"],               enabledCapabilities: ["bookings","customers","catalog","media","pos","website","schedules"] },
    catering:     { operatingProfile: "restaurant_catering",   serviceDeliveryModes: ["at_customer_location","delivery"],           enabledCapabilities: ["bookings","customers","catalog","media","inventory","contracts","website"] },
    salon:        { operatingProfile: "salon_in_branch",       serviceDeliveryModes: ["on_site","at_customer_location"],            enabledCapabilities: ["bookings","customers","catalog","media","attendance","schedules","pos","website"] },
    barber:       { operatingProfile: "salon_in_branch",       serviceDeliveryModes: ["on_site","at_customer_location"],            enabledCapabilities: ["bookings","customers","catalog","media","attendance","schedules","pos","website"] },
    spa:          { operatingProfile: "salon_spa",             serviceDeliveryModes: ["on_site","at_customer_location"],            enabledCapabilities: ["bookings","customers","catalog","media","attendance","schedules","pos","website"] },
    fitness:      { operatingProfile: "salon_in_branch",       serviceDeliveryModes: ["on_site","at_customer_location"],            enabledCapabilities: ["bookings","customers","catalog","media","attendance","schedules","pos","website"] },
    hotel:        { operatingProfile: "hotel_standard",        serviceDeliveryModes: ["on_site","reservation_based"],              enabledCapabilities: ["bookings","customers","catalog","media","inventory","accounting","website","hotel"] },
    car_rental:   { operatingProfile: "car_rental_daily",      serviceDeliveryModes: ["pickup","at_customer_location"],             enabledCapabilities: ["bookings","customers","catalog","media","assets","contracts","accounting","car_rental"] },
    rental:       { operatingProfile: "rental_equipment",      serviceDeliveryModes: ["delivery","pickup","on_site"],               enabledCapabilities: ["bookings","customers","catalog","media","assets","inventory","contracts","accounting"] },
    events:           { operatingProfile: "events_full",           serviceDeliveryModes: ["at_customer_location","on_site"],                 enabledCapabilities: ["bookings","customers","catalog","media","inventory","contracts","attendance","website"] },
    event_organizer:  { operatingProfile: "event_full_planning",   serviceDeliveryModes: ["at_customer_location","on_site"],                 enabledCapabilities: ["bookings","customers","catalog","media","contracts","inventory","website"] },
    events_vendor:    { operatingProfile: "events_vendor_rental",  serviceDeliveryModes: ["at_customer_location","delivery","on_site"],       enabledCapabilities: ["bookings","customers","catalog","media","assets","contracts","inventory"] },
    photography:      { operatingProfile: "photography_studio",    serviceDeliveryModes: ["on_site","at_customer_location"],                  enabledCapabilities: ["bookings","customers","catalog","media","contracts","website"] },
    retail:           { operatingProfile: "retail_standard",       serviceDeliveryModes: ["on_site","pickup","delivery"],                     enabledCapabilities: ["bookings","customers","catalog","media","inventory","pos","website"] },
    store:            { operatingProfile: "retail_standard",       serviceDeliveryModes: ["on_site","pickup","delivery"],                     enabledCapabilities: ["bookings","customers","catalog","media","inventory","pos","website"] },
    printing:         { operatingProfile: "retail_standard",       serviceDeliveryModes: ["on_site","delivery","pickup"],                     enabledCapabilities: ["bookings","customers","catalog","media","pos","website"] },
    digital_services: { operatingProfile: "digital_projects",      serviceDeliveryModes: ["remote","on_site"],                               enabledCapabilities: ["bookings","customers","catalog","media","contracts","website"] },
    marketing:        { operatingProfile: "digital_projects",      serviceDeliveryModes: ["remote","on_site"],                               enabledCapabilities: ["bookings","customers","catalog","media","contracts","website"] },
    agency:           { operatingProfile: "digital_projects",      serviceDeliveryModes: ["remote","on_site"],                               enabledCapabilities: ["bookings","customers","catalog","media","contracts","website"] },
    technology:       { operatingProfile: "digital_projects",      serviceDeliveryModes: ["remote","on_site"],                               enabledCapabilities: ["bookings","customers","catalog","media","contracts","website"] },
    maintenance:      { operatingProfile: "field_service",         serviceDeliveryModes: ["at_customer_location","on_site"],                  enabledCapabilities: ["bookings","customers","catalog","media","attendance","schedules","website"] },
    workshop:         { operatingProfile: "field_service",         serviceDeliveryModes: ["on_site","at_customer_location"],                  enabledCapabilities: ["bookings","customers","catalog","media","attendance","pos","website"] },
    real_estate:      { operatingProfile: "real_estate_rental",    serviceDeliveryModes: ["on_site","at_customer_location"],                  enabledCapabilities: ["bookings","customers","catalog","media","contracts","website"] },
    laundry:          { operatingProfile: "retail_standard",       serviceDeliveryModes: ["on_site","delivery","pickup"],                     enabledCapabilities: ["bookings","customers","catalog","media","pos","website"] },
    services:         { operatingProfile: "appointments",          serviceDeliveryModes: ["on_site","at_customer_location"],                  enabledCapabilities: ["bookings","customers","catalog","media","website"] },
    medical:          { operatingProfile: "appointments",          serviceDeliveryModes: ["on_site","at_customer_location"],                  enabledCapabilities: ["bookings","customers","catalog","media","website"] },
    education:        { operatingProfile: "appointments",          serviceDeliveryModes: ["on_site","at_customer_location","remote"],          enabledCapabilities: ["bookings","customers","catalog","media","website","schedules"] },
    construction:     { operatingProfile: "projects",              serviceDeliveryModes: ["at_customer_location","on_site"],                  enabledCapabilities: ["bookings","customers","catalog","media","contracts","attendance","inventory"] },
    logistics:        { operatingProfile: "field_service",         serviceDeliveryModes: ["delivery","at_customer_location"],                 enabledCapabilities: ["bookings","customers","catalog","media","attendance","inventory","website"] },
    other:            { operatingProfile: "general",               serviceDeliveryModes: ["on_site"],                                        enabledCapabilities: ["bookings","customers","catalog","media"] },
    general:          { operatingProfile: "general",               serviceDeliveryModes: ["on_site"],                                        enabledCapabilities: ["bookings","customers","catalog","media"] },
    school:           { operatingProfile: "appointments",          serviceDeliveryModes: ["on_site","remote"],                               enabledCapabilities: ["bookings","customers","catalog","media","schedules","attendance"] },
  };
  return defaults[businessType] ?? {
    operatingProfile: "general",
    serviceDeliveryModes: ["on_site"],
    enabledCapabilities: ["bookings","customers","catalog","media"],
  };
}

/**
 * Extract the real client IP from the request.
 * Priority: CF-Connecting-IP (Cloudflare) → X-Real-IP (Nginx) → first entry of X-Forwarded-For
 * Falls back to "unknown" — never trust the full X-Forwarded-For chain blindly.
 */
export function getTrustedIp(c: import("hono").Context): string {
  return (
    c.req.header("CF-Connecting-IP") ||           // Cloudflare (production)
    c.req.header("X-Real-IP") ||                  // Nginx proxy
    (c.req.header("X-Forwarded-For") || "").split(",")[0].trim() || // first hop only
    "unknown"
  );
}

/**
 * Pick a sort field from a validated whitelist
 */
export function safeSortField<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  defaultField: T
): T {
  return (allowed as readonly string[]).includes(value ?? "") ? (value as T) : defaultField;
}
