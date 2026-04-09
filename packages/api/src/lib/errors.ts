/**
 * Nasaq API — Error Code Registry
 *
 * كل خطأ يحمل:
 *   - code    : رمز فريد (مثل ORG_NOT_FOUND) للتتبع السريع في السجلات
 *   - msg     : رسالة عربية للمستخدم
 *   - requestId : معرّف الطلب من X-Request-Id (يُضاف تلقائياً)
 *
 * الاستخدام داخل route:
 *   return apiErr(c, "ORG_NOT_FOUND", 404);
 */

import type { Context } from "hono";

// ============================================================
// ERROR CATALOG
// ============================================================

export const E = {

  // ── Auth ─────────────────────────────────────────────────
  AUTH_NO_TOKEN:      { code: "AUTH_NO_TOKEN",      msg: "غير مصرح — لا يوجد رمز دخول" },
  AUTH_EXPIRED:       { code: "AUTH_EXPIRED",       msg: "الجلسة منتهية أو منتهية الصلاحية" },
  AUTH_NO_USER:       { code: "AUTH_NO_USER",       msg: "المستخدم غير موجود" },
  AUTH_NOT_STAFF:     { code: "AUTH_NOT_STAFF",     msg: "غير مصرح — يلزم عضوية في فريق نسق" },
  AUTH_SUPER_ONLY:    { code: "AUTH_SUPER_ONLY",    msg: "هذا الإجراء يتطلب صلاحية سوبر أدمن" },
  AUTH_ROLE_NOT_ALLOWED: { code: "AUTH_ROLE_NOT_ALLOWED", msg: "دورك الحالي لا يملك صلاحية هذا الإجراء" },
  AUTH_NO_ADMIN:      { code: "AUTH_NO_ADMIN",      msg: "بيانات المدير غير موجودة" },

  // ── Organizations ────────────────────────────────────────
  ORG_NOT_FOUND:      { code: "ORG_NOT_FOUND",      msg: "المنشأة غير موجودة" },
  ORG_NO_OWNER:       { code: "ORG_NO_OWNER",       msg: "لا يوجد مالك للمنشأة" },
  ORG_INVALID_CAPS:   { code: "ORG_INVALID_CAPS",   msg: "capabilities يجب أن تكون مصفوفة" },
  ORG_NAME_REQUIRED:  { code: "ORG_NAME_REQUIRED",  msg: "الاسم مطلوب" },
  ORG_PLAN_REQUIRED:  { code: "ORG_PLAN_REQUIRED",  msg: "الباقة مطلوبة" },
  ORG_SLUG_TAKEN:     { code: "ORG_SLUG_TAKEN",     msg: "هذا الـ Slug مستخدم من منشأة أخرى" },
  ORG_SUSPENDED:      { code: "ORG_SUSPENDED",       msg: "اشتراككم موقوف — يرجى تجديد الاشتراك للاستمرار" },

  // ── Plans ────────────────────────────────────────────────
  PLAN_NOT_FOUND:     { code: "PLAN_NOT_FOUND",     msg: "الباقة غير موجودة" },

  // ── Commercial Engine ────────────────────────────────────
  COM_FEAT_NOT_FOUND:      { code: "COM_FEAT_NOT_FOUND",      msg: "الميزة غير موجودة" },
  COM_QUOTA_NOT_FOUND:     { code: "COM_QUOTA_NOT_FOUND",     msg: "الحصة غير موجودة" },
  COM_ADDON_NOT_FOUND:     { code: "COM_ADDON_NOT_FOUND",     msg: "الإضافة غير موجودة" },
  COM_GRANT_NOT_FOUND:     { code: "COM_GRANT_NOT_FOUND",     msg: "المنحة غير موجودة" },
  COM_DISCOUNT_NOT_FOUND:  { code: "COM_DISCOUNT_NOT_FOUND",  msg: "الخصم غير موجود" },
  COM_PROMO_NOT_FOUND:     { code: "COM_PROMO_NOT_FOUND",     msg: "العرض غير موجود أو غير نشط" },
  COM_RULE_NOT_FOUND:      { code: "COM_RULE_NOT_FOUND",      msg: "القاعدة غير موجودة" },
  COM_FEAT_REQUIRED:       { code: "COM_FEAT_REQUIRED",       msg: "id و nameAr مطلوبان للميزة" },
  COM_ADDON_REQUIRED:      { code: "COM_ADDON_REQUIRED",      msg: "key و nameAr و type مطلوبة للإضافة" },
  COM_GRANT_REQUIRED:      { code: "COM_GRANT_REQUIRED",      msg: "nameAr و type و reason مطلوبة للمنحة" },
  COM_DISCOUNT_REQUIRED:   { code: "COM_DISCOUNT_REQUIRED",   msg: "name و type و value مطلوبة للخصم" },
  COM_PROMO_REQUIRED:      { code: "COM_PROMO_REQUIRED",      msg: "name و type مطلوبان للعرض" },
  COM_RULE_REQUIRED:       { code: "COM_RULE_REQUIRED",       msg: "name و trigger مطلوبان للقاعدة" },
  COM_INVALID_FEATURES:    { code: "COM_INVALID_FEATURES",    msg: "features يجب أن تكون مصفوفة" },
  COM_INVALID_QUOTAS:      { code: "COM_INVALID_QUOTAS",      msg: "quotas يجب أن تكون مصفوفة" },
  COM_BILLING_REASON:      { code: "COM_BILLING_REASON",      msg: "reason مطلوب لأسباب المراجعة" },

  // ── Users / Staff ────────────────────────────────────────
  USR_NOT_FOUND:      { code: "USR_NOT_FOUND",      msg: "المستخدم غير موجود" },
  USR_EMAIL_TAKEN:    { code: "USR_EMAIL_TAKEN",    msg: "البريد الإلكتروني مسجل مسبقاً" },
  USR_PHONE_TAKEN:    { code: "USR_PHONE_TAKEN",    msg: "رقم الجوال مسجل مسبقاً" },
  USR_INVALID_INPUT:  { code: "USR_INVALID_INPUT",  msg: "الاسم والبريد الإلكتروني أو الجوال مطلوبان" },
  USR_WEAK_PASSWORD:  { code: "USR_WEAK_PASSWORD",  msg: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" },
  USR_SELF_DELETE:    { code: "USR_SELF_DELETE",    msg: "لا يمكنك حذف حسابك الخاص" },
  USR_DELETE_SUPER:   { code: "USR_DELETE_SUPER",   msg: "لا يمكن حذف سوبر أدمن" },

  // ── Documents ────────────────────────────────────────────
  DOC_NOT_FOUND:      { code: "DOC_NOT_FOUND",      msg: "الوثيقة غير موجودة" },

  // ── Support Tickets ──────────────────────────────────────
  SUP_NOT_FOUND:      { code: "SUP_NOT_FOUND",      msg: "التذكرة غير موجودة" },
  TICKET_NOT_FOUND:   { code: "TICKET_NOT_FOUND",   msg: "التذكرة غير موجودة" },
  TICKET_CLOSED:      { code: "TICKET_CLOSED",      msg: "التذكرة مغلقة ولا يمكن إضافة ردود" },
  MSG_REQUIRED:       { code: "MSG_REQUIRED",       msg: "محتوى الرسالة مطلوب" },

  // ── Announcements ────────────────────────────────────────
  ANN_NOT_FOUND:      { code: "ANN_NOT_FOUND",      msg: "الإعلان غير موجود" },

  // ── Bookings ─────────────────────────────────────────────
  BKG_NOT_FOUND:      { code: "BKG_NOT_FOUND",      msg: "الحجز غير موجود" },
  BKG_INVALID_STATUS: { code: "BKG_INVALID_STATUS", msg: "الحالة المطلوبة غير صالحة لهذا الحجز" },
  BKG_CONFLICT:       { code: "BKG_CONFLICT",        msg: "يوجد تعارض في الحجز مع موعد آخر" },
  BKG_NO_DATE:        { code: "BKG_NO_DATE",         msg: "هذه الخدمة تتطلب تاريخ ووقت الحجز" },
  BKG_CUST_REQUIRED:  { code: "BKG_CUST_REQUIRED",   msg: "العميل مطلوب" },

  // ── Customers ────────────────────────────────────────────
  CUST_NOT_FOUND:     { code: "CUST_NOT_FOUND",     msg: "العميل غير موجود" },
  CUST_PHONE_TAKEN:   { code: "CUST_PHONE_TAKEN",   msg: "رقم الجوال مسجل مسبقاً" },

  // ── Services ─────────────────────────────────────────────
  SVC_NOT_FOUND:      { code: "SVC_NOT_FOUND",      msg: "الخدمة غير موجودة" },
  SVC_NOT_BOOKABLE:   { code: "SVC_NOT_BOOKABLE",   msg: "الخدمة غير متاحة للحجز حالياً" },

  // ── Payments ─────────────────────────────────────────────
  PAY_NOT_FOUND:      { code: "PAY_NOT_FOUND",      msg: "الدفعة غير موجودة" },
  PAY_AMOUNT_EXCEEDS: { code: "PAY_AMOUNT_EXCEEDS",  msg: "المبلغ يتجاوز المبلغ المتبقي" },

  // ── Inventory ────────────────────────────────────────────
  INV_ASSET_NOT_FOUND:   { code: "INV_ASSET_NOT_FOUND",   msg: "الأصل غير موجود" },
  INV_TYPE_NOT_FOUND:    { code: "INV_TYPE_NOT_FOUND",     msg: "نوع الأصل غير موجود" },
  INV_NOT_AVAILABLE:     { code: "INV_NOT_AVAILABLE",      msg: "الأصل غير متاح في هذا التاريخ" },
  INV_TRANSFER_SAME_LOC: { code: "INV_TRANSFER_SAME_LOC",  msg: "الموقع الحالي والوجهة متطابقان" },

  // ── Categories ───────────────────────────────────────────
  CAT_NOT_FOUND:       { code: "CAT_NOT_FOUND",      msg: "الفئة غير موجودة" },
  CAT_HAS_CHILDREN:    { code: "CAT_HAS_CHILDREN",   msg: "لا يمكن حذف فئة تحتوي على فئات فرعية" },

  // ── Addons ───────────────────────────────────────────────
  ADDON_NOT_FOUND:    { code: "ADDON_NOT_FOUND",    msg: "الإضافة غير موجودة" },

  // ── Approvals ────────────────────────────────────────────
  APPR_NOT_FOUND:     { code: "APPR_NOT_FOUND",     msg: "طلب الموافقة غير موجود أو تم حله مسبقاً" },
  APPR_RULE_NOT_FOUND: { code: "APPR_RULE_NOT_FOUND", msg: "قاعدة الموافقة غير موجودة" },

  // ── Marketplace ──────────────────────────────────────────
  MKT_RFP_NOT_FOUND:  { code: "MKT_RFP_NOT_FOUND", msg: "الطلب غير موجود أو مغلق" },
  MKT_ALREADY_PROPOSED: { code: "MKT_ALREADY_PROPOSED", msg: "لقد قدمت عرضاً على هذا الطلب مسبقاً" },
  MKT_LISTING_NOT_FOUND: { code: "MKT_LISTING_NOT_FOUND", msg: "الإعلان غير موجود" },

  // ── Procurement ──────────────────────────────────────────
  SUPPLIER_NOT_FOUND:         { code: "SUPPLIER_NOT_FOUND",         msg: "المورد غير موجود" },
  PO_NOT_FOUND:               { code: "PO_NOT_FOUND",               msg: "أمر الشراء غير موجود" },
  PO_NOT_RECEIVABLE:          { code: "PO_NOT_RECEIVABLE",          msg: "لا يمكن استلام هذا الأمر في حالته الحالية" },
  PO_IMMUTABLE:               { code: "PO_IMMUTABLE",               msg: "لا يمكن تعديل أمر الشراء بعد الاستلام أو الإغلاق" },
  PO_ITEM_NOT_FOUND:          { code: "PO_ITEM_NOT_FOUND",          msg: "بند أمر الشراء غير موجود" },
  GR_NOT_FOUND:               { code: "GR_NOT_FOUND",               msg: "إيصال الاستلام غير موجود" },
  GR_ALREADY_PROCESSED:       { code: "GR_ALREADY_PROCESSED",       msg: "تمت معالجة إيصال الاستلام مسبقاً" },
  SUPPLIER_INVOICE_NOT_FOUND: { code: "SUPPLIER_INVOICE_NOT_FOUND", msg: "فاتورة المورد غير موجودة" },

  // ── Admin ────────────────────────────────────────────────
  PASSWORD_TOO_SHORT: { code: "PASSWORD_TOO_SHORT", msg: "كلمة المرور قصيرة جداً — 6 أحرف على الأقل" },
  OWNER_NOT_FOUND:    { code: "OWNER_NOT_FOUND",    msg: "لا يوجد مالك لهذه المنشأة" },
  NOT_FOUND:          { code: "NOT_FOUND",          msg: "العنصر المطلوب غير موجود" },

  // ── Server ───────────────────────────────────────────────
  SRV_INTERNAL:       { code: "SRV_INTERNAL",       msg: "خطأ في الخادم، يرجى المحاولة لاحقاً" },
  SRV_VALIDATION:     { code: "SRV_VALIDATION",     msg: "البيانات المُدخلة غير صحيحة" },

} as const;

export type ErrorCode = keyof typeof E;

// ============================================================
// HELPER
// ============================================================

/**
 * ترجع response موحّد يحمل:
 *   { error, code, requestId }
 *
 * مثال:
 *   return apiErr(c, "ORG_NOT_FOUND", 404);
 * → { error: "المنشأة غير موجودة", code: "ORG_NOT_FOUND", requestId: "req_xyz" }
 */
export function apiErr(
  c: Context,
  key: ErrorCode,
  status: 400 | 401 | 403 | 404 | 409 | 500,
) {
  const { code, msg } = E[key];
  const requestId = (c.get("requestId") as string | undefined) ?? undefined;
  return c.json({ error: msg, code, requestId }, status);
}
