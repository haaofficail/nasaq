import { pool } from "@nasaq/db/client";
import { log } from "../lib/logger";

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

  let dispatched = 0;

  for (const reminder of reminders) {
    // لا ترسل مرتين في نفس اليوم
    const alreadySent = reminder.notifications_log.some((n) => n.sentAt?.startsWith(todayStr));
    if (alreadySent) continue;

    const channels = reminder.notification_channels ?? ["dashboard"];
    const externalChannels = channels.filter((ch) => ch !== "dashboard");

    // أرسل عبر القنوات الخارجية (sms / whatsapp) بكتابة سجل في message_logs
    for (const channel of externalChannels) {
      try {
        await pool.query(`
          INSERT INTO message_logs
            (org_id, channel, recipient_phone, message_text, status, category)
          SELECT
            $1, $2, u.phone,
            $3,
            'sent', 'reminder'
          FROM users u
          WHERE u.org_id = $1
            AND u.type   = 'owner'
          LIMIT 1
        `, [
          reminder.org_id,
          channel,
          `تذكير: ${reminder.title} — تاريخ الاستحقاق: ${reminder.due_date}`,
        ]);
      } catch (err) {
        log.warn({ err, reminderId: reminder.id, channel }, "[reminder-dispatcher] message_log insert failed");
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
