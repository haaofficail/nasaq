import { useState } from "react";
import {
  CheckCircle2, AlertCircle, Plus, Trash2, Loader2,
  Scale, ChevronDown, ChevronLeft, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { reconciliationApi } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select, TextArea } from "@/components/ui";

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  bank: "تسوية بنكية",
  cash: "تسوية صندوق",
  ar:   "تسوية ذمم عملاء",
  ap:   "تسوية ذمم موردين",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:       { label: "مسودة",        color: "bg-gray-100 text-gray-600" },
  in_progress: { label: "قيد التسوية",  color: "bg-amber-50 text-amber-600" },
  completed:   { label: "مكتملة",       color: "bg-emerald-50 text-emerald-600" },
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  outstanding_check:  "شيك غير محصل",
  deposit_in_transit: "إيداع في الطريق",
  bank_charge:        "رسوم بنكية",
  bank_interest:      "فوائد بنكية",
  nsf_check:          "شيك مرتجع",
  error_correction:   "تصحيح خطأ",
  other:              "أخرى",
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const ITEM_TYPE_OPTIONS = Object.entries(ITEM_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const SIDE_OPTIONS = [
  { value: "book",     label: "يعدِّل رصيد الدفاتر (رسوم بنك، فوائد، أخطاء دفترية)" },
  { value: "external", label: "يعدِّل الرصيد الخارجي (شيكات معلقة، إيداعات في الطريق)" },
];

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ────────────────────────────────────────────────────────────
// Create Statement Modal
// ────────────────────────────────────────────────────────────

interface CreateForm {
  type: string;
  periodStart: string;
  periodEnd: string;
  bookBalance: string;
  externalBalance: string;
  notes: string;
}

function CreateModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [form, setForm] = useState<CreateForm>({
    type: "bank", periodStart: firstOfMonth, periodEnd: today,
    bookBalance: "", externalBalance: "", notes: "",
  });
  const { mutate, loading } = useMutation((data: any) => reconciliationApi.create(data));

  const set = (k: keyof CreateForm) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    await mutate({
      type:            form.type,
      periodStart:     form.periodStart,
      periodEnd:       form.periodEnd,
      bookBalance:     parseFloat(form.bookBalance || "0"),
      externalBalance: parseFloat(form.externalBalance || "0"),
      notes:           form.notes || null,
    });
    onCreated();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="كشف تسوية جديد" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={loading}>إنشاء</Button>
        </>
      }>
      <div className="space-y-4">
        <Select label="نوع التسوية" name="type" value={form.type} onChange={set("type")} options={TYPE_OPTIONS} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="من تاريخ" name="from" type="date" value={form.periodStart} onChange={set("periodStart")} dir="ltr" />
          <Input label="إلى تاريخ" name="to" type="date" value={form.periodEnd} onChange={set("periodEnd")} dir="ltr" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="رصيد الدفاتر" name="book" type="number" value={form.bookBalance} onChange={set("bookBalance")} suffix="ر.س" dir="ltr" />
          <Input label="الرصيد الخارجي (البنك)" name="ext" type="number" value={form.externalBalance} onChange={set("externalBalance")} suffix="ر.س" dir="ltr" />
        </div>
        <TextArea label="ملاحظات" name="notes" value={form.notes} onChange={set("notes")} rows={2} />
      </div>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Add Item Modal
// ────────────────────────────────────────────────────────────

function AddItemModal({ statementId, open, onClose, onAdded }: {
  statementId: string; open: boolean; onClose: () => void; onAdded: () => void;
}) {
  const [form, setForm] = useState({
    itemType: "bank_charge", description: "", amount: "", adjustsSide: "book", reference: "",
  });
  const { mutate, loading } = useMutation((data: any) => reconciliationApi.addItem(statementId, data));
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    await mutate({
      itemType: form.itemType, description: form.description,
      amount: parseFloat(form.amount || "0"), adjustsSide: form.adjustsSide,
      reference: form.reference || null,
    });
    onAdded();
    onClose();
    setForm({ itemType: "bank_charge", description: "", amount: "", adjustsSide: "book", reference: "" });
  };

  return (
    <Modal open={open} onClose={onClose} title="إضافة بند تسوية" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={loading}>إضافة</Button>
        </>
      }>
      <div className="space-y-4">
        <Select label="نوع البند" name="it" value={form.itemType} onChange={set("itemType")} options={ITEM_TYPE_OPTIONS} />
        <Input label="الوصف" name="desc" value={form.description} onChange={set("description")} required />
        <Input label="المبلغ (موجب يزيد / سالب ينقص)" name="amount" type="number" value={form.amount} onChange={set("amount")} suffix="ر.س" dir="ltr" />
        <Select label="يعدِّل" name="side" value={form.adjustsSide} onChange={set("adjustsSide")} options={SIDE_OPTIONS} />
        <Input label="المرجع (اختياري)" name="ref" value={form.reference} onChange={set("reference")} />
      </div>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Statement Detail View
// ────────────────────────────────────────────────────────────

function StatementDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [showAddItem, setShowAddItem] = useState(false);
  const { data, loading, refetch } = useApi(() => reconciliationApi.get(id), [id]);
  const { mutate: completeStmt, loading: completing } = useMutation((_: void) => reconciliationApi.complete(id));
  const { mutate: removeItem } = useMutation((itemId: string) => reconciliationApi.deleteItem(id, itemId));

  const s = data?.data;
  const computed = s?.computed ?? {};

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
    </div>
  );
  if (!s) return null;

  const isCompleted = s.status === "completed";

  const handleComplete = async () => {
    try {
      await completeStmt();
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    await removeItem(itemId);
    refetch();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{TYPE_LABELS[s.type]}</h1>
            <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_LABELS[s.status]?.color)}>
              {STATUS_LABELS[s.status]?.label}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {fmtDate(s.periodStart)} — {fmtDate(s.periodEnd)}
          </p>
        </div>
        {!isCompleted && (
          <div className="flex gap-2">
            <Button variant="secondary" icon={Plus} onClick={() => setShowAddItem(true)}>إضافة بند</Button>
            <Button
              onClick={handleComplete}
              loading={completing}
              disabled={!computed.isBalanced}>
              إتمام التسوية
            </Button>
          </div>
        )}
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "رصيد الدفاتر", value: parseFloat(s.bookBalance), color: "text-gray-900" },
          { label: "الرصيد الخارجي", value: parseFloat(s.externalBalance), color: "text-gray-900" },
          { label: "الرصيد المعدَّل (دفاتر)", value: computed.adjustedBook ?? 0, color: "text-brand-600" },
          {
            label: "الفرق",
            value: Math.abs(computed.difference ?? 0),
            color: computed.isBalanced ? "text-emerald-600" : "text-red-500",
          },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{k.label}</p>
            <p className={clsx("text-lg font-bold tabular-nums", k.color)}>{fmt(k.value)} ر.س</p>
          </div>
        ))}
      </div>

      {/* Balance indicator */}
      <div className={clsx(
        "flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium",
        computed.isBalanced ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      )}>
        {computed.isBalanced
          ? <><CheckCircle2 className="w-4 h-4" /> الكشف متوازن — يمكن إتمام التسوية</>
          : <><AlertCircle className="w-4 h-4" /> الفرق: {fmt(Math.abs(computed.difference ?? 0))} ر.س — أضف بنوداً لتصحيح الفرق</>}
      </div>

      {/* Items by side */}
      {(["book", "external"] as const).map((side) => {
        const items = (s.items ?? []).filter((i: any) => i.adjustsSide === side);
        const sideTotal = items.reduce((sum: number, i: any) => sum + parseFloat(i.amount), 0);
        const sideLabel = side === "book" ? "تسويات رصيد الدفاتر" : "تسويات الرصيد الخارجي";

        return (
          <div key={side} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">{sideLabel}</p>
              <span className="text-sm font-bold tabular-nums text-gray-700">{fmt(sideTotal)} ر.س</span>
            </div>
            {items.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">لا توجد بنود</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">النوع</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الوصف</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">المرجع</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">المبلغ</th>
                    {!isCompleted && <th className="py-2.5 px-4" />}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40">
                      <td className="py-3 px-4">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-800">{item.description}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs font-mono">{item.reference || "—"}</td>
                      <td className={clsx("py-3 px-4 font-bold tabular-nums",
                        parseFloat(item.amount) >= 0 ? "text-emerald-600" : "text-red-500")}>
                        {parseFloat(item.amount) >= 0 ? "+" : ""}{fmt(parseFloat(item.amount))} ر.س
                      </td>
                      {!isCompleted && (
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      <AddItemModal
        statementId={id}
        open={showAddItem}
        onClose={() => setShowAddItem(false)}
        onAdded={refetch}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// List View
// ────────────────────────────────────────────────────────────

function StatementList({ onSelect }: { onSelect: (id: string) => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const { data, loading, refetch } = useApi(
    () => reconciliationApi.list(typeFilter ? { type: typeFilter } : undefined),
    [typeFilter]
  );

  const statements = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">التسويات</h1>
          <p className="text-sm text-gray-400 mt-0.5">تسوية بنكية، نقدية، ذمم عملاء وموردين</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>كشف تسوية جديد</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: "", label: "الكل" }, ...TYPE_OPTIONS].map((opt) => (
          <button key={opt.value}
            onClick={() => setTypeFilter(opt.value)}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all",
              typeFilter === opt.value
                ? "bg-brand-500 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-brand-300"
            )}>
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : statements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Scale className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">لا توجد كشوف تسوية</p>
          <Button className="mt-4" icon={Plus} onClick={() => setShowCreate(true)}>إنشاء أول كشف</Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold">النوع</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الفترة</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">رصيد الدفاتر</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الرصيد الخارجي</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الفرق النهائي</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {statements.map((s: any) => (
                <tr key={s.id}
                  onClick={() => onSelect(s.id)}
                  className="border-b border-gray-50 last:border-0 hover:bg-brand-50/40 cursor-pointer transition-colors">
                  <td className="py-3.5 px-5 font-medium text-gray-900">{TYPE_LABELS[s.type] ?? s.type}</td>
                  <td className="py-3.5 px-4 text-gray-500 text-xs">
                    {fmtDate(s.periodStart)} — {fmtDate(s.periodEnd)}
                  </td>
                  <td className="py-3.5 px-4 tabular-nums text-gray-700">{fmt(parseFloat(s.bookBalance))} ر.س</td>
                  <td className="py-3.5 px-4 tabular-nums text-gray-700">{fmt(parseFloat(s.externalBalance))} ر.س</td>
                  <td className="py-3.5 px-4 tabular-nums">
                    {s.finalDifference != null ? (
                      <span className={Math.abs(parseFloat(s.finalDifference)) < 0.01 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                        {fmt(Math.abs(parseFloat(s.finalDifference)))} ر.س
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_LABELS[s.status]?.color)}>
                      {STATUS_LABELS[s.status]?.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refetch}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────

export function ReconciliationPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return selectedId
    ? <StatementDetail id={selectedId} onBack={() => setSelectedId(null)} />
    : <StatementList onSelect={setSelectedId} />;
}
