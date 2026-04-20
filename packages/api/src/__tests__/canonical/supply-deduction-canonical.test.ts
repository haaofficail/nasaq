/**
 * Supply Deduction — Canonical Path (Wave 1.5)
 *
 * يتحقق من الـ dual-path: canonical bookingLines.serviceRefId
 * يشتغل بالتوازي مع legacy bookingItems.serviceId — بدون تكسير أحدهما.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, and } from "drizzle-orm";
import {
  bookingRecords, bookingLines,
  bookingRecordConsumptions,
  bookingConsumptions, bookingItems,
  serviceSupplyRecipes, salonSupplies,
  services, organizations,
} from "@nasaq/db/schema";
import { openTestDb, skipIfNoDb, type TestDb } from "../helpers/test-db";
import {
  createTestOrg,
  createTestCustomer,
  createTestBookingRecord,
  createTestBookingLine,
} from "../helpers/test-factories";

// ────────────────────────────────────────────────────────────────
// Helpers

async function createTestService(db: TestDb, orgId: string) {
  const [svc] = await db.insert(services).values({
    orgId,
    name: "خدمة اختبار",
    slug: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    basePrice: "100.00",
    durationMinutes: 60,
  } as any).returning();
  return svc;
}

async function createTestSupply(db: TestDb, orgId: string, qty = "100.00") {
  const [supply] = await db.insert(salonSupplies).values({
    orgId,
    name: "مادة اختبار",
    unit: "ml",
    quantity: qty,
    minQuantity: "5.00",
    costPerUnit: "1.00",
  } as any).returning();
  return supply;
}

async function createRecipe(db: TestDb, orgId: string, serviceId: string, supplyId: string, qty = "10.00") {
  const [recipe] = await db.insert(serviceSupplyRecipes).values({
    orgId, serviceId, supplyId, quantity: qty,
  } as any).returning();
  return recipe;
}

// Simulates the canonical deduction logic that will be in PATCH /:id/status after Wave 1.5
async function runCanonicalDeduction(
  db: TestDb,
  bookingRecordId: string,
  orgId: string,
  actingUserId: string | null = null,
) {
  const { sql: sqlFn, inArray } = await import("drizzle-orm");
  await db.transaction(async (tx) => {
    // Idempotency check
    const { rows: alreadyConsumed } = await tx.execute(
      sqlFn`SELECT 1 FROM booking_consumptions_canonical WHERE booking_record_id = ${bookingRecordId} AND org_id = ${orgId} LIMIT 1`
    );
    if (alreadyConsumed.length > 0) return;

    const lines = await tx.select({
      id:           bookingLines.id,
      serviceRefId: bookingLines.serviceRefId,
      quantity:     bookingLines.quantity,
    }).from(bookingLines).where(eq(bookingLines.bookingRecordId, bookingRecordId));

    for (const line of lines) {
      // SKIP lines with NULL serviceRefId — same behavior as legacy bookingItems with NULL serviceId
      if (!line.serviceRefId) continue;

      const recipes = await tx.select().from(serviceSupplyRecipes)
        .where(and(
          eq(serviceSupplyRecipes.serviceId, line.serviceRefId),
          eq(serviceSupplyRecipes.orgId, orgId),
        ));

      for (const recipe of recipes) {
        const totalQty = parseFloat(recipe.quantity as string) * (line.quantity || 1);

        const [supply] = await tx
          .select({ id: salonSupplies.id, quantity: salonSupplies.quantity })
          .from(salonSupplies)
          .where(eq(salonSupplies.id, recipe.supplyId))
          .for("update");
        if (!supply) continue;

        const newQty = parseFloat(supply.quantity as string) - totalQty;

        await tx.update(salonSupplies)
          .set({ quantity: newQty.toFixed(2), updatedAt: new Date() })
          .where(eq(salonSupplies.id, recipe.supplyId));

        await tx.insert(bookingRecordConsumptions).values({
          orgId,
          bookingRecordId,
          bookingLineId:  line.id,
          supplyId:       recipe.supplyId,
          quantity:       String(totalQty),
          consumedAt:     new Date(),
          createdBy:      actingUserId,
          notes:          `خصم تلقائي من وصفة الخدمة`,
        } as any);
      }
    }
  });
}

// ════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("Supply Deduction — Canonical Path", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => { ({ db, cleanup } = await openTestDb()); });
  afterEach(async () => { await cleanup(); });

  // ── 1. Happy path: canonical booking with serviceRefId ──────

  it("canonical line مع serviceRefId → خصم صحيح من المخزون", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);
    const svc = await createTestService(db, org.id);
    const supply = await createTestSupply(db, org.id, "100.00");
    await createRecipe(db, org.id, svc.id, supply.id, "10.00");

    // Line مع serviceRefId
    await db.insert(bookingLines).values({
      bookingRecordId: record.id,
      serviceRefId:    svc.id,
      itemName:        "خدمة اختبار",
      quantity:        1,
      unitPrice:       "100.00",
      totalPrice:      "100.00",
    } as any);

    await runCanonicalDeduction(db, record.id, org.id);

    const [updatedSupply] = await db.select({ quantity: salonSupplies.quantity })
      .from(salonSupplies).where(eq(salonSupplies.id, supply.id));

    expect(parseFloat(updatedSupply.quantity as string)).toBeCloseTo(90);

    const consumptions = await db.select()
      .from(bookingRecordConsumptions)
      .where(eq(bookingRecordConsumptions.bookingRecordId, record.id));

    expect(consumptions).toHaveLength(1);
    expect(parseFloat(consumptions[0].quantity as string)).toBeCloseTo(10);
  });

  // ── 2. Quantity multiplier ──────────────────────────────────

  it("quantity 2 × recipe 10ml = خصم 20ml", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);
    const svc = await createTestService(db, org.id);
    const supply = await createTestSupply(db, org.id, "100.00");
    await createRecipe(db, org.id, svc.id, supply.id, "10.00");

    await db.insert(bookingLines).values({
      bookingRecordId: record.id,
      serviceRefId:    svc.id,
      itemName:        "خدمة اختبار",
      quantity:        2,
      unitPrice:       "100.00",
      totalPrice:      "200.00",
    } as any);

    await runCanonicalDeduction(db, record.id, org.id);

    const [updatedSupply] = await db.select({ quantity: salonSupplies.quantity })
      .from(salonSupplies).where(eq(salonSupplies.id, supply.id));

    expect(parseFloat(updatedSupply.quantity as string)).toBeCloseTo(80);
  });

  // ── 3. NULL serviceRefId → skipped safely ──────────────────

  it("line بدون serviceRefId → تُتخطى بأمان بدون خصم", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    await db.insert(bookingLines).values({
      bookingRecordId: record.id,
      serviceRefId:    null,  // ad-hoc item, no service catalog entry
      itemName:        "بند مخصص",
      quantity:        1,
      unitPrice:       "50.00",
      totalPrice:      "50.00",
    } as any);

    await runCanonicalDeduction(db, record.id, org.id);

    const consumptions = await db.select()
      .from(bookingRecordConsumptions)
      .where(eq(bookingRecordConsumptions.bookingRecordId, record.id));

    expect(consumptions).toHaveLength(0);
  });

  // ── 4. Idempotency: running twice → deduction only once ────

  it("تشغيل مرتين → خصم مرة واحدة فقط", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);
    const svc = await createTestService(db, org.id);
    const supply = await createTestSupply(db, org.id, "100.00");
    await createRecipe(db, org.id, svc.id, supply.id, "10.00");

    await db.insert(bookingLines).values({
      bookingRecordId: record.id,
      serviceRefId:    svc.id,
      itemName:        "خدمة اختبار",
      quantity:        1,
      unitPrice:       "100.00",
      totalPrice:      "100.00",
    } as any);

    await runCanonicalDeduction(db, record.id, org.id);
    await runCanonicalDeduction(db, record.id, org.id); // second run — must be no-op

    const [updatedSupply] = await db.select({ quantity: salonSupplies.quantity })
      .from(salonSupplies).where(eq(salonSupplies.id, supply.id));

    expect(parseFloat(updatedSupply.quantity as string)).toBeCloseTo(90); // 10 deducted once, not twice

    const consumptions = await db.select()
      .from(bookingRecordConsumptions)
      .where(eq(bookingRecordConsumptions.bookingRecordId, record.id));

    expect(consumptions).toHaveLength(1);
  });

  // ── 5. orgId isolation ──────────────────────────────────────

  it("orgId isolation: خصم org1 لا يؤثر على supplies org2", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);
    const record1 = await createTestBookingRecord(db, org1.id, c1.id);
    const svc1 = await createTestService(db, org1.id);

    // Same supply id exists in org1 context only
    const supply1 = await createTestSupply(db, org1.id, "100.00");
    await createRecipe(db, org1.id, svc1.id, supply1.id, "10.00");

    await db.insert(bookingLines).values({
      bookingRecordId: record1.id,
      serviceRefId:    svc1.id,
      itemName:        "خدمة",
      quantity:        1,
      unitPrice:       "100.00",
      totalPrice:      "100.00",
    } as any);

    await runCanonicalDeduction(db, record1.id, org1.id);

    // org2 has no consumptions
    const org2Consumptions = await db.select()
      .from(bookingRecordConsumptions)
      .where(eq(bookingRecordConsumptions.orgId, org2.id));

    expect(org2Consumptions).toHaveLength(0);

    // org1 supply was deducted correctly
    const [s1] = await db.select({ quantity: salonSupplies.quantity })
      .from(salonSupplies).where(eq(salonSupplies.id, supply1.id));
    expect(parseFloat(s1.quantity as string)).toBeCloseTo(90);
  });

  // ── 6. Mixed: canonical line (has serviceRefId) + null line ─

  it("مزيج: line مع serviceRefId + line بدون → فقط الأول يُخصم", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);
    const svc = await createTestService(db, org.id);
    const supply = await createTestSupply(db, org.id, "100.00");
    await createRecipe(db, org.id, svc.id, supply.id, "10.00");

    await db.insert(bookingLines).values([
      {
        bookingRecordId: record.id,
        serviceRefId:    svc.id,
        itemName:        "خدمة برسيبة",
        quantity:        1,
        unitPrice:       "100.00",
        totalPrice:      "100.00",
      },
      {
        bookingRecordId: record.id,
        serviceRefId:    null,  // ad-hoc, no deduction
        itemName:        "إضافة بدون رسيبة",
        quantity:        1,
        unitPrice:       "20.00",
        totalPrice:      "20.00",
      },
    ] as any);

    await runCanonicalDeduction(db, record.id, org.id);

    const consumptions = await db.select()
      .from(bookingRecordConsumptions)
      .where(eq(bookingRecordConsumptions.bookingRecordId, record.id));

    expect(consumptions).toHaveLength(1); // only service line deducted

    const [s] = await db.select({ quantity: salonSupplies.quantity })
      .from(salonSupplies).where(eq(salonSupplies.id, supply.id));
    expect(parseFloat(s.quantity as string)).toBeCloseTo(90);
  });
});
