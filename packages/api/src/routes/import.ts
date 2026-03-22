import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { services, customers } from "@nasaq/db/schema";
import { getOrgId, generateSlug } from "../lib/helpers";

export const importRouter = new Hono();

// ============================================================
// POST /import/services — Bulk import services from CSV data
// Frontend يحوّل CSV لـ JSON ويرسله هنا
// ============================================================

importRouter.post("/services", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { rows } = body; // [{ name, categoryId, basePrice, description, ... }]

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: "لا توجد بيانات للاستيراد" }, 400);
  }

  if (rows.length > 500) {
    return c.json({ error: "الحد الأقصى 500 خدمة في كل استيراد" }, 400);
  }

  const results = { imported: 0, skipped: 0, errors: [] as any[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.name || !row.basePrice) {
        results.errors.push({ row: i + 1, error: "الاسم والسعر مطلوبان" });
        results.skipped++;
        continue;
      }

      const slug = generateSlug(row.name);

      // Check duplicate by slug
      const [existing] = await db.select({ id: services.id }).from(services)
        .where(and(eq(services.orgId, orgId), eq(services.slug, slug)));

      if (existing) {
        results.errors.push({ row: i + 1, error: `خدمة مكررة: ${row.name}` });
        results.skipped++;
        continue;
      }

      await db.insert(services).values({
        orgId,
        name: row.name,
        slug,
        categoryId: row.categoryId || null,
        shortDescription: row.shortDescription || null,
        description: row.description || null,
        basePrice: String(row.basePrice),
        status: "draft",
        maxCapacity: row.maxCapacity ? parseInt(row.maxCapacity) : null,
        durationMinutes: row.durationMinutes ? parseInt(row.durationMinutes) : 1440,
        depositPercent: row.depositPercent || "30",
      });

      results.imported++;
    } catch (err: any) {
      results.errors.push({ row: i + 1, error: err.message });
      results.skipped++;
    }
  }

  return c.json({ data: results });
});

// ============================================================
// POST /import/customers — Bulk import customers from CSV data
// ============================================================

importRouter.post("/customers", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { rows } = body;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: "لا توجد بيانات للاستيراد" }, 400);
  }

  if (rows.length > 1000) {
    return c.json({ error: "الحد الأقصى 1000 عميل في كل استيراد" }, 400);
  }

  const results = { imported: 0, skipped: 0, updated: 0, errors: [] as any[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.name || !row.phone) {
        results.errors.push({ row: i + 1, error: "الاسم والجوال مطلوبان" });
        results.skipped++;
        continue;
      }

      // Normalize phone
      let phone = row.phone.toString().replace(/[\s-]/g, "");
      if (phone.startsWith("05")) phone = "+966" + phone.substring(1);
      if (phone.startsWith("966")) phone = "+" + phone;

      // Check duplicate by phone
      const [existing] = await db.select({ id: customers.id }).from(customers)
        .where(and(eq(customers.orgId, orgId), eq(customers.phone, phone)));

      if (existing) {
        // Update existing
        await db.update(customers).set({
          name: row.name,
          email: row.email || undefined,
          city: row.city || undefined,
          type: row.type || undefined,
          updatedAt: new Date(),
        }).where(eq(customers.id, existing.id));
        results.updated++;
        continue;
      }

      await db.insert(customers).values({
        orgId,
        name: row.name,
        phone,
        email: row.email || null,
        type: row.type || "individual",
        tier: row.tier || "regular",
        city: row.city || null,
        companyName: row.companyName || null,
        source: row.source || "import",
      });

      results.imported++;
    } catch (err: any) {
      results.errors.push({ row: i + 1, error: err.message });
      results.skipped++;
    }
  }

  return c.json({ data: results });
});
