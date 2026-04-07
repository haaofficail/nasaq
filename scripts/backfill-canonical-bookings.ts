/**
 * backfill-canonical-bookings.ts
 *
 * يرحّل الحجوزات التاريخية من جداول legacy إلى canonical (booking_records + related).
 * آمن للتشغيل أكثر من مرة (idempotent) — يتجاوز ما هو مرحَّل مسبقًا.
 *
 * Run: npx tsx scripts/backfill-canonical-bookings.ts
 * Run (dry):  DRY_RUN=true npx tsx scripts/backfill-canonical-bookings.ts
 * Run (org):  ORG_ID=<uuid> npx tsx scripts/backfill-canonical-bookings.ts
 */

import "dotenv/config";
import { db } from "@nasaq/db/client";
import {
  bookings, bookingItems, bookingItemAddons, bookingEvents,
  bookingAssignments, bookingCommissions, bookingConsumptions, payments,
  bookingRecords, bookingLines, bookingLineAddons, bookingTimelineEvents,
  bookingRecordAssignments, bookingRecordCommissions,
  bookingRecordConsumptions, bookingPaymentLinks,
} from "@nasaq/db/schema";
import { eq, and, notInArray, inArray, isNotNull } from "drizzle-orm";
import { mapLegacyBookingAggregateToCanonical } from "../packages/api/src/lib/bookings-mapping";

const DRY_RUN  = process.env.DRY_RUN === "true";
const ORG_ID   = process.env.ORG_ID ?? null;
const BATCH    = parseInt(process.env.BATCH ?? "50", 10);

// ─── Stats ────────────────────────────────────────────────────────────────────
let total = 0, migrated = 0, skipped = 0, errors = 0;

function log(msg: string) { process.stdout.write(`${new Date().toISOString().slice(11, 19)} ${msg}\n`); }

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log(`=== backfill-canonical-bookings ${DRY_RUN ? "[DRY RUN]" : "[LIVE]"} ===`);
  if (ORG_ID) log(`scope: org ${ORG_ID}`);

  // 1. Find all bookingRef IDs already in canonical
  const existingRefs = await db
    .select({ bookingRef: bookingRecords.bookingRef })
    .from(bookingRecords)
    .where(isNotNull(bookingRecords.bookingRef));

  const alreadyMigratedIds = new Set(
    existingRefs.map(r => r.bookingRef!).filter(Boolean),
  );
  log(`already migrated: ${alreadyMigratedIds.size}`);

  // 2. Fetch all legacy bookings in batches
  let offset = 0;
  while (true) {
    const batch = await db
      .select()
      .from(bookings)
      .where(ORG_ID ? eq(bookings.orgId, ORG_ID) : undefined as any)
      .limit(BATCH)
      .offset(offset);

    if (batch.length === 0) break;
    total += batch.length;

    for (const booking of batch) {
      if (alreadyMigratedIds.has(booking.id)) {
        skipped++;
        continue;
      }

      try {
        await migrateBooking(booking);
        migrated++;
        if (migrated % 10 === 0) {
          log(`progress: ${migrated} migrated / ${skipped} skipped / ${errors} errors`);
        }
      } catch (err) {
        errors++;
        log(`ERROR booking ${booking.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    offset += BATCH;
  }

  log(`=== done: total=${total} migrated=${migrated} skipped=${skipped} errors=${errors} ===`);
  process.exit(errors > 0 ? 1 : 0);
}

// ─── Migrate single booking ───────────────────────────────────────────────────
async function migrateBooking(booking: typeof bookings.$inferSelect) {
  // bookingRecords.customerId is NOT NULL — skip orphan bookings
  if (!booking.customerId) {
    skipped++;
    return;
  }

  // Fetch full aggregate
  const [items, eventsRows, assignmentsRows, commissionsRows, consumptionsRows, paymentsRows] =
    await Promise.all([
      db.select().from(bookingItems).where(eq(bookingItems.bookingId, booking.id)),
      db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, booking.id)),
      db.select().from(bookingAssignments).where(eq(bookingAssignments.bookingId, booking.id)),
      db.select().from(bookingCommissions).where(eq(bookingCommissions.bookingId, booking.id)),
      db.select().from(bookingConsumptions).where(eq(bookingConsumptions.bookingId, booking.id)),
      db.select().from(payments).where(eq(payments.bookingId, booking.id)),
    ]);

  const addonsRows = items.length > 0
    ? await db.select().from(bookingItemAddons)
        .where(inArray(bookingItemAddons.bookingItemId, items.map(i => i.id)))
    : [];

  const payload = mapLegacyBookingAggregateToCanonical({
    booking,
    items,
    addons: addonsRows,
    events: eventsRows,
    assignments: assignmentsRows,
    commissions: commissionsRows,
    consumptions: consumptionsRows,
    payments: paymentsRows,
  });

  if (DRY_RUN) return; // inspection only

  // Insert booking_records
  const [canonicalRecord] = await db
    .insert(bookingRecords)
    .values({
      ...payload.booking_records as any,
      bookingRef: booking.id,
    })
    .onConflictDoNothing()
    .returning({ id: bookingRecords.id });

  if (!canonicalRecord?.id) return; // conflict → already exists

  const recordId = canonicalRecord.id;

  // Build line ID map (legacyItemId → canonicalLineId) for linking addons/commissions/consumptions
  const lineIdMap = new Map<string, string>();

  if (payload.booking_lines.length > 0) {
    const insertedLines = await db
      .insert(bookingLines)
      .values(payload.booking_lines.map(l => ({
        ...l.row as any,
        bookingRecordId: recordId,
      })))
      .returning({ id: bookingLines.id });

    payload.booking_lines.forEach((l, i) => {
      if (insertedLines[i]?.id) lineIdMap.set(l.legacyBookingItemId, insertedLines[i].id);
    });
  }

  if (payload.booking_line_addons.length > 0) {
    const addonValues = payload.booking_line_addons
      .map(a => {
        const lineId = lineIdMap.get(a.legacyBookingItemId);
        if (!lineId) return null;
        return { ...a.row as any, bookingLineId: lineId };
      })
      .filter(Boolean);
    if (addonValues.length > 0) {
      await db.insert(bookingLineAddons).values(addonValues as any[]).onConflictDoNothing();
    }
  }

  if (payload.booking_timeline_events.length > 0) {
    await db.insert(bookingTimelineEvents).values(
      payload.booking_timeline_events.map(e => ({
        ...e as any,
        bookingRecordId: recordId,
      })),
    ).onConflictDoNothing();
  }

  if (payload.booking_record_assignments.length > 0) {
    await db.insert(bookingRecordAssignments).values(
      payload.booking_record_assignments.map(a => ({
        ...a as any,
        bookingRecordId: recordId,
      })),
    ).onConflictDoNothing();
  }

  if (payload.booking_record_commissions.length > 0) {
    const commissionValues = payload.booking_record_commissions
      .map(c => ({
        ...c.row as any,
        bookingRecordId: recordId,
        bookingLineId: c.legacyBookingItemId ? (lineIdMap.get(c.legacyBookingItemId) ?? null) : null,
      }));
    await db.insert(bookingRecordCommissions).values(commissionValues).onConflictDoNothing();
  }

  if (payload.booking_consumptions_canonical.length > 0) {
    const consumptionValues = payload.booking_consumptions_canonical
      .map(c => ({
        ...c.row as any,
        bookingRecordId: recordId,
        bookingLineId: c.legacyBookingItemId ? (lineIdMap.get(c.legacyBookingItemId) ?? null) : null,
      }));
    await db.insert(bookingRecordConsumptions).values(consumptionValues).onConflictDoNothing();
  }

  if (payload.booking_payment_links.length > 0) {
    await db.insert(bookingPaymentLinks).values(
      payload.booking_payment_links.map(p => ({
        ...p as any,
        bookingRecordId: recordId,
      })),
    ).onConflictDoNothing();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
