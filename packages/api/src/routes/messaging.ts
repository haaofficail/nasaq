import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { sendWhatsApp, isWhatsAppConfigured, isSmsConfigured } from "../lib/whatsapp";
import { sendSms } from "../lib/sms";

const sendBulkSchema = z.object({
  phones: z.array(z.string().min(5).max(20)).min(1).max(500),
  message: z.string().min(1).max(4096),
  category: z.string().max(100).optional(),
});

const createVariableSchema = z.object({
  name: z.string().max(100).optional(),
  variableKey: z.string().max(100).optional(),
  example: z.string().max(500).optional(),
  variableValue: z.string().max(500).optional(),
  label: z.string().max(200).optional().nullable(),
  description: z.string().max(200).optional().nullable(),
}).refine(d => d.name || d.variableKey, { message: "name or variableKey required" });

export const messagingRouter = new Hono();

// GET /messaging/status
messagingRouter.get("/status", async (c) => {
  const orgId = getOrgId(c);
  const waConfigured  = isWhatsAppConfigured();
  const smsConfigured = isSmsConfigured();

  // Check for manually-saved session record (legacy QR-based)
  const result = await pool.query(
    `SELECT * FROM whatsapp_sessions WHERE org_id = $1 LIMIT 1`,
    [orgId]
  );
  const session = result.rows[0];

  return c.json({
    data: {
      connected:     waConfigured || session?.status === "connected",
      status:        waConfigured ? "connected" : (session?.status || "disconnected"),
      phoneNumber:   session?.phone || null,
      provider:      waConfigured ? "api" : (smsConfigured ? "sms_only" : "none"),
      waConfigured,
      smsConfigured,
    },
  });
});

// POST /messaging/connect — يُظهر حالة التهيئة (API-based، لا QR)
messagingRouter.post("/connect", async (c) => {
  const waConfigured = isWhatsAppConfigured();
  if (waConfigured) {
    return c.json({ data: { connected: true, provider: "api", message: "واتساب مُهيأ عبر API" } });
  }
  return c.json({ error: "واتساب غير مُهيأ — أضف UNIFONIC_APP_SID أو بيانات Twilio في متغيرات البيئة" }, 503);
});

// POST /messaging/disconnect
messagingRouter.post("/disconnect", async (c) => {
  const orgId = getOrgId(c);
  await pool.query(
    `UPDATE whatsapp_sessions SET status = 'disconnected' WHERE org_id = $1`,
    [orgId]
  );
  return c.json({ success: true });
});

// POST /messaging/test
messagingRouter.post("/test", async (c) => {
  const orgId  = getOrgId(c);
  const { phone, message, channel } = await c.req.json();
  if (!phone || !message) return c.json({ error: "phone و message مطلوبان" }, 400);

  let delivered = false;
  const ch = channel || "whatsapp";

  if (ch === "sms") {
    delivered = await sendSms(phone, message);
  } else {
    delivered = await sendWhatsApp(phone, message);
  }

  const status = delivered ? "sent" : "failed";
  await pool.query(
    `INSERT INTO message_logs (org_id, channel, recipient_phone, message_text, status, category)
     VALUES ($1, $2, $3, $4, $5, 'test')`,
    [orgId, ch, phone, message, status]
  ).catch(() => {});

  return c.json({ success: delivered, delivered, status });
});

// ── Templates per business type ───────────────────────────────────

type TemplateRow = {
  event_type: string; category: string; send_to: string;
  sort_order?: number; delay_minutes?: number;
  title: string; message_ar: string;
};

// ── المدفوعات (مشتركة) ──────────────────────────────────────────
const SHARED_PAYMENT_TEMPLATES: TemplateRow[] = [
  {
    event_type: "payment_received", category: "payments", send_to: "customer", sort_order: 1,
    title: "استلام دفعة",
    message_ar: "تم استلام دفعتك بنجاح ✅\nالمبلغ: {amount} ر.س\nالرقم المرجعي: {booking_number}\n{org_name}\n\nشكراً لثقتك بنا",
  },
  {
    event_type: "invoice_issued", category: "payments", send_to: "customer", sort_order: 2,
    title: "إصدار فاتورة",
    message_ar: "تم إصدار فاتورتك من {org_name}\nالمبلغ: {amount} ر.س\nرقم الفاتورة: {invoice_number}\n\nللاستفسار تواصل معنا.",
  },
];

const TEMPLATES_BY_BUSINESS_TYPE: Record<string, TemplateRow[]> = {

  // ── صالون التجميل ────────────────────────────────────────────
  salon: [
    { event_type: "booking_confirmed",       category: "bookings", send_to: "customer", sort_order: 1,
      title: "تأكيد الحجز",
      message_ar: "مرحباً {customer_name}\nتم تأكيد حجزك في {org_name}.\n\nالتاريخ: {booking_date}\nالوقت: {booking_time}\nالخدمة: {service_name}\n\nرقم الحجز: {booking_number}\nنتطلع لاستقبالك!" },
    { event_type: "booking_reminder_24h",    category: "bookings", send_to: "customer", sort_order: 2,
      title: "تذكير قبل 24 ساعة",
      message_ar: "تذكير\nلديك حجز في {org_name} غداً.\n\n{booking_date} — {booking_time}\n{service_name}\n\nللتعديل أو الإلغاء تواصل معنا." },
    { event_type: "booking_reminder_2h",     category: "bookings", send_to: "customer", sort_order: 3,
      title: "تذكير قبل ساعتين",
      message_ar: "تذكير\nحجزك في {org_name} بعد ساعتين!\n\n{booking_date} — {booking_time}\n{service_name}\n\nنراك قريباً" },
    { event_type: "booking_cancelled",       category: "bookings", send_to: "customer", sort_order: 4,
      title: "إلغاء الحجز",
      message_ar: "نأسف لإبلاغك {customer_name}\nتم إلغاء حجزك رقم {booking_number} في {org_name}.\n\nللحجز مجدداً تواصل معنا." },
    { event_type: "booking_rescheduled",     category: "bookings", send_to: "customer", sort_order: 5,
      title: "إعادة جدولة الحجز",
      message_ar: "تم تحديث موعدك في {org_name}\n\nالموعد الجديد:\n{booking_date} — {booking_time}\n{service_name}\n\nرقم الحجز: {booking_number}" },
    { event_type: "booking_completed",       category: "bookings", send_to: "customer", sort_order: 6,
      title: "اكتمال الحجز",
      message_ar: "شكراً لزيارتك {customer_name}\nنتمنى أن تكون تجربتك في {org_name} رائعة.\n\nنسعد بخدمتك دائماً!" },
    { event_type: "owner_new_booking",       category: "bookings", send_to: "owner",    sort_order: 7,
      title: "إشعار المالك — حجز جديد",
      message_ar: "حجز جديد\nالعميل: {customer_name}\n{booking_date} — {booking_time}\n{service_name}\nالمبلغ: {amount} ر.س\nرقم الحجز: {booking_number}" },
    { event_type: "owner_booking_cancelled", category: "bookings", send_to: "owner",    sort_order: 8,
      title: "إشعار المالك — إلغاء حجز",
      message_ar: "تم إلغاء حجز\nالعميل: {customer_name}\n{booking_date} — {booking_time}\nرقم الحجز: {booking_number}" },
    { event_type: "staff_assigned",          category: "staff",    send_to: "provider", sort_order: 1,
      title: "تكليف موظف بحجز",
      message_ar: "تم تكليفك بحجز جديد\nالعميل: {customer_name}\n{booking_date} — {booking_time}\n{service_name}" },
    { event_type: "staff_schedule_change",   category: "staff",    send_to: "provider", sort_order: 2,
      title: "تغيير في الجدول",
      message_ar: "تنبيه: تم تعديل جدولك في {org_name}\nيرجى مراجعة التطبيق للاطلاع على التفاصيل." },
    ...SHARED_PAYMENT_TEMPLATES,
  ],

  // ── محل الورود ──────────────────────────────────────────────
  flower_shop: [
    { event_type: "flower_order_confirmed",  category: "orders",   send_to: "customer", sort_order: 1,
      title: "تأكيد طلب الورود",
      message_ar: "مرحباً {customer_name}\nتم استلام طلبك بنجاح من {org_name}.\n\nرقم الطلب: {order_number}\nالمنتجات: {items}\nالمبلغ الإجمالي: {total} ر.س\n\nسنتواصل معك قريباً لتأكيد موعد التسليم." },
    { event_type: "flower_order_ready",      category: "orders",   send_to: "customer", sort_order: 2,
      title: "الطلب جاهز للاستلام",
      message_ar: "طلبك جاهز {customer_name}!\nالطلب رقم {order_number} من {org_name} جاهز الآن.\n\nيمكنك الاستلام أو سيتم التوصيل حسب الاتفاق." },
    { event_type: "flower_order_out",        category: "delivery", send_to: "customer", sort_order: 1,
      title: "الطلب في الطريق",
      message_ar: "طلبك في الطريق إليك\nالطلب رقم {order_number} من {org_name} انطلق للتوصيل.\n\nالعنوان: {delivery_address}\n\nتوقع وصوله خلال فترة قصيرة." },
    { event_type: "flower_order_delivered",  category: "delivery", send_to: "customer", sort_order: 2,
      title: "تم تسليم الطلب",
      message_ar: "تم تسليم طلبك بنجاح\nرقم الطلب: {order_number}\n{org_name}\n\nنتمنى أن يعجبك! نسعد بخدمتك مجدداً." },
    { event_type: "flower_order_cancelled",  category: "orders",   send_to: "customer", sort_order: 3,
      title: "إلغاء طلب الورود",
      message_ar: "نأسف لإبلاغك {customer_name}\nتم إلغاء طلبك رقم {order_number} في {org_name}.\n\nللمزيد من التفاصيل أو إعادة الطلب تواصل معنا." },
    { event_type: "owner_new_flower_order",  category: "orders",   send_to: "owner",    sort_order: 4,
      title: "إشعار المالك — طلب جديد",
      message_ar: "طلب ورود جديد\nالعميل: {customer_name}\nالهاتف: {phone}\nالمنتجات: {items}\nالمبلغ: {total} ر.س\nرقم الطلب: {order_number}" },
    { event_type: "flower_stock_expiry",     category: "stock",    send_to: "owner",    sort_order: 1,
      title: "تنبيه انتهاء صلاحية المخزون",
      message_ar: "تنبيه المخزون — {org_name}\nالصنف: {item_name}\nالكمية المتبقية: {quantity}\nتاريخ انتهاء الصلاحية: {expiry_date}\n\nيرجى المراجعة والتصرف." },
    ...SHARED_PAYMENT_TEMPLATES,
  ],

  // ── الفنادق ─────────────────────────────────────────────────
  hotel: [
    { event_type: "hotel_reservation_confirmed",  category: "reservations", send_to: "customer", sort_order: 1,
      title: "تأكيد الحجز",
      message_ar: "مرحباً {customer_name}\nتم تأكيد حجزك في {org_name}.\n\nتاريخ الوصول: {check_in_date}\nتاريخ المغادرة: {check_out_date}\nالغرفة: {room_type}\nرقم الحجز: {booking_number}\n\nنتطلع لاستقبالك!" },
    { event_type: "hotel_check_in_reminder",      category: "reservations", send_to: "customer", sort_order: 2,
      title: "تذكير قبل الوصول",
      message_ar: "تذكير بموعد وصولك\nتسجيل دخولك في {org_name} غداً.\n\nتاريخ الوصول: {check_in_date}\nرقم الحجز: {booking_number}\n\nنتطلع لاستقبالك!" },
    { event_type: "hotel_room_ready",             category: "reservations", send_to: "customer", sort_order: 3,
      title: "الغرفة جاهزة",
      message_ar: "غرفتك جاهزة {customer_name}!\nنرحب بك في {org_name}.\n\nالغرفة: {room_type}\nرقم الغرفة: {room_number}\n\nنتمنى لك إقامة ممتعة." },
    { event_type: "hotel_check_out_reminder",     category: "reservations", send_to: "customer", sort_order: 4,
      title: "تذكير بموعد المغادرة",
      message_ar: "تذكير بموعد مغادرتك\nموعد تسجيل خروجك من {org_name} اليوم.\n\nتاريخ المغادرة: {check_out_date}\nوقت الإخلاء: 12:00 ظهراً\n\nيسعدنا خدمتك مجدداً!" },
    { event_type: "hotel_room_service",           category: "services",     send_to: "customer", sort_order: 1,
      title: "تأكيد طلب الغرفة",
      message_ar: "تم استلام طلبك\nالغرفة: {room_number} — {org_name}\n\nسيتم توصيل طلبك خلال فترة قصيرة." },
    { event_type: "owner_new_reservation",        category: "reservations", send_to: "owner",    sort_order: 5,
      title: "إشعار المالك — حجز جديد",
      message_ar: "حجز فندقي جديد\nالعميل: {customer_name}\nتاريخ الوصول: {check_in_date}\nتاريخ المغادرة: {check_out_date}\nالغرفة: {room_type}\nالمبلغ: {amount} ر.س\nرقم الحجز: {booking_number}" },
    ...SHARED_PAYMENT_TEMPLATES,
  ],

  // ── تأجير السيارات ──────────────────────────────────────────
  car_rental: [
    { event_type: "rental_confirmed",         category: "rentals", send_to: "customer", sort_order: 1,
      title: "تأكيد عقد الإيجار",
      message_ar: "مرحباً {customer_name}\nتم تأكيد عقد إيجار سيارتك من {org_name}.\n\nالسيارة: {car_model}\nتاريخ الاستلام: {pickup_date}\nتاريخ الإعادة: {return_date}\nالمبلغ الإجمالي: {amount} ر.س\nرقم العقد: {booking_number}" },
    { event_type: "car_ready_pickup",         category: "rentals", send_to: "customer", sort_order: 2,
      title: "السيارة جاهزة للاستلام",
      message_ar: "سيارتك جاهزة {customer_name}!\n{car_model} جاهزة للاستلام من {org_name}.\n\nتاريخ الاستلام: {pickup_date}\nرقم العقد: {booking_number}\n\nأحضر هويتك ورخصة القيادة." },
    { event_type: "rental_return_reminder",   category: "rentals", send_to: "customer", sort_order: 3,
      title: "تذكير بموعد الإعادة",
      message_ar: "تذكير بموعد إعادة السيارة\nيتوجب إعادة {car_model} إلى {org_name} غداً.\n\nتاريخ الإعادة: {return_date}\nرقم العقد: {booking_number}\n\nللتمديد تواصل معنا مسبقاً." },
    { event_type: "car_returned",             category: "rentals", send_to: "customer", sort_order: 4,
      title: "تم استلام السيارة",
      message_ar: "تم استلام السيارة بنجاح\nشكراً {customer_name} على اختيارك {org_name}.\n\nرقم العقد: {booking_number}\n\nنتطلع لخدمتك مجدداً!" },
    { event_type: "owner_new_rental",         category: "rentals", send_to: "owner",    sort_order: 5,
      title: "إشعار المالك — إيجار جديد",
      message_ar: "عقد إيجار جديد\nالعميل: {customer_name}\nالسيارة: {car_model}\nمن: {pickup_date} — إلى: {return_date}\nالمبلغ: {amount} ر.س\nرقم العقد: {booking_number}" },
    ...SHARED_PAYMENT_TEMPLATES,
  ],

  // ── المطاعم ──────────────────────────────────────────────────
  restaurant: [
    { event_type: "table_confirmed",          category: "bookings", send_to: "customer", sort_order: 1,
      title: "تأكيد حجز الطاولة",
      message_ar: "مرحباً {customer_name}\nتم تأكيد حجز طاولتك في {org_name}.\n\nالتاريخ: {booking_date}\nالوقت: {booking_time}\nعدد الأشخاص: {guests_count}\n\nرقم الحجز: {booking_number}\nنتطلع لاستقبالك!" },
    { event_type: "table_reminder_1h",        category: "bookings", send_to: "customer", sort_order: 2,
      title: "تذكير قبل ساعة",
      message_ar: "تذكير\nحجز طاولتك في {org_name} بعد ساعة.\n\n{booking_date} — {booking_time}\n\nنراك قريباً!" },
    { event_type: "table_cancelled",          category: "bookings", send_to: "customer", sort_order: 3,
      title: "إلغاء حجز الطاولة",
      message_ar: "نأسف {customer_name}\nتم إلغاء حجز طاولتك رقم {booking_number} في {org_name}.\n\nللحجز مجدداً تواصل معنا." },
    { event_type: "online_order_received",    category: "orders",   send_to: "customer", sort_order: 1,
      title: "استلام الطلب الإلكتروني",
      message_ar: "تم استلام طلبك\nرقم الطلب: {order_number}\n{org_name}\n\nالمبلغ: {total} ر.س\nجاري التجهيز الآن." },
    { event_type: "order_ready_pickup",       category: "orders",   send_to: "customer", sort_order: 2,
      title: "الطلب جاهز للاستلام",
      message_ar: "طلبك جاهز!\nرقم الطلب: {order_number} من {org_name} جاهز للاستلام الآن.\n\nيمكنك الحضور في أي وقت." },
    { event_type: "order_out_for_delivery",   category: "orders",   send_to: "customer", sort_order: 3,
      title: "الطلب في الطريق",
      message_ar: "طلبك في الطريق إليك\nرقم الطلب: {order_number} من {org_name} انطلق للتوصيل.\n\nالعنوان: {delivery_address}" },
    { event_type: "owner_new_table_booking",  category: "bookings", send_to: "owner",    sort_order: 4,
      title: "إشعار المالك — حجز طاولة",
      message_ar: "حجز طاولة جديد\nالعميل: {customer_name}\n{booking_date} — {booking_time}\nعدد الأشخاص: {guests_count}\nرقم الحجز: {booking_number}" },
    { event_type: "owner_new_online_order",   category: "orders",   send_to: "owner",    sort_order: 4,
      title: "إشعار المالك — طلب إلكتروني",
      message_ar: "طلب إلكتروني جديد\nالعميل: {customer_name}\nالمبلغ: {total} ر.س\nرقم الطلب: {order_number}" },
    ...SHARED_PAYMENT_TEMPLATES,
  ],

  // ── التصوير الفوتوغرافي ──────────────────────────────────────
  photography: [
    { event_type: "session_confirmed",        category: "sessions",  send_to: "customer", sort_order: 1,
      title: "تأكيد جلسة التصوير",
      message_ar: "مرحباً {customer_name}\nتم تأكيد جلسة التصوير في {org_name}.\n\nالتاريخ: {booking_date}\nالوقت: {booking_time}\nنوع الجلسة: {service_name}\n\nرقم الحجز: {booking_number}\nنتطلع لرؤيتك!" },
    { event_type: "session_reminder_24h",     category: "sessions",  send_to: "customer", sort_order: 2,
      title: "تذكير قبل يوم",
      message_ar: "تذكير بجلسة التصوير\nجلستك في {org_name} غداً.\n\n{booking_date} — {booking_time}\n{service_name}\n\nاستعد لجلسة رائعة!" },
    { event_type: "session_reminder_2h",      category: "sessions",  send_to: "customer", sort_order: 3,
      title: "تذكير قبل ساعتين",
      message_ar: "جلستك بعد ساعتين!\n{org_name} ينتظرك.\n\n{booking_date} — {booking_time}\n\nنراك قريباً." },
    { event_type: "session_completed",        category: "sessions",  send_to: "customer", sort_order: 4,
      title: "اكتمال الجلسة",
      message_ar: "شكراً لاختيارك {org_name} {customer_name}!\nكانت جلسة رائعة. سنتواصل معك فور انتهاء المعالجة." },
    { event_type: "photos_ready",             category: "delivery",  send_to: "customer", sort_order: 1,
      title: "صورك جاهزة",
      message_ar: "صورك جاهزة {customer_name}!\nيسعدنا إبلاغك بأن صور جلسة {service_name} من {org_name} جاهزة الآن.\n\nرقم الحجز: {booking_number}\n\nتواصل معنا للاستلام." },
    { event_type: "owner_new_session",        category: "sessions",  send_to: "owner",    sort_order: 5,
      title: "إشعار المالك — حجز جلسة",
      message_ar: "حجز جلسة تصوير جديد\nالعميل: {customer_name}\n{booking_date} — {booking_time}\n{service_name}\nالمبلغ: {amount} ر.س\nرقم الحجز: {booking_number}" },
    ...SHARED_PAYMENT_TEMPLATES,
  ],

  // ── التجزئة ─────────────────────────────────────────────────
  retail: [
    { event_type: "retail_order_confirmed",   category: "orders",   send_to: "customer", sort_order: 1,
      title: "تأكيد الطلب",
      message_ar: "مرحباً {customer_name}\nتم استلام طلبك من {org_name}.\n\nرقم الطلب: {order_number}\nالمبلغ الإجمالي: {total} ر.س\n\nسنبلغك فور شحن الطلب." },
    { event_type: "retail_order_processing",  category: "orders",   send_to: "customer", sort_order: 2,
      title: "الطلب قيد التجهيز",
      message_ar: "طلبك رقم {order_number} من {org_name} قيد التجهيز الآن.\n\nسنبلغك فور الشحن." },
    { event_type: "retail_order_shipped",     category: "orders",   send_to: "customer", sort_order: 3,
      title: "تم شحن الطلب",
      message_ar: "تم شحن طلبك\nرقم الطلب: {order_number} من {org_name} في الطريق إليك.\n\nالعنوان: {delivery_address}\n\nمتوقع الوصول خلال 2-4 أيام عمل." },
    { event_type: "retail_order_delivered",   category: "orders",   send_to: "customer", sort_order: 4,
      title: "تم تسليم الطلب",
      message_ar: "تم تسليم طلبك بنجاح\nرقم الطلب: {order_number}\n{org_name}\n\nنشكرك على ثقتك بنا. نسعد بخدمتك مجدداً!" },
    { event_type: "retail_order_cancelled",   category: "orders",   send_to: "customer", sort_order: 5,
      title: "إلغاء الطلب",
      message_ar: "نأسف {customer_name}\nتم إلغاء طلبك رقم {order_number} من {org_name}.\n\nللاستفسار أو إعادة الطلب تواصل معنا." },
    { event_type: "owner_new_retail_order",   category: "orders",   send_to: "owner",    sort_order: 6,
      title: "إشعار المالك — طلب جديد",
      message_ar: "طلب تجزئة جديد\nالعميل: {customer_name}\nالمبلغ: {total} ر.س\nرقم الطلب: {order_number}" },
    ...SHARED_PAYMENT_TEMPLATES,
  ],

  // ── تأجير الأصول / العقارات ──────────────────────────────────
  rental: [
    { event_type: "contract_confirmed",       category: "contracts", send_to: "customer", sort_order: 1,
      title: "تأكيد العقد",
      message_ar: "مرحباً {customer_name}\nتم تأكيد عقدك مع {org_name}.\n\nالأصل: {asset_name}\nبداية العقد: {start_date}\nnهاية العقد: {end_date}\nالمبلغ: {amount} ر.س\nرقم العقد: {booking_number}" },
    { event_type: "contract_start",           category: "contracts", send_to: "customer", sort_order: 2,
      title: "بداية العقد",
      message_ar: "ابتداء عقدك اليوم\n{asset_name} — {org_name}\n\nبداية العقد: {start_date}\nنهاية العقد: {end_date}\nرقم العقد: {booking_number}" },
    { event_type: "contract_expiry_reminder", category: "contracts", send_to: "customer", sort_order: 3,
      title: "تذكير بانتهاء العقد",
      message_ar: "تذكير بانتهاء العقد\nعقدك مع {org_name} على وشك الانتهاء.\n\nتاريخ الانتهاء: {end_date}\nرقم العقد: {booking_number}\n\nتواصل معنا للتجديد." },
    { event_type: "contract_ended",           category: "contracts", send_to: "customer", sort_order: 4,
      title: "انتهاء العقد",
      message_ar: "انتهى عقدك مع {org_name}\nرقم العقد: {booking_number}\n\nشكراً على ثقتك. نسعد بتجديد التعامل معك." },
    { event_type: "owner_new_contract",       category: "contracts", send_to: "owner",    sort_order: 5,
      title: "إشعار المالك — عقد جديد",
      message_ar: "عقد إيجار جديد\nالعميل: {customer_name}\nالأصل: {asset_name}\nمن: {start_date} — إلى: {end_date}\nالمبلغ: {amount} ر.س\nرقم العقد: {booking_number}" },
    ...SHARED_PAYMENT_TEMPLATES,
  ],

};

// القوالب الافتراضية (مشتركة / عام)
const DEFAULT_TEMPLATES: TemplateRow[] = [
  { event_type: "booking_confirmed",       category: "bookings", send_to: "customer", sort_order: 1,
    title: "تأكيد الحجز",
    message_ar: "مرحباً {customer_name}\nتم تأكيد حجزك في {org_name}.\n\nالتاريخ: {booking_date}\nالوقت: {booking_time}\nالخدمة: {service_name}\n\nرقم الحجز: {booking_number}\nنتطلع لاستقبالك!" },
  { event_type: "booking_reminder_24h",    category: "bookings", send_to: "customer", sort_order: 2,
    title: "تذكير قبل 24 ساعة",
    message_ar: "تذكير\nلديك حجز في {org_name} غداً.\n\n{booking_date} — {booking_time}\n{service_name}\n\nللتعديل أو الإلغاء تواصل معنا." },
  { event_type: "booking_reminder_2h",     category: "bookings", send_to: "customer", sort_order: 3,
    title: "تذكير قبل ساعتين",
    message_ar: "تذكير\nحجزك في {org_name} بعد ساعتين!\n\n{booking_date} — {booking_time}\n{service_name}\n\nنراك قريباً" },
  { event_type: "booking_cancelled",       category: "bookings", send_to: "customer", sort_order: 4,
    title: "إلغاء الحجز",
    message_ar: "نأسف لإبلاغك {customer_name}\nتم إلغاء حجزك رقم {booking_number} في {org_name}.\n\nللحجز مجدداً تواصل معنا." },
  { event_type: "booking_rescheduled",     category: "bookings", send_to: "customer", sort_order: 5,
    title: "إعادة جدولة الحجز",
    message_ar: "تم تحديث موعدك في {org_name}\n\nالموعد الجديد:\n{booking_date} — {booking_time}\n{service_name}\n\nرقم الحجز: {booking_number}" },
  { event_type: "booking_completed",       category: "bookings", send_to: "customer", sort_order: 6,
    title: "اكتمال الحجز",
    message_ar: "شكراً لزيارتك {customer_name}\nنتمنى أن تكون تجربتك في {org_name} رائعة.\n\nنسعد بخدمتك دائماً!" },
  { event_type: "owner_new_booking",       category: "bookings", send_to: "owner",    sort_order: 7,
    title: "إشعار المالك — حجز جديد",
    message_ar: "حجز جديد\nالعميل: {customer_name}\n{booking_date} — {booking_time}\n{service_name}\nالمبلغ: {amount} ر.س\nرقم الحجز: {booking_number}" },
  { event_type: "owner_booking_cancelled", category: "bookings", send_to: "owner",    sort_order: 8,
    title: "إشعار المالك — إلغاء حجز",
    message_ar: "تم إلغاء حجز\nالعميل: {customer_name}\n{booking_date} — {booking_time}\nرقم الحجز: {booking_number}" },
  ...SHARED_PAYMENT_TEMPLATES,
  { event_type: "staff_assigned",          category: "staff",    send_to: "provider", sort_order: 1,
    title: "تكليف موظف بمهمة",
    message_ar: "تم تكليفك بمهمة جديدة\nالعميل: {customer_name}\n{booking_date} — {booking_time}\n{service_name}" },
  { event_type: "staff_schedule_change",   category: "staff",    send_to: "provider", sort_order: 2,
    title: "تغيير في الجدول",
    message_ar: "تنبيه: تم تعديل جدولك في {org_name}\nيرجى مراجعة التطبيق للاطلاع على التفاصيل." },
];

function getTemplatesForBizType(bizType: string): TemplateRow[] {
  return TEMPLATES_BY_BUSINESS_TYPE[bizType] ?? DEFAULT_TEMPLATES;
}

// ── المتغيرات حسب نوع المنشأة ───────────────────────────────────
const VARIABLES_BY_BUSINESS_TYPE: Record<string, Array<{ key: string; label: string; description: string }>> = {
  flower_shop: [
    { key: "customer_name",    label: "اسم العميل",          description: "الاسم الكامل للعميل" },
    { key: "order_number",     label: "رقم الطلب",           description: "الرقم التعريفي للطلب" },
    { key: "items",            label: "المنتجات",            description: "قائمة منتجات الطلب" },
    { key: "total",            label: "المبلغ الإجمالي",     description: "إجمالي قيمة الطلب بالريال" },
    { key: "delivery_address", label: "عنوان التوصيل",       description: "عنوان تسليم الطلب" },
    { key: "delivery_date",    label: "تاريخ التسليم",       description: "الموعد المتوقع للتسليم" },
    { key: "item_name",        label: "اسم الصنف",           description: "اسم الصنف في تنبيهات المخزون" },
    { key: "quantity",         label: "الكمية",              description: "كمية الصنف المتبقية" },
    { key: "expiry_date",      label: "تاريخ انتهاء الصلاحية", description: "تاريخ انتهاء صلاحية الصنف" },
    { key: "gift_message",     label: "رسالة الهدية",        description: "النص المرافق للطلب كهدية" },
    { key: "phone",            label: "رقم الجوال",          description: "رقم جوال العميل" },
    { key: "org_name",         label: "اسم المنشأة",         description: "اسم محل الورود" },
  ],
  hotel: [
    { key: "customer_name",    label: "اسم الضيف",           description: "الاسم الكامل للضيف" },
    { key: "booking_number",   label: "رقم الحجز",           description: "الرقم التعريفي للحجز" },
    { key: "check_in_date",    label: "تاريخ الوصول",        description: "تاريخ تسجيل الدخول" },
    { key: "check_out_date",   label: "تاريخ المغادرة",      description: "تاريخ تسجيل الخروج" },
    { key: "room_type",        label: "نوع الغرفة",          description: "تصنيف الغرفة (مفردة، مزدوجة، جناح...)" },
    { key: "room_number",      label: "رقم الغرفة",          description: "رقم الغرفة المخصصة" },
    { key: "amount",           label: "المبلغ",              description: "قيمة الحجز بالريال" },
    { key: "org_name",         label: "اسم الفندق",          description: "اسم الفندق" },
  ],
  car_rental: [
    { key: "customer_name",    label: "اسم العميل",          description: "الاسم الكامل للعميل" },
    { key: "booking_number",   label: "رقم العقد",           description: "الرقم التعريفي للعقد" },
    { key: "car_model",        label: "موديل السيارة",       description: "نوع وموديل السيارة" },
    { key: "pickup_date",      label: "تاريخ الاستلام",      description: "موعد استلام السيارة" },
    { key: "return_date",      label: "تاريخ الإعادة",       description: "موعد إعادة السيارة" },
    { key: "amount",           label: "المبلغ",              description: "قيمة الإيجار بالريال" },
    { key: "org_name",         label: "اسم الشركة",          description: "اسم شركة تأجير السيارات" },
  ],
  restaurant: [
    { key: "customer_name",    label: "اسم العميل",          description: "الاسم الكامل للعميل" },
    { key: "booking_number",   label: "رقم الحجز",           description: "رقم حجز الطاولة" },
    { key: "booking_date",     label: "تاريخ الحجز",         description: "تاريخ حجز الطاولة" },
    { key: "booking_time",     label: "وقت الحجز",           description: "وقت حجز الطاولة" },
    { key: "guests_count",     label: "عدد الأشخاص",         description: "عدد الأشخاص في الحجز" },
    { key: "order_number",     label: "رقم الطلب",           description: "رقم الطلب الإلكتروني" },
    { key: "total",            label: "المبلغ الإجمالي",     description: "إجمالي قيمة الطلب" },
    { key: "delivery_address", label: "عنوان التوصيل",       description: "عنوان تسليم الطلب" },
    { key: "org_name",         label: "اسم المطعم",          description: "اسم المطعم" },
  ],
  photography: [
    { key: "customer_name",    label: "اسم العميل",          description: "الاسم الكامل للعميل" },
    { key: "booking_number",   label: "رقم الحجز",           description: "رقم حجز الجلسة" },
    { key: "booking_date",     label: "تاريخ الجلسة",        description: "تاريخ جلسة التصوير" },
    { key: "booking_time",     label: "وقت الجلسة",          description: "وقت جلسة التصوير" },
    { key: "service_name",     label: "نوع الجلسة",          description: "نوع جلسة التصوير" },
    { key: "amount",           label: "المبلغ",              description: "قيمة الجلسة بالريال" },
    { key: "org_name",         label: "اسم الاستوديو",       description: "اسم استوديو التصوير" },
  ],
  retail: [
    { key: "customer_name",    label: "اسم العميل",          description: "الاسم الكامل للعميل" },
    { key: "order_number",     label: "رقم الطلب",           description: "الرقم التعريفي للطلب" },
    { key: "total",            label: "المبلغ الإجمالي",     description: "إجمالي قيمة الطلب" },
    { key: "delivery_address", label: "عنوان التوصيل",       description: "عنوان تسليم الطلب" },
    { key: "org_name",         label: "اسم المتجر",          description: "اسم متجر التجزئة" },
  ],
  rental: [
    { key: "customer_name",    label: "اسم العميل",          description: "الاسم الكامل للعميل" },
    { key: "booking_number",   label: "رقم العقد",           description: "الرقم التعريفي للعقد" },
    { key: "asset_name",       label: "اسم الأصل",           description: "اسم الأصل المؤجَّر" },
    { key: "start_date",       label: "تاريخ البداية",       description: "تاريخ بداية العقد" },
    { key: "end_date",         label: "تاريخ النهاية",       description: "تاريخ انتهاء العقد" },
    { key: "amount",           label: "المبلغ",              description: "قيمة الإيجار بالريال" },
    { key: "org_name",         label: "اسم الشركة",          description: "اسم شركة الإيجار" },
  ],
};

const DEFAULT_VARIABLES = [
  { key: "customer_name",   label: "اسم العميل",      description: "الاسم الكامل للعميل" },
  { key: "booking_date",    label: "تاريخ الحجز",     description: "تاريخ الحجز بالميلادي" },
  { key: "booking_time",    label: "وقت الحجز",       description: "وقت الحجز" },
  { key: "service_name",    label: "اسم الخدمة",      description: "اسم الخدمة المحجوزة" },
  { key: "booking_number",  label: "رقم الحجز",       description: "الرقم التعريفي للحجز" },
  { key: "org_name",        label: "اسم المنشأة",     description: "اسم منشأتك" },
  { key: "amount",          label: "المبلغ",           description: "المبلغ بالريال السعودي" },
  { key: "staff_name",      label: "اسم الموظف",      description: "اسم الموظف المكلف" },
  { key: "invoice_number",  label: "رقم الفاتورة",    description: "رقم الفاتورة" },
  { key: "phone",           label: "رقم الجوال",      description: "رقم جوال العميل" },
];

// GET /messaging/templates
messagingRouter.get("/templates", async (c) => {
  const orgId = getOrgId(c);

  // Seed default templates if org has none
  const existing = await pool.query(
    `SELECT COUNT(*) FROM message_templates WHERE org_id = $1`, [orgId]
  );
  if (parseInt(existing.rows[0].count) === 0) {
    // Fetch org's business type to seed appropriate templates
    const orgRes = await pool.query(
      `SELECT business_type FROM organizations WHERE id = $1 LIMIT 1`, [orgId]
    ).catch(() => ({ rows: [] as any[] }));
    const bizType = orgRes.rows[0]?.business_type ?? "general";
    const templates = getTemplatesForBizType(bizType);

    const insertValues = templates.map((t, i) => {
      const base = (i * 8) + 2;
      return `($1,$${base},$${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7})`;
    }).join(",");
    const params: any[] = [orgId];
    templates.forEach(t => {
      params.push(t.event_type, t.category, t.send_to, t.sort_order ?? 0, t.title, t.message_ar, true, t.delay_minutes ?? 0);
    });
    await pool.query(
      `INSERT INTO message_templates (org_id, event_type, category, send_to, sort_order, title, message_ar, is_active, delay_minutes)
       VALUES ${insertValues} ON CONFLICT (org_id, event_type, send_to) DO NOTHING`,
      params
    ).catch(() => {});
  }

  const result = await pool.query(
    `SELECT * FROM message_templates WHERE org_id = $1 ORDER BY category ASC, sort_order ASC`,
    [orgId]
  );

  // Group by category
  const grouped: Record<string, any[]> = {};
  for (const row of result.rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }

  return c.json({ data: grouped, total: result.rowCount });
});

// PUT /messaging/templates/:id
messagingRouter.put("/templates/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `UPDATE message_templates SET
       title = COALESCE($1, title),
       message_ar = COALESCE($2, message_ar),
       message_en = COALESCE($3, message_en),
       is_active = COALESCE($4, is_active),
       delay_minutes = COALESCE($5, delay_minutes),
       updated_at = NOW()
     WHERE id = $6 AND org_id = $7 RETURNING *`,
    [body.title || null, body.messageAr || null, body.messageEn || null,
     body.isActive ?? null, body.delayMinutes ?? null,
     c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "message_template", resourceId: c.req.param("id") });
  return c.json({ data: result.rows[0] });
});

// POST /messaging/templates/reset/:eventType
messagingRouter.post("/templates/reset/:eventType", async (c) => {
  const orgId = getOrgId(c);
  const eventType = c.req.param("eventType");
  // Reset to default (blank body, active)
  await pool.query(
    `UPDATE message_templates SET message_ar = '', is_active = true, updated_at = NOW()
     WHERE org_id = $1 AND event_type = $2`,
    [orgId, eventType]
  );
  return c.json({ success: true });
});

// POST /messaging/templates/reseed — حذف القوالب الحالية وإعادة البذر حسب نوع المنشأة
messagingRouter.post("/templates/reseed", async (c) => {
  const orgId = getOrgId(c);
  const orgRes = await pool.query(
    `SELECT business_type FROM organizations WHERE id = $1 LIMIT 1`, [orgId]
  );
  const bizType = orgRes.rows[0]?.business_type ?? "general";
  const templates = getTemplatesForBizType(bizType);

  await pool.query(`DELETE FROM message_templates WHERE org_id = $1`, [orgId]);

  if (templates.length > 0) {
    const insertValues = templates.map((t, i) => {
      const base = (i * 8) + 2;
      return `($1,$${base},$${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7})`;
    }).join(",");
    const params: any[] = [orgId];
    templates.forEach(t => {
      params.push(t.event_type, t.category, t.send_to, t.sort_order ?? 0, t.title, t.message_ar, true, t.delay_minutes ?? 0);
    });
    await pool.query(
      `INSERT INTO message_templates (org_id, event_type, category, send_to, sort_order, title, message_ar, is_active, delay_minutes)
       VALUES ${insertValues}`,
      params
    );
  }

  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "message_templates_reseeded", resourceId: orgId });
  return c.json({ success: true, businessType: bizType, count: templates.length });
});

// GET /messaging/settings
messagingRouter.get("/settings", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM message_settings WHERE org_id = $1 LIMIT 1`,
    [orgId]
  );
  return c.json({ data: result.rows[0] || { orgId, channel: "whatsapp", autoSend: false } });
});

// PUT /messaging/settings
messagingRouter.put("/settings", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const existing = await pool.query(`SELECT id FROM message_settings WHERE org_id = $1`, [orgId]);

  let result;
  if (existing.rows[0]) {
    result = await pool.query(
      `UPDATE message_settings SET
         auto_send = COALESCE($1, auto_send),
         channel = COALESCE($2, channel),
         updated_at = NOW()
       WHERE org_id = $3 RETURNING *`,
      [body.autoSend ?? null, body.channel || null, orgId]
    );
  } else {
    result = await pool.query(
      `INSERT INTO message_settings (org_id, auto_send, channel) VALUES ($1, $2, $3) RETURNING *`,
      [orgId, body.autoSend || false, body.channel || "whatsapp"]
    );
  }
  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "messaging_settings", resourceId: orgId });
  return c.json({ data: result.rows[0] });
});

// GET /messaging/logs
messagingRouter.get("/logs", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const category = c.req.query("category");
  const date = c.req.query("date");

  const phone = c.req.query("phone");
  const conditions = ["org_id = $1"];
  const params: any[] = [orgId];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
  if (date) { params.push(date); conditions.push(`created_at::date = $${params.length}`); }
  if (phone) { params.push(phone); conditions.push(`recipient_phone = $${params.length}`); }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await pool.query(
    `SELECT * FROM message_logs ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const countResult = await pool.query(`SELECT COUNT(*) FROM message_logs ${where}`, params);
  return c.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
});

// GET /messaging/stats
messagingRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'sent') as sent,
       COUNT(*) FILTER (WHERE status = 'failed') as failed,
       COUNT(*) FILTER (WHERE status = 'pending') as pending
     FROM message_logs WHERE org_id = $1`,
    [orgId]
  );
  return c.json({ data: result.rows[0] });
});

// GET /messaging/variables
messagingRouter.get("/variables", async (c) => {
  const orgId = getOrgId(c);

  // Fetch org's business type to return appropriate standard variables
  const orgRes = await pool.query(
    `SELECT business_type FROM organizations WHERE id = $1 LIMIT 1`, [orgId]
  ).catch(() => ({ rows: [] as any[] }));
  const bizType = orgRes.rows[0]?.business_type ?? "general";
  const standardVars = VARIABLES_BY_BUSINESS_TYPE[bizType] ?? DEFAULT_VARIABLES;

  const result = await pool.query(
    `SELECT * FROM message_variables WHERE org_id = $1 ORDER BY variable_key ASC`,
    [orgId]
  );
  return c.json({ data: { standard: standardVars, custom: result.rows } });
});

// POST /messaging/variables
messagingRouter.post("/variables", async (c) => {
  const orgId = getOrgId(c);
  const body = createVariableSchema.parse(await c.req.json());
  const result = await pool.query(
    `INSERT INTO message_variables (org_id, variable_key, variable_value, description) VALUES ($1,$2,$3,$4) RETURNING *`,
    [orgId, body.name || body.variableKey, body.example || body.variableValue || "", body.label || body.description || null]
  );
  return c.json({ data: result.rows[0] }, 201);
});

// DELETE /messaging/variables/:id
messagingRouter.delete("/variables/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE message_variables SET is_active = false WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// POST /messaging/send-bulk
messagingRouter.post("/send-bulk", async (c) => {
  const orgId = getOrgId(c);
  const { phones, message, category } = sendBulkSchema.parse(await c.req.json());
  const ch = (c.req.query("channel") || "whatsapp") as "whatsapp" | "sms";

  let sent = 0;
  let failed = 0;

  // إرسال فعلي لكل رقم
  await Promise.all(
    phones.map(async (phone) => {
      const ok = ch === "sms"
        ? await sendSms(phone, message)
        : await sendWhatsApp(phone, message);

      const status = ok ? "sent" : "failed";
      if (ok) sent++; else failed++;

      await pool.query(
        `INSERT INTO message_logs (org_id, channel, recipient_phone, message_text, status, category)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orgId, ch, phone, message, status, category || "bulk"]
      ).catch(() => {});
    }),
  );

  insertAuditLog({
    orgId, userId: getUserId(c),
    action: "created", resource: "bulk_message", resourceId: orgId,
    metadata: { sent, failed, total: phones.length, channel: ch },
  });

  return c.json({ data: { sent, failed, total: phones.length } });
});

// POST /messaging/schedule
messagingRouter.post("/schedule", async (c) => {
  const orgId = getOrgId(c);
  const { phone, message, scheduledAt } = await c.req.json();
  const result = await pool.query(
    `INSERT INTO scheduled_messages (org_id, recipient_phone, scheduled_at, status)
     VALUES ($1,$2,$3,'pending') RETURNING *`,
    [orgId, phone, scheduledAt]
  );
  return c.json({ data: result.rows[0] }, 201);
});
