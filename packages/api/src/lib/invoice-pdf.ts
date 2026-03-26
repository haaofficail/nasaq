// ============================================================
// INVOICE PDF GENERATOR
// يولّد PDF احترافي للفاتورة ويُرسله عبر البريد الإلكتروني
// ============================================================

import { log } from "./logger";
import { sendEmail } from "./email";

interface InvoiceItem {
  description: string;
  quantity:    string | number;
  unitPrice:   string | number;
  totalAmount: string | number;
  vatRate?:    string | number;
}

interface InvoiceData {
  invoiceNumber:   string;
  issueDate:       Date | string;
  dueDate?:        Date | string | null;
  sellerName:      string;
  sellerVatNumber?: string | null;
  buyerName:       string;
  buyerEmail?:     string | null;
  buyerPhone?:     string | null;
  subtotal:        string | number;
  vatAmount:       string | number;
  totalAmount:     string | number;
  items:           InvoiceItem[];
  notes?:          string | null;
  qrCode?:         string | null;
}

// ── توليد HTML الفاتورة ───────────────────────────────────────
function buildInvoiceHtml(inv: InvoiceData): string {
  const fmt = (n: string | number) =>
    parseFloat(String(n)).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  };

  const itemRows = inv.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#374151">${item.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#374151">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:left;color:#374151">${fmt(item.unitPrice)} ر.س</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:left;font-weight:600;color:#111827">${fmt(item.totalAmount)} ر.س</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>فاتورة ${inv.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1f2937; direction: rtl; }
    .page { max-width: 700px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #5b9bd5, #3b7bbf); padding: 36px 40px; color: #fff; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .brand-sub { font-size: 13px; opacity: 0.8; margin-top: 4px; }
    .invoice-tag { background: rgba(255,255,255,0.2); border-radius: 8px; padding: 8px 16px; text-align: center; }
    .invoice-tag-label { font-size: 11px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }
    .invoice-tag-number { font-size: 18px; font-weight: 700; margin-top: 2px; }
    .header-dates { display: flex; gap: 24px; margin-top: 24px; }
    .date-item { font-size: 13px; }
    .date-label { opacity: 0.7; }
    .date-value { font-weight: 600; margin-top: 2px; }
    .body { padding: 32px 40px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .party-box { background: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb; }
    .party-label { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .party-name { font-size: 16px; font-weight: 700; color: #111827; }
    .party-detail { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table thead tr { background: #f3f4f6; }
    .items-table thead th { padding: 12px; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals-box { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .totals-row.total { font-size: 16px; font-weight: 700; color: #111827; border-bottom: none; padding-top: 12px; }
    .totals-row .label { color: #6b7280; }
    .notes { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; color: #92400e; }
    .footer { background: #f8fafc; border-top: 1px solid #e5e7eb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; }
    .qr-section { text-align: center; margin-bottom: 24px; }
    .qr-section img { width: 100px; height: 100px; }
    .qr-label { font-size: 11px; color: #9ca3af; margin-top: 6px; }
    @media print {
      body { background: #fff; }
      .page { max-width: 100%; box-shadow: none; }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-top">
      <div>
        <div class="brand">${inv.sellerName}</div>
        ${inv.sellerVatNumber ? `<div class="brand-sub">الرقم الضريبي: ${inv.sellerVatNumber}</div>` : ""}
      </div>
      <div class="invoice-tag">
        <div class="invoice-tag-label">فاتورة ضريبية</div>
        <div class="invoice-tag-number">${inv.invoiceNumber}</div>
      </div>
    </div>
    <div class="header-dates">
      <div class="date-item">
        <div class="date-label">تاريخ الإصدار</div>
        <div class="date-value">${fmtDate(inv.issueDate)}</div>
      </div>
      ${inv.dueDate ? `<div class="date-item"><div class="date-label">تاريخ الاستحقاق</div><div class="date-value">${fmtDate(inv.dueDate)}</div></div>` : ""}
    </div>
  </div>

  <div class="body">
    <div class="parties">
      <div class="party-box">
        <div class="party-label">المورد</div>
        <div class="party-name">${inv.sellerName}</div>
        ${inv.sellerVatNumber ? `<div class="party-detail">الرقم الضريبي: ${inv.sellerVatNumber}</div>` : ""}
      </div>
      <div class="party-box">
        <div class="party-label">العميل</div>
        <div class="party-name">${inv.buyerName}</div>
        ${inv.buyerPhone ? `<div class="party-detail">${inv.buyerPhone}</div>` : ""}
        ${inv.buyerEmail ? `<div class="party-detail">${inv.buyerEmail}</div>` : ""}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align:right">الوصف</th>
          <th style="text-align:center">الكمية</th>
          <th style="text-align:left">سعر الوحدة</th>
          <th style="text-align:left">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span class="label">المجموع قبل الضريبة</span>
          <span>${fmt(inv.subtotal)} ر.س</span>
        </div>
        <div class="totals-row">
          <span class="label">ضريبة القيمة المضافة (15%)</span>
          <span>${fmt(inv.vatAmount)} ر.س</span>
        </div>
        <div class="totals-row total">
          <span>الإجمالي</span>
          <span>${fmt(inv.totalAmount)} ر.س</span>
        </div>
      </div>
    </div>

    ${inv.qrCode ? `
    <div class="qr-section">
      <img src="data:image/png;base64,${inv.qrCode}" alt="QR Code" onerror="this.style.display='none'"/>
      <div class="qr-label">رمز ZATCA للتحقق</div>
    </div>` : ""}

    ${inv.notes ? `<div class="notes"><strong>ملاحظات:</strong> ${inv.notes}</div>` : ""}
  </div>

  <div class="footer">
    تم إصدار هذه الفاتورة إلكترونياً عبر منصة نسق · ${new Date().getFullYear()}
  </div>
</div>
</body>
</html>`;
}

// ── إرسال الفاتورة عبر البريد الإلكتروني ─────────────────────
export async function sendInvoiceEmail(inv: InvoiceData): Promise<boolean> {
  if (!inv.buyerEmail) {
    log.warn({ invoiceNumber: inv.invoiceNumber }, "[invoice-pdf] no buyer email — skipping");
    return false;
  }

  const html = buildInvoiceHtml(inv);
  const fmt  = (n: string | number) =>
    parseFloat(String(n)).toLocaleString("ar-SA", { minimumFractionDigits: 2 });

  return sendEmail({
    to:      inv.buyerEmail,
    subject: `فاتورة ${inv.invoiceNumber} من ${inv.sellerName}`,
    html,
    text: [
      `فاتورة رقم: ${inv.invoiceNumber}`,
      `من: ${inv.sellerName}`,
      `إلى: ${inv.buyerName}`,
      `الإجمالي: ${fmt(inv.totalAmount)} ر.س`,
      "",
      "يرجى مراجعة الفاتورة المرفقة في البريد الإلكتروني.",
    ].join("\n"),
  });
}

// ── endpoint handler: GET /finance/invoices/:id/send-email ────
export async function buildInvoiceData(
  pool: any,
  invoiceId: string,
  orgId: string,
): Promise<InvoiceData | null> {
  const { rows: [inv] } = await pool.query(
    `SELECT i.*, array_agg(
       json_build_object(
         'description', ii.description,
         'quantity', ii.quantity,
         'unitPrice', ii.unit_price,
         'totalAmount', ii.total_amount,
         'vatRate', ii.vat_rate
       ) ORDER BY ii.sort_order
     ) AS items
     FROM invoices i
     LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
     WHERE i.id = $1 AND i.org_id = $2
     GROUP BY i.id`,
    [invoiceId, orgId],
  );

  if (!inv) return null;

  return {
    invoiceNumber:   inv.invoice_number,
    issueDate:       inv.issue_date,
    dueDate:         inv.due_date,
    sellerName:      inv.seller_name,
    sellerVatNumber: inv.seller_vat_number,
    buyerName:       inv.buyer_name,
    buyerEmail:      inv.buyer_email,
    buyerPhone:      inv.buyer_phone,
    subtotal:        inv.taxable_amount ?? inv.total_amount,
    vatAmount:       inv.vat_amount,
    totalAmount:     inv.total_amount,
    items:           inv.items?.filter((i: any) => i.description) ?? [],
    notes:           inv.notes,
    qrCode:          inv.qr_code,
  };
}
