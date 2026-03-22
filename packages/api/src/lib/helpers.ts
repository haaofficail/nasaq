import { Context } from "hono";
import { z, ZodSchema } from "zod";

/**
 * Get organization ID from request context
 * In production: extracted from JWT/session via authMiddleware (c.set("orgId", ...))
 * Dev fallback: from header X-Org-Id
 */
export function getOrgId(c: Context): string {
  // Primary: from context set by authMiddleware
  const orgIdFromContext = c.get("orgId");
  if (orgIdFromContext) {
    return orgIdFromContext as string;
  }
  // Fallback: from header (dev mode)
  const orgId = c.req.header("X-Org-Id");
  if (!orgId) {
    throw new Error("Missing org ID — not authenticated");
  }
  return orgId;
}

/**
 * Get authenticated user ID
 */
export function getUserId(c: Context): string | null {
  // Primary: from context set by authMiddleware
  const user = c.get("user") as { id: string } | null;
  if (user?.id) return user.id;
  // Fallback: from header (dev mode)
  return c.req.header("X-User-Id") || null;
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
 * Pagination helper
 */
export function getPagination(c: Context) {
  const page = Math.max(1, parseInt(c.req.query("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "20")));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
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
