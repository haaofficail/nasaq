import { pool } from "@nasaq/db/client";
import { log } from "./logger";
import { sendSms } from "./sms";
import { sendWhatsApp } from "./whatsapp";

// ============================================================
// MESSAGING ENGINE — يربط أحداث النظام بإرسال الرسائل
//
// الاستخدام:
//   fireBookingEvent("booking_confirmed", { orgId, bookingId })
//   fireBookingEvent("booking_cancelled", { orgId, bookingId })
//   fireBookingEvent("payment_received",  { orgId, bookingId, amount })
//   fireBookingEvent("invoice_issued",    { orgId, customerId, invoiceNumber, amount })
//
// كل استدعاء:
//   1. يجلب إعدادات الرسائل للمنشأة (channel + auto_send)
//   2. يجلب قالب الحدث من message_templates
//   3. يستبدل المتغيرات ويرسل
//   4. يسجّل في message_logs
//   5. fire-and-forget — لا يكسر الاستجابة الأصلية أبداً
// ============================================================

type BookingEventType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "booking_completed"
  | "payment_received"
  | "invoice_issued"
  | "owner_new_booking"
  | "owner_booking_cancelled";

interface BookingEventPayload {
  orgId:         string;
  bookingId?:    string;
  customerId?:   string;
  amount?:       number;
  invoiceNumber?: string;
  extra?:        Record<string, string>;
}

export function fireBookingEvent(
  eventType: BookingEventType,
  payload: BookingEventPayload,
): void {
  // fire-and-forget — لا await
  _send(eventType, payload).catch((err) =>
    log.warn({ err, eventType, orgId: payload.orgId }, "[msg-engine] unhandled error"),
  );
}

async function _send(eventType: BookingEventType, payload: BookingEventPayload): Promise<void> {
  const { orgId, bookingId, amount, invoiceNumber, extra } = payload;

  // ── 1. جلب إعدادات الرسائل للمنشأة ─────────────────────
  const { rows: [settings] } = await pool.query<{
    auto_send: boolean;
    channel: string;
  }>(
    `SELECT auto_send, channel FROM message_settings WHERE org_id = $1 LIMIT 1`,
    [orgId],
  );

  if (!settings?.auto_send) return; // الإرسال التلقائي معطّل

  const channel = settings.channel || "whatsapp";

  // ── 2. جلب قالب الحدث ────────────────────────────────────
  const { rows: [template] } = await pool.query<{
    message_ar: string;
    send_to:    string;
    is_active:  boolean;
  }>(
    `SELECT message_ar, send_to, is_active
     FROM message_templates
     WHERE org_id = $1 AND event_type = $2
     LIMIT 1`,
    [orgId, eventType],
  );

  if (!template?.is_active || !template.message_ar) return; // القالب معطّل أو فارغ

  // ── 3. جلب بيانات الحجز والعميل والمنشأة ─────────────────
  let vars: Record<string, string> = {
    org_name:       "",
    customer_name:  "",
    customer_phone: "",
    booking_date:   "",
    booking_time:   "",
    service_name:   "",
    booking_number: "",
    amount:         amount ? String(amount) : "",
    invoice_number: invoiceNumber ?? "",
    ...extra,
  };

  // جلب اسم المنشأة
  const { rows: [org] } = await pool.query<{ name: string }>(
    `SELECT name FROM organizations WHERE id = $1`, [orgId],
  );
  vars.org_name = org?.name ?? "";

  let recipientPhone: string | null = null;
  let ownerPhone:     string | null = null;

  if (bookingId) {
    const { rows: [booking] } = await pool.query<{
      customer_name:   string;
      customer_phone:  string | null;
      booking_number:  string;
      event_date:      Date | null;
      event_time:      string | null;
      total_amount:    string;
    }>(
      `SELECT
         COALESCE(c.name, b.customer_name, '') AS customer_name,
         COALESCE(c.phone, b.customer_phone)   AS customer_phone,
         b.booking_number,
         b.event_date,
         b.event_time,
         b.total_amount
       FROM bookings b
       LEFT JOIN customers c ON c.id = b.customer_id
       WHERE b.id = $1 AND b.org_id = $2`,
      [bookingId, orgId],
    );

    if (booking) {
      vars.customer_name  = booking.customer_name  ?? "";
      vars.customer_phone = booking.customer_phone ?? "";
      vars.booking_number = booking.booking_number ?? "";
      vars.booking_date   = booking.event_date
        ? new Date(booking.event_date).toLocaleDateString("ar-SA")
        : "";
      vars.booking_time   = booking.event_time ?? "";
      if (!vars.amount) vars.amount = booking.total_amount ?? "";
      recipientPhone = booking.customer_phone;

      // جلب اسم الخدمة الأولى
      const { rows: [item] } = await pool.query<{ service_name: string }>(
        `SELECT s.name AS service_name
         FROM booking_items bi
         JOIN services s ON s.id = bi.service_id
         WHERE bi.booking_id = $1 LIMIT 1`,
        [bookingId],
      );
      vars.service_name = item?.service_name ?? "";
    }
  }

  // جلب رقم المالك لإشعارات المالك
  if (template.send_to === "owner") {
    const { rows: [owner] } = await pool.query<{ phone: string }>(
      `SELECT u.phone FROM users u
       JOIN org_members om ON om.user_id = u.id
       WHERE om.org_id = $1 AND om.role = 'owner' AND u.phone IS NOT NULL
       LIMIT 1`,
      [orgId],
    );
    ownerPhone = owner?.phone ?? null;
  }

  // ── 4. استبدال المتغيرات ─────────────────────────────────
  let message = template.message_ar;
  for (const [key, value] of Object.entries(vars)) {
    message = message.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }

  // ── 5. تحديد المستلم وإرسال ──────────────────────────────
  const phone = template.send_to === "owner" ? ownerPhone : recipientPhone;
  if (!phone) return; // لا يوجد رقم جوال

  let delivered = false;
  try {
    if (channel === "sms") {
      delivered = await sendSms(phone, message);
    } else {
      delivered = await sendWhatsApp(phone, message);
    }
  } catch (_err) {
    delivered = false;
  }

  // ── 6. تسجيل في message_logs ─────────────────────────────
  await pool.query(
    `INSERT INTO message_logs (org_id, channel, recipient_phone, message_text, status, category)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [orgId, channel, phone, message, delivered ? "sent" : "failed", eventType],
  ).catch(() => {});
}
