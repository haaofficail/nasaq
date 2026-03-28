import { pool } from "@nasaq/db/client";
import { log } from "../lib/logger";
import { sendSms } from "../lib/sms";
import { sendWhatsApp } from "../lib/whatsapp";

// ============================================================
// REMINDER DISPATCHER — يُرسل التذكيرات المستحقة يومياً
// يعمل كل دقيقة ويتحقق من:
//   dueDate - remindBeforeDays[i] == today
// يتجنب الإرسال المزدوج عبر notifications_log
// ============================================================

export async function dispatchReminders(): Promise<void> {
  const todayStr = new Date().toISOString().split("T")[0];

  // استعلام واحد يجلب كل التذكيرات المستحقة اليوم لكل المنشآت النشطة
  const { rows: reminders } = await pool.query<{
    id: string;
    org_id: string;
    title: string;
    due_date: string;
    notification_channels: string[];
    notifications_log: Array<{ sentAt: string; channels: string[]; type: string }>;
  }>(`
    SELECT
      r.id,
      r.org_id,
      r.title,
      r.due_date::text,
      COALESCE(r.notification_channels, '["dashboard"]'::jsonb) AS notification_channels,
      COALESCE(r.notifications_log, '[]'::jsonb)                AS notifications_log
    FROM org_reminders r
    JOIN organizations o ON r.org_id = o.id
    WHERE r.status       = 'upcoming'
      AND r.deleted_at  IS NULL
      AND o.subscription_status IN ('active', 'trialing')
      AND (r.snoozed_until IS NULL OR r.snoozed_until < CURRENT_DATE)
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(r.remind_before_days) AS d
        WHERE (r.due_date::date - (d.value::text::int)) = CURRENT_DATE
      )
  `);

  if (reminders.length === 0) return;

  // Pre-fetch owner phones for all distinct orgs in ONE query (N+1 → 1)
  const distinctOrgIds = [...new Set(reminders.map((r) => r.org_id))];
  const { rows: ownerRows } = await pool.query<{ org_id: string; phone: string }>(
    `SELECT DISTINCT ON (om.org_id) om.org_id, u.phone
     FROM org_members om
     JOIN users u ON u.id = om.user_id
     WHERE om.org_id = ANY($1::uuid[])
       AND om.role = 'owner'
       AND u.phone IS NOT NULL`,
    [distinctOrgIds],
  );
  const ownerPhoneMap = new Map(ownerRows.map((r) => [r.org_id, r.phone]));

  let dispatched = 0;

  for (const reminder of reminders) {
    // لا ترسل مرتين في نفس اليوم
    const alreadySent = reminder.notifications_log.some((n) => n.sentAt?.startsWith(todayStr));
    if (alreadySent) continue;

    const channels = reminder.notification_channels ?? ["dashboard"];
    const externalChannels = channels.filter((ch) => ch !== "dashboard");

    // أرسل عبر القنوات الخارجية (sms / whatsapp) مع إرسال فعلي
    for (const channel of externalChannels) {
      try {
        // رقم المالك من الـ map المُعبّأة مسبقاً
        const ownerPhone = ownerPhoneMap.get(reminder.org_id);
        if (!ownerPhone) continue;

        const msgText = `تذكير: ${reminder.title} — تاريخ الاستحقاق: ${reminder.due_date}`;
        let delivered = false;

        if (channel === "whatsapp") {
          delivered = await sendWhatsApp(ownerPhone, msgText);
        } else if (channel === "sms") {
          delivered = await sendSms(ownerPhone, msgText);
        }

        await pool.query(
          `INSERT INTO message_logs
             (org_id, channel, recipient_phone, message_text, status, category)
           VALUES ($1, $2, $3, $4, $5, 'reminder')`,
          [reminder.org_id, channel, ownerPhone, msgText, delivered ? "sent" : "failed"],
        );
      } catch (err) {
        log.warn({ err, reminderId: reminder.id, channel }, "[reminder-dispatcher] send failed");
      }
    }

    // أضف إدخالاً في notifications_log لمنع الإعادة
    const entry = { sentAt: new Date().toISOString(), channels, type: "auto" };
    await pool.query(`
      UPDATE org_reminders
      SET notifications_log = notifications_log || $1::jsonb,
          updated_at        = NOW()
      WHERE id = $2
    `, [JSON.stringify([entry]), reminder.id]);

    dispatched++;
  }

  if (dispatched > 0) {
    log.info({ dispatched }, "[job] reminder-dispatcher sent");
  }
}
