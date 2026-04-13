import { useState, useEffect, useRef, useCallback } from "react";
import { clsx } from "clsx";
import {
  ShoppingCart, Plus, Minus, Trash2, Search, Package,
  CreditCard, Banknote, ArrowLeftRight, Receipt, X, CheckCircle2,
  Users, Scissors, ChevronDown, Tag, StickyNote, Percent,
  RotateCcw, Clock, TrendingUp, Wallet, Printer, Smartphone,
  SplitSquareHorizontal, AlertCircle, ScanBarcode, ChevronRight,
  Lock, Pencil,
} from "lucide-react";
import { posApi, servicesApi, menuApi, categoriesApi, customersApi, settingsApi } from "@/lib/api";
import { VAT_RATE as VAT_RATE_DECIMAL } from "@/lib/constants";
import { useApi } from "@/hooks/useApi";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "@/hooks/useToast";
import { success as hapticSuccess } from "@/lib/haptics";
import { normalizeNumeric } from "@/lib/normalize-input";

// ============================================================
// TYPES
// ============================================================

interface CartItem {
  id: string;
  name: string;
  price: number;         // السعر الأصلي
  customPrice?: number;  // السعر المعدَّل (ما سيُحسب)
  minPrice?: number;     // الحد الأدنى (من إعداد الخدمة)
  qty: number;
  staffId?: string;
  staffName?: string;
  note?: string;         // ملاحظة على البند
}

interface PaymentRow {
  method: "cash" | "card" | "mada" | "apple_pay" | "bank_transfer";
  amount: string;
  reference?: string;
}

interface SplitPart {
  label: string;
  color: string;
  customerId?: string;
  customerName: string;
  itemIds?: string[];    // for "items" mode
  amount: string;        // for "equal" / "amount" mode
  payments: PaymentRow[];
}

interface SaleResult {
  transaction: any;
  invoice: any;
}

// ============================================================
// CONSTANTS
// ============================================================

const PAYMENT_LABELS: Record<string, string> = {
  cash: "نقد",
  card: "بطاقة",
  mada: "مدى",
  apple_pay: "Apple Pay",
  bank_transfer: "تحويل بنكي",
};

const PAYMENT_COLORS: Record<string, string> = {
  cash:          "bg-emerald-50 border-emerald-300 text-emerald-700",
  card:          "bg-brand-50 border-brand-300 text-brand-700",
  bank_transfer: "bg-violet-50 border-violet-300 text-violet-700",
};

const SPLIT_PART_COLORS = [
  "bg-brand-100 border-brand-300 text-brand-700",
  "bg-violet-100 border-violet-300 text-violet-700",
  "bg-emerald-100 border-emerald-300 text-emerald-700",
  "bg-amber-100 border-amber-300 text-amber-700",
  "bg-rose-100 border-rose-300 text-rose-700",
  "bg-teal-100 border-teal-300 text-teal-700",
];

const VAT_RATE = VAT_RATE_DECIMAL * 100; // e.g. 0.15 → 15

function calcCart(items: CartItem[], discType: "fixed" | "percent", discValue: number) {
  const subtotal = items.reduce((s, i) => s + (i.customPrice ?? i.price) * i.qty, 0);
  const discountAmount = discType === "percent"
    ? +(subtotal * discValue / 100).toFixed(2)
    : Math.min(discValue, subtotal);
  const taxable = +(subtotal - discountAmount).toFixed(2);
  const vatAmount = +(taxable * VAT_RATE / 100).toFixed(2);
  const total = +(taxable + vatAmount).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), discountAmount, taxable, vatAmount, total };
}

function fmt(n: number | string) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTime(d: string | Date) {
  const date = new Date(d);
  return date.toLocaleTimeString("ar-SA-u-ca-gregory-nu-latn", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string | Date) {
  const date = new Date(d);
  return date.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "2-digit", month: "short" });
}

// ============================================================
// SPLIT BILL MODAL
// ============================================================

interface SplitBillModalProps {
  cart: CartItem[];
  total: number;
  onConfirm: (splitType: "equal" | "items" | "amount", parts: SplitPart[]) => void;
  onClose: () => void;
}

function SplitBillModal({ cart, total, onConfirm, onClose }: SplitBillModalProps) {
  const [mode, setMode] = useState<"equal" | "items" | "amount">("equal");
  const [count, setCount] = useState(2);
  const [parts, setParts] = useState<SplitPart[]>([
    { label: "الجزء 1", color: SPLIT_PART_COLORS[0], customerName: "الجزء 1", amount: "", payments: [{ method: "cash", amount: "" }] },
    { label: "الجزء 2", color: SPLIT_PART_COLORS[1], customerName: "الجزء 2", amount: "", payments: [{ method: "cash", amount: "" }] },
  ]);
  const [itemAssignments, setItemAssignments] = useState<Record<string, number>>({});

  // Build equal parts when count changes
  useEffect(() => {
    if (mode !== "equal") return;
    const perPerson = +(total / count).toFixed(2);
    const newParts: SplitPart[] = Array.from({ length: count }, (_, i) => ({
      label: `الجزء ${i + 1}`,
      color: SPLIT_PART_COLORS[i % SPLIT_PART_COLORS.length],
      customerName: `الجزء ${i + 1}`,
      amount: String(i === count - 1 ? +(total - perPerson * (count - 1)).toFixed(2) : perPerson),
      payments: [{ method: "cash" as const, amount: String(i === count - 1 ? +(total - perPerson * (count - 1)).toFixed(2) : perPerson) }],
    }));
    setParts(newParts);
  }, [count, total, mode]);

  // Build amount parts when switching to amount mode
  useEffect(() => {
    if (mode === "amount") {
      setParts(p => p.length < 2 ? [
        { label: "الجزء 1", color: SPLIT_PART_COLORS[0], customerName: "الجزء 1", amount: "", payments: [{ method: "cash", amount: "" }] },
        { label: "الجزء 2", color: SPLIT_PART_COLORS[1], customerName: "الجزء 2", amount: "", payments: [{ method: "cash", amount: "" }] },
      ] : p);
    }
  }, [mode]);

  const updatePart = (i: number, field: keyof SplitPart, val: any) => {
    setParts(ps => ps.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  const updatePartPayment = (partIdx: number, payIdx: number, field: keyof PaymentRow, val: string) => {
    setParts(ps => ps.map((p, i) => i !== partIdx ? p : {
      ...p,
      payments: p.payments.map((pay, j) => j !== payIdx ? pay : { ...pay, [field]: val }),
    }));
  };

  const addPartPayment = (partIdx: number) => {
    setParts(ps => ps.map((p, i) => i !== partIdx ? p : {
      ...p,
      payments: [...p.payments, { method: "cash" as const, amount: "" }],
    }));
  };

  const removePartPayment = (partIdx: number, payIdx: number) => {
    setParts(ps => ps.map((p, i) => i !== partIdx ? p : {
      ...p,
      payments: p.payments.filter((_, j) => j !== payIdx),
    }));
  };

  const addPart = () => {
    const i = parts.length;
    setParts(ps => [...ps, {
      label: `الجزء ${i + 1}`,
      color: SPLIT_PART_COLORS[i % SPLIT_PART_COLORS.length],
      customerName: `الجزء ${i + 1}`,
      amount: "",
      payments: [{ method: "cash", amount: "" }],
    }]);
  };

  const assignItem = (cartItemId: string, partIndex: number) => {
    setItemAssignments(a => ({ ...a, [cartItemId]: partIndex }));
  };

  const getPartItems = (partIndex: number) =>
    cart.filter(ci => (itemAssignments[ci.id] ?? 0) === partIndex);

  const getPartTotal = (partIndex: number) => {
    const items = getPartItems(partIndex);
    const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
    return +(sub * (1 + VAT_RATE / 100)).toFixed(2);
  };

  const amountPaid = parts.reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
  const remaining = +(total - amountPaid).toFixed(2);

  const canConfirm = () => {
    if (mode === "equal") return parts.every(p => p.payments.every(pay => parseFloat(pay.amount || "0") > 0));
    if (mode === "amount") return Math.abs(remaining) < 0.05 && parts.every(p => p.payments.every(pay => parseFloat(pay.amount || "0") > 0));
    if (mode === "items") return parts.every((_, i) => getPartItems(i).length > 0 && parts[i].payments.every(pay => parseFloat(pay.amount || "0") > 0));
    return false;
  };

  const handleConfirm = () => {
    if (!canConfirm()) return;
    const finalParts: SplitPart[] = parts.map((p, i) => ({
      ...p,
      itemIds: mode === "items" ? getPartItems(i).map(ci => ci.id) : undefined,
      amount: mode === "items" ? String(getPartTotal(i)) : p.amount,
    }));
    onConfirm(mode, finalParts);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <SplitSquareHorizontal className="w-5 h-5 text-brand-500" />
            <h2 className="font-bold text-gray-900">تقسيم الفاتورة</h2>
            <span className="text-sm text-gray-400">— إجمالي {fmt(total)} ر.س</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode selector */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {([["equal", "بالتساوي"], ["items", "بالبنود"], ["amount", "بالمبلغ"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={clsx("flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                  mode === key ? "bg-white text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Equal mode: count picker */}
          {mode === "equal" && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">عدد الأشخاص:</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setCount(c => Math.max(2, c - 1))} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-bold text-lg tabular-nums">{count}</span>
                <button onClick={() => setCount(c => Math.min(10, c + 1))} className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-sm text-gray-400">{fmt(+(total / count).toFixed(2))} ر.س / شخص</span>
            </div>
          )}

          {/* Items mode: item assignment */}
          {mode === "items" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">اختر الجزء لكل بند</p>
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.qty} × {fmt(item.price)} ر.س</p>
                  </div>
                  <div className="flex gap-1">
                    {parts.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => assignItem(item.id, i)}
                        className={clsx(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                          (itemAssignments[item.id] ?? 0) === i ? p.color : "border-gray-200 text-gray-400 hover:bg-gray-100"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={addPart}
                className="w-full text-xs text-brand-600 border border-dashed border-brand-300 rounded-xl py-2 hover:bg-brand-50"
              >
                + أضف جزءاً
              </button>
            </div>
          )}

          {/* Amount mode: running total */}
          {mode === "amount" && (
            <div className={clsx(
              "flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium",
              Math.abs(remaining) < 0.05 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            )}>
              <span>المتبقي</span>
              <span className="tabular-nums font-bold">{fmt(remaining)} ر.س</span>
            </div>
          )}

          {/* Parts list */}
          <div className="space-y-3">
            {parts.map((part, pi) => {
              const partTotal = mode === "items" ? getPartTotal(pi) : 0;
              const paySum = part.payments.reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
              const partPaid = Math.abs(paySum - (mode === "items" ? partTotal : parseFloat(part.amount || "0"))) < 0.05;

              return (
                <div key={pi} className={clsx("rounded-xl border p-4 space-y-3", part.color)}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{part.label}</span>
                    <input
                      className="flex-1 bg-white/80 border border-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
                      placeholder="اسم الشخص (اختياري)"
                      value={part.customerName}
                      onChange={e => updatePart(pi, "customerName", e.target.value)}
                    />
                    {mode === "items" && (
                      <span className="text-sm font-bold tabular-nums shrink-0">
                        {fmt(partTotal)} ر.س
                        <span className="text-xs font-normal mr-1">({getPartItems(pi).length} بند)</span>
                      </span>
                    )}
                  </div>

                  {/* Amount input for "amount" mode */}
                  {mode === "amount" && (
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full bg-white/80 border border-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200 tabular-nums"
                      placeholder="المبلغ ر.س"
                      value={part.amount}
                      onChange={e => updatePart(pi, "amount", normalizeNumeric(e.target.value))}
                      dir="ltr"
                    />
                  )}

                  {/* Payment rows for this part */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold opacity-70">طريقة الدفع</p>
                    {part.payments.map((pay, payi) => (
                      <div key={payi} className="flex gap-2">
                        <select
                          className="bg-white/80 border border-white rounded-lg px-2 py-1.5 text-xs outline-none"
                          value={pay.method}
                          onChange={e => updatePartPayment(pi, payi, "method", e.target.value)}
                        >
                          <option value="cash">نقد</option>
                          <option value="card">بطاقة</option>
                          <option value="mada">مدى</option>
                          <option value="apple_pay">Apple Pay</option>
                          <option value="bank_transfer">تحويل</option>
                        </select>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="flex-1 bg-white/80 border border-white rounded-lg px-3 py-1.5 text-sm outline-none tabular-nums"
                          placeholder="المبلغ"
                          value={pay.amount}
                          onChange={e => updatePartPayment(pi, payi, "amount", normalizeNumeric(e.target.value))}
                          dir="ltr"
                        />
                        {part.payments.length > 1 && (
                          <button onClick={() => removePartPayment(pi, payi)} className="p-1.5 hover:bg-white/60 rounded-lg text-red-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addPartPayment(pi)} className="text-xs opacity-70 hover:opacity-100">
                      + أضف طريقة دفع
                    </button>
                  </div>

                  {/* Payment status indicator */}
                  {partPaid && mode !== "equal" && (
                    <div className="flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> مغطّى بالكامل
                    </div>
                  )}
                </div>
              );
            })}

            {mode === "amount" && (
              <button onClick={addPart} className="w-full text-xs text-brand-600 border border-dashed border-brand-300 rounded-xl py-2 hover:bg-brand-50">
                + أضف جزءاً
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm()}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            تأكيد التقسيم وإتمام البيع
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RECEIPT MODAL
// ============================================================

interface ReceiptModalProps {
  result: SaleResult;
  orgName: string;
  onClose: () => void;
  hasNextPart?: boolean;
  currentPart?: number;
  totalParts?: number;
}

function ReceiptModal({ result, orgName, onClose, hasNextPart, currentPart, totalParts }: ReceiptModalProps) {
  const { invoice, transaction } = result;
  const payments: any[] = transaction?.payments || [];
  const isSplit = !!invoice?.parentInvoiceId || invoice?.splitTotal > 1;
  const splitLabel = isSplit ? `جزء ${invoice.splitIndex} من ${invoice.splitTotal}` : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* Print area */}
        <div id="receipt-print" className="p-6 space-y-4">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-lg leading-none">ن</span>
            </div>
            <h2 className="font-bold text-gray-900 text-base">{orgName}</h2>
            {isSplit && (
              <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 inline-block">
                فاتورة مقسّمة — {splitLabel}
              </div>
            )}
          </div>

          {/* Invoice info */}
          <div className="border-t border-b border-dashed border-gray-200 py-3 space-y-1 text-xs text-gray-600">
            <div className="flex justify-between"><span>رقم الفاتورة</span><span className="font-mono font-bold text-gray-900">{invoice?.invoiceNumber}</span></div>
            <div className="flex justify-between"><span>التاريخ</span><span className="tabular-nums">{invoice ? new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" }) : ""}</span></div>
            <div className="flex justify-between"><span>الوقت</span><span className="tabular-nums">{invoice ? new Date(invoice.issueDate || invoice.createdAt).toLocaleTimeString("ar-SA-u-ca-gregory-nu-latn", { hour: "2-digit", minute: "2-digit" }) : ""}</span></div>
            {transaction?.customer_name && transaction.customer_name !== "زائر" && (
              <div className="flex justify-between"><span>العميل</span><span className="font-medium">{transaction.customer_name}</span></div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-1.5">
            {(transaction?.items || []).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 flex-1">{item.name}</span>
                <span className="text-gray-400 text-xs mx-2">×{item.quantity}</span>
                <span className="tabular-nums font-medium">{fmt(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>المجموع</span>
              <span className="tabular-nums">{fmt(transaction?.subtotal)} ر.س</span>
            </div>
            {parseFloat(transaction?.discount_amount || "0") > 0 && (
              <div className="flex justify-between text-red-500">
                <span>الخصم</span>
                <span className="tabular-nums">- {fmt(transaction?.discount_amount)} ر.س</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>ضريبة ({VAT_RATE}%)</span>
              <span className="tabular-nums">{fmt(transaction?.tax_amount)} ر.س</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-1.5">
              <span>الإجمالي</span>
              <span className="tabular-nums text-brand-600">{fmt(transaction?.total_amount)} ر.س</span>
            </div>
          </div>

          {/* Payments */}
          <div className="space-y-1 text-sm">
            {payments.map((p: any, i: number) => (
              <div key={i} className="flex justify-between text-gray-600">
                <span>{PAYMENT_LABELS[p.method] || p.method}</span>
                <span className="tabular-nums">{fmt(p.amount)} ر.س</span>
              </div>
            ))}
            {parseFloat(transaction?.change_amount || "0") > 0 && (
              <div className="flex justify-between font-medium text-emerald-600">
                <span>الباقي</span>
                <span className="tabular-nums">{fmt(transaction?.change_amount)} ر.س</span>
              </div>
            )}
          </div>

          {/* QR */}
          {invoice?.qrCode && (
            <div className="text-center">
              <p className="text-[10px] text-gray-300 break-all font-mono">{invoice.qrCode.slice(0, 40)}...</p>
              <p className="text-[10px] text-gray-400 mt-1">QR — متوافق مع زاتكا</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-[10px] text-gray-300 border-t border-dashed border-gray-100 pt-3">
            شكراً لزيارتكم · ترميز OS — tarmizos.com
          </div>
        </div>

        {/* Part navigator */}
        {totalParts && totalParts > 1 && (
          <div className="mx-6 mb-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-amber-700 font-semibold">
              إيصال الجزء {currentPart} من {totalParts}
            </span>
            {hasNextPart && (
              <span className="text-xs text-amber-600">اضغط "التالي" للجزء التالي</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <Printer className="w-4 h-4" /> طباعة
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            {hasNextPart ? `التالي — الجزء ${(currentPart ?? 0) + 1}` : "تم"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SALES LOG TAB
// ============================================================

function SalesLogTab() {
  const { data: todayRes, loading, refetch } = useApi(() => posApi.today(), []);
  const { data: statsRes } = useApi(() => posApi.stats(), []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const transactions: any[] = todayRes?.data || [];
  const stats = statsRes?.data;

  const handleRefund = async (tx: any) => {
    if (!confirm(`استرداد عملية ${tx.transaction_number}؟`)) return;
    setRefundingId(tx.id);
    try {
      await posApi.refund(tx.id, "استرداد من الكاشير");
      toast.success("تم الاسترداد");
      refetch();
    } catch { toast.error("فشل الاسترداد"); }
    finally { setRefundingId(null); }
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "المبيعات", value: `${fmt(stats.total_sales)} ر.س`, icon: TrendingUp, color: "text-brand-600", bg: "bg-brand-50" },
            { label: "العمليات", value: String(stats.sales_count), icon: Receipt, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "المتوسط", value: `${fmt(stats.avg_sale)} ر.س`, icon: Tag, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "الاستردادات", value: `${fmt(stats.total_refunds)} ر.س`, icon: RotateCcw, color: "text-red-500", bg: "bg-red-50" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                <s.icon className={clsx("w-4 h-4", s.color)} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={clsx("text-sm font-bold tabular-nums", s.color)}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment breakdown */}
      {stats?.byMethod && Object.keys(stats.byMethod).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">توزيع طرق الدفع</p>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(stats.byMethod as Record<string, number>).map(([method, amount]) => (
              <div key={method} className="flex items-center gap-2">
                <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border", PAYMENT_COLORS[method] || "bg-gray-100 text-gray-600 border-gray-200")}>
                  {PAYMENT_LABELS[method] || method}
                </span>
                <span className="text-sm font-bold tabular-nums text-gray-800">{fmt(amount)} ر.س</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">مبيعات اليوم</h3>
          <button onClick={refetch} className="text-xs text-brand-500 hover:text-brand-700">تحديث</button>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">لا توجد مبيعات اليوم بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map(tx => {
              const payments: any[] = tx.payments || [];
              const methodLabel = payments.length === 1
                ? (PAYMENT_LABELS[payments[0].method] || payments[0].method)
                : `مختلط (${payments.length})`;
              const isExpanded = expandedId === tx.id;
              const isSplit = !!tx.parent_transaction_id || !!tx.split_type;

              return (
                <div key={tx.id}>
                  <div
                    className="flex items-center px-5 py-3.5 hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{tx.customer_name || "زائر"}</span>
                        {isSplit && (
                          <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded font-medium">مقسّمة</span>
                        )}
                        {tx.status === "refunded" && (
                          <span className="text-[10px] bg-red-50 text-red-500 border border-red-200 px-1.5 py-0.5 rounded font-medium">مستردة</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtTime(tx.created_at)} · {methodLabel}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-bold tabular-nums text-gray-900">{fmt(tx.total_amount)} ر.س</p>
                      <p className="text-xs text-gray-400 font-mono">{tx.transaction_number}</p>
                    </div>
                    <ChevronDown className={clsx("w-4 h-4 text-gray-300 mr-3 transition-transform shrink-0", isExpanded && "rotate-180")} />
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-4 bg-gray-50/50">
                      {/* Items */}
                      <div className="space-y-1 mb-3">
                        {(tx.items || []).map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs text-gray-600">
                            <span>{item.name} × {item.quantity}</span>
                            <span className="tabular-nums">{fmt(item.price * item.quantity)} ر.س</span>
                          </div>
                        ))}
                      </div>
                      {/* Payments */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {payments.map((p: any, i: number) => (
                          <span key={i} className={clsx("text-xs px-2 py-1 rounded-lg border font-medium", PAYMENT_COLORS[p.method] || "bg-gray-100 text-gray-600 border-gray-200")}>
                            {PAYMENT_LABELS[p.method] || p.method}: {fmt(p.amount)} ر.س
                          </span>
                        ))}
                      </div>
                      {tx.status !== "refunded" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRefund(tx); }}
                          disabled={refundingId === tx.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {refundingId === tx.id ? "جاري الاسترداد..." : "استرداد"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN POS PAGE
// ============================================================

export function POSPage() {
  const [activeTab, setActiveTab] = useState<"pos" | "log">("pos");
  const { systemRole, hasPermission } = usePermission();
  const canEditPrice = systemRole === "owner" || systemRole === "manager"
    || hasPermission("pos.override_price");

  // Catalog state
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<{ id?: string; name: string; phone?: string } | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showCustomerInput, setShowCustomerInput] = useState(false);
  const [discType, setDiscType] = useState<"fixed" | "percent">("fixed");
  const [discValue, setDiscValue] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [notes, setNotes] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Payment state
  const [payMode, setPayMode] = useState<"cash" | "card" | "mada" | "apple_pay" | "bank_transfer" | "mixed">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [cardRef, setCardRef] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [mixedPayments, setMixedPayments] = useState<PaymentRow[]>([
    { method: "cash", amount: "" },
    { method: "card", amount: "" },
  ]);

  // UI state
  const [completing, setCompleting] = useState(false);
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);
  const [splitResults, setSplitResults] = useState<SaleResult[]>([]);
  const [splitReceiptIdx, setSplitReceiptIdx] = useState(0);
  const [showSplit, setShowSplit] = useState(false);
  const [editingQty, setEditingQty] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"catalog" | "cart">("catalog");

  // Profile — used for org name in receipt only
  const { data: profileRes } = useApi(() => settingsApi.profile(), []);
  const orgProfile = profileRes?.data as any;

  // Menu items + categories fetched unconditionally.
  // If this org has the "catalog" capability → API returns data → food-business mode.
  // If not (403 / empty) → data stays null/[] → fall back to services.
  const { data: menuItemsRes, loading: loadingMenuItems } = useApi(() => menuApi.items(), []);
  const { data: menuCatRes } = useApi(() => menuApi.categories(), []);

  const menuItemsList: any[] = menuItemsRes?.data ?? [];
  const menuCatList:   any[] = menuCatRes?.data   ?? [];
  // Food-business mode when the catalog API actually returned data
  const isFoodBusiness = menuItemsList.length > 0 || menuCatList.length > 0;

  // Service categories — fetched always, used as fallback for non-food businesses
  const { data: svcCatRes } = useApi(() => categoriesApi.list(true), []);
  const categories: any[] = isFoodBusiness ? menuCatList : (svcCatRes?.data || []);

  const { data: servicesRes, loading: loadingServices } = useApi(
    () => servicesApi.list({ status: "active", visibleInPOS: "true" }),
    []
  );
  const services: any[] = servicesRes?.data || [];

  const { data: customersRes } = useApi(
    () => customerSearch.length >= 2 ? customersApi.list({ q: customerSearch }) : Promise.resolve({ data: [] } as any),
    [customerSearch]
  );
  const customerList: any[] = (customersRes as any)?.data || [];

  // Normalise menu items to same shape as services for the cart
  const menuItemsAsServices: any[] = menuItemsList.map((item: any) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    categoryId: item.category_id,  // PostgreSQL returns snake_case
    visibleInPOS: true,
  }));

  const effectiveServices = isFoodBusiness ? menuItemsAsServices : services;
  // Hold skeleton until menu items resolve — avoids service→menu content flicker
  const effectiveLoading = loadingMenuItems || (!isFoodBusiness && loadingServices);

  // Filtered services
  const filteredServices = effectiveServices.filter((s: any) => {
    const matchesCat = activeCat === "all" || s.categoryId === activeCat;
    const matchesSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Calculations
  const { subtotal, discountAmount, taxable, vatAmount, total } = calcCart(
    cart, discType, parseFloat(discValue || "0")
  );

  const cashChange = payMode === "cash" ? Math.max(0, parseFloat(cashReceived || "0") - total) : 0;
  const mixedTotal = mixedPayments.reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
  const mixedRemaining = +(total - mixedTotal).toFixed(2);

  // Get final payments array
  const buildPayments = (): { method: string; amount: number; reference?: string }[] => {
    if (payMode === "cash") return [{ method: "cash", amount: total }];
    if (payMode === "card") return [{ method: "card", amount: total, reference: cardRef || undefined }];
    if (payMode === "mada") return [{ method: "mada", amount: total }];
    if (payMode === "apple_pay") return [{ method: "apple_pay", amount: total }];
    if (payMode === "bank_transfer") return [{ method: "bank_transfer", amount: total, reference: bankRef || undefined }];
    return mixedPayments
      .filter(p => parseFloat(p.amount || "0") > 0)
      .map(p => ({ method: p.method, amount: parseFloat(p.amount), reference: p.reference || undefined }));
  };

  const canComplete = () => {
    if (cart.length === 0) return false;
    // Block if any item is below min price
    if (cart.some(c => c.minPrice != null && c.minPrice > 0 && (c.customPrice ?? c.price) < c.minPrice)) return false;
    if (payMode === "cash") return parseFloat(cashReceived || "0") >= total;
    if (payMode === "mixed") return Math.abs(mixedRemaining) < 0.05;
    return true;
  };

  // Actions
  const addToCart = (svc: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === svc.id);
      if (existing) return prev.map(c => c.id === svc.id ? { ...c, qty: c.qty + 1 } : c);
      const basePrice = Number(svc.basePrice ?? svc.price ?? 0);
      const minP = Number(svc.minPrice ?? 0) || undefined;
      return [...prev, { id: svc.id, name: svc.name, price: basePrice, minPrice: minP, qty: 1 }];
    });
  };

  const updateItemPrice = (id: string, val: string) => {
    const n = parseFloat(normalizeNumeric(val));
    setCart(prev => prev.map(c => c.id === id ? { ...c, customPrice: isNaN(n) ? undefined : n } : c));
  };

  const updateItemNote = (id: string, note: string) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, note } : c));
  };

  const changeQty = (id: string, delta: number) => {
    if (completing) return;
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
  };

  const updateQty = (id: string, qty: number) => {
    const safe = Math.max(1, qty || 1);
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: safe } : c));
  };

  const updateItemStaff = (id: string, staffId: string, staffName: string) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, staffId, staffName } : c));
  };

  const removeItem = (id: string) => { if (completing) return; setCart(prev => prev.filter(c => c.id !== id)); };

  const clearAll = useCallback(() => {
    setCart([]);
    setCustomer(null);
    setCustomerSearch("");
    setDiscValue("");
    setNotes("");
    setPayMode("cash");
    setCashReceived("");
    setCardRef("");
    setBankRef("");
    setMixedPayments([{ method: "cash", amount: "" }, { method: "card", amount: "" }]);
  }, []);

  const handleCompleteSale = async () => {
    if (!canComplete()) return;
    setCompleting(true);
    try {
      const res = await posApi.sale({
        items: cart.map(c => ({ id: c.id, name: c.name, quantity: c.qty, price: c.customPrice ?? c.price, staffId: c.staffId || undefined, staffName: c.staffName, note: c.note || undefined })),
        payments: buildPayments(),
        customerId: customer?.id,
        customerName: customer?.name || "زائر",
        customerPhone: customer?.phone,
        discountType: parseFloat(discValue || "0") > 0 ? discType : null,
        discountValue: parseFloat(discValue || "0"),
        notes: notes || null,
      });
      setSaleResult(res.data);
      toast.success("تم إتمام البيع");
      hapticSuccess();
    } catch (err: any) {
      toast.error(err?.message || "فشل إتمام البيع");
    } finally {
      setCompleting(false);
    }
  };

  const handleSplitConfirm = async (splitType: "equal" | "items" | "amount", parts: SplitPart[]) => {
    setShowSplit(false);
    setCompleting(true);
    try {
      const res = await posApi.splitSale({
        splitType,
        allItems: cart.map(c => ({ id: c.id, name: c.name, quantity: c.qty, price: c.price })),
        parts: parts.map(p => ({
          items: p.itemIds
            ? cart.filter(ci => p.itemIds!.includes(ci.id)).map(c => ({ id: c.id, name: c.name, quantity: c.qty, price: c.price }))
            : undefined,
          amount: parseFloat(p.amount || "0"),
          customerName: p.customerName,
          payments: p.payments.filter(pay => parseFloat(pay.amount || "0") > 0).map(pay => ({ method: pay.method, amount: parseFloat(pay.amount) })),
        })),
        notes: notes || null,
      });
      // Show receipts for all parts
      const children: SaleResult[] = res.data?.children || [];
      if (children.length > 0) {
        setSplitResults(children);
        setSplitReceiptIdx(0);
        setSaleResult(children[0]);
      }
      toast.success(`تم إتمام البيع المقسّم — ${children.length} أجزاء`);
      hapticSuccess();
    } catch (err: any) {
      toast.error(err?.message || "فشل إتمام البيع المقسّم");
    } finally {
      setCompleting(false);
    }
  };

  const handleReceiptClose = () => {
    // If split: advance to next part's receipt, else close
    if (splitResults.length > 0 && splitReceiptIdx < splitResults.length - 1) {
      const nextIdx = splitReceiptIdx + 1;
      setSplitReceiptIdx(nextIdx);
      setSaleResult(splitResults[nextIdx]);
    } else {
      setSaleResult(null);
      setSplitResults([]);
      setSplitReceiptIdx(0);
      clearAll();
    }
  };

  // Barcode state
  const barcodeBuffer = useRef<string>("");
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);

  const handleBarcodeInput = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) { setBarcodeInput(""); return; }

    // 1. Fast local lookup first
    const local = effectiveServices.find((s: any) => s.sku === trimmed || s.barcode === trimmed);
    if (local) {
      addToCart(local);
      toast.success(`أضيف: ${local.name}`);
      setBarcodeInput("");
      if (barcodeRef.current) barcodeRef.current.value = "";
      return;
    }

    // 2. Fallback: API lookup (covers inventory_products)
    setBarcodeLoading(true);
    try {
      const res: any = await posApi.lookupByBarcode(trimmed);
      if (res?.data) {
        const item = res.data;
        addToCart({ id: item.id, name: item.name, basePrice: item.price });
        toast.success(`أضيف: ${item.name}`);
      } else {
        toast.error("الباركود غير مسجل في النظام");
      }
    } catch {
      toast.error("الباركود غير مسجل في النظام");
    } finally {
      setBarcodeLoading(false);
    }
    setBarcodeInput("");
    if (barcodeRef.current) barcodeRef.current.value = "";
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] overflow-hidden -m-4 md:-m-6">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-gray-100 shrink-0 shadow-[0_1px_0_0_#f3f4f6]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm shadow-brand-500/30">
              <Receipt className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-sm font-bold text-gray-900">نقطة البيع</h1>
          </div>
          <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-xl">
            {([["pos", "الكاشير"], ["log", "سجل اليوم"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={clsx("px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all",
                  activeTab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Barcode input */}
        <div className="relative flex items-center">
          <ScanBarcode className={`absolute right-3 w-4 h-4 ${barcodeLoading ? "text-brand-500 animate-pulse" : "text-gray-300"}`} />
          <input
            ref={barcodeRef}
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleBarcodeInput(barcodeInput); }}
            placeholder="امسح الباركود..."
            className="pr-9 pl-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 w-48 bg-gray-50 placeholder:text-gray-300"
            dir="ltr"
          />
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "log" ? (
        <div className="flex-1 overflow-y-auto p-5">
          <SalesLogTab />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Catalog ── */}
          <div className={clsx("flex-1 flex-col border-l border-gray-100 min-w-0 bg-gray-50/50", mobileView === "catalog" ? "flex" : "hidden md:flex")}>

            {/* Category tabs */}
            <div className="flex gap-1.5 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto shrink-0 scrollbar-hide">
              <button
                onClick={() => setActiveCat("all")}
                className={clsx(
                  "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                  activeCat === "all"
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                الكل
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={clsx(
                    "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                    activeCat === cat.id
                      ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-4 py-3 bg-white border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                <input
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-9 pl-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 placeholder:text-gray-300"
                  placeholder="بحث سريع..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Services grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {effectiveLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center">
                  <Package className="w-10 h-10 text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">لا توجد خدمات</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredServices.map(svc => {
                    const inCart = cart.find(c => c.id === svc.id);
                    const initial = (svc.name || "خ").charAt(0);
                    const basePrice = Number(svc.basePrice || svc.price || 0);
                    return (
                      <div
                        key={svc.id}
                        className={clsx(
                          "relative rounded-2xl border transition-all select-none overflow-hidden",
                          inCart
                            ? "border-brand-300 bg-white shadow-[0_2px_12px_rgba(91,155,213,0.15)]"
                            : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                        )}
                      >
                        {/* Full-card click zone */}
                        <button
                          onClick={() => addToCart(svc)}
                          className="w-full text-right p-3.5 pb-10 active:scale-[0.97] transition-transform"
                        >
                          {/* Icon */}
                          <div className={clsx(
                            "w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 text-sm font-bold",
                            inCart ? "bg-brand-50 text-brand-600" : "bg-gray-100 text-gray-500"
                          )}>
                            {initial}
                          </div>

                          {/* Name */}
                          <p className={clsx(
                            "text-[13px] font-semibold leading-tight line-clamp-2 mb-1.5",
                            inCart ? "text-brand-700" : "text-gray-800"
                          )}>
                            {svc.name}
                          </p>

                          {/* Price */}
                          <p className={clsx("text-sm font-bold tabular-nums", inCart ? "text-brand-600" : "text-gray-600")}>
                            {basePrice.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                            <span className="text-[11px] font-medium text-gray-400 mr-0.5">ر.س</span>
                          </p>
                        </button>

                        {/* Qty controls — absolute overlay at bottom */}
                        {inCart ? (
                          <div
                            className="absolute bottom-0 left-0 right-0 flex items-center bg-brand-500 px-2 py-1.5 gap-2"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => changeQty(inCart.id, -1)}
                              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="flex-1 text-center text-sm font-black text-white tabular-nums">
                              {inCart.qty}
                            </span>
                            <button
                              onClick={() => changeQty(inCart.id, 1)}
                              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-center">
                            <Plus className="w-3.5 h-3.5 text-gray-300" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Floating cart button (mobile only, catalog view) ── */}
          {mobileView === "catalog" && (
            <button
              onClick={() => setMobileView("cart")}
              className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-5 py-3 bg-brand-500 text-white rounded-2xl shadow-lg shadow-brand-500/30 font-semibold text-sm active:scale-95 transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>السلة</span>
              {cart.length > 0 && (
                <>
                  <span className="w-5 h-5 bg-white text-brand-600 text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                    {cart.reduce((s, c) => s + c.qty, 0)}
                  </span>
                  <span className="opacity-80 text-xs font-normal">{fmt(total)} ر.س</span>
                </>
              )}
            </button>
          )}

          {/* ── RIGHT: Cart + Payment ── */}
          <div className={clsx("shrink-0 flex flex-col bg-white border-r border-gray-100 w-full md:w-80 lg:w-[360px] shadow-[-4px_0_24px_0_rgba(0,0,0,0.04)]", mobileView === "cart" ? "flex" : "hidden md:flex")}>

            {/* Cart header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setMobileView("catalog")}
                  className="md:hidden p-1 -mr-1 text-gray-400 hover:text-gray-600"
                  aria-label="العودة للكتالوج"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-brand-500" />
                  <span className="font-bold text-gray-900 text-sm">السلة</span>
                  {cart.length > 0 && (
                    <span className="min-w-[20px] h-5 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums px-1">
                      {cart.reduce((s, c) => s + c.qty, 0)}
                    </span>
                  )}
                </div>
              </div>
              {cart.length > 0 && (
                <button onClick={clearAll} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 px-2 py-1 rounded-lg">
                  <Trash2 className="w-3 h-3" /> مسح
                </button>
              )}
            </div>

            {/* Customer picker — compact chip, expands on click */}
            <div className="px-3 py-2 border-b border-gray-100 shrink-0 relative">
              {!showCustomerInput && !customer ? (
                <button
                  onClick={() => setShowCustomerInput(true)}
                  className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-brand-600 transition-colors py-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>العميل: زائر</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              ) : (
                <div className="relative">
                  <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                  <input
                    className={clsx(
                      "w-full bg-gray-50 border rounded-xl pr-8 pl-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-50 placeholder:text-gray-300 transition-all",
                      customer ? "border-brand-300 bg-brand-50/30 focus:border-brand-400" : "border-gray-200 focus:border-brand-400"
                    )}
                    placeholder="ابحث عن عميل..."
                    value={customerSearch}
                    autoFocus={!customer}
                    onChange={e => { setCustomerSearch(e.target.value); setShowCustomerList(true); setCustomer(null); }}
                    onFocus={() => setShowCustomerList(true)}
                    onBlur={() => { if (!customer) { setTimeout(() => { setShowCustomerList(false); if (!customerSearch) setShowCustomerInput(false); }, 150); } }}
                  />
                  <button
                    onClick={() => { setCustomer(null); setCustomerSearch(""); setShowCustomerInput(false); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-400 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {/* Selected customer chip */}
              {customer && !showCustomerInput && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex items-center gap-1.5 bg-brand-50 border border-brand-200 rounded-lg px-2.5 py-1 flex-1 min-w-0">
                    <Users className="w-3 h-3 text-brand-400 shrink-0" />
                    <span className="text-[12px] font-semibold text-brand-700 truncate">{customer.name}</span>
                  </div>
                  <button onClick={() => { setCustomer(null); setCustomerSearch(""); }} className="p-1 text-gray-300 hover:text-red-400 rounded transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {showCustomerList && customerList.length > 0 && (
                <div className="absolute left-3 right-3 z-20 bg-white border border-gray-200 rounded-2xl shadow-xl mt-1 max-h-44 overflow-y-auto">
                  {customerList.slice(0, 6).map((c: any) => (
                    <button
                      key={c.id}
                      className="w-full text-right px-4 py-2.5 hover:bg-brand-50 text-sm border-b border-gray-50 last:border-0 first:rounded-t-2xl last:rounded-b-2xl transition-colors"
                      onMouseDown={() => {
                        setCustomer({ id: c.id, name: c.name, phone: c.phone });
                        setCustomerSearch(c.name);
                        setShowCustomerList(false);
                        setShowCustomerInput(false);
                      }}
                    >
                      <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-center p-4 gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium">اضغط على أي منتج لإضافته</p>
                </div>
              ) : (
                <div className="p-2.5 space-y-1.5">
                  {cart.map(item => {
                    const effectiveUnitPrice = item.customPrice ?? item.price;
                    const belowMin = item.minPrice != null && item.minPrice > 0 && effectiveUnitPrice < item.minPrice;
                    const priceChanged = item.customPrice !== undefined && item.customPrice !== item.price;
                    const isExpanded = expandedItem === item.id;
                    return (
                      <div key={item.id} className={clsx(
                        "rounded-xl border transition-all overflow-hidden",
                        belowMin ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"
                      )}>
                        {/* ── Compact row (always visible) ── */}
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          {/* Qty stepper */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => changeQty(item.id, -1)}
                              className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-red-200 hover:text-red-500 transition-colors"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            {editingQty === item.id ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                defaultValue={item.qty}
                                className="w-8 text-center text-xs font-bold border border-brand-300 rounded-lg px-0.5 py-0.5 focus:outline-none bg-white"
                                autoFocus
                                onBlur={e => { updateQty(item.id, parseInt(normalizeNumeric(e.target.value)) || 1); setEditingQty(null); }}
                                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditingQty(null); }}
                              />
                            ) : (
                              <button
                                onClick={() => setEditingQty(item.id)}
                                className="w-7 text-center text-xs font-bold text-brand-600 hover:text-brand-700 tabular-nums"
                              >
                                {item.qty}
                              </button>
                            )}
                            <button
                              onClick={() => changeQty(item.id, 1)}
                              className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          {/* Name */}
                          <p className="flex-1 text-[13px] font-medium text-gray-800 truncate min-w-0">{item.name}</p>

                          {/* Total + expand + delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {priceChanged && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="سعر معدَّل" />}
                            <span className="text-[13px] font-bold text-gray-900 tabular-nums">
                              {fmt(effectiveUnitPrice * item.qty)}
                            </span>
                            {canEditPrice && (
                              <button
                                onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                                className={clsx(
                                  "p-1 rounded-lg transition-colors",
                                  isExpanded ? "text-brand-500 bg-brand-50" : "text-gray-300 hover:text-gray-500 hover:bg-gray-200"
                                )}
                                title="تعديل السعر"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* ── Expanded details (price edit + note) — only for authorized users ── */}
                        {isExpanded && canEditPrice && (
                          <div className="px-3 pb-3 pt-1 border-t border-gray-200 bg-white space-y-2">
                            {/* Price override */}
                            <div className={clsx(
                              "flex items-center gap-2 rounded-lg px-2.5 py-2 border",
                              belowMin ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
                            )}>
                              <span className="text-[11px] text-gray-400 shrink-0">سعر الوحدة</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                className="flex-1 bg-transparent text-sm font-bold text-gray-800 outline-none tabular-nums text-left min-w-0"
                                value={item.customPrice !== undefined ? String(item.customPrice) : String(item.price)}
                                onChange={e => updateItemPrice(item.id, e.target.value)}
                                dir="ltr"
                              />
                              {item.minPrice != null && item.minPrice > 0 && (
                                <span className={clsx("text-[10px] shrink-0 tabular-nums", belowMin ? "text-red-600 font-bold" : "text-gray-400")}>
                                  حد أدنى {fmt(item.minPrice)}
                                </span>
                              )}
                              {priceChanged && (
                                <button
                                  onClick={() => setCart(prev => prev.map(c => c.id === item.id ? { ...c, customPrice: undefined } : c))}
                                  className="text-gray-300 hover:text-brand-500 transition-colors shrink-0"
                                  title="استعادة السعر الأصلي"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {belowMin && (
                              <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                السعر أقل من الحد الأدنى
                              </p>
                            )}

                            {/* Per-item note */}
                            <input
                              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none placeholder:text-gray-300 focus:border-brand-300"
                              placeholder="ملاحظة على هذا البند..."
                              value={item.note || ""}
                              onChange={e => updateItemNote(item.id, e.target.value)}
                            />
                          </div>
                        )}

                        {/* Staff name pill */}
                        {item.staffName && (
                          <div className="flex items-center gap-1 px-3 pb-2">
                            <Scissors className="w-3 h-3 text-gray-300" />
                            <span className="text-[11px] text-gray-400">{item.staffName}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Discount + Notes — progressive disclosure */}
            <div className="px-3 pb-2 border-t border-gray-100 pt-2 shrink-0">
              {/* Toggle links */}
              <div className="flex items-center gap-3 mb-1.5">
                {!showDiscount ? (
                  <button
                    onClick={() => setShowDiscount(true)}
                    className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-brand-600 transition-colors"
                  >
                    <Tag className="w-3 h-3" />
                    خصم
                  </button>
                ) : (
                  <button
                    onClick={() => { setShowDiscount(false); setDiscValue(""); }}
                    className="flex items-center gap-1 text-[12px] text-brand-500 hover:text-brand-700 transition-colors"
                  >
                    <Tag className="w-3 h-3" />
                    إلغاء الخصم
                  </button>
                )}
                <span className="w-px h-3 bg-gray-200" />
                <div className="flex items-center gap-1.5 flex-1">
                  <StickyNote className="w-3 h-3 text-gray-300 shrink-0" />
                  <input
                    className="flex-1 bg-transparent text-[12px] text-gray-600 outline-none placeholder:text-gray-300"
                    placeholder="ملاحظة..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Discount row — only when toggled */}
              {showDiscount && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setDiscType(t => t === "fixed" ? "percent" : "fixed")}
                    className={clsx(
                      "w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0",
                      discType === "percent"
                        ? "border-brand-400 bg-brand-50 text-brand-500"
                        : "border-gray-200 text-gray-400 hover:bg-gray-50"
                    )}
                    title={discType === "fixed" ? "مبلغ ثابت" : "نسبة مئوية"}
                  >
                    {discType === "fixed" ? <Tag className="w-3.5 h-3.5" /> : <Percent className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 placeholder:text-gray-300 tabular-nums"
                    placeholder={discType === "fixed" ? "خصم ثابت (ر.س)" : "خصم % (0-100)"}
                    value={discValue}
                    onChange={e => setDiscValue(normalizeNumeric(e.target.value))}
                    autoFocus
                    dir="ltr"
                  />
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="mx-3 mb-3 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
              <div className="px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>المجموع</span>
                  <span className="tabular-nums font-medium">{fmt(subtotal)} ر.س</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>الخصم</span>
                    <span className="tabular-nums font-medium">- {fmt(discountAmount)} ر.س</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>ضريبة {VAT_RATE}%</span>
                  <span className="tabular-nums font-medium">{fmt(vatAmount)} ر.س</span>
                </div>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-brand-500 border-t border-brand-400">
                <span className="text-sm font-semibold text-white/80">الإجمالي</span>
                <span className="tabular-nums text-xl font-black text-white tracking-tight">{fmt(total)} <span className="text-sm font-medium opacity-80">ر.س</span></span>
              </div>
            </div>

            {/* Payment section */}
            <div className="px-3 pt-3 border-t border-gray-100 shrink-0">
              {/* Method buttons — row 1 */}
              <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                {(["cash", "card", "mada"] as const).map(method => {
                  const icons = { cash: Banknote, card: CreditCard, mada: Smartphone };
                  const labels = { cash: "نقد", card: "بطاقة", mada: "مدى" };
                  const Icon = icons[method];
                  return (
                    <button
                      key={method}
                      onClick={() => setPayMode(method)}
                      className={clsx(
                        "flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-bold transition-all",
                        payMode === method
                          ? "border-brand-400 bg-brand-500 text-white shadow-md shadow-brand-500/25"
                          : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:border-gray-300"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {labels[method]}
                    </button>
                  );
                })}
              </div>
              {/* Method buttons — row 2 */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {(["apple_pay", "bank_transfer", "mixed"] as const).map(method => {
                  const icons = { apple_pay: Smartphone, bank_transfer: ArrowLeftRight, mixed: Wallet };
                  const labels = { apple_pay: "Apple Pay", bank_transfer: "تحويل", mixed: "مختلط" };
                  const Icon = icons[method];
                  return (
                    <button
                      key={method}
                      onClick={() => setPayMode(method)}
                      className={clsx(
                        "flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-bold transition-all",
                        payMode === method
                          ? "border-brand-400 bg-brand-500 text-white shadow-md shadow-brand-500/25"
                          : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:border-gray-300"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {labels[method]}
                    </button>
                  );
                })}
              </div>

              {/* Payment details */}
              {payMode === "cash" && (
                <div className="space-y-2 mb-3">
                  {/* Quick-amount presets */}
                  <div className="flex gap-1.5">
                    {[
                      { label: "المبلغ كاملاً", value: total },
                      { label: "500", value: 500 },
                      { label: "100", value: 100 },
                      { label: "50", value: 50 },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => setCashReceived(String(preset.value))}
                        className={clsx(
                          "flex-1 py-1.5 rounded-xl text-[11px] font-bold border transition-all",
                          parseFloat(cashReceived || "0") === preset.value
                            ? "border-brand-400 bg-brand-500 text-white"
                            : "border-gray-200 bg-gray-50 text-gray-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 tabular-nums text-left font-semibold placeholder:text-gray-300 placeholder:font-normal"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={e => setCashReceived(normalizeNumeric(e.target.value))}
                    dir="ltr"
                  />
                  {parseFloat(cashReceived || "0") > 0 && (
                    <div className={clsx(
                      "flex justify-between items-center px-4 py-2.5 rounded-2xl text-sm font-semibold",
                      cashChange >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                    )}>
                      <span>{cashChange >= 0 ? "الباقي للعميل" : "مبلغ ناقص"}</span>
                      <span className="tabular-nums font-black text-base">{fmt(Math.abs(cashChange))} ر.س</span>
                    </div>
                  )}
                </div>
              )}

              {payMode === "card" && (
                <input
                  className="w-full mb-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 placeholder:text-gray-300"
                  placeholder="رقم مرجع العملية (اختياري)"
                  value={cardRef}
                  onChange={e => setCardRef(e.target.value)}
                  dir="ltr"
                />
              )}

              {payMode === "bank_transfer" && (
                <input
                  className="w-full mb-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 placeholder:text-gray-300"
                  placeholder="رقم مرجع التحويل (اختياري)"
                  value={bankRef}
                  onChange={e => setBankRef(e.target.value)}
                  dir="ltr"
                />
              )}

              {payMode === "mixed" && (
                <div className="space-y-2 mb-3">
                  {mixedPayments.map((pay, i) => (
                    <div key={i} className="flex gap-2">
                      <select
                        className="bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs outline-none focus:border-brand-300"
                        value={pay.method}
                        onChange={e => setMixedPayments(prev => prev.map((p, idx) => idx === i ? { ...p, method: e.target.value as any } : p))}
                      >
                        <option value="cash">نقد</option>
                        <option value="card">بطاقة</option>
                        <option value="mada">مدى</option>
                        <option value="apple_pay">Apple Pay</option>
                        <option value="bank_transfer">تحويل</option>
                      </select>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 tabular-nums"
                        placeholder="المبلغ"
                        value={pay.amount}
                        onChange={e => setMixedPayments(prev => prev.map((p, idx) => idx === i ? { ...p, amount: normalizeNumeric(e.target.value) } : p))}
                        dir="ltr"
                      />
                      {mixedPayments.length > 2 && (
                        <button onClick={() => setMixedPayments(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-gray-300 hover:text-red-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setMixedPayments(prev => [...prev, { method: "cash", amount: "" }])}
                      className="text-xs text-brand-500 hover:text-brand-700"
                    >
                      + أضف طريقة
                    </button>
                    <span className={clsx(
                      "text-xs font-bold tabular-nums px-2 py-1 rounded-lg",
                      Math.abs(mixedRemaining) < 0.05 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    )}>
                      {Math.abs(mixedRemaining) < 0.05 ? "مغطّى" : `متبقي: ${fmt(mixedRemaining)} ر.س`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="p-3 space-y-2 border-t border-gray-100 shrink-0">
              {/* Complete sale — primary CTA */}
              <button
                onClick={handleCompleteSale}
                disabled={!canComplete() || completing}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-500/30 active:scale-[0.98]"
              >
                {completing ? (
                  <span className="text-sm">جاري المعالجة...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{cart.length > 0 ? `إتمام البيع — ${fmt(total)} ر.س` : "إتمام البيع"}</span>
                  </>
                )}
              </button>

              {/* Split bill */}
              <button
                onClick={() => setShowSplit(true)}
                disabled={cart.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-gray-200 text-gray-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-semibold"
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                تقسيم الفاتورة
              </button>
            </div>

          </div>{/* end cart panel */}
        </div>
      )}

      {/* Split bill modal */}
      {showSplit && (
        <SplitBillModal
          cart={cart}
          total={total}
          onConfirm={handleSplitConfirm}
          onClose={() => setShowSplit(false)}
        />
      )}

      {/* Receipt modal */}
      {saleResult && (
        <ReceiptModal
          result={saleResult}
          orgName={orgProfile?.name || "ترميز OS"}
          onClose={handleReceiptClose}
          hasNextPart={splitResults.length > 0 && splitReceiptIdx < splitResults.length - 1}
          currentPart={splitResults.length > 0 ? splitReceiptIdx + 1 : undefined}
          totalParts={splitResults.length > 0 ? splitResults.length : undefined}
        />
      )}

    </div>
  );
}
