import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Send, Printer, FileText, CreditCard,
  XCircle, AlertCircle, Clock, CheckCircle2, AlertTriangle,
  Plus, RotateCcw, Receipt, RefreshCw, ChevronRight, Download,
} from "lucide-react";
import { clsx } from "clsx";
import { financeApi, settingsApi } from "@/lib/api";
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
function getPrintTokens() {
  const s = getComputedStyle(document.documentElement);
  const get = (v: string) => s.getPropertyValue(v).trim();
  return {
    BRAND:   get("--brand-500")  || "#5b9bd5",
    INK:     get("--text-1")     || "#1a1a1a",
    MUTED:   get("--text-3")     || "rgba(26,26,26,0.45)",
    SURFACE: get("--surface-2")  || "#f8fafc",
    BORDER:  get("--border")     || "#eef2f6",
  };
}

function fmtNum(n: any) {
  return parseFloat(String(n || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPrintDate(d: any): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "numeric", day: "numeric", calendar: "gregory" });
  } catch { return String(d); }
}

function printWindow(title: string, bodyHtml: string, tokens: ReturnType<typeof getPrintTokens>) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="utf-8"><title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;700&display=swap" rel="stylesheet">
    <style>
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      @page{size:A4;margin:0}
      body{font-family:'IBM Plex Sans Arabic',Arial,sans-serif;font-size:10px;color:${tokens.INK};direction:rtl;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .page{width:210mm;min-height:297mm;background:#fff;padding:18mm 19mm 18mm 16mm;border-right:3mm solid ${tokens.BRAND};overflow:hidden}
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

  const inv: any    = res?.data;
  const pmts: any[] = pmtRes?.data || [];

  const { data: orgRes } = useApi(() => settingsApi.profile(), []);
  const orgProfile: any  = orgRes?.data || {};

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
    const { BRAND, INK, MUTED, SURFACE, BORDER } = getPrintTokens();

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
      </div>`, { BRAND, INK, MUTED, SURFACE, BORDER });
  };

  const printReceipt = () => {
    if (!inv) return;
    const { BRAND, INK, MUTED } = getPrintTokens();
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
      </div>`, { BRAND, INK, MUTED, SURFACE: "#ffffff", BORDER: "#eaeaea" });
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

  const st         = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
  const StatusIcon = st.icon;
  const canPay     = ["issued","sent","overdue","partially_paid"].includes(inv.status);
  const canCancel  = ["draft","issued","sent"].includes(inv.status);
  const canSend    = ["issued","sent","overdue","partially_paid"].includes(inv.status);
  const remaining  = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0));
  const invTypeLabel = inv.invoiceType === "tax" ? "فاتورة ضريبية" : "فاتورة ضريبية مبسطة";
  const defaultTerms = ["أي تمديد يُحتسب بتكلفة إضافية","جميع التجهيزات تحت مسؤولية العميل","يتحمل العميل أي تلف أو فقد","الفاتورة تُعد عرض سعر صالح لمدة 3 أيام فقط"];
  const termsLines: string[] = (inv.termsAndConditions || "").split("\n").filter(Boolean).length > 0
    ? (inv.termsAndConditions as string).split("\n").filter(Boolean)
    : defaultTerms;
  const orgLogo = orgProfile?.logo || null;
  const firstPmt = pmts[0];

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-12 print:bg-white print:pb-0">

      {/* ── Toolbar (no-print) ───────────────────────────────── */}
      <div className="print:hidden w-[210mm] max-w-full mx-auto px-0 pt-6 pb-4">
        {/* back + breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px] text-[#64748b] mb-4">
          <button onClick={() => navigate("/dashboard/invoices")} className="inline-flex items-center gap-1 hover:text-brand-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
            الفواتير
          </button>
          <span>/</span>
          <span className="text-[#0f172a] font-semibold">{inv.invoiceNumber}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#475569]">معاينة الفاتورة — {inv.invoiceNumber}</span>
          <div className="flex items-center gap-2">
            {canSend && (
              <button onClick={handleSend} disabled={sending}
                className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg bg-lavender-soft text-lavender text-[12px] font-medium hover:opacity-80 transition-colors disabled:opacity-50">
                <Send className="w-3.5 h-3.5" /> إرسال
              </button>
            )}
            {canPay && (
              <button onClick={() => setShowPayment(true)}
                className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg bg-success-soft text-success text-[12px] font-medium hover:opacity-80 transition-colors">
                <CreditCard className="w-3.5 h-3.5" /> تسجيل دفعة
              </button>
            )}
            <button onClick={printInvoice}
              className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg bg-white text-[#475569] border border-[#d1d9e2] text-[12px] font-medium hover:bg-[#f8fafc] transition-colors">
              <Printer className="w-3.5 h-3.5" /> طباعة
            </button>
            <button onClick={printReceipt}
              className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg bg-white text-[#475569] border border-[#d1d9e2] text-[12px] font-medium hover:bg-[#f8fafc] transition-colors">
              <Receipt className="w-3.5 h-3.5" /> إيصال
            </button>
            {canCancel && (
              <button onClick={handleCancel}
                className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg bg-danger-soft text-danger text-[12px] font-medium hover:opacity-80 transition-colors">
                <XCircle className="w-3.5 h-3.5" /> إلغاء
              </button>
            )}
            <button onClick={refetch}
              className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-lg bg-white border border-[#d1d9e2] text-[#475569] hover:bg-[#f8fafc] transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── A4 Paper ─────────────────────────────────────────── */}
      <div className="w-[210mm] max-w-full mx-auto bg-white shadow-[0_4px_32px_rgba(0,0,0,0.12)] min-h-[297mm] flex flex-col print:shadow-none print:min-h-0">

        {/* HEADER */}
        <div className="flex justify-between items-start px-10 pt-8 pb-7 border-b border-[#f1f5f9]">
          {/* Right: org info */}
          <div className="flex flex-col gap-2">
            {orgLogo && <img src={orgLogo} alt="" className="h-12 object-contain object-right mb-1" />}
            <h1 className="text-[22px] font-bold text-[#0f172a] leading-tight">{inv.sellerName}</h1>
            <div className="text-[11px] text-[#94a3b8] leading-relaxed">
              {inv.sellerAddress && <div>{inv.sellerAddress}</div>}
              {inv.sellerCR && <div>رقم السجل التجاري: {inv.sellerCR}</div>}
              {inv.sellerVatNumber && <div>الرقم الضريبي: {inv.sellerVatNumber}</div>}
            </div>
          </div>
          {/* Left: invoice id */}
          <div className="text-left flex-shrink-0 mr-8">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">{invTypeLabel}</div>
            <div className="text-[26px] font-bold text-brand-500 tabular-nums" dir="ltr">{inv.invoiceNumber}</div>
            <span className={clsx("inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[11px] font-bold border", st.color)}>
              <StatusIcon className="w-3 h-3" /> {st.label}
            </span>
          </div>
        </div>

        {/* META ROW */}
        <div className="grid grid-cols-3 gap-6 px-10 py-5 bg-[#fafbfc] border-b border-[#f1f5f9]">
          <div>
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1">تاريخ الإصدار</div>
            <div className="text-[13px] font-semibold text-[#0f172a]">{inv.issueDate ? fmtDate(inv.issueDate) : "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1">تاريخ الاستحقاق</div>
            <div className="text-[13px] font-semibold text-[#0f172a]">{inv.dueDate ? fmtDate(inv.dueDate) : "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1">طريقة الدفع</div>
            <div className="text-[13px] font-semibold text-[#0f172a]">
              {firstPmt ? PAY_METHOD[firstPmt.paymentMethod] || firstPmt.paymentMethod : "—"}
            </div>
            {firstPmt?.transferName && <div className="text-[11px] text-[#475569] mt-0.5">{firstPmt.transferName}</div>}
          </div>
        </div>

        {/* CUSTOMER BLOCK */}
        <div className="flex justify-between items-start px-10 py-5 border-b border-[#f1f5f9]">
          <div>
            <div className="text-[15px] font-bold text-[#0f172a] mb-1">فاتورة إلى</div>
            <div className="text-[12px] text-[#475569] leading-relaxed space-y-0.5">
              <div className="font-semibold text-[#0f172a]">{inv.buyerName}</div>
              {(inv.buyerPhone || inv.buyerEmail) && (
                <div dir="ltr" className="text-right">
                  {inv.buyerPhone}{inv.buyerPhone && inv.buyerEmail ? " · " : ""}{inv.buyerEmail}
                </div>
              )}
              {inv.buyerCompanyName && <div>{inv.buyerCompanyName}</div>}
              {inv.buyerAddress && <div>{inv.buyerAddress}</div>}
              {inv.buyerVatNumber && <div>الرقم الضريبي: {inv.buyerVatNumber}</div>}
            </div>
          </div>
          {inv.bookingId && (
            <div className="text-left flex-shrink-0 mr-8">
              <div className="text-[15px] font-bold text-[#0f172a] mb-1">رقم الحجز</div>
              <div className="text-[13px] font-semibold text-brand-500 tabular-nums" dir="ltr">
                {inv.bookingId.slice(0, 8).toUpperCase()}
              </div>
              <div className="text-[11px] text-[#475569] mt-0.5">
                {inv.sourceType === "booking" ? "حجز" : inv.sourceType === "order" ? "طلب" : inv.sourceType}
              </div>
            </div>
          )}
        </div>

        {/* ITEMS TABLE */}
        <div className="px-10 flex-1">
          <table className="w-full border-collapse mt-5">
            <thead>
              <tr className="bg-[#fafbfc]">
                <th className="text-center px-3 py-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide border-b-2 border-[#f1f5f9] w-9">#</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide border-b-2 border-[#f1f5f9]">الخدمة / البند</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide border-b-2 border-[#f1f5f9] w-20">الكمية</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide border-b-2 border-[#f1f5f9] w-28">سعر الوحدة</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide border-b-2 border-[#f1f5f9] w-28">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {(inv.items || []).length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-[13px] text-[#94a3b8]">لا توجد بنود</td></tr>
              )}
              {(inv.items || []).map((item: any, i: number) => (
                <tr key={item.id || i} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-3 py-[11px] text-[13px] text-[#94a3b8] border-b border-[#f8fafc] text-center">{i + 1}</td>
                  <td className="px-3 py-[11px] border-b border-[#f8fafc]">
                    <div className="text-[13px] font-semibold text-[#0f172a]">{item.description}</div>
                  </td>
                  <td className="px-3 py-[11px] text-[13px] text-[#0f172a] border-b border-[#f8fafc] tabular-nums">{item.quantity}</td>
                  <td className="px-3 py-[11px] text-[13px] text-[#0f172a] border-b border-[#f8fafc] tabular-nums" dir="ltr">{fmt(item.unitPrice)} ر.س</td>
                  <td className="px-3 py-[11px] text-[13px] text-[#0f172a] border-b border-[#f8fafc] tabular-nums" dir="ltr">{fmt(item.totalAmount)} ر.س</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS */}
        <div className="flex justify-end px-10 py-5">
          <div className="w-[260px]">
            <div className="flex justify-between items-center pb-[10px] mb-1 border-b border-dashed border-[#e2e8f0]">
              <span className="text-[13px] text-[#475569]">المجموع قبل الضريبة</span>
              <span className="text-[13px] font-semibold text-[#0f172a] tabular-nums" dir="ltr">{fmt(inv.taxableAmount ?? inv.subtotal)} ر.س</span>
            </div>
            <div className="flex justify-between items-center py-[5px]">
              <span className="text-[13px] text-[#475569]">ضريبة القيمة المضافة ({inv.vatRate ?? 15}%)</span>
              <span className="text-[13px] font-semibold text-[#0f172a] tabular-nums" dir="ltr">{fmt(inv.vatAmount || 0)} ر.س</span>
            </div>
            {Number(inv.discountAmount || 0) > 0 && (
              <div className="flex justify-between items-center py-[5px]">
                <span className="text-[13px] text-[#475569]">خصم</span>
                <span className="text-[13px] font-semibold text-success tabular-nums" dir="ltr">— {fmt(inv.discountAmount)} ر.س</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t-2 border-[#0f172a] pt-[10px] mt-[6px]">
              <span className="text-[14px] font-bold text-[#0f172a]">الإجمالي النهائي</span>
              <span className="text-[20px] font-bold text-brand-500 tabular-nums" dir="ltr">{fmt(inv.totalAmount)} ر.س</span>
            </div>
          </div>
        </div>

        {/* NOTES */}
        {inv.notes && (
          <div className="px-10 pb-6">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1.5">ملاحظات</div>
            <div className="text-[12px] text-[#475569] leading-relaxed bg-[#f8fafc] border border-[#f1f5f9] rounded-lg px-3.5 py-2.5">
              {inv.notes}
            </div>
          </div>
        )}

        {/* TERMS */}
        {termsLines.length > 0 && (
          <div className="px-10 pb-6">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1.5">الشروط والأحكام</div>
            <div className="text-[12px] text-[#475569] leading-relaxed bg-[#f8fafc] border border-[#f1f5f9] rounded-lg px-3.5 py-2.5 space-y-1">
              {termsLines.map((t: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <span className="text-brand-400 font-bold flex-shrink-0">·</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-auto flex justify-between items-center px-10 py-4 bg-[#fafbfc] border-t border-[#f1f5f9]">
          <div className="flex items-center gap-2">
            {orgLogo && <img src={orgLogo} alt="" className="h-[18px] object-contain" style={{ opacity: 0.35 }} />}
            <span className="text-[10px] text-[#94a3b8]">
              صادرة عبر منصة <strong className="text-[#475569]">ترميز OS</strong> — tarmizos.com
            </span>
          </div>
          <div className="text-[10px] text-[#94a3b8] text-left leading-relaxed">
            {inv.sellerVatNumber && <div>الرقم الضريبي: {inv.sellerVatNumber}</div>}
            <div>هذه فاتورة ضريبية رسمية وفق أنظمة هيئة الزكاة والضريبة.</div>
          </div>
        </div>
      </div>

      {/* ── Operations (no-print) ────────────────────────────── */}
      <div className="print:hidden w-[210mm] max-w-full mx-auto mt-6 space-y-4">

        {/* payments history */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold text-[#0f172a]">سجل المدفوعات</h2>
              {pmts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-success-soft text-success text-[10px] font-bold">{pmts.length}</span>
              )}
            </div>
            {canPay && (
              <button onClick={() => setShowPayment(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-success-soft text-success text-[12px] font-medium hover:opacity-80 transition-colors">
                <Plus className="w-3.5 h-3.5" /> تسجيل دفعة
              </button>
            )}
          </div>
          {pmts.length === 0 ? (
            <div className="text-center py-10">
              <CreditCard className="w-9 h-9 text-[#cbd5e1] mx-auto mb-2" />
              <p className="text-[13px] text-[#94a3b8]">لا توجد مدفوعات مسجّلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#fafbfc]">
                    {["#","المبلغ","طريقة الدفع","تاريخ الدفع","اسم المحوّل","رقم المرجع","ملاحظات"].map(h => (
                      <th key={h} className="text-right px-4 py-2.5 text-[11px] font-semibold text-[#94a3b8] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pmts.map((p: any, i: number) => (
                    <tr key={p.id} className="border-t border-[#f1f5f9] hover:bg-[#fafbfc]">
                      <td className="px-4 py-3 text-[#94a3b8] text-[12px]">{i + 1}</td>
                      <td className="px-4 py-3 font-bold text-success text-[13px] tabular-nums" dir="ltr">{fmt(p.amount)} ر.س</td>
                      <td className="px-4 py-3 text-[13px] text-[#0f172a]">{PAY_METHOD[p.paymentMethod] || p.paymentMethod}</td>
                      <td className="px-4 py-3 text-[12px] text-[#475569]">{p.paymentDate ? fmtDate(p.paymentDate) : "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-[#475569]">{p.transferName || "—"}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#94a3b8]">{p.referenceNumber || p.reference || "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-[#94a3b8] max-w-[140px] truncate">{p.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* refund + status actions */}
        <div className="flex gap-3">
          {inv.status === "paid" && (
            <button onClick={() => setShowRefund(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-danger-soft text-danger text-[12px] font-medium hover:opacity-80 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> طلب استرجاع
            </button>
          )}
          {canSend && (
            <button onClick={handleSend} disabled={sending}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-lavender-soft text-lavender text-[12px] font-medium hover:opacity-80 transition-colors disabled:opacity-50">
              <Send className="w-3.5 h-3.5" /> إرسال للعميل
            </button>
          )}
          <button onClick={printInvoice}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white border border-[#d1d9e2] text-[#475569] text-[12px] font-medium hover:bg-[#f8fafc] transition-colors">
            <Download className="w-3.5 h-3.5" /> تحميل / طباعة
          </button>
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
