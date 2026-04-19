import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Send, Printer, FileText, CreditCard,
  XCircle, AlertCircle, Clock, CheckCircle2, AlertTriangle,
  Plus, RotateCcw, Receipt, Eye, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select, Breadcrumb } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

// ── helpers ──────────────────────────────────────────────────────
function fmt(n: any) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft:          { label: "مسودة",         color: "bg-[var(--surface-3)] text-[var(--text-2)] border-[var(--border)]", icon: Clock },
  issued:         { label: "صادرة",          color: "bg-brand-soft text-brand-700 border-brand-200",                    icon: FileText },
  sent:           { label: "مُرسلة",         color: "bg-lavender-soft text-lavender border-lavender-soft",              icon: FileText },
  paid:           { label: "مدفوعة",         color: "bg-success-soft text-success border-success-soft",                 icon: CheckCircle2 },
  partially_paid: { label: "مدفوع جزئياً",  color: "bg-sky-soft text-sky border-sky-soft",                             icon: Clock },
  overdue:        { label: "متأخرة",         color: "bg-danger-soft text-danger border-danger-soft",                    icon: AlertTriangle },
  cancelled:      { label: "ملغاة",          color: "bg-[var(--surface-3)] text-[var(--text-3)] border-[var(--border)]", icon: XCircle },
};

const PAY_METHOD: Record<string, string> = {
  cash: "كاش", card: "بطاقة", bank_transfer: "تحويل بنكي",
  online: "إلكتروني", check: "شيك", other: "أخرى",
};

const TABS = [
  { key: "details",  label: "تفاصيل الفاتورة" },
  { key: "payments", label: "العمليات" },
  { key: "refunds",  label: "طلبات الاسترجاع" },
  { key: "invoices", label: "الفواتير" },
];

// ── print helpers ─────────────────────────────────────────────────
const BRAND = "#5b9bd5";
const INK   = "#1a1a1a";
const MUTED = "rgba(26,26,26,0.45)";

function fmtNum(n: any) {
  return parseFloat(String(n || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPrintDate(d: any): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "numeric", day: "numeric", calendar: "gregory" });
  } catch { return String(d); }
}

function printWindow(title: string, bodyHtml: string) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="utf-8"><title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;700&display=swap" rel="stylesheet">
    <style>
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      @page{size:A4;margin:0}
      body{font-family:'IBM Plex Sans Arabic',Arial,sans-serif;font-size:10px;color:${INK};direction:rtl;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .page{width:210mm;min-height:297mm;background:#fff;padding:18mm 19mm 18mm 16mm;border-right:3mm solid ${BRAND};overflow:hidden}
      @media print{body{background:#fff}.page{box-shadow:none}}
    </style>
    </head><body><div class="page">${bodyHtml}</div>
    <script>window.onload=()=>{window.print()}<\/script></body></html>`);
  w.document.close();
}

// ── main component ────────────────────────────────────────────────
export function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab]             = useState("details");
  const [showPayment, setShowPayment] = useState(false);
  const [showRefund,  setShowRefund]  = useState(false);
  const [sending, setSending]     = useState(false);
  const [payForm, setPayForm]     = useState({
    amount: "", paymentMethod: "cash", paymentDate: new Date().toISOString().split("T")[0],
    referenceNumber: "", transferName: "", notes: "",
  });

  const { data: res, loading, error, refetch } = useApi(() => financeApi.getInvoice(id!), [id]);
  const { data: pmtRes, refetch: refetchPmts }  = useApi(() => financeApi.invoicePayments(id!), [id]);

  const { mutate: addPayment, loading: addingPmt } = useMutation((data: any) => financeApi.addInvoicePayment(id!, data));
  const { mutate: updateStatus } = useMutation(({ s }: any) => financeApi.updateInvoiceStatus(id!, s));

  const inv: any   = res?.data;
  const pmts: any[] = pmtRes?.data || [];

  const handleSend = async () => {
    setSending(true);
    try {
      const r: any = await financeApi.sendInvoice(id!);
      const parts = [];
      if (r?.data?.email)    parts.push("البريد");
      if (r?.data?.whatsapp) parts.push("الواتساب");
      toast.success(parts.length ? `تم الإرسال عبر ${parts.join(" و ")}` : "تم الإرسال");
      refetch();
    } catch { toast.error("فشل الإرسال"); }
    finally { setSending(false); }
  };

  const handleCancel = async () => {
    if (!confirm("هل أنت متأكد من إلغاء هذه الفاتورة؟")) return;
    try {
      await updateStatus({ s: "cancelled" });
      toast.success("تم إلغاء الفاتورة");
      refetch();
    } catch { toast.error("فشل الإلغاء"); }
  };

  const handleAddPayment = async () => {
    if (!payForm.amount || isNaN(Number(payForm.amount))) {
      toast.error("أدخل مبلغاً صحيحاً"); return;
    }
    try {
      await addPayment({
        amount: Number(payForm.amount),
        paymentMethod: payForm.paymentMethod,
        paymentDate: payForm.paymentDate,
        referenceNumber: payForm.referenceNumber || undefined,
        transferName: payForm.transferName || undefined,
        notes: payForm.notes || undefined,
      });
      toast.success("تم تسجيل الدفعة");
      setShowPayment(false);
      setPayForm({ amount: "", paymentMethod: "cash", paymentDate: new Date().toISOString().split("T")[0], referenceNumber: "", transferName: "", notes: "" });
      refetch(); refetchPmts();
    } catch { toast.error("فشل تسجيل الدفعة"); }
  };

  const printInvoice = () => {
    if (!inv) return;

    const invTypeLabel = inv.invoiceType === "tax" ? "فاتورة ضريبية" : "فاتورة ضريبية مبسطة";
    const invTypeEn    = inv.invoiceType === "tax" ? "Tax Invoice"    : "Simplified Tax Invoice";
    const hasDiscount  = Number(inv.discountAmount || 0) > 0 ||
      (inv.items || []).some((it: any) => Number(it.discountAmount || 0) > 0);

    const discColDefs    = hasDiscount ? `<col style="width:18mm"><col style="width:24mm">` : "";
    const discHeaderCols = hasDiscount ? `
      <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right;white-space:nowrap">
        <div style="font-size:10px">الخصم</div><div style="font-size:7px;opacity:0.75;margin-top:0.5mm">Discount</div>
      </th>
      <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right;white-space:nowrap">
        <div style="font-size:10px">بعد الخصم</div><div style="font-size:7px;opacity:0.75;margin-top:0.5mm">After Disc.</div>
      </th>` : "";

    const itemRows = (inv.items || []).map((it: any, i: number) => {
      const rowBg      = i % 2 === 0 ? "#ffffff" : "#fafafa";
      const unitPrice  = Number(it.unitPrice  || 0);
      const qty        = Number(it.quantity    || 0);
      const discAmt    = Number(it.discountAmount || 0);
      const rowSub     = unitPrice * qty;
      const afterDisc  = rowSub - discAmt;
      const discCols   = hasDiscount ? `
        <td style="padding:3mm;border-bottom:1px solid #f0f0f0;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;color:${INK}">${discAmt > 0 ? fmtNum(discAmt) : "—"}</td>
        <td style="padding:3mm;border-bottom:1px solid #f0f0f0;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;color:${INK}">${fmtNum(afterDisc)}</td>` : "";
      return `
        <tr style="background:${rowBg}">
          <td style="padding:3mm;border-bottom:1px solid #f0f0f0;text-align:center;direction:ltr;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;color:${MUTED}">${i + 1}</td>
          <td style="padding:3mm;border-bottom:1px solid #f0f0f0;white-space:normal;word-wrap:break-word;overflow:hidden">
            <div style="font-weight:700;font-size:10px;color:${INK};word-break:break-word">${it.description}</div>
          </td>
          <td style="padding:3mm;border-bottom:1px solid #f0f0f0;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;color:${INK}">${fmtNum(it.unitPrice)}</td>
          <td style="padding:3mm;border-bottom:1px solid #f0f0f0;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;color:${INK}">${it.quantity}</td>
          <td style="padding:3mm;border-bottom:1px solid #f0f0f0;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;color:${INK}">${fmtNum(rowSub)}</td>
          ${discCols}
          <td style="padding:3mm;border-bottom:1px solid #f0f0f0;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:10px;font-weight:700;color:${INK}">${fmtNum(it.totalAmount)}</td>
        </tr>`;
    }).join("");

    const discSummaryRow = Number(inv.discountAmount || 0) > 0 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:2.5mm 3mm;border-bottom:1px solid #eaeaea">
        <div><div style="font-size:9px;font-weight:700;color:${INK}">الخصم</div><div style="font-size:7px;color:${MUTED}">Discount</div></div>
        <div style="font-size:10px;font-variant-numeric:tabular-nums;direction:ltr;color:${INK}">- ${fmtNum(inv.discountAmount)} ر.س</div>
      </div>` : "";

    const defaultTerms = [
      "أي تمديد يُحتسب بتكلفة إضافية",
      "جميع التجهيزات تحت مسؤولية العميل",
      "يتحمل العميل أي تلف أو فقد",
      "الفاتورة تُعد عرض سعر صالح لمدة 3 أيام فقط",
    ];
    const terms = (inv.termsAndConditions || "").split("\n").filter(Boolean).length > 0
      ? (inv.termsAndConditions as string).split("\n").filter(Boolean)
      : defaultTerms;

    printWindow(`فاتورة ${inv.invoiceNumber}`, `

      <!-- ══ HEADER ══════════════════════════════════════ -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8mm">
        <div style="flex:1;min-width:0;overflow:hidden">
          <div style="font-size:24px;font-weight:700;color:${INK};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${inv.sellerName}</div>
        </div>
        <div style="flex-shrink:0;margin-right:8mm;text-align:left">
          <div style="display:inline-block;background:${BRAND};color:#fff;font-size:9px;font-weight:700;padding:1.5mm 4mm;border-radius:2mm;margin-bottom:2mm">${invTypeLabel} · ${invTypeEn}</div>
          <div style="font-size:20px;font-weight:700;color:${INK};direction:ltr;text-align:left;margin-bottom:1mm;font-variant-numeric:tabular-nums">${inv.invoiceNumber}</div>
          <div style="font-size:9px;color:${MUTED};direction:ltr;text-align:left">${fmtPrintDate(inv.issueDate)}</div>
        </div>
      </div>

      <!-- ══ DATE BOXES ══════════════════════════════════ -->
      <div style="display:flex;gap:3mm;margin-bottom:6mm">
        ${[
          { ar: "تاريخ الإصدار", en: "Issue Date", val: fmtPrintDate(inv.issueDate) },
          { ar: "تاريخ الاستحقاق", en: "Due Date", val: fmtPrintDate(inv.dueDate) },
          { ar: "تاريخ التوريد", en: "Supply Date", val: fmtPrintDate(inv.issueDate) },
        ].map(d => `
        <div style="flex:1;border:1px solid #eaeaea;padding:3mm;border-radius:1.5mm;overflow:hidden">
          <div style="font-size:9px;font-weight:700;color:${INK};margin-bottom:0.5mm">${d.ar}</div>
          <div style="font-size:8px;color:${MUTED};margin-bottom:1.5mm">${d.en}</div>
          <div style="font-size:11px;font-weight:700;color:${INK};direction:ltr;font-variant-numeric:tabular-nums">${d.val}</div>
        </div>`).join("")}
      </div>

      <!-- ══ PARTIES ═════════════════════════════════════ -->
      <div style="display:flex;gap:4mm;margin-bottom:6mm">
        <div style="flex:1;border:1px solid #eaeaea;border-top:2mm solid ${BRAND};padding:5mm;border-radius:1.5mm;overflow:hidden">
          <div style="font-size:10px;font-weight:700;color:${INK};margin-bottom:3mm">معلومات النشاط <span style="color:${MUTED};font-weight:400;font-size:9px"> — Business Info</span></div>
          <div style="margin-bottom:2mm"><div style="font-size:8px;color:${MUTED};margin-bottom:0.5mm">الاسم التجاري · Commercial Name</div>
            <div style="font-size:11px;font-weight:700;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${inv.sellerName}</div></div>
          ${inv.sellerAddress ? `<div style="margin-bottom:2mm"><div style="font-size:8px;color:${MUTED};margin-bottom:0.5mm">العنوان · Address</div><div style="font-size:10px;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${inv.sellerAddress}</div></div>` : ""}
          ${inv.sellerVatNumber ? `<div><div style="font-size:8px;color:${MUTED};margin-bottom:0.5mm">الرقم الضريبي · Tax Number</div><div style="font-size:10px;font-weight:700;color:${BRAND};direction:ltr;text-align:right;font-variant-numeric:tabular-nums">${inv.sellerVatNumber}</div></div>` : ""}
        </div>
        <div style="flex:1;border:1px solid #eaeaea;border-top:2mm solid ${INK};padding:5mm;border-radius:1.5mm;overflow:hidden">
          <div style="font-size:10px;font-weight:700;color:${INK};margin-bottom:3mm">معلومات العميل <span style="color:${MUTED};font-weight:400;font-size:9px"> — Customer Info</span></div>
          <div style="margin-bottom:2mm"><div style="font-size:8px;color:${MUTED};margin-bottom:0.5mm">اسم العميل · Customer Name</div>
            <div style="font-size:11px;font-weight:700;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${inv.buyerName}</div></div>
          ${inv.buyerPhone ? `<div><div style="font-size:8px;color:${MUTED};margin-bottom:0.5mm">الجوال · Mobile Number</div><div style="font-size:10px;color:${INK};direction:ltr;text-align:right;font-variant-numeric:tabular-nums">${inv.buyerPhone}</div></div>` : ""}
        </div>
      </div>

      <!-- ══ ITEMS TABLE ═════════════════════════════════ -->
      <div style="margin-bottom:6mm;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;table-layout:fixed">
          <colgroup>
            <col style="width:7mm"><col>
            <col style="width:22mm"><col style="width:14mm">
            <col style="width:22mm">${discColDefs}
            <col style="width:22mm">
          </colgroup>
          <thead>
            <tr style="background:${BRAND}">
              <th style="padding:3mm 3mm 2mm;color:#fff;text-align:center;white-space:nowrap"><div style="font-size:10px">#</div></th>
              <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right"><div style="font-size:10px">تفاصيل المنتج</div><div style="font-size:7px;opacity:0.75;margin-top:0.5mm">Product Details</div></th>
              <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right;white-space:nowrap"><div style="font-size:10px">سعر الوحدة</div><div style="font-size:7px;opacity:0.75;margin-top:0.5mm">Unit Price</div></th>
              <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right;white-space:nowrap"><div style="font-size:10px">الكمية</div><div style="font-size:7px;opacity:0.75;margin-top:0.5mm">Quantity</div></th>
              <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right;white-space:nowrap"><div style="font-size:10px">المجموع الفرعي</div><div style="font-size:7px;opacity:0.75;margin-top:0.5mm">Subtotal</div></th>
              ${discHeaderCols}
              <th style="padding:3mm 3mm 2mm;color:#fff;text-align:right;white-space:nowrap"><div style="font-size:10px">المجموع</div><div style="font-size:7px;opacity:0.75;margin-top:0.5mm">Total</div></th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>

      <!-- ══ FINANCIAL SUMMARY ════════════════════════════ -->
      <div style="display:flex;margin-bottom:8mm">
        <div style="width:70mm;border:1px solid #eaeaea;border-radius:1.5mm;overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:2.5mm 3mm;border-bottom:1px solid #eaeaea">
            <div><div style="font-size:9px;font-weight:700;color:${INK}">المجموع الفرعي</div><div style="font-size:7px;color:${MUTED}">Subtotal</div></div>
            <div style="font-size:10px;font-variant-numeric:tabular-nums;direction:ltr;font-weight:700;color:${INK}">${fmtNum(inv.taxableAmount ?? inv.subtotal)} ر.س</div>
          </div>
          ${discSummaryRow}
          <div style="display:flex;justify-content:space-between;align-items:center;padding:3mm;background:${BRAND}">
            <div><div style="font-size:10px;font-weight:700;color:#fff">إجمالي الطلب</div><div style="font-size:7px;color:rgba(255,255,255,0.75)">Grand Total</div></div>
            <div style="font-size:13px;font-variant-numeric:tabular-nums;direction:ltr;font-weight:700;color:#fff">${fmtNum(inv.totalAmount)} ر.س</div>
          </div>
        </div>
      </div>

      <!-- ══ TERMS ════════════════════════════════════════ -->
      <div style="margin-bottom:6mm;border-top:1px solid #eaeaea;padding-top:4mm">
        <div style="font-size:9px;font-weight:700;color:${INK};margin-bottom:2mm">الشروط العامة:</div>
        ${terms.map((t: string) => `<div style="font-size:8.5px;color:rgba(26,26,26,0.5);margin-bottom:1.5mm;display:flex;gap:2mm"><span style="flex-shrink:0;color:${BRAND};font-weight:700">·</span><span style="word-break:break-word">${t}</span></div>`).join("")}
      </div>

      <!-- ══ SIGNATURES ═══════════════════════════════════ -->
      <div style="display:flex;gap:4mm;margin-bottom:8mm">
        ${[{ar:"توقيع البائع",en:"Seller Signature"},{ar:"ختم المنشأة",en:"Official Seal"},{ar:"توقيع العميل",en:"Customer Signature"}].map(s=>`
        <div style="flex:1;text-align:center">
          <div style="height:14mm"></div>
          <div style="border-top:1px dashed #ccc;padding-top:2mm">
            <div style="font-size:8px;font-weight:700;color:${INK}">${s.ar}</div>
            <div style="font-size:7px;color:${MUTED}">${s.en}</div>
          </div>
        </div>`).join("")}
      </div>

      <!-- ══ FOOTER ═══════════════════════════════════════ -->
      <div style="border-top:1px solid #f0f0f0;padding-top:4mm;text-align:center">
        ${inv.qrCode ? `<div style="margin-bottom:3mm"><img src="data:image/png;base64,${inv.qrCode}" alt="ZATCA QR" style="width:16mm;height:16mm;display:inline-block" onerror="this.style.display='none'"><div style="font-size:7px;color:${MUTED};margin-top:1mm">رمز الفاتورة الإلكترونية — ZATCA</div></div>` : ""}
        <div style="font-size:12px;font-weight:700;color:${BRAND};margin-bottom:3mm">شكراً لتعاملكم</div>
        <div style="border-top:1px solid #f0f0f0;padding-top:2.5mm"><span style="font-size:7.5px;color:#ccc">مدعوم بواسطة </span><span style="font-size:7.5px;font-weight:700;color:${BRAND}">ترميز OS</span><span style="font-size:7.5px;color:#ccc"> · tarmizos.com</span></div>
      </div>`);
  };

  const printReceipt = () => {
    if (!inv) return;
    const remaining = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0));
    const pmtRows = pmts.map((p: any, i: number) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fafafa"}">
        <td style="padding:3mm;border-bottom:1px solid #f0f0f0;text-align:center;color:${MUTED};font-size:10px;direction:ltr;font-variant-numeric:tabular-nums">${i + 1}</td>
        <td style="padding:3mm;border-bottom:1px solid #f0f0f0;font-size:10px;color:${INK};direction:ltr;text-align:left;font-variant-numeric:tabular-nums;font-weight:700">${fmtNum(p.amount)} ر.س</td>
        <td style="padding:3mm;border-bottom:1px solid #f0f0f0;font-size:10px;color:${INK}">${PAY_METHOD[p.paymentMethod] || p.paymentMethod}</td>
        <td style="padding:3mm;border-bottom:1px solid #f0f0f0;font-size:10px;color:${INK};direction:ltr;text-align:left;font-variant-numeric:tabular-nums">${p.paymentDate ? fmtPrintDate(p.paymentDate) : "—"}</td>
      </tr>`).join("");

    printWindow(`إيصال ${inv.invoiceNumber}`, `
      <!-- ══ HEADER ══════════════════════════════════════ -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8mm">
        <div style="flex:1;overflow:hidden">
          <div style="font-size:24px;font-weight:700;color:${INK};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${inv.sellerName}</div>
          ${inv.sellerVatNumber ? `<div style="font-size:9px;color:${MUTED};margin-top:1mm;direction:ltr;font-variant-numeric:tabular-nums">الرقم الضريبي · ${inv.sellerVatNumber}</div>` : ""}
        </div>
        <div style="flex-shrink:0;margin-right:8mm;text-align:left">
          <div style="display:inline-block;background:${BRAND};color:#fff;font-size:9px;font-weight:700;padding:1.5mm 4mm;border-radius:2mm;margin-bottom:2mm">إيصال دفع · Payment Receipt</div>
          <div style="font-size:20px;font-weight:700;color:${INK};direction:ltr;text-align:left;margin-bottom:1mm;font-variant-numeric:tabular-nums">${inv.invoiceNumber}</div>
          <div style="font-size:9px;color:${MUTED};direction:ltr;text-align:left">${fmtPrintDate(inv.issueDate)}</div>
        </div>
      </div>

      <!-- ══ PARTIES ═════════════════════════════════════ -->
      <div style="display:flex;gap:4mm;margin-bottom:6mm">
        <div style="flex:1;border:1px solid #eaeaea;border-top:2mm solid ${BRAND};padding:5mm;border-radius:1.5mm;overflow:hidden">
          <div style="font-size:8px;color:${MUTED};margin-bottom:0.5mm">البائع · Seller</div>
          <div style="font-size:14px;font-weight:700;color:${INK};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${inv.sellerName}</div>
        </div>
        <div style="flex:1;border:1px solid #eaeaea;border-top:2mm solid ${INK};padding:5mm;border-radius:1.5mm;overflow:hidden">
          <div style="font-size:8px;color:${MUTED};margin-bottom:0.5mm">العميل · Customer</div>
          <div style="font-size:14px;font-weight:700;color:${INK};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${inv.buyerName}</div>
          ${inv.buyerPhone ? `<div style="font-size:10px;color:${INK};direction:ltr;text-align:right;font-variant-numeric:tabular-nums;margin-top:1mm">${inv.buyerPhone}</div>` : ""}
        </div>
      </div>

      <!-- ══ AMOUNTS ═════════════════════════════════════ -->
      <div style="display:flex;gap:4mm;margin-bottom:6mm">
        ${[
          { ar:"الإجمالي",    en:"Grand Total",    val:`${fmtNum(inv.totalAmount)} ر.س`,  bold:false },
          { ar:"المبلغ المدفوع", en:"Amount Paid", val:`${fmtNum(inv.paidAmount ?? 0)} ر.س`, bold:false },
          { ar:"المبلغ المتبقي", en:"Remaining",   val:`${fmtNum(remaining)} ر.س`, bold:true },
        ].map(a => `
        <div style="flex:1;border:1px solid #eaeaea;padding:4mm;border-radius:1.5mm;text-align:center">
          <div style="font-size:9px;font-weight:700;color:${INK}">${a.ar}</div>
          <div style="font-size:7px;color:${MUTED};margin-bottom:2mm">${a.en}</div>
          <div style="font-size:${a.bold ? "14" : "12"}px;font-weight:700;color:${a.bold && remaining > 0 ? BRAND : INK};direction:ltr;font-variant-numeric:tabular-nums">${a.val}</div>
        </div>`).join("")}
      </div>

      <!-- ══ PAYMENTS TABLE ══════════════════════════════ -->
      ${pmts.length > 0 ? `
      <div style="margin-bottom:6mm;overflow:hidden">
        <div style="font-size:10px;font-weight:700;color:${INK};margin-bottom:3mm">سجل المدفوعات · Payment History</div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed">
          <colgroup><col style="width:7mm"><col><col style="width:30mm"><col style="width:30mm"></colgroup>
          <thead>
            <tr style="background:${BRAND}">
              <th style="padding:3mm;color:#fff;text-align:center;font-size:10px">#</th>
              <th style="padding:3mm;color:#fff;text-align:right;font-size:10px">المبلغ · Amount</th>
              <th style="padding:3mm;color:#fff;text-align:right;font-size:10px">طريقة الدفع · Method</th>
              <th style="padding:3mm;color:#fff;text-align:right;font-size:10px">التاريخ · Date</th>
            </tr>
          </thead>
          <tbody>${pmtRows}</tbody>
        </table>
      </div>` : ""}

      <!-- ══ FOOTER ═══════════════════════════════════════ -->
      <div style="border-top:1px solid #f0f0f0;padding-top:4mm;text-align:center;margin-top:6mm">
        <div style="font-size:12px;font-weight:700;color:${BRAND};margin-bottom:3mm">شكراً لتعاملكم</div>
        <div style="border-top:1px solid #f0f0f0;padding-top:2.5mm"><span style="font-size:7.5px;color:#ccc">مدعوم بواسطة </span><span style="font-size:7.5px;font-weight:700;color:${BRAND}">ترميز OS</span><span style="font-size:7.5px;color:#ccc"> · tarmizos.com</span></div>
      </div>`);
  };

  if (loading) return <PageSkeleton />;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-10 h-10 text-danger" />
      <p className="text-danger">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );
  if (!inv) return <div className="text-center py-12 text-[var(--text-2)]">الفاتورة غير موجودة</div>;

  const st      = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
  const StatusIcon = st.icon;
  const canPay  = ["issued","sent","overdue","partially_paid"].includes(inv.status);
  const canCancel = ["draft","issued","sent"].includes(inv.status);
  const canSend = ["issued","sent","overdue","partially_paid"].includes(inv.status);
  const remaining = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0));

  return (
    <div className="space-y-5">

      {/* breadcrumb */}
      <Breadcrumb items={[
        { label: "الفواتير", href: "/dashboard/invoices" },
        { label: `فاتورة #${inv?.invoiceNumber || id?.slice(0,8)}` },
      ]} />

      {/* ── header ──────────────────────────────────────────── */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* left: order info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-lg font-bold text-[var(--text-1)] font-mono">{inv.invoiceNumber}</h1>
              <span className={clsx("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", st.color)}>
                <StatusIcon className="w-3.5 h-3.5" /> {st.label}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-[var(--text-3)] mb-0.5">العميل</p>
                <p className="font-medium text-[var(--text-1)]">{inv.buyerName}</p>
                {inv.buyerPhone && <p className="text-xs text-[var(--text-3)]" dir="ltr">{inv.buyerPhone}</p>}
              </div>
              <div>
                <p className="text-xs text-[var(--text-3)] mb-0.5">تاريخ الإصدار</p>
                <p className="font-medium text-[var(--text-1)]">{inv.issueDate ? fmtDate(inv.issueDate) : "—"}</p>
              </div>
              {inv.dueDate && (
                <div>
                  <p className="text-xs text-[var(--text-3)] mb-0.5">تاريخ الاستحقاق</p>
                  <p className="font-medium text-[var(--text-1)]">{fmtDate(inv.dueDate)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[var(--text-3)] mb-0.5">النوع</p>
                <p className="font-medium text-[var(--text-1)]">{inv.invoiceType === "simplified" ? "مبسطة B2C" : "ضريبية B2B"}</p>
              </div>
            </div>
          </div>

          {/* right: actions */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {canSend && (
              <button
                onClick={handleSend} disabled={sending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lavender-soft text-lavender text-sm font-medium hover:opacity-80 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> إرسال للعميل
              </button>
            )}
            {canPay && (
              <button
                onClick={() => setShowPayment(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-soft text-success text-sm font-medium hover:opacity-80 transition-colors"
              >
                <CreditCard className="w-4 h-4" /> تسجيل دفعة
              </button>
            )}
            <button
              onClick={printInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--text-2)] text-sm font-medium hover:bg-[var(--surface-3)] transition-colors"
            >
              <Printer className="w-4 h-4" /> طباعة الفاتورة
            </button>
            <button
              onClick={printReceipt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--text-2)] text-sm font-medium hover:bg-[var(--surface-3)] transition-colors"
            >
              <Receipt className="w-4 h-4" /> طباعة الإيصال
            </button>
            {canCancel && (
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-soft text-danger text-sm font-medium hover:opacity-80 transition-colors"
              >
                <XCircle className="w-4 h-4" /> إلغاء الفاتورة
              </button>
            )}
            <button
              onClick={refetch}
              className="p-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--text-3)] hover:bg-[var(--surface-3)] transition-colors"
              title="تحديث"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* amounts summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[var(--border)]">
          <div className="bg-[var(--surface-2)] rounded-xl p-3">
            <p className="text-xs text-[var(--text-3)]">الإجمالي</p>
            <p className="text-lg font-bold text-[var(--text-1)] tabular-nums">{fmt(inv.totalAmount)}</p>
            <p className="text-xs text-[var(--text-3)]">ر.س</p>
          </div>
          <div className="bg-success-soft rounded-xl p-3">
            <p className="text-xs text-success">المبلغ المدفوع</p>
            <p className="text-lg font-bold text-success tabular-nums">{fmt(inv.paidAmount || 0)}</p>
            <p className="text-xs text-success">ر.س</p>
          </div>
          <div className={clsx("rounded-xl p-3", remaining > 0 ? "bg-warning-soft" : "bg-[var(--surface-2)]")}>
            <p className={clsx("text-xs", remaining > 0 ? "text-warning" : "text-[var(--text-3)]")}>المبلغ المتبقي</p>
            <p className={clsx("text-lg font-bold tabular-nums", remaining > 0 ? "text-warning" : "text-[var(--text-2)]")}>{fmt(remaining)}</p>
            <p className={clsx("text-xs", remaining > 0 ? "text-warning" : "text-[var(--text-3)]")}>ر.س</p>
          </div>
          <div className="bg-[var(--surface-2)] rounded-xl p-3">
            <p className="text-xs text-[var(--text-3)]">ضريبة القيمة المضافة</p>
            <p className="text-lg font-bold text-[var(--text-1)] tabular-nums">{fmt(inv.vatAmount || 0)}</p>
            <p className="text-xs text-[var(--text-3)]">ر.س</p>
          </div>
        </div>
      </div>

      {/* ── tabs card ────────────────────────────────────────── */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="flex overflow-x-auto border-b border-[var(--border)] px-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "px-5 py-[6px] text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                tab === t.key
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-[var(--text-2)] hover:text-[var(--text-1)]",
              )}
            >
              {t.label}
              {t.key === "payments" && pmts.length > 0 && (
                <span className="mr-1.5 px-1.5 py-0.5 rounded-full bg-success-soft text-success text-[10px] font-bold">{pmts.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ── تفاصيل الفاتورة ─────────────────────────────── */}
          {tab === "details" && (
            <div className="space-y-6">
              {/* seller + buyer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[var(--surface-2)] rounded-xl p-4">
                  <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wide mb-2">المورد / البائع</p>
                  <p className="font-bold text-[var(--text-1)]">{inv.sellerName}</p>
                  {inv.sellerVatNumber && <p className="text-xs text-[var(--text-2)] mt-1">الرقم الضريبي: <span className="font-mono">{inv.sellerVatNumber}</span></p>}
                </div>
                <div className="bg-[var(--surface-2)] rounded-xl p-4">
                  <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wide mb-2">العميل / المشتري</p>
                  <p className="font-bold text-[var(--text-1)]">{inv.buyerName}</p>
                  {inv.buyerCompanyName && <p className="text-sm text-lavender font-medium mt-0.5">{inv.buyerCompanyName}</p>}
                  {inv.buyerPhone && <p className="text-xs text-[var(--text-2)] mt-1" dir="ltr">{inv.buyerPhone}</p>}
                  {inv.buyerEmail && <p className="text-xs text-[var(--text-2)]" dir="ltr">{inv.buyerEmail}</p>}
                  {inv.buyerVatNumber && <p className="text-xs text-[var(--text-2)] mt-1">الرقم الضريبي: <span className="font-mono">{inv.buyerVatNumber}</span></p>}
                  {inv.buyerCrNumber && <p className="text-xs text-[var(--text-2)]">س.ت: <span className="font-mono">{inv.buyerCrNumber}</span></p>}
                </div>
              </div>

              {/* items table */}
              {inv.items?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-1)] mb-3">قائمة الخدمات / السلع</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[var(--surface-2)] rounded-lg">
                          {["الاسم / الوصف", "الكمية", "سعر الوحدة", "الخصم", "السعر بدون ضريبة", "نسبة الضريبة", "قيمة الضريبة", "الإجمالي شامل الضريبة"].map(h => (
                            <th key={h} className="text-right px-3 py-2.5 text-xs font-semibold text-[var(--text-3)] whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((item: any) => {
                          const net = Number(item.totalAmount || 0) / (1 + Number(item.vatRate || 0) / 100);
                          const vatAmt = Number(item.totalAmount || 0) - net;
                          return (
                            <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                              <td className="px-3 py-2.5 text-[var(--text-1)] font-medium">{item.description}</td>
                              <td className="px-3 py-2.5 text-center text-[var(--text-2)]">{item.quantity}</td>
                              <td className="px-3 py-2.5 tabular-nums text-[var(--text-2)]">{fmt(item.unitPrice)} ر.س</td>
                              <td className="px-3 py-2.5 tabular-nums text-[var(--text-2)]">{fmt(item.discountAmount || 0)} ر.س</td>
                              <td className="px-3 py-2.5 tabular-nums text-[var(--text-2)]">{fmt(net)} ر.س</td>
                              <td className="px-3 py-2.5 text-center text-[var(--text-2)]">{item.vatRate ?? 15}%</td>
                              <td className="px-3 py-2.5 tabular-nums text-[var(--text-2)]">{fmt(vatAmt)} ر.س</td>
                              <td className="px-3 py-2.5 tabular-nums font-bold text-[var(--text-1)]">{fmt(item.totalAmount)} ر.س</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* transaction details + totals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* dates */}
                <div className="space-y-2 text-sm">
                  <h3 className="text-sm font-semibold text-[var(--text-1)] mb-3">تفاصيل المعاملة</h3>
                  {[
                    { label: "تاريخ الإصدار",    value: inv.issueDate ? fmtDate(inv.issueDate) : "—" },
                    { label: "تاريخ الاستحقاق",  value: inv.dueDate ? fmtDate(inv.dueDate) : "—" },
                    { label: "نوع الفاتورة",      value: inv.invoiceType === "simplified" ? "مبسطة B2C" : "ضريبية B2B" },
                    { label: "مصدر الفاتورة",    value: inv.sourceType === "booking" ? "حجز" : inv.sourceType === "order" ? "طلب" : "يدوي" },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between py-1.5 border-b border-[var(--border)]">
                      <span className="text-[var(--text-3)]">{row.label}</span>
                      <span className="text-[var(--text-1)] font-medium">{row.value}</span>
                    </div>
                  ))}
                  {inv.notes && (
                    <div className="mt-3 p-3 bg-warning-soft rounded-lg text-sm text-warning border border-warning-soft">
                      <strong>ملاحظات:</strong> {inv.notes}
                    </div>
                  )}
                </div>

                {/* totals */}
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-1)] mb-3">الإجمالي</h3>
                  <div className="bg-[var(--surface-2)] rounded-xl p-4 space-y-2">
                    {[
                      { label: "المجموع الفرعي",          value: fmt(inv.taxableAmount ?? inv.subtotal ?? inv.totalAmount) + " ر.س" },
                      { label: "الخصم",                    value: fmt(inv.discountAmount || 0) + " ر.س" },
                      { label: "المبلغ بدون الضريبة",      value: fmt(inv.taxableAmount ?? inv.subtotal ?? inv.totalAmount) + " ر.س" },
                      { label: `قيمة ضريبة القيمة المضافة (${inv.vatRate ?? 15}%)`, value: fmt(inv.vatAmount || 0) + " ر.س" },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between text-sm">
                        <span className="text-[var(--text-3)]">{row.label}</span>
                        <span className="tabular-nums font-medium text-[var(--text-2)]">{row.value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-base font-bold border-t border-[var(--border)] pt-2 mt-2">
                      <span>السعر الكلي شامل الضريبة</span>
                      <span className="tabular-nums text-brand-600">{fmt(inv.totalAmount)} ر.س</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-[var(--border)] pt-2">
                      <span className="text-[var(--text-3)]">المبلغ المدفوع</span>
                      <span className="tabular-nums text-success font-medium">{fmt(inv.paidAmount || 0)} ر.س</span>
                    </div>
                    {remaining > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-3)]">المبلغ المتبقي</span>
                        <span className="tabular-nums text-warning font-bold">{fmt(remaining)} ر.س</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── العمليات (payments) ──────────────────────────── */}
          {tab === "payments" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[var(--text-2)]">{pmts.length} عملية دفع مسجّلة</p>
                {canPay && (
                  <button
                    onClick={() => setShowPayment(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-soft text-success text-sm font-medium hover:opacity-80 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> تسجيل دفعة
                  </button>
                )}
              </div>

              {pmts.length === 0 ? (
                <div className="text-center py-10">
                  <CreditCard className="w-10 h-10 text-[var(--text-3)] mx-auto mb-3" />
                  <p className="text-[var(--text-3)] text-sm">لا توجد عمليات دفع مسجّلة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--surface-2)]">
                        {["#", "رقم العملية", "المدفوع", "طريقة الدفع", "وقت الإنشاء", "تاريخ الدفع", "اسم المحوّل", "الرقم المرجعي", "ملاحظات"].map(h => (
                          <th key={h} className="text-right px-3 py-2.5 text-xs font-semibold text-[var(--text-3)] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pmts.map((p: any, i: number) => (
                        <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                          <td className="px-3 py-3 text-[var(--text-3)] text-xs">{i + 1}</td>
                          <td className="px-3 py-3 font-mono text-xs text-brand-500">{p.id?.substring(0, 8).toUpperCase()}</td>
                          <td className="px-3 py-3 font-bold text-success tabular-nums">{fmt(p.amount)} ر.س</td>
                          <td className="px-3 py-3 text-[var(--text-1)]">{PAY_METHOD[p.paymentMethod] || p.paymentMethod}</td>
                          <td className="px-3 py-3 text-[var(--text-3)]">{p.createdAt ? new Date(p.createdAt).toLocaleDateString("ar-SA") : "—"}</td>
                          <td className="px-3 py-3 text-[var(--text-2)]">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("ar-SA") : "—"}</td>
                          <td className="px-3 py-3 text-[var(--text-2)]">{p.transferName || "—"}</td>
                          <td className="px-3 py-3 font-mono text-xs text-[var(--text-2)]">{p.reference || "—"}</td>
                          <td className="px-3 py-3 text-[var(--text-3)] max-w-[160px] truncate">{p.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── طلبات الاسترجاع ──────────────────────────────── */}
          {tab === "refunds" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[var(--text-2)]">طلبات الاسترجاع</p>
                {inv.status === "paid" && (
                  <button
                    onClick={() => setShowRefund(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-soft text-danger text-sm font-medium hover:opacity-80 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> طلب استرجاع
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      {["#", "المبلغ المسترجع", "طريقة الدفع الأصلية", "طريقة الاسترجاع", "سبب الاسترجاع", "حالة الاسترجاع", "سبب الرفض", "تاريخ الاسترجاع"].map(h => (
                        <th key={h} className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-[var(--text-3)] text-sm">لا يوجد عمليات استرجاع</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── الفواتير (invoice record) ─────────────────────── */}
          {tab === "invoices" && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      {["#", "الحالة", "المجموع الفرعي", "قيمة الضريبة", "المجموع", "تاريخ الإصدار", "طباعة"].map(h => (
                        <th key={h} className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
                      <td className="px-3 py-3 font-mono text-xs text-brand-500">{inv.invoiceNumber}</td>
                      <td className="px-3 py-3">
                        <span className={clsx("inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border", st.color)}>
                          <StatusIcon className="w-3 h-3" /> {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-[var(--text-2)]">{fmt(inv.taxableAmount ?? inv.subtotal ?? inv.totalAmount)} ر.س</td>
                      <td className="px-3 py-3 tabular-nums text-[var(--text-2)]">{fmt(inv.vatAmount || 0)} ر.س</td>
                      <td className="px-3 py-3 tabular-nums font-bold text-[var(--text-1)]">{fmt(inv.totalAmount)} ر.س</td>
                      <td className="px-3 py-3 text-[var(--text-2)]">{inv.issueDate ? fmtDate(inv.issueDate) : "—"}</td>
                      <td className="px-3 py-3">
                        <button onClick={printInvoice} className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 transition-colors">
                          <Printer className="w-3.5 h-3.5" /> طباعة
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── add payment modal ─────────────────────────────────── */}
      <Modal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        title="تسجيل دفعة"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPayment(false)}>إلغاء</Button>
            <Button onClick={handleAddPayment} loading={addingPmt}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="المبلغ (ر.س)"
            name="amount"
            type="number"
            min={0}
            step={0.01}
            value={payForm.amount}
            onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
            placeholder={`المتبقي: ${fmt(remaining)} ر.س`}
            required
          />
          <Select
            label="طريقة الدفع"
            name="paymentMethod"
            value={payForm.paymentMethod}
            onChange={e => setPayForm(f => ({ ...f, paymentMethod: e.target.value }))}
            options={Object.entries(PAY_METHOD).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Input
            label="تاريخ الدفع"
            name="paymentDate"
            type="date"
            value={payForm.paymentDate}
            onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))}
          />
          {payForm.paymentMethod === "bank_transfer" && (
            <>
              <Input
                label="اسم المحوّل"
                name="transferName"
                value={payForm.transferName}
                onChange={e => setPayForm(f => ({ ...f, transferName: e.target.value }))}
                placeholder="اسم صاحب الحساب"
              />
              <Input
                label="الرقم المرجعي للتحويل"
                name="referenceNumber"
                value={payForm.referenceNumber}
                onChange={e => setPayForm(f => ({ ...f, referenceNumber: e.target.value }))}
                placeholder="رقم المرجع"
              />
            </>
          )}
          <Input
            label="ملاحظات (اختياري)"
            name="notes"
            value={payForm.notes}
            onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="أي ملاحظات إضافية"
          />
        </div>
      </Modal>

      {/* ── refund request modal (placeholder) ───────────────── */}
      <Modal
        open={showRefund}
        onClose={() => setShowRefund(false)}
        title="طلب استرجاع"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRefund(false)}>إلغاء</Button>
            <Button variant="danger" onClick={() => { toast.info("قيد التطوير"); setShowRefund(false); }}>إرسال الطلب</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-2)] text-center py-6">ميزة طلبات الاسترجاع قيد التطوير.</p>
      </Modal>

    </div>
  );
}
