import { Hono } from "hono";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { marketplaceListings, rfpRequests, rfpProposals, apiKeys, webhookSubscriptions, webhookDeliveries, appStorePlugins, installedPlugins, services, organizations } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { nanoid } from "nanoid";
import { z } from "zod";

const createListingSchema = z.object({
  serviceId: z.string().uuid(),
  isActive: z.boolean().optional(),
  marketplacePrice: z.string().optional().nullable(),
});

const createRfpSchema = z.object({
  clientName: z.string(),
  clientPhone: z.string(),
  clientEmail: z.string().optional().nullable(),
  clientCity: z.string().optional().nullable(),
  eventType: z.string().optional().nullable(),
  guestCount: z.number().int().optional().nullable(),
  eventDate: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  description: z.string(),
});

const createProposalSchema = z.object({
  proposalText: z.string(),
  proposedPrice: z.string(),
  estimatedDuration: z.string().optional().nullable(),
  includedServices: z.array(z.unknown()).optional(),
});

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const platformRouter = new Hono();

// ============================================================
// MARKETPLACE LISTINGS
// ============================================================

// Public: browse marketplace
platformRouter.get("/marketplace", async (c) => {
  const city = c.req.query("city");
  const category = c.req.query("category");
  const search = c.req.query("search");

  const result = await db.select({
    listing: marketplaceListings,
    service: services,
    orgName: organizations.name,
    orgLogo: organizations.logo,
    orgCity: organizations.city,
  }).from(marketplaceListings)
    .innerJoin(services, eq(marketplaceListings.serviceId, services.id))
    .innerJoin(organizations, eq(marketplaceListings.orgId, organizations.id))
    .where(and(
      eq(marketplaceListings.isActive, true),
      eq(services.status, "active"),
      city ? eq(organizations.city, city) : sql`1=1`,
    ))
    .orderBy(desc(marketplaceListings.sortScore))
    .limit(50);

  return c.json({
    data: result.map(r => ({
      id: r.listing.id,
      service: { id: r.service.id, name: r.service.name, slug: r.service.slug, description: r.service.shortDescription,
        price: r.listing.marketplacePrice || r.service.basePrice, rating: r.service.avgRating, bookings: r.service.totalBookings },
      vendor: { name: r.orgName, logo: r.orgLogo, city: r.orgCity },
      views: r.listing.views, featured: !!r.listing.featuredUntil,
    })),
  });
});

// Org: manage own listings
platformRouter.get("/marketplace/mine", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select({ listing: marketplaceListings, service: services })
    .from(marketplaceListings).innerJoin(services, eq(marketplaceListings.serviceId, services.id))
    .where(eq(marketplaceListings.orgId, orgId));
  return c.json({ data: result.map(r => ({ ...r.listing, service: r.service })) });
});

platformRouter.post("/marketplace/listings", async (c) => {
  const orgId = getOrgId(c);
  const body = createListingSchema.parse(await c.req.json());
  const [listing] = await db.insert(marketplaceListings).values({ orgId, ...body }).returning();
  return c.json({ data: listing }, 201);
});

// ============================================================
// RFP — طلبات عروض الأسعار
// ============================================================

// Public: create RFP
platformRouter.post("/rfp", async (c) => {
  const body = createRfpSchema.parse(await c.req.json());
  const [rfp] = await db.insert(rfpRequests).values(body).returning();
  return c.json({ data: rfp }, 201);
});

// Public: list open RFPs
platformRouter.get("/rfp", async (c) => {
  const result = await db.select().from(rfpRequests).where(eq(rfpRequests.status, "open")).orderBy(desc(rfpRequests.createdAt));
  return c.json({ data: result });
});

// Org: submit proposal
platformRouter.post("/rfp/:id/proposals", async (c) => {
  const orgId = getOrgId(c);
  const body = createProposalSchema.parse(await c.req.json());
  const [proposal] = await db.insert(rfpProposals).values({ rfpId: c.req.param("id"), orgId, ...body }).returning();
  return c.json({ data: proposal }, 201);
});

// ============================================================
// API KEYS
// ============================================================

platformRouter.get("/api-keys", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(apiKeys).where(eq(apiKeys.orgId, orgId)).orderBy(desc(apiKeys.createdAt));
  return c.json({ data: result.map(k => ({ ...k, key: k.key.substring(0, 12) + "..." })) });
});

platformRouter.post("/api-keys", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = await c.req.json();
  const prefix = body.environment === "test" ? "nsq_test_" : "nsq_live_";
  const key = prefix + nanoid(32);
  const [apiKey] = await db.insert(apiKeys).values({
    orgId, name: body.name, key, keyPrefix: prefix, scopes: body.scopes || ["read"], createdBy: userId,
  }).returning();
  return c.json({ data: { ...apiKey, key } }, 201); // Show full key only on creation
});

platformRouter.delete("/api-keys/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(apiKeys).where(and(eq(apiKeys.id, c.req.param("id")), eq(apiKeys.orgId, orgId))).returning();
  if (!deleted) return c.json({ error: "المفتاح غير موجود" }, 404);
  return c.json({ data: deleted });
});

// ============================================================
// WEBHOOKS
// ============================================================

platformRouter.get("/webhooks", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(webhookSubscriptions).where(eq(webhookSubscriptions.orgId, orgId));
  return c.json({ data: result });
});

platformRouter.post("/webhooks", async (c) => {
  const orgId = getOrgId(c);
  const body = createWebhookSchema.parse(await c.req.json());
  const secret = "whsec_" + nanoid(24);
  const [sub] = await db.insert(webhookSubscriptions).values({ orgId, secret, ...body }).returning();
  return c.json({ data: { ...sub, secret } }, 201);
});

platformRouter.get("/webhooks/:id/deliveries", async (c) => {
  const result = await db.select().from(webhookDeliveries)
    .where(eq(webhookDeliveries.subscriptionId, c.req.param("id"))).orderBy(desc(webhookDeliveries.createdAt)).limit(50);
  return c.json({ data: result });
});

// ============================================================
// APP STORE
// ============================================================

platformRouter.get("/apps", async (c) => {
  const category = c.req.query("category");
  const conditions = [eq(appStorePlugins.isPublished, true)];
  if (category) conditions.push(eq(appStorePlugins.category, category));
  const result = await db.select().from(appStorePlugins).where(and(...conditions)).orderBy(desc(appStorePlugins.installCount));
  return c.json({ data: result });
});

platformRouter.get("/apps/installed", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select({ installed: installedPlugins, plugin: appStorePlugins })
    .from(installedPlugins).innerJoin(appStorePlugins, eq(installedPlugins.pluginId, appStorePlugins.id))
    .where(eq(installedPlugins.orgId, orgId));
  return c.json({ data: result.map(r => ({ ...r.installed, plugin: r.plugin })) });
});

platformRouter.post("/apps/:pluginId/install", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = await c.req.json();
  const [installed] = await db.insert(installedPlugins).values({
    orgId, pluginId: c.req.param("pluginId"), config: body.config || {}, installedBy: userId,
  }).returning();
  // Update install count
  await db.update(appStorePlugins).set({ installCount: sql`${appStorePlugins.installCount} + 1` })
    .where(eq(appStorePlugins.id, c.req.param("pluginId")));
  return c.json({ data: installed }, 201);
});

platformRouter.delete("/apps/:pluginId/uninstall", async (c) => {
  const orgId = getOrgId(c);
  const [removed] = await db.delete(installedPlugins).where(and(
    eq(installedPlugins.orgId, orgId), eq(installedPlugins.pluginId, c.req.param("pluginId")),
  )).returning();
  return c.json({ data: removed });
});
