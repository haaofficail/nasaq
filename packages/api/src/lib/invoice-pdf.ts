// ============================================================
// INVOICE PDF GENERATOR — ترميز OS Brand
// يولّد PDF احترافي للفاتورة ويُرسله عبر البريد الإلكتروني
// Template: Puppeteer-ready, IBM Plex Sans Arabic, A4, RTL
// ============================================================

import { log } from "./logger";
import { sendEmail } from "./email";

interface InvoiceItem {
  description:     string;
  quantity:        string | number;
  unitPrice:       string | number;
  totalAmount:     string | number;
  vatRate?:        string | number;
  discountAmount?: string | number | null;
  taxableAmount?:  string | number | null;
  notes?:          string | null;
}

interface InvoiceData {
  invoiceNumber:    string;
  invoiceType?:     string | null;          // 'simplified' | 'tax' | 'credit_note' …
  issueDate:        Date | string;
  dueDate?:         Date | string | null;
  supplyDate?:      Date | string | null;
  sellerName:       string;
  sellerVatNumber?: string | null;
  sellerAddress?:   string | null;
  logoUrl?:         string | null;
  invoiceTerms?:    string | null;
  buyerName:        string;
  buyerEmail?:      string | null;
  buyerPhone?:      string | null;
  subtotal:         string | number;
  discountTotal?:   string | number | null;
  vatAmount:        string | number;
  totalAmount:      string | number;
  items:            InvoiceItem[];
  notes?:           string | null;
  qrCode?:          string | null;          // base64 (no data: prefix)
}

// ── توليد HTML الفاتورة ───────────────────────────────────────
function buildInvoiceHtml(inv: InvoiceData): string {
  const BRAND = "#5b9bd5";
  const BLACK = "#1a1a1a";
  const MUTED = "rgba(26,26,26,0.45)";

  const fmt = (n: string | number | null | undefined) =>
    parseFloat(String(n || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (d: Date | string | null | undefined): string => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("ar-SA", {
        year: "numeric", month: "numeric", day: "numeric",
        calendar: "gregory",
      });
    } catch { return String(d); }
  };

  const invTypeLabel = inv.invoiceType === "tax" ? "فاتورة ضريبية" : "فاتورة ضريبية مبسطة";
  const invTypeEn    = inv.invoiceType === "tax" ? "Tax Invoice"    : "Simplified Tax Invoice";

  const hasDiscount =
    Number(inv.discountTotal || 0) > 0 ||
    inv.items.some(it => Number(it.discountAmount || 0) > 0);

  const defaultTerms = [
    "أي تمديد يُحتسب بتكلفة إضافية",
    "جميع التجهيزات تحت مسؤولية العميل",
    "يتحمل العميل أي تلف أو فقد",
    "الفاتورة تُعد عرض سعر صالح لمدة 3 أيام فقط",
  ];
  const terms = inv.invoiceTerms
    ? inv.invoiceTerms.split("\n").filter(Boolean)
    : defaultTerms;

  // ── Item rows ──────────────────────────────────────────────
  const itemRows = inv.items.map((item, i) => {
    const rowBg      = i % 2 === 0 ? "#ffffff" : "#fafafa";
    const unitPrice  = Number(item.unitPrice  || 0);
    const qty        = Number(item.quantity    || 0);
    const discAmt    = Number(item.discountAmount || 0);
    const rowSubtotal = unitPrice * qty;
    const afterDisc  = rowSubtotal - discAmt;

    const discCols = hasDiscount ? `
      <td style="padding:3mm;border-bottom:1px solid #f0f0f0;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;color:${BLACK}">
        ${discAmt > 0 ? fmt(discAmt) : "—"}
      </td>
      <td style="padding:3mm;border-bottom:1px solid #f0f0f0;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;color:${BLACK}">
        ${fmt(afterDisc)}
      </td>` : "";

    return `
    <tr style="background:${rowBg}">
      <td style="padding:3mm;border-bottom:1px solid #f0f0f0;text-align:center;direction:ltr;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;color:${MUTED}">${i + 1}</td>
      <td style="padding:3mm;border-bottom:1px solid #f0f0f0;white-space:normal;word-wrap:break-word;overflow:hidden">
        <div style="font-weight:700;font-size:10px;color:${BLACK};word-break:break-word">${item.description}</div>
        ${item.notes ? `<div style="font-size:8px;color:${MUTED};margin-top:1mm;word-break:break-word">${item.notes}</div>` : ""}
      </td>
      <td style="padding:3mm;border-bottom:1px solid #f0f0f0;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;color:${BLACK}">${fmt(item.unitPrice)}</td>
      <td style="padding:3mm;border-bottom:1px solid #f0f0f0;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;color:${BLACK}">${item.quantity}</td>
      <td style="padding:3mm;border-bottom:1px solid #f0f0f0;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;color:${BLACK}">${fmt(rowSubtotal)}</td>
      ${discCols}
      <td style="padding:3mm;border-bottom:1px solid #f0f0f0;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;font-weight:700;color:${BLACK}">${fmt(item.totalAmount)}</td>
    </tr>`;
  }).join("");

  // ── Table header discount columns ──────────────────────────
  const discHeaderCols = hasDiscount ? `
    <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right;white-space:nowrap">
      <div style="font-size:10px">الخصم</div>
      <div style="font-size:7px;opacity:0.75;margin-top:0.5mm">Discount</div>
    </th>
    <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right;white-space:nowrap">
      <div style="font-size:10px">بعد الخصم</div>
      <div style="font-size:7px;opacity:0.75;margin-top:0.5mm">After Disc.</div>
    </th>` : "";

  const discColDefs = hasDiscount
    ? `<col style="width:18mm"><col style="width:24mm">`
    : "";

  // ── Discount summary row ───────────────────────────────────
  const discSummaryRow = Number(inv.discountTotal || 0) > 0 ? `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:2.5mm 3mm;border-bottom:1px solid #eaeaea">
      <div>
        <div style="font-size:9px;font-weight:700;color:${BLACK}">الخصم</div>
        <div style="font-size:7px;color:${MUTED}">Discount</div>
      </div>
      <div style="font-size:10px;font-variant-numeric:tabular-nums;direction:ltr;color:${BLACK}">- ${fmt(inv.discountTotal)} ر.س</div>
    </div>` : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>فاتورة ${inv.invoiceNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 0; }
    body {
      font-family: 'IBM Plex Sans Arabic', Arial, sans-serif;
      font-size: 10px;
      color: ${BLACK};
      direction: rtl;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      background: #ffffff;
      padding: 18mm 19mm 18mm 16mm;
      border-right: 3mm solid ${BRAND};
      overflow: hidden;
    }
    @media print {
      body { background: #fff; }
      .page { box-shadow: none; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ══ 1. HEADER ══════════════════════════════════════════════ -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8mm">

    <!-- Right: Logo / Name -->
    <div style="flex:1;min-width:0;overflow:hidden">
      ${inv.logoUrl
        ? `<img src="${inv.logoUrl}" alt="${inv.sellerName}" style="max-width:40mm;max-height:15mm;object-fit:contain;display:block">`
        : `<div style="font-size:24px;font-weight:700;color:${BLACK};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${inv.sellerName}</div>`
      }
    </div>

    <!-- Left: Invoice type + number + date -->
    <div style="flex-shrink:0;margin-right:8mm;text-align:left">
      <div style="display:inline-block;background:${BRAND};color:#fff;font-size:9px;font-weight:700;padding:1.5mm 4mm;border-radius:2mm;margin-bottom:2mm">
        ${invTypeLabel} · ${invTypeEn}
      </div>
      <div style="font-size:20px;font-weight:700;color:${BLACK};direction:ltr;text-align:left;margin-bottom:1mm;font-variant-numeric:tabular-nums">
        ${inv.invoiceNumber}
      </div>
      <div style="font-size:9px;color:${MUTED};direction:ltr;text-align:left">
        ${fmtDate(inv.issueDate)}
      </div>
    </div>
  </div>

  <!-- ══ 2. DATE BOXES ══════════════════════════════════════════ -->
  <div style="display:flex;gap:3mm;margin-bottom:6mm">
    <div style="flex:1;border:1px solid #eaeaea;padding:3mm;border-radius:1.5mm;overflow:hidden">
      <div style="font-size:9px;font-weight:700;color:${BLACK};margin-bottom:0.5mm">تاريخ الإصدار</div>
      <div style="font-size:8px;color:${MUTED};margin-bottom:1.5mm">Issue Date</div>
      <div style="font-size:11px;font-weight:700;color:${BLACK};direction:ltr;font-variant-numeric:tabular-nums">${fmtDate(inv.issueDate)}</div>
    </div>
    <div style="flex:1;border:1px solid #eaeaea;padding:3mm;border-radius:1.5mm;overflow:hidden">
      <div style="font-size:9px;font-weight:700;color:${BLACK};margin-bottom:0.5mm">تاريخ الاستحقاق</div>
      <div style="font-size:8px;color:${MUTED};margin-bottom:1.5mm">Due Date</div>
      <div style="font-size:11px;font-weight:700;color:${BLACK};direction:ltr;font-variant-numeric:tabular-nums">${fmtDate(inv.dueDate)}</div>
    </div>
    <div style="flex:1;border:1px solid #eaeaea;padding:3mm;border-radius:1.5mm;overflow:hidden">
      <div style="font-size:9px;font-weight:700;color:${BLACK};margin-bottom:0.5mm">تاريخ التوريد</div>
      <div style="font-size:8px;color:${MUTED};margin-bottom:1.5mm">Supply Date</div>
      <div style="font-size:11px;font-weight:700;color:${BLACK};direction:ltr;font-variant-numeric:tabular-nums">${fmtDate(inv.supplyDate ?? inv.issueDate)}</div>
    </div>
  </div>

  <!-- ══ 3. PARTIES ═════════════════════════════════════════════ -->
  <div style="display:flex;gap:4mm;margin-bottom:6mm">

    <!-- Seller -->
    <div style="flex:1;border:1px solid #eaeaea;border-top:2mm solid ${BRAND};padding:5mm;border-radius:1.5mm;overflow:hidden">
      <div style="font-size:10px;font-weight:700;color:${BLACK};margin-bottom:3mm">
        معلومات النشاط
        <span style="color:${MUTED};font-weight:400;font-size:9px"> — Business Info</span>
      </div>
      <div style="margin-bottom:2mm;overflow:hidden">
        <div style="font-size:8px;color:${MUTED};margin-bottom:0.5mm">الاسم التجاري · Commercial Name</div>
        <div style="font-size:11px;font-weight:700;color:${BLACK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${inv.sellerName}</div>
      </div>
      ${inv.sellerAddress ? `
      <div style="margin-bottom:2mm;overflow:hidden">
        <div style="font-size:8px;color:${MUTED};margin-bottom:0.5mm">العنوان · Address</div>
        <div style="font-size:10px;color:${BLACK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${inv.sellerAddress}</div>
      </div>` : ""}
      ${inv.sellerVatNumber ? `
      <div style="overflow:hidden">
        <div style="font-size:8px;color:${MUTED};margin-bottom:0.5mm">الرقم الضريبي · Tax Number</div>
        <div style="font-size:10px;font-weight:700;color:${BRAND};direction:ltr;text-align:right;font-variant-numeric:tabular-nums">${inv.sellerVatNumber}</div>
      </div>` : ""}
    </div>

    <!-- Buyer -->
    <div style="flex:1;border:1px solid #eaeaea;border-top:2mm solid ${BLACK};padding:5mm;border-radius:1.5mm;overflow:hidden">
      <div style="font-size:10px;font-weight:700;color:${BLACK};margin-bottom:3mm">
        معلومات العميل
        <span style="color:${MUTED};font-weight:400;font-size:9px"> — Customer Info</span>
      </div>
      <div style="margin-bottom:2mm;overflow:hidden">
        <div style="font-size:8px;color:${MUTED};margin-bottom:0.5mm">اسم العميل · Customer Name</div>
        <div style="font-size:11px;font-weight:700;color:${BLACK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${inv.buyerName}</div>
      </div>
      ${inv.buyerPhone ? `
      <div style="overflow:hidden">
        <div style="font-size:8px;color:${MUTED};margin-bottom:0.5mm">الجوال · Mobile Number</div>
        <div style="font-size:10px;color:${BLACK};direction:ltr;text-align:right;font-variant-numeric:tabular-nums">${inv.buyerPhone}</div>
      </div>` : ""}
    </div>
  </div>

  <!-- ══ 4. ITEMS TABLE ══════════════════════════════════════════ -->
  <div style="margin-bottom:6mm;overflow:hidden">
    <table style="width:100%;border-collapse:collapse;table-layout:fixed">
      <colgroup>
        <col style="width:7mm">
        <col>
        <col style="width:22mm">
        <col style="width:14mm">
        <col style="width:22mm">
        ${discColDefs}
        <col style="width:22mm">
      </colgroup>
      <thead>
        <tr style="background:${BRAND}">
          <th style="padding:3mm 3mm 2mm;color:#fff;text-align:center;white-space:nowrap">
            <div style="font-size:10px">#</div>
          </th>
          <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right">
            <div style="font-size:10px">تفاصيل المنتج</div>
            <div style="font-size:7px;opacity:0.75;margin-top:0.5mm">Product Details</div>
          </th>
          <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right;white-space:nowrap">
            <div style="font-size:10px">سعر الوحدة</div>
            <div style="font-size:7px;opacity:0.75;margin-top:0.5mm">Unit Price</div>
          </th>
          <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right;white-space:nowrap">
            <div style="font-size:10px">الكمية</div>
            <div style="font-size:7px;opacity:0.75;margin-top:0.5mm">Quantity</div>
          </th>
          <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right;white-space:nowrap">
            <div style="font-size:10px">المجموع الفرعي</div>
            <div style="font-size:7px;opacity:0.75;margin-top:0.5mm">Subtotal</div>
          </th>
          ${discHeaderCols}
          <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right;white-space:nowrap">
            <div style="font-size:10px">المجموع</div>
            <div style="font-size:7px;opacity:0.75;margin-top:0.5mm">Total</div>
          </th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>

  <!-- ══ 5. FINANCIAL SUMMARY ════════════════════════════════════ -->
  <div style="display:flex;margin-bottom:8mm">
    <div style="width:70mm;border:1px solid #eaeaea;border-radius:1.5mm;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:2.5mm 3mm;border-bottom:1px solid #eaeaea">
        <div>
          <div style="font-size:9px;font-weight:700;color:${BLACK}">المجموع الفرعي</div>
          <div style="font-size:7px;color:${MUTED}">Subtotal</div>
        </div>
        <div style="font-size:10px;font-variant-numeric:tabular-nums;direction:ltr;font-weight:700;color:${BLACK}">${fmt(inv.subtotal)} ر.س</div>
      </div>
      ${discSummaryRow}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:3mm;background:${BRAND}">
        <div>
          <div style="font-size:10px;font-weight:700;color:#fff">إجمالي الطلب</div>
          <div style="font-size:7px;color:rgba(255,255,255,0.75)">Grand Total</div>
        </div>
        <div style="font-size:13px;font-variant-numeric:tabular-nums;direction:ltr;font-weight:700;color:#fff">${fmt(inv.totalAmount)} ر.س</div>
      </div>
    </div>
  </div>

  <!-- ══ 6. TERMS ════════════════════════════════════════════════ -->
  <div style="margin-bottom:6mm;border-top:1px solid #eaeaea;padding-top:4mm">
    <div style="font-size:9px;font-weight:700;color:${BLACK};margin-bottom:2mm">الشروط العامة:</div>
    ${terms.map(t => `
    <div style="font-size:8.5px;color:rgba(26,26,26,0.5);margin-bottom:1.5mm;display:flex;gap:2mm;align-items:baseline;overflow:hidden">
      <span style="flex-shrink:0;color:${BRAND};font-weight:700">·</span>
      <span style="word-break:break-word">${t}</span>
    </div>`).join("")}
  </div>

  <!-- ══ 7. SIGNATURES ═══════════════════════════════════════════ -->
  <div style="display:flex;gap:4mm;margin-bottom:8mm">
    ${[
      { ar: "توقيع البائع",   en: "Seller Signature"   },
      { ar: "ختم المنشأة",   en: "Official Seal"        },
      { ar: "توقيع العميل",  en: "Customer Signature"  },
    ].map(s => `
    <div style="flex:1;text-align:center">
      <div style="height:14mm"></div>
      <div style="border-top:1px dashed #cccccc;padding-top:2mm">
        <div style="font-size:8px;font-weight:700;color:${BLACK}">${s.ar}</div>
        <div style="font-size:7px;color:${MUTED}">${s.en}</div>
      </div>
    </div>`).join("")}
  </div>

  <!-- ══ 8. FOOTER ═══════════════════════════════════════════════ -->
  <div style="border-top:1px solid #f0f0f0;padding-top:4mm;text-align:center">
    ${inv.qrCode ? `
    <div style="margin-bottom:3mm">
      <img src="data:image/png;base64,${inv.qrCode}" alt="ZATCA QR"
           style="width:16mm;height:16mm;display:inline-block"
           onerror="this.style.display='none'">
      <div style="font-size:7px;color:${MUTED};margin-top:1mm">رمز الفاتورة الإلكترونية — ZATCA</div>
    </div>` : ""}
    <div style="font-size:12px;font-weight:700;color:${BRAND};margin-bottom:3mm">شكراً لتعاملكم</div>
    <div style="border-top:1px solid #f0f0f0;padding-top:2.5mm">
      <span style="font-size:7.5px;color:#cccccc">مدعوم بواسطة </span><span style="font-size:7.5px;font-weight:700;color:${BRAND}">ترميز OS</span><span style="font-size:7.5px;color:#cccccc"> · tarmizos.com</span>
    </div>
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
    `SELECT i.*,
            o.logo AS logo_url,
            array_agg(
              json_build_object(
                'description',    ii.description,
                'quantity',       ii.quantity,
                'unitPrice',      ii.unit_price,
                'discountAmount', ii.discount_amount,
                'taxableAmount',  ii.taxable_amount,
                'totalAmount',    ii.total_amount,
                'vatRate',        ii.vat_rate
              ) ORDER BY ii.sort_order
            ) AS items
     FROM invoices i
     LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
     LEFT JOIN organizations o  ON o.id = i.org_id
     WHERE i.id = $1 AND i.org_id = $2
     GROUP BY i.id, o.logo`,
    [invoiceId, orgId],
  );

  if (!inv) return null;

  return {
    invoiceNumber:    inv.invoice_number,
    invoiceType:      inv.invoice_type,
    issueDate:        inv.issue_date,
    dueDate:          inv.due_date,
    sellerName:       inv.seller_name,
    sellerVatNumber:  inv.seller_vat_number,
    sellerAddress:    inv.seller_address,
    logoUrl:          inv.logo_url,
    invoiceTerms:     inv.terms_and_conditions,
    buyerName:        inv.buyer_name,
    buyerEmail:       inv.buyer_email,
    buyerPhone:       inv.buyer_phone,
    subtotal:         inv.taxable_amount ?? inv.subtotal ?? inv.total_amount,
    discountTotal:    inv.discount_amount,
    vatAmount:        inv.vat_amount,
    totalAmount:      inv.total_amount,
    items:            inv.items?.filter((i: any) => i.description) ?? [],
    notes:            inv.notes,
    qrCode:           inv.qr_code,
  };
}
