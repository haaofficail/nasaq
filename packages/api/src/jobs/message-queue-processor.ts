import { pool } from "@nasaq/db/client";
import { log } from "../lib/logger";
import { sendSms } from "../lib/sms";
import { sendWhatsApp } from "../lib/whatsapp";

// ============================================================
// MESSAGE QUEUE PROCESSOR
// يعالج الرسائل بحالة "queued" في جدول message_logs
// يُشغَّل كل دقيقة عبر pg-boss
// ============================================================

export async function processMessageQueue(): Promise<void> {
  // جلب الرسائل المعلّقة (حد 50 رسالة لكل دورة)
  const { rows: messages } = await pool.query<{
    id: string;
    org_id: string;
    channel: string;
    recipient_phone: string;
    message_text: string;
  }>(
    `SELECT id, org_id, channel, recipient_phone, message_text
     FROM message_logs
     WHERE status = 'queued'
     ORDER BY created_at ASC
     LIMIT 50
     FOR UPDATE SKIP LOCKED`,
  );

  if (messages.length === 0) return;

  let sent = 0;
  let failed = 0;

  await Promise.all(
    messages.map(async (msg) => {
      let delivered = false;

      try {
        if (msg.channel === "sms") {
          delivered = await sendSms(msg.recipient_phone, msg.message_text);
        } else if (msg.channel === "whatsapp") {
          delivered = await sendWhatsApp(msg.recipient_phone, msg.message_text);
        } else {
          // قناة غير معروفة — تجاهل مع تسجيل
          delivered = false;
        }
      } catch (err) {
        log.warn({ err, msgId: msg.id }, "[msg-queue] send error");
      }

      const status = delivered ? "sent" : "failed";
      await pool.query(
        `UPDATE message_logs SET status = $1, sent_at = CASE WHEN $2 THEN NOW() ELSE NULL END WHERE id = $3`,
        [status, delivered, msg.id],
      ).catch(() => {});

      if (delivered) sent++; else failed++;
    }),
  );

  if (sent > 0 || failed > 0) {
    log.info({ sent, failed, total: messages.length }, "[job] message-queue-processor done");
  }
}
