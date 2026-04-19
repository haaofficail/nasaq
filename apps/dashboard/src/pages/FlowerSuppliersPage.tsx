import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { flowerSuppliersApi, procurementApi, flowerMasterApi } from "@/lib/api";
import {
  Plus, X, Phone, Mail, Globe, Star, Package,
  AlertTriangle, Loader2, RefreshCw, TrendingUp, Clock,
  Award, History, CheckCircle2, XCircle, Hourglass,
  ChevronRight, ShoppingCart, CreditCard, Leaf, BarChart2,
  Truck, Edit2, Trash2, FileText, Banknote,
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/hooks/useToast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  notes?: string;
  flower_specialty?: string;
  flower_origin?: string;
  // computed from flower_batches
  total_batches?: number;
  total_purchases_calc?: number;
  quality_score_calc?: number;
  last_delivery_at_calc?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ORIGINS = [
  { value: "السعودية", label: "السعودية" },
  { value: "هولندا",   label: "هولندا" },
  { value: "كينيا",    label: "كينيا" },
  { value: "إكوادور",  label: "إكوادور" },
  { value: "كولومبيا", label: "كولومبيا" },
  { value: "اليابان",  label: "اليابان" },
  { value: "أخرى",     label: "أخرى" },
];

const SPECIALTIES = [
  "ورود", "تولب", "ليلية", "أوركيد", "زنبق", "ياسمين",
  "بونسيانا", "نرجس", "عباد الشمس", "ورد صناعي", "شامل",
];

const QUALITY_LABELS: Record<string, { label: string; cls: string }> = {
  fresh:    { label: "طازج",           cls: "bg-green-100 text-green-700" },
  good:     { label: "جيد",            cls: "bg-yellow-100 text-yellow-700" },
  fair:     { label: "مقبول",          cls: "bg-orange-100 text-orange-700" },
  damaged:  { label: "تالف",           cls: "bg-red-100 text-red-700" },
  expired:  { label: "منتهي الصلاحية", cls: "bg-gray-100 text-gray-600" },
};

const inputCls = "w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300/30 focus:border-brand-500 bg-white";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | string | undefined) {
  const num = Number(n ?? 0);
  return num.toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(s?: string | null) {
  if (!s) return "—";
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 30) return `منذ ${days} يوم`;
  const months = Math.floor(days / 30);
  return `منذ ${months} شهر`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QualityBar({ score }: { score: number }) {
  const pct = Math.min(100, (score / 10) * 100);
  const color = score >= 7 ? "bg-green-500" : score >= 4 ? "bg-amber-500" : "bg-red-500";
  const text  = score >= 7 ? "text-green-700" : score >= 4 ? "text-amber-700" : "text-red-600";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">تقييم الجودة</span>
        <span className={clsx("font-bold tabular-nums", text)}>{score.toFixed(1)}/10</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    paid:     { label: "مدفوعة",  cls: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="w-3 h-3" /> },
    pending:  { label: "معلقة",   cls: "bg-amber-100 text-amber-700",  icon: <Hourglass className="w-3 h-3" /> },
    matched:  { label: "مطابقة",  cls: "bg-blue-100 text-blue-700",    icon: <CheckCircle2 className="w-3 h-3" /> },
    approved: { label: "موافق",   cls: "bg-violet-100 text-violet-700",icon: <CheckCircle2 className="w-3 h-3" /> },
    disputed: { label: "متنازع",  cls: "bg-red-100 text-red-700",      icon: <XCircle className="w-3 h-3" /> },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600", icon: null };
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold", s.cls)}>
      {s.icon}{s.label}
    </span>
  );
}

function POStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft:    "bg-gray-100 text-gray-600",
    sent:     "bg-blue-100 text-blue-700",
    received: "bg-green-100 text-green-700",
    partial:  "bg-yellow-100 text-yellow-700",
    cancelled:"bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    draft: "مسودة", sent: "مُرسل", received: "مستلم", partial: "جزئي", cancelled: "ملغي",
  };
  return (
    <span className={clsx("px-2 py-0.5 rounded-lg text-[10px] font-semibold", map[status] ?? "bg-gray-100 text-gray-600")}>
      {labels[status] ?? status}
    </span>
  );
}

function Modal({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={clsx("bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh]", wide ? "max-w-2xl" : "max-w-lg")}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f6] shrink-0">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4 flex-1">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-400 mr-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function SpecialtyCheckboxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = (value || "").split(",").map(s => s.trim()).filter(Boolean);
  const toggle = (s: string) => {
    const next = selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s];
    onChange(next.join(","));
  };
  return (
    <div className="flex flex-wrap gap-2">
      {SPECIALTIES.map(sp => {
        const checked = selected.includes(sp);
        return (
          <button key={sp} type="button" onClick={() => toggle(sp)}
            className={clsx("px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors",
              checked ? "border-brand-400 bg-brand-50 text-brand-700" : "border-[#eef2f6] text-gray-600 hover:border-[#eef2f6]")}>
            {sp}
          </button>
        );
      })}
    </div>
  );
}

// ─── Supplier Detail Panel ────────────────────────────────────────────────────

type DetailTab = "batches" | "orders" | "invoices";

function SupplierDetailPanel({
  supplier, onClose, onEdit, onReceive,
}: {
  supplier: Supplier;
  onClose: () => void;
  onEdit: () => void;
  onReceive: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>("invoices");
  const [payInvoice, setPayInvoice] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [showNewPO, setShowNewPO] = useState(false);

  // Fetch supplier detail (batches history)
  const { data: detailRes, loading: detailLoading } = useApi(
    () => flowerSuppliersApi.get(supplier.id),
    [supplier.id]
  );
  // Fetch POs for this supplier
  const { data: ordersRes, loading: ordersLoading, refetch: refetchOrders } = useApi(
    () => procurementApi.orders({ supplierId: supplier.id, limit: "50" }),
    [supplier.id]
  );
  // Fetch invoices
  const { data: invoicesRes, loading: invoicesLoading, refetch: refetchInvoices } = useApi(
    () => procurementApi.invoices({ supplierId: supplier.id, limit: "50" }),
    [supplier.id]
  );

  const detail = detailRes?.data;
  const batches: any[] = detail?.batches ?? [];
  const orders: any[] = ordersRes?.orders ?? [];
  const invoices: any[] = invoicesRes?.invoices ?? [];

  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount ?? i.totalAmount ?? 0), 0);
  const totalPaid     = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.paid_amount ?? i.total_amount ?? 0), 0);
  const outstanding   = totalInvoiced - totalPaid;

  const { mutate: advanceInvoice, loading: paying } = useMutation(
    ({ id, data }: { id: string; data: any }) => procurementApi.advanceInvoice(id, data)
  );

  async function handlePay() {
    if (!payInvoice) return;
    const amount = parseFloat(payAmount) || Number(payInvoice.total_amount ?? payInvoice.totalAmount ?? 0);
    const res = await advanceInvoice({ id: payInvoice.id, data: { status: "paid", paidAmount: amount } });
    if (res) {
      toast.success("تم تسجيل الدفعة");
      setPayInvoice(null);
      setPayAmount("");
      refetchInvoices();
    }
  }

  const TABS: { id: DetailTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "invoices", label: "الفواتير",      icon: FileText,     count: invoices.length },
    { id: "orders",   label: "أوامر الشراء",  icon: ShoppingCart, count: orders.length },
    { id: "batches",  label: "الدفعات",        icon: Package,      count: batches.length },
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-lg h-full bg-white shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#eef2f6] shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">{supplier.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {supplier.flower_origin && <span>{supplier.flower_origin} · </span>}
                {supplier.flower_specialty}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-gray-500">إجمالي الفواتير</p>
              <p className="text-base font-bold text-gray-800 tabular-nums">{fmt(totalInvoiced)}</p>
              <p className="text-[10px] text-gray-400">ر.س</p>
            </div>
            <div className="bg-green-50 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-green-600">المدفوع</p>
              <p className="text-base font-bold text-green-700 tabular-nums">{fmt(totalPaid)}</p>
              <p className="text-[10px] text-green-400">ر.س</p>
            </div>
            <div className={clsx("rounded-xl p-2.5 text-center", outstanding > 0 ? "bg-amber-50" : "bg-[#f8fafc]")}>
              <p className={clsx("text-[10px]", outstanding > 0 ? "text-amber-600" : "text-gray-500")}>المستحق</p>
              <p className={clsx("text-base font-bold tabular-nums", outstanding > 0 ? "text-amber-700" : "text-gray-400")}>{fmt(outstanding)}</p>
              <p className={clsx("text-[10px]", outstanding > 0 ? "text-amber-400" : "text-gray-400")}>ر.س</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button onClick={onReceive}
              className="flex-1 flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2 text-xs font-semibold transition-colors">
              <Truck className="w-3.5 h-3.5" /> استلام شحنة
            </button>
            <button onClick={() => setShowNewPO(true)}
              className="flex-1 flex items-center justify-center gap-1.5 border border-brand-300 text-brand-600 hover:bg-brand-50 rounded-xl py-2 text-xs font-semibold transition-colors">
              <ShoppingCart className="w-3.5 h-3.5" /> أمر شراء
            </button>
            <button onClick={onEdit}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#eef2f6] text-gray-500 hover:bg-[#f8fafc] transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 px-3 pt-3 shrink-0">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={clsx("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors",
                  tab === t.id ? "bg-brand-50 text-brand-600" : "text-gray-500 hover:bg-[#f8fafc]")}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {(t.count ?? 0) > 0 && (
                  <span className={clsx("px-1.5 py-0.5 rounded-md text-[10px] font-bold",
                    tab === t.id ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500")}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* INVOICES TAB */}
          {tab === "invoices" && (
            invoicesLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-[#f8fafc] rounded-xl animate-pulse" />)}
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">لا توجد فواتير لهذا المورد</p>
                <p className="text-xs text-gray-300 mt-1">تُنشأ الفواتير عند إنشاء أمر شراء وتسليمه</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv: any) => {
                  const total = Number(inv.total_amount ?? inv.totalAmount ?? 0);
                  const paid  = Number(inv.paid_amount ?? inv.paidAmount ?? 0);
                  const remaining = total - paid;
                  const canPay = inv.status !== "paid" && inv.status !== "cancelled";
                  return (
                    <div key={inv.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-gray-800">
                              {inv.invoice_number ?? inv.invoiceNumber ?? `#${inv.id.slice(-6)}`}
                            </span>
                            <InvoiceStatusBadge status={inv.status ?? "pending"} />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {fmtDate(inv.invoice_date ?? inv.invoiceDate ?? inv.created_at)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-800 tabular-nums">{fmt(total)} ر.س</p>
                          {remaining > 0 && remaining < total && (
                            <p className="text-[10px] text-amber-600">متبقي: {fmt(remaining)} ر.س</p>
                          )}
                        </div>
                      </div>
                      {canPay && (
                        <button
                          onClick={() => { setPayInvoice(inv); setPayAmount(String(remaining || total)); }}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg py-1.5 text-xs font-semibold transition-colors"
                        >
                          <Banknote className="w-3.5 h-3.5" /> سجّل دفعة
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ORDERS TAB */}
          {tab === "orders" && (
            ordersLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-[#f8fafc] rounded-xl animate-pulse" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">لا توجد أوامر شراء</p>
                <button onClick={() => setShowNewPO(true)}
                  className="mt-3 flex items-center gap-1.5 bg-brand-500 text-white px-4 py-2 rounded-xl text-xs font-semibold mx-auto hover:bg-brand-600 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> إنشاء أمر شراء
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((po: any) => (
                  <div key={po.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-800">
                            {po.order_number ?? po.poNumber ?? `#${po.id.slice(-6)}`}
                          </span>
                          <POStatusBadge status={po.status ?? "draft"} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {fmtDate(po.order_date ?? po.expectedDate ?? po.created_at)}
                        </p>
                      </div>
                      {po.total_amount != null && (
                        <p className="text-sm font-bold text-gray-800 tabular-nums">{fmt(Number(po.total_amount))} ر.س</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* BATCHES TAB */}
          {tab === "batches" && (
            detailLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-[#f8fafc] rounded-xl animate-pulse" />)}
              </div>
            ) : batches.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">لا توجد دفعات من هذا المورد</p>
                <p className="text-xs text-gray-300 mt-1">تُسجَّل الدفعات من صفحة مخزون الورد</p>
              </div>
            ) : (
              <div className="space-y-2">
                {batches.map((b: any) => {
                  const qty = Number(b.quantity_remaining ?? 0);
                  const cost = Number(b.unit_cost ?? 0);
                  const qStatus = b.quality_status ?? "fresh";
                  const badge = QUALITY_LABELS[qStatus] ?? { label: qStatus, cls: "bg-gray-100 text-gray-600" };
                  return (
                    <div key={b.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{b.variant_name ?? "—"}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={clsx("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", badge.cls)}>
                              {badge.label}
                            </span>
                            <span className="text-[10px] text-gray-400">{fmtDate(b.received_at)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-800">{qty} ساق</p>
                          {cost > 0 && <p className="text-[10px] text-gray-400">{cost} ر.س/ساق</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Contact info strip */}
        <div className="border-t border-[#eef2f6] px-5 py-3 shrink-0 flex items-center gap-4 text-xs text-gray-500">
          {supplier.phone && (
            <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 hover:text-brand-500 transition-colors">
              <Phone className="w-3.5 h-3.5" /> {supplier.phone}
            </a>
          )}
          {supplier.email && (
            <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 hover:text-brand-500 transition-colors truncate">
              <Mail className="w-3.5 h-3.5" /> {supplier.email}
            </a>
          )}
          {supplier.contact_person && (
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> {supplier.contact_person}
            </span>
          )}
        </div>

        {/* Pay Invoice Modal */}
        {payInvoice && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900">تسجيل دفعة</h4>
                <button onClick={() => setPayInvoice(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="text-gray-500 text-xs">الفاتورة</p>
                <p className="font-semibold text-gray-800">{payInvoice.invoice_number ?? `#${payInvoice.id?.slice(-6)}`}</p>
                <p className="text-brand-600 font-bold mt-1">
                  {fmt(Number(payInvoice.total_amount ?? 0))} ر.س
                </p>
              </div>
              <Field label="مبلغ الدفعة (ر.س)">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className={inputCls} placeholder="0.00" />
              </Field>
              <div className="flex gap-3">
                <button onClick={() => setPayInvoice(null)}
                  className="flex-1 border border-[#eef2f6] text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-[#f8fafc]">
                  إلغاء
                </button>
                <button onClick={handlePay} disabled={paying || !payAmount}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                  تأكيد الدفعة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New PO Modal */}
        {showNewPO && (
          <NewPOModal
            supplier={supplier}
            onClose={() => setShowNewPO(false)}
            onSaved={() => { setShowNewPO(false); refetchOrders(); }}
          />
        )}
      </div>
    </div>
  );
}

// ─── New Purchase Order Modal ─────────────────────────────────────────────────

function NewPOModal({ supplier, onClose, onSaved }: { supplier: Supplier; onClose: () => void; onSaved: () => void }) {
  const { data: variantsRes } = useApi(() => flowerMasterApi.variants(), []);
  const variants: any[] = variantsRes?.data ?? [];

  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<{ variantId: string; quantity: string; unitPrice: string }[]>([
    { variantId: "", quantity: "", unitPrice: "" },
  ]);

  const { mutate: createPO, loading } = useMutation((data: any) => procurementApi.createOrder(data));

  const addItem = () => setItems(p => [...p, { variantId: "", quantity: "", unitPrice: "" }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const setItem = (i: number, f: string, v: string) =>
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [f]: v } : item));

  const total = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);

  async function handleSave() {
    const validItems = items.filter(i => i.variantId && i.quantity);
    if (validItems.length === 0) {
      toast.error("أضف صنفاً واحداً على الأقل");
      return;
    }
    const payload = {
      supplierId: supplier.id,
      expectedDate,
      notes: notes || undefined,
      items: validItems.map(i => ({
        variantId: i.variantId,
        quantity: parseInt(i.quantity),
        unitPrice: parseFloat(i.unitPrice) || 0,
      })),
    };
    const res = await createPO(payload);
    if (res) {
      toast.success("تم إنشاء أمر الشراء");
      onSaved();
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f6] shrink-0">
          <div>
            <h4 className="font-bold text-gray-900">أمر شراء جديد</h4>
            <p className="text-xs text-gray-400 mt-0.5">المورد: {supplier.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <Field label="تاريخ التسليم المتوقع">
            <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className={inputCls} />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">أصناف الورد</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> إضافة صنف
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_80px_32px] gap-2 items-center">
                  <select value={item.variantId} onChange={e => setItem(i, "variantId", e.target.value)}
                    className={clsx(inputCls, "py-2")}>
                    <option value="">اختر الصنف</option>
                    {variants.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.displayNameAr ?? v.display_name_ar ?? `${v.flowerType ?? v.flower_type} ${v.color ?? ""}`}
                      </option>
                    ))}
                  </select>
                  <input type="number" value={item.quantity} onChange={e => setItem(i, "quantity", e.target.value)}
                    placeholder="الكمية" className={clsx(inputCls, "py-2 text-center")} min="1" />
                  <input type="number" value={item.unitPrice} onChange={e => setItem(i, "unitPrice", e.target.value)}
                    placeholder="سعر/ساق" className={clsx(inputCls, "py-2 text-center")} min="0" step="0.01" />
                  <button onClick={() => removeItem(i)} disabled={items.length === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-30">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {total > 0 && (
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-brand-700 font-medium">إجمالي أمر الشراء</span>
              <span className="text-lg font-black text-brand-600 tabular-nums">{fmt(total)} ر.س</span>
            </div>
          )}

          <Field label="ملاحظات">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="أي تعليمات خاصة..." className={inputCls} />
          </Field>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-[#eef2f6] shrink-0">
          <button onClick={onClose} className="flex-1 border border-[#eef2f6] text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-[#f8fafc]">
            إلغاء
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            إرسال الطلب
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Supplier Card ────────────────────────────────────────────────────────────

function SupplierCard({ supplier, isBest, onClick }: {
  supplier: Supplier;
  isBest: boolean;
  onClick: () => void;
}) {
  const score     = Number(supplier.quality_score_calc ?? 0);
  const purchases = Number(supplier.total_purchases_calc ?? 0);
  const batches   = Number(supplier.total_batches ?? 0);

  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white rounded-2xl border cursor-pointer hover:shadow-md transition-all group",
        isBest ? "border-brand-300 ring-1 ring-brand-100" : "border-[#eef2f6]"
      )}
    >
      {/* Card Header */}
      <div className="px-[10px] py-[6px] border-b border-gray-50 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
              {supplier.name}
            </span>
            {isBest && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-50 text-brand-500 text-[10px] font-bold shrink-0">
                <Award className="w-3 h-3" /> الأفضل
              </span>
            )}
          </div>
          {supplier.flower_origin && (
            <span className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <Globe className="w-3 h-3" /> {supplier.flower_origin}
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5 group-hover:text-brand-400 transition-colors" />
      </div>

      {/* Card Body */}
      <div className="px-[10px] py-[6px] space-y-2.5">
        {supplier.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-600" onClick={e => e.stopPropagation()}>
            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <a href={`tel:${supplier.phone}`} className="text-brand-500 hover:underline" dir="ltr">{supplier.phone}</a>
          </div>
        )}
        {supplier.email && (
          <div className="flex items-center gap-2 text-xs text-gray-600" onClick={e => e.stopPropagation()}>
            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <a href={`mailto:${supplier.email}`} className="text-brand-500 hover:underline" dir="ltr">{supplier.email}</a>
          </div>
        )}
        {supplier.flower_specialty && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Leaf className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {supplier.flower_specialty.split(",").map(s => (
              <span key={s} className="px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-600 text-[10px] font-medium">{s.trim()}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-gray-700 tabular-nums">{fmt(purchases)}</span> ر.س
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-gray-700">{batches}</span> دفعة
          </span>
          {supplier.last_delivery_at_calc && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {timeAgo(supplier.last_delivery_at_calc)}
            </span>
          )}
        </div>

        {score > 0 && <QualityBar score={score} />}
      </div>
    </div>
  );
}

// ─── Supplier Form Modal ──────────────────────────────────────────────────────

interface SupplierForm {
  name: string;
  phone: string;
  email: string;
  contactPerson: string;
  flowerOrigin: string;
  flowerSpecialty: string;
  notes: string;
}

const EMPTY_FORM: SupplierForm = {
  name: "", phone: "", email: "", contactPerson: "",
  flowerOrigin: "", flowerSpecialty: "", notes: "",
};

function SupplierFormModal({ initial, onClose, onSaved }: {
  initial?: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<SupplierForm>(initial ? {
    name:            initial.name,
    phone:           initial.phone ?? "",
    email:           initial.email ?? "",
    contactPerson:   initial.contact_person ?? "",
    flowerOrigin:    initial.flower_origin ?? "",
    flowerSpecialty: initial.flower_specialty ?? "",
    notes:           initial.notes ?? "",
  } : EMPTY_FORM);

  const { mutate: create, loading: creating } = useMutation((d: any) => flowerSuppliersApi.create(d));
  const { mutate: update, loading: updating } = useMutation(
    ({ id, data }: any) => flowerSuppliersApi.update(id, data)
  );

  const set = (f: keyof SupplierForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  async function handleSave() {
    if (!form.name.trim()) { toast.error("اسم المورد مطلوب"); return; }
    let res;
    if (isEdit && initial) {
      res = await update({ id: initial.id, data: form });
    } else {
      res = await create(form);
    }
    if (res) {
      toast.success(isEdit ? "تم تحديث المورد" : "تمت إضافة المورد");
      onSaved();
    }
  }

  const saving = creating || updating;

  return (
    <Modal title={isEdit ? "تعديل المورد" : "مورد جديد"} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="اسم المورد" required>
            <input value={form.name} onChange={set("name")} placeholder="اسم شركة أو فرد" className={inputCls} />
          </Field>
        </div>
        <Field label="جوال التواصل">
          <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+966501234567" className={inputCls} dir="ltr" />
        </Field>
        <Field label="البريد الإلكتروني">
          <input type="email" value={form.email} onChange={set("email")} placeholder="supplier@example.com" className={inputCls} dir="ltr" />
        </Field>
        <div className="col-span-2">
          <Field label="اسم جهة الاتصال">
            <input value={form.contactPerson} onChange={set("contactPerson")} placeholder="اسم الشخص المسؤول" className={inputCls} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="بلد المنشأ">
            <select value={form.flowerOrigin} onChange={set("flowerOrigin")} className={inputCls}>
              <option value="">اختر الدولة</option>
              {ORIGINS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="التخصص (اختر ما ينطبق)">
            <SpecialtyCheckboxes
              value={form.flowerSpecialty}
              onChange={v => setForm(p => ({ ...p, flowerSpecialty: v }))}
            />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="ملاحظات">
            <textarea value={form.notes} onChange={set("notes")} rows={2} placeholder="أي معلومات إضافية..." className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onClose} className="flex-1 border border-[#eef2f6] text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-[#f8fafc]">
          إلغاء
        </button>
        <button onClick={handleSave} disabled={saving || !form.name.trim()}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isEdit ? "حفظ التعديلات" : "إضافة المورد"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-4 animate-pulse space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="h-4 bg-gray-100 rounded w-32" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-24" />
        <div className="h-3 bg-gray-100 rounded w-36" />
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FlowerSuppliersPage() {
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [activeSupplier, setActive] = useState<Supplier | null>(null);

  const { data: res, loading, error, refetch } = useApi(() => flowerSuppliersApi.list(), []);

  // /flower-suppliers returns { data: rows[] } with computed fields
  const suppliers: Supplier[] = (res as any)?.data ?? [];

  const totalPurchases = suppliers.reduce((s, sup) => s + Number(sup.total_purchases_calc ?? 0), 0);
  const qualityList    = suppliers.filter(s => Number(s.quality_score_calc ?? 0) > 0);
  const avgQuality     = qualityList.length > 0
    ? qualityList.reduce((s, sup) => s + Number(sup.quality_score_calc ?? 0), 0) / qualityList.length : 0;
  const bestSupplier   = qualityList.reduce<Supplier | undefined>((best, s) =>
    Number(s.quality_score_calc ?? 0) > Number(best?.quality_score_calc ?? 0) ? s : best, undefined);

  const openCreate = () => { setEditTarget(null); setShowForm(true); };
  const openEdit   = (s: Supplier) => { setEditTarget(s); setShowForm(true); setActive(null); };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">الموردين</h1>
            <p className="text-xs text-gray-400">إدارة موردي الورد والزهور</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#eef2f6] hover:bg-[#f8fafc] text-gray-400 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm shadow-brand-500/20">
            <Plus className="w-4 h-4" /> مورد جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "عدد الموردين",   value: loading ? null : suppliers.length,                                                  icon: Package,  color: "text-blue-500 bg-blue-50"     },
          { label: "إجمالي المشتريات (ر.س)", value: loading ? null : fmt(totalPurchases),                                      icon: TrendingUp, color: "text-brand-500 bg-brand-50"  },
          { label: "متوسط الجودة",   value: loading ? null : (avgQuality > 0 ? `${avgQuality.toFixed(1)}/10` : "—"),            icon: Star,     color: "text-green-500 bg-green-50"   },
          { label: "أفضل مورد",      value: loading ? null : (bestSupplier?.name ?? "—"),                                      icon: Award,    color: "text-amber-500 bg-amber-50"   },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#eef2f6] p-4">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            {loading
              ? <div className="h-7 bg-gray-100 rounded w-16 animate-pulse mb-1" />
              : <p className="text-xl font-bold text-gray-900 truncate">{s.value}</p>}
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-[#eef2f6]">
          <AlertTriangle className="w-10 h-10 text-red-300 mb-3" />
          <p className="text-sm font-semibold text-gray-700">حدث خطأ في تحميل الموردين</p>
          <button onClick={refetch} className="mt-3 px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-600 hover:bg-gray-200">
            إعادة المحاولة
          </button>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-[#eef2f6]">
          <div className="w-14 h-14 rounded-2xl bg-[#f8fafc] flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-700">لا يوجد موردون</p>
          <p className="text-xs text-gray-400 mt-1">أضف أول مورد لبدء تتبع المشتريات والجودة</p>
          <button onClick={openCreate}
            className="mt-4 flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> مورد جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {suppliers.map(sup => (
            <SupplierCard
              key={sup.id}
              supplier={sup}
              isBest={bestSupplier?.id === sup.id}
              onClick={() => setActive(sup)}
            />
          ))}
        </div>
      )}

      {/* Supplier Form Modal */}
      {showForm && (
        <SupplierFormModal
          initial={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSaved={() => { setShowForm(false); setEditTarget(null); refetch(); }}
        />
      )}

      {/* Supplier Detail Panel */}
      {activeSupplier && (
        <SupplierDetailPanel
          supplier={activeSupplier}
          onClose={() => setActive(null)}
          onEdit={() => openEdit(activeSupplier)}
          onReceive={() => {
            setActive(null);
            window.location.href = "/dashboard/flower-inventory";
          }}
        />
      )}
    </div>
  );
}
