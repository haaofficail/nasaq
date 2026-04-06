import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@nasaq/db/client";
import {
  organizationLegalSettings,
  privacyRequests,
  securityIncidents,
} from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { requirePermission } from "../middleware/auth";

// ============================================================
// SCHEMAS
// ============================================================

const legalSettingsSchema = z.object({
  businessName:           z.string().min(1).optional().nullable(),
  commercialRegistration: z.string().optional().nullable(),
  vatNumber:              z.string().optional().nullable(),
  contactEmail:           z.string().email().optional().nullable(),
  contactPhone:           z.string().optional().nullable(),
  address:                z.string().optional().nullable(),
  refundPolicy:           z.string().optional().nullable(),
  cancellationPolicy:     z.string().optional().nullable(),
  dataRetentionDays:      z.number().int().min(30).max(3650).optional(),
  allowDataExport:        z.boolean().optional(),
  allowDataDeletion:      z.boolean().optional(),
  dpoEmail:               z.string().email().optional().nullable(),
  privacyPolicyUrl:       z.string().url().optional().nullable(),
  termsUrl:               z.string().url().optional().nullable(),
});

const privacyRequestSchema = z.object({
  customerId:     z.string().uuid().optional().nullable(),
  type:           z.enum(["export", "delete"]),
  requesterName:  z.string().min(1),
  requesterEmail: z.string().email().optional().nullable(),
  requesterPhone: z.string().optional().nullable(),
  notes:          z.string().optional().nullable(),
});

const updateStatusSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "rejected"]),
  notes:  z.string().optional().nullable(),
});

// ============================================================
// ROUTER
// ============================================================

export const complianceRouter = new Hono();

// ── GET /compliance/legal-settings ───────────────────────────
complianceRouter.get("/legal-settings", async (c) => {
  const orgId = getOrgId(c);
  const [settings] = await db
    .select()
    .from(organizationLegalSettings)
    .where(eq(organizationLegalSettings.orgId, orgId));
  return c.json({ data: settings ?? null });
});

// ── PUT /compliance/legal-settings ───────────────────────────
complianceRouter.put(
  "/legal-settings",
  requirePermission("settings", "edit"),
  async (c) => {
    const orgId = getOrgId(c);
    const userId = getUserId(c);
    const body = legalSettingsSchema.parse(await c.req.json());

    const [existing] = await db
      .select({ id: organizationLegalSettings.id })
      .from(organizationLegalSettings)
      .where(eq(organizationLegalSettings.orgId, orgId));

    let result;
    if (existing) {
      [result] = await db
        .update(organizationLegalSettings)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(organizationLegalSettings.orgId, orgId))
        .returning();
    } else {
      [result] = await db
        .insert(organizationLegalSettings)
        .values({ orgId, ...body })
        .returning();
    }

    insertAuditLog({
      orgId,
      userId,
      action:     "updated",
      resource:   "legal_settings",
      resourceId: orgId,
    });

    return c.json({ data: result });
  }
);

// ── GET /compliance/privacy-requests ─────────────────────────
complianceRouter.get(
  "/privacy-requests",
  requirePermission("settings", "view"),
  async (c) => {
    const orgId = getOrgId(c);
    const requests = await db
      .select()
      .from(privacyRequests)
      .where(eq(privacyRequests.orgId, orgId))
      .orderBy(desc(privacyRequests.createdAt));
    return c.json({ data: requests });
  }
);

// ── POST /compliance/privacy-requests ────────────────────────
// عام — لا يشترط مصادقة (العميل يقدّم الطلب من صفحة عامة)
complianceRouter.post("/privacy-requests", async (c) => {
  const orgId = getOrgId(c);
  const body = privacyRequestSchema.parse(await c.req.json());

  const [request] = await db
    .insert(privacyRequests)
    .values({ orgId, ...body, status: "pending" })
    .returning();

  return c.json({ data: request }, 201);
});

// ── PUT /compliance/privacy-requests/:id/status ───────────────
complianceRouter.put(
  "/privacy-requests/:id/status",
  requirePermission("settings", "edit"),
  async (c) => {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const { status, notes } = updateStatusSchema.parse(await c.req.json());

    const [updated] = await db
      .update(privacyRequests)
      .set({
        status,
        notes:       notes ?? undefined,
        processedBy: getUserId(c),
        processedAt: new Date(),
        updatedAt:   new Date(),
      })
      .where(
        and(
          eq(privacyRequests.id, id),
          eq(privacyRequests.orgId, orgId)
        )
      )
      .returning();

    if (!updated) return c.json({ error: "الطلب غير موجود" }, 404);
    return c.json({ data: updated });
  }
);

// ── GET /compliance/security-incidents ───────────────────────
// للأدمن والمالك فقط
complianceRouter.get(
  "/security-incidents",
  requirePermission("settings", "view"),
  async (c) => {
    const orgId = getOrgId(c);
    const incidents = await db
      .select()
      .from(securityIncidents)
      .where(eq(securityIncidents.orgId, orgId))
      .orderBy(desc(securityIncidents.detectedAt));
    return c.json({ data: incidents });
  }
);
