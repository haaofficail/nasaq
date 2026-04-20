import { eq, and, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { customerSubscriptions, bookings, customers } from "@nasaq/db/schema";
import { log } from "../lib/logger";
import { generateBookingNumber } from "../lib/helpers";

// ============================================================
// AUTO-BOOK JOB — الحجز التلقائي من الاشتراكات
// يعمل يومياً عند 6:00 صباحاً
// يبحث عن الاشتراكات النشطة التي:
//   - autoBook = true
//   - nextBookingDate = today
// وينشئ حجزاً معلقاً لكل منها
// ============================================================

function nextDateByInterval(from: Date, interval: string): Date {
  const d = new Date(from);
  switch (interval) {
    case "weekly":  d.setDate(d.getDate() + 7);  break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "yearly":  d.setFullYear(d.getFullYear() + 1); break;
    default:        d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}

export async function runAutoBook(): Promise<void> {
  const todayStr = new Date().toISOString().split("T")[0];

  const subs = await db.select().from(customerSubscriptions).where(
    and(
      eq(customerSubscriptions.autoBook, true),
      eq(customerSubscriptions.status, "active"),
      sql`${customerSubscriptions.nextBookingDate}::text = ${todayStr}`,
    )
  );

  if (subs.length === 0) return;

  let created = 0;

  for (const sub of subs) {
    let newBookingId: string | null = null;
    try {
      // Validate customer still exists
      const [customer] = await db.select({ id: customers.id, orgId: customers.orgId })
        .from(customers)
        .where(and(eq(customers.id, sub.customerId), eq(customers.orgId, sub.orgId)));
      if (!customer) continue;

      const bookingNumber = await generateBookingNumber(sub.orgId);
      const eventDate = sub.nextBookingDate ? new Date(sub.nextBookingDate) : new Date();

      // Apply preferred time if set (e.g. "10:00")
      if (sub.preferredTime) {
        const [hh, mm] = sub.preferredTime.split(":").map(Number);
        if (!isNaN(hh)) {
          eventDate.setHours(hh, mm ?? 0, 0, 0);
        }
      }

      const txResult = await db.transaction(async (tx) => {
        const [booking] = await tx.insert(bookings).values({
          orgId: sub.orgId,
          customerId: sub.customerId,
          bookingNumber,
          status: "pending",
          paymentStatus: "pending",
          eventDate,
          subtotal: sub.price ?? "0",
          discountAmount: "0",
          vatAmount: "0",
          totalAmount: sub.price ?? "0",
          depositAmount: "0",
          paidAmount: "0",
          balanceDue: sub.price ?? "0",
          source: "subscription",
          internalNotes: `حجز تلقائي من اشتراك: ${sub.name}`,
        }).returning({ id: bookings.id });

        // Advance nextBookingDate
        const nextDate = nextDateByInterval(eventDate, sub.interval ?? "monthly");
        await tx.update(customerSubscriptions).set({
          nextBookingDate: nextDate.toISOString().split("T")[0],
          currentUsage: sql`COALESCE(${customerSubscriptions.currentUsage}, 0) + 1`,
        }).where(eq(customerSubscriptions.id, sub.id));

        // Deactivate if maxUsage reached
        if (sub.maxUsage && (sub.currentUsage ?? 0) + 1 >= sub.maxUsage) {
          await tx.update(customerSubscriptions).set({ status: "completed" })
            .where(eq(customerSubscriptions.id, sub.id));
        }

        return booking;
      });
      newBookingId = txResult?.id ?? null;

      created++;
    } catch (err) {
      log.warn({ err, subId: sub.id }, "[auto-book] failed to create booking for subscription");
    }
  }

  if (created > 0) {
    log.info({ created }, "[job] auto-book done");
  }
}
