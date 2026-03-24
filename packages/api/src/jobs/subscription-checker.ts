import { db, pool } from "@nasaq/db/client";
import { organizations } from "@nasaq/db/schema";
import { and, lt, eq, inArray, isNotNull } from "drizzle-orm";
import { log } from "../lib/logger";

// ============================================================
// SUBSCRIPTION CHECKER — يدير دورة حياة الاشتراكات
// يعمل كل 6 ساعات
//
// الحالات:
//   active/trialing → past_due   (عند انتهاء الاشتراك)
//   past_due → suspended         (بعد 7 أيام grace period)
// ============================================================

const GRACE_PERIOD_DAYS = 7;

export async function checkSubscriptions(): Promise<void> {
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  // ── 1. active / trialing → past_due ────────────────────────
  const pastDue = await db
    .update(organizations)
    .set({ subscriptionStatus: "past_due" })
    .where(
      and(
        isNotNull(organizations.subscriptionEndsAt),
        lt(organizations.subscriptionEndsAt, now),
        inArray(organizations.subscriptionStatus as any, ["active", "trialing"]),
      ),
    )
    .returning({
      id:    organizations.id,
      name:  organizations.name,
      phone: organizations.phone,
    });

  // أرسل إشعار WhatsApp لكل منشأة انتهى اشتراكها
  for (const org of pastDue) {
    log.info({ orgId: org.id, orgName: org.name }, "[subscription-checker] org → past_due");

    if (org.phone) {
      await pool.query(`
        INSERT INTO message_logs
          (org_id, channel, recipient_phone, message_text, status, category)
        VALUES ($1, 'whatsapp', $2, $3, 'sent', 'system')
      `, [
        org.id,
        org.phone,
        `مرحباً، اشتراككم في نسق قد انتهى. يرجى تجديد الاشتراك خلال ${GRACE_PERIOD_DAYS} أيام للاستمرار في الخدمة.`,
      ]).catch((err) => log.warn({ err, orgId: org.id }, "[subscription-checker] notify failed"));
    }
  }

  // ── 2. past_due > grace → suspended ────────────────────────
  const suspended = await db
    .update(organizations)
    .set({
      subscriptionStatus: "suspended",
      suspendedAt:        now,
      suspendReason:      "subscription_expired",
    })
    .where(
      and(
        isNotNull(organizations.subscriptionEndsAt),
        lt(organizations.subscriptionEndsAt, graceCutoff),
        eq(organizations.subscriptionStatus as any, "past_due"),
      ),
    )
    .returning({
      id:   organizations.id,
      name: organizations.name,
    });

  for (const org of suspended) {
    log.warn({ orgId: org.id, orgName: org.name }, "[subscription-checker] org suspended — grace period expired");
  }

  if (pastDue.length > 0 || suspended.length > 0) {
    log.info({ pastDue: pastDue.length, suspended: suspended.length }, "[subscription-checker] done");
  }
}
