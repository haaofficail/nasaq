import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { eventsApi } from "@/lib/api";
import {
  FileText, Plus, X, ChevronRight, Trash2, CheckCircle2,
  Send, ClipboardList, BarChart3, Calendar, Users, MapPin,
  Tag, Clock, AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft:    { label: "مسودة",    cls: "bg-gray-100 text-gray-600" },
  sent:     { label: "مُرسل",    cls: "bg-blue-50 text-blue-600" },
  accepted: { label: "مقبول",   cls: "bg-green-50 text-green-700" },
  rejected: { label: "مرفوض",   cls: "bg-red-50 text-red-600" },
  expired:  { label: "منتهي",   cls: "bg-orange-50 text-orange-600" },
};

const PHASE_MAP: Record<string, string> = {
  pre_event: "قبل الفعالية",
  day_of:    "يوم الفعالية",
  post_event: "بعد الفعالية",
};

const TASK_STATUS_MAP: Record<string, { label: string; cls: string; icon: any }> = {
  pending:     { label: "قيد الانتظار", cls: "bg-gray-100 text-gray-600",   icon: Clock },
  in_progress: { label: "جارٍ",         cls: "bg-blue-50 text-blue-600",    icon: BarChart3 },
  done:        { label: "مكتمل",        cls: "bg-green-50 text-green-700",  icon: CheckCircle2 },
  blocked:     { label: "معلق",         cls: "bg-red-50 text-red-600",      icon: AlertTriangle },
};

const ITEM_CATEGORIES = ["قاعة", "تموين", "ترفيه", "تزيين", "طاقم", "أفراح", "مرئي وصوتي", "أخرى"];
const TASK_CATEGORIES = ["إعداد", "تموين", "صوت وصورة", "تزيين", "أمن", "تنظيف", "إداري", "أخرى"];

const inp = "w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300";
const btn = "px-4 py-2 rounded-xl text-sm font-medium transition-colors";

function fmt(n: number | string) {
  return Number(n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 });
}

// ─── Modal ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={clsx("bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] overflow-y-auto", wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="flex items-center justify-between p-5 border-b border-[#eef2f6] sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Quotation Form ─────────────────────────────────────────────────────────
const EMPTY_Q = {
  clientName: "", clientPhone: "", clientEmail: "", title: "",
  eventDate: "", eventVenue: "", guestCount: "", notes: "",
  discountAmount: "0", vatRate: "15", depositRequired: "0",
  validUntil: "", paymentTerms: "",
};
const EMPTY_ITEM = { description: "", category: "", qty: "1", unitPrice: "", notes: "" };

function QuotationForm({ initial, onSave, onClose }: { initial?: any; onSave: (d: any) => Promise<void>; onClose: () => void }) {
  const [form, setForm]   = useState({ ...EMPTY_Q, ...initial });
  const [items, setItems] = useState<any[]>(initial?.items || [{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 1) * (Number(it.unitPrice) || 0), 0);
  const afterDiscount = subtotal - (Number(form.discountAmount) || 0);
  const vatAmount = afterDiscount * (Number(form.vatRate) || 0) / 100;
  const total = afterDiscount + vatAmount;

  const updateItem = (idx: number, k: string, v: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it));
  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.clientName || !form.title) { toast.error("يرجى ملء الحقول المطلوبة"); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        guestCount:     form.guestCount ? Number(form.guestCount) : null,
        discountAmount: Number(form.discountAmount) || 0,
        vatRate:        Number(form.vatRate) || 15,
        depositRequired:Number(form.depositRequired) || 0,
        items: items.filter(it => it.description && it.unitPrice).map((it, idx) => ({
          description: it.description,
          category:    it.category || null,
          qty:         Number(it.qty) || 1,
          unitPrice:   Number(it.unitPrice) || 0,
          notes:       it.notes || null,
          sortOrder:   idx,
        })),
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Client info */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">معلومات العميل</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">اسم العميل *</label>
            <input className={inp} value={form.clientName} onChange={f("clientName")} placeholder="محمد العتيبي" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">رقم الجوال</label>
            <input className={inp} value={form.clientPhone} onChange={f("clientPhone")} placeholder="05xxxxxxxx" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">البريد الإلكتروني</label>
            <input className={inp} type="email" value={form.clientEmail} onChange={f("clientEmail")} />
          </div>
        </div>
      </div>

      {/* Event details */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">تفاصيل الفعالية</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">اسم العرض / العنوان *</label>
            <input className={inp} value={form.title} onChange={f("title")} placeholder="عرض سعر حفل زفاف" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">تاريخ الفعالية</label>
              <input className={inp} type="date" value={form.eventDate} onChange={f("eventDate")} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">عدد الضيوف</label>
              <input className={inp} type="number" value={form.guestCount} onChange={f("guestCount")} placeholder="200" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">صالح حتى</label>
              <input className={inp} type="date" value={form.validUntil} onChange={f("validUntil")} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">مكان الفعالية</label>
            <input className={inp} value={form.eventVenue} onChange={f("eventVenue")} placeholder="قصر الأفراح النخيل" />
          </div>
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">بنود العرض</h4>
          <button onClick={addItem} className="text-brand-600 text-xs hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> إضافة بند
          </button>
        </div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <input className={inp} value={it.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="وصف الخدمة" />
              </div>
              <div className="col-span-2">
                <select className={inp} value={it.category} onChange={e => updateItem(idx, "category", e.target.value)}>
                  <option value="">الفئة</option>
                  {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <input className={inp} type="number" min="1" value={it.qty} onChange={e => updateItem(idx, "qty", e.target.value)} placeholder="الكمية" />
              </div>
              <div className="col-span-2">
                <input className={inp} type="number" min="0" value={it.unitPrice} onChange={e => updateItem(idx, "unitPrice", e.target.value)} placeholder="السعر" />
              </div>
              <div className="col-span-1 text-sm text-gray-600 text-center">
                {fmt((Number(it.qty) || 1) * (Number(it.unitPrice) || 0))}
              </div>
              <div className="col-span-1">
                <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed border-[#eef2f6] rounded-xl">
              اضغط على "إضافة بند" لإضافة خدمات العرض
            </p>
          )}
        </div>
      </div>

      {/* Pricing summary */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>المجموع الفرعي</span><span>{fmt(subtotal)} ر.س</span>
        </div>
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>الخصم</span>
          <input className="w-24 border border-[#eef2f6] rounded-lg px-2 py-1 text-sm text-left" type="number" min="0" value={form.discountAmount} onChange={f("discountAmount")} />
        </div>
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>نسبة الضريبة %</span>
          <input className="w-16 border border-[#eef2f6] rounded-lg px-2 py-1 text-sm text-left" type="number" min="0" max="100" value={form.vatRate} onChange={f("vatRate")} />
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>الضريبة</span><span>{fmt(vatAmount)} ر.س</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-[#eef2f6]">
          <span>الإجمالي</span><span>{fmt(total)} ر.س</span>
        </div>
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>الدفعة الأولى المطلوبة</span>
          <input className="w-28 border border-[#eef2f6] rounded-lg px-2 py-1 text-sm text-left" type="number" min="0" value={form.depositRequired} onChange={f("depositRequired")} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">شروط الدفع</label>
        <textarea className={inp} rows={2} value={form.paymentTerms} onChange={f("paymentTerms")} placeholder="الدفعة الأولى 50% عند التوقيع، والباقي قبل الفعالية بأسبوع" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">ملاحظات</label>
        <textarea className={inp} rows={2} value={form.notes} onChange={f("notes")} />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className={clsx(btn, "flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200")}>إلغاء</button>
        <button onClick={handleSave} disabled={saving} className={clsx(btn, "flex-1 bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50")}>
          {saving ? "جاري الحفظ..." : "حفظ العرض"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export function EventQuotationsPage() {
  const [tab, setTab]           = useState<"quotations" | "execution">("quotations");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createModal, setCreateModal]   = useState(false);
  const [editModal, setEditModal]       = useState<any>(null);
  const [detailQ, setDetailQ]           = useState<any>(null);
  const [taskModal, setTaskModal]       = useState(false);
  const [taskForm, setTaskForm]         = useState({ title: "", category: "", assignedTo: "", dueDate: "", eventPhase: "pre_event", description: "", notes: "" });
  const [phaseFilter, setPhaseFilter]   = useState("all");
  const [statusTaskFilter, setStatusTaskFilter] = useState("all");

  const { data: qData, loading: qLoading, refetch: refetchQ } = useApi(() => eventsApi.quotations(), []);
  const { data: detailData, refetch: refetchDetail }           = useApi(
    () => detailQ ? eventsApi.getQuotation(detailQ.id) : Promise.resolve(null),
    [detailQ?.id]
  );
  const { data: tasksData, loading: tasksLoading, refetch: refetchTasks } = useApi(() => eventsApi.executionTasks(), []);

  const createQ  = useMutation((d: any) => eventsApi.createQuotation(d));
  const updateQ  = useMutation(({ id, d }: any) => eventsApi.updateQuotation(id, d));
  const deleteQ  = useMutation((id: string) => eventsApi.deleteQuotation(id));
  const setStatus = useMutation(({ id, status }: any) => eventsApi.updateQuotationStatus(id, status));
  const createTask = useMutation((d: any) => eventsApi.createTask(d));
  const updateTask = useMutation(({ id, d }: any) => eventsApi.updateTask(id, d));
  const deleteTask = useMutation((id: string) => eventsApi.deleteTask(id));

  const quotations = (qData?.data || []).filter((q: any) =>
    statusFilter === "all" || q.status === statusFilter
  );
  const tasks = (tasksData?.data || []).filter((t: any) => {
    const matchPhase  = phaseFilter === "all" || t.event_phase === phaseFilter;
    const matchStatus = statusTaskFilter === "all" || t.status === statusTaskFilter;
    return matchPhase && matchStatus;
  });

  const handleCreateQ = async (d: any) => {
    await createQ.mutate(d);
    toast.success("تم إنشاء عرض السعر");
    setCreateModal(false);
    refetchQ();
  };
  const handleUpdateQ = async (d: any) => {
    await updateQ.mutate({ id: editModal.id, d });
    toast.success("تم تحديث عرض السعر");
    setEditModal(null);
    refetchQ();
    if (detailQ?.id === editModal.id) refetchDetail();
  };
  const handleDeleteQ = async (id: string) => {
    if (!confirm("تأكيد الحذف؟")) return;
    await deleteQ.mutate(id);
    toast.success("تم الحذف");
    if (detailQ?.id === id) setDetailQ(null);
    refetchQ();
  };
  const handleStatusChange = async (id: string, status: string) => {
    await setStatus.mutate({ id, status });
    toast.success("تم تحديث الحالة");
    refetchQ();
    if (detailQ?.id === id) refetchDetail();
  };
  const handleCreateTask = async () => {
    if (!taskForm.title) { toast.error("يرجى إدخال عنوان المهمة"); return; }
    await createTask.mutate({ ...taskForm, dueDate: taskForm.dueDate ? taskForm.dueDate + "T00:00:00Z" : null });
    toast.success("تم إضافة المهمة");
    setTaskModal(false);
    setTaskForm({ title: "", category: "", assignedTo: "", dueDate: "", eventPhase: "pre_event", description: "", notes: "" });
    refetchTasks();
  };
  const handleTaskStatus = async (id: string, status: string) => {
    await updateTask.mutate({ id, d: { status } });
    refetchTasks();
  };
  const handleDeleteTask = async (id: string) => {
    if (!confirm("تأكيد الحذف؟")) return;
    await deleteTask.mutate(id);
    toast.success("تم الحذف");
    refetchTasks();
  };

  const tf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setTaskForm((p: any) => ({ ...p, [k]: e.target.value }));

  const qDetail = detailData?.data;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الفعاليات والعروض</h1>
          <p className="text-sm text-gray-500 mt-1">عروض الأسعار، العقود، تتبع التنفيذ</p>
        </div>
        <button
          onClick={() => tab === "quotations" ? setCreateModal(true) : setTaskModal(true)}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" />
          {tab === "quotations" ? "عرض سعر جديد" : "مهمة جديدة"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f1f5f9] rounded-xl p-1 w-fit">
        {[
          { id: "quotations", label: "عروض الأسعار", icon: FileText },
          { id: "execution",  label: "تتبع التنفيذ",  icon: ClipboardList },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === t.id ? "bg-white text-brand-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Quotations ─────────────────────────────────────── */}
      {tab === "quotations" && (
        <div className="grid grid-cols-3 gap-6">
          {/* List */}
          <div className="col-span-1 space-y-4">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {["all", "draft", "sent", "accepted", "rejected"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    statusFilter === s ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-[#eef2f6] hover:border-brand-300"
                  )}
                >
                  {s === "all" ? "الكل" : STATUS_MAP[s]?.label}
                </button>
              ))}
            </div>

            {/* Cards */}
            {qLoading ? <SkeletonRows rows={4} /> : quotations.length === 0 ? (
              <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-[#eef2f6]">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد عروض</p>
              </div>
            ) : (
              quotations.map((q: any) => (
                <div
                  key={q.id}
                  onClick={() => setDetailQ(q)}
                  className={clsx(
                    "bg-white rounded-2xl border p-4 cursor-pointer hover:border-brand-200 transition-colors",
                    detailQ?.id === q.id ? "border-brand-400 ring-1 ring-brand-200" : "border-[#eef2f6]"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{q.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{q.client_name} • {q.quotation_number}</p>
                    </div>
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_MAP[q.status]?.cls)}>
                      {STATUS_MAP[q.status]?.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-brand-600">{fmt(q.total)} ر.س</span>
                    {q.event_date && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(q.event_date).toLocaleDateString("ar-SA-u-ca-gregory")}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail panel */}
          <div className="col-span-2">
            {!detailQ ? (
              <div className="bg-white rounded-2xl border border-[#eef2f6] flex items-center justify-center h-96">
                <div className="text-center text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">اختر عرض سعر من القائمة</p>
                </div>
              </div>
            ) : qDetail ? (
              <div className="bg-white rounded-2xl border border-[#eef2f6] p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{qDetail.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">{qDetail.quotation_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={clsx("text-sm px-3 py-1 rounded-full font-medium", STATUS_MAP[qDetail.status]?.cls)}>
                      {STATUS_MAP[qDetail.status]?.label}
                    </span>
                    <button onClick={() => setEditModal({ ...qDetail, items: qDetail.items })} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-[#f8fafc]">
                      <Tag className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteQ(qDetail.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Client + Event info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase">العميل</p>
                    <p className="font-medium text-gray-900">{qDetail.client_name}</p>
                    {qDetail.client_phone && <p className="text-sm text-gray-600">{qDetail.client_phone}</p>}
                    {qDetail.client_email && <p className="text-sm text-gray-500">{qDetail.client_email}</p>}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase">الفعالية</p>
                    {qDetail.event_date && (
                      <p className="text-sm text-gray-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-brand-500" />
                        {new Date(qDetail.event_date).toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    )}
                    {qDetail.event_venue && (
                      <p className="text-sm text-gray-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-500" />{qDetail.event_venue}
                      </p>
                    )}
                    {qDetail.guest_count && (
                      <p className="text-sm text-gray-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-brand-500" />{qDetail.guest_count} ضيف
                      </p>
                    )}
                  </div>
                </div>

                {/* Items */}
                {qDetail.items?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">بنود العرض</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b border-[#eef2f6]">
                            <th className="text-right pb-2 font-medium">الوصف</th>
                            <th className="pb-2 font-medium w-20 text-center">الكمية</th>
                            <th className="pb-2 font-medium w-28 text-center">سعر الوحدة</th>
                            <th className="pb-2 font-medium w-28 text-center">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {qDetail.items.map((it: any) => (
                            <tr key={it.id}>
                              <td className="py-2">
                                <p className="font-medium text-gray-800">{it.description}</p>
                                {it.category && <p className="text-xs text-gray-400">{it.category}</p>}
                              </td>
                              <td className="py-2 text-center text-gray-600">{it.qty}</td>
                              <td className="py-2 text-center text-gray-600">{fmt(it.unit_price)} ر.س</td>
                              <td className="py-2 text-center font-medium text-gray-800">{fmt(it.total_price)} ر.س</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="border-t border-[#eef2f6] pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>المجموع الفرعي</span><span>{fmt(qDetail.subtotal)} ر.س</span>
                  </div>
                  {Number(qDetail.discount_amount) > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>الخصم</span><span>-{fmt(qDetail.discount_amount)} ر.س</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>ضريبة القيمة المضافة ({qDetail.vat_rate}%)</span><span>{fmt(qDetail.vat_amount)} ر.س</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-[#eef2f6]">
                    <span>الإجمالي</span><span className="text-brand-600">{fmt(qDetail.total)} ر.س</span>
                  </div>
                  {Number(qDetail.deposit_required) > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>الدفعة الأولى</span><span>{fmt(qDetail.deposit_required)} ر.س</span>
                    </div>
                  )}
                </div>

                {qDetail.payment_terms && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-700 mb-1">شروط الدفع</p>
                    <p className="text-sm text-blue-800">{qDetail.payment_terms}</p>
                  </div>
                )}

                {/* Status actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {qDetail.status === "draft" && (
                    <button onClick={() => handleStatusChange(qDetail.id, "sent")} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                      <Send className="w-3.5 h-3.5" /> إرسال للعميل
                    </button>
                  )}
                  {qDetail.status === "sent" && (
                    <>
                      <button onClick={() => handleStatusChange(qDetail.id, "accepted")} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> وافق العميل
                      </button>
                      <button onClick={() => handleStatusChange(qDetail.id, "rejected")} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                        <X className="w-3.5 h-3.5" /> رفض العميل
                      </button>
                    </>
                  )}
                  {(qDetail.status === "sent" || qDetail.status === "accepted") && (
                    <button onClick={() => setEditModal({ ...qDetail, items: qDetail.items })} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
                      <Tag className="w-3.5 h-3.5" /> تعديل العرض
                    </button>
                  )}
                  {qDetail.status === "accepted" && (
                    <button
                      onClick={() => { setTab("execution"); }}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700"
                    >
                      <ClipboardList className="w-3.5 h-3.5" /> متابعة التنفيذ
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#eef2f6] flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-300 text-sm">جاري التحميل...</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Execution tasks ────────────────────────────────── */}
      {tab === "execution" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-2">
              {["all", "pre_event", "day_of", "post_event"].map(p => (
                <button key={p} onClick={() => setPhaseFilter(p)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  phaseFilter === p ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-[#eef2f6] hover:border-brand-300"
                )}>
                  {p === "all" ? "كل المراحل" : PHASE_MAP[p]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {["all", "pending", "in_progress", "done", "blocked"].map(s => (
                <button key={s} onClick={() => setStatusTaskFilter(s)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  statusTaskFilter === s ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-[#eef2f6] hover:border-gray-400"
                )}>
                  {s === "all" ? "الكل" : TASK_STATUS_MAP[s]?.label}
                </button>
              ))}
            </div>
          </div>

          {tasksLoading ? <SkeletonRows rows={5} /> : tasks.length === 0 ? (
            <div className="text-center text-gray-400 py-16 bg-white rounded-2xl border border-[#eef2f6]">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد مهام تنفيذ</p>
              <button onClick={() => setTaskModal(true)} className="mt-3 text-brand-600 text-sm hover:underline">إضافة مهمة</button>
            </div>
          ) : (
            <div className="grid gap-3">
              {["pre_event", "day_of", "post_event"].map(phase => {
                const phaseTasks = tasks.filter((t: any) => t.event_phase === phase);
                if (phaseTasks.length === 0 && phaseFilter !== "all" && phaseFilter !== phase) return null;
                if (phaseTasks.length === 0) return null;
                return (
                  <div key={phase}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-400" />
                      {PHASE_MAP[phase]} ({phaseTasks.length})
                    </h3>
                    <div className="grid gap-2">
                      {phaseTasks.map((t: any) => {
                        const sm = TASK_STATUS_MAP[t.status];
                        const Icon = sm?.icon || Clock;
                        return (
                          <div key={t.id} className="bg-white rounded-2xl border border-[#eef2f6] p-4 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={clsx("p-1.5 rounded-lg mt-0.5", sm?.cls)}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm">{t.title}</p>
                                {t.assigned_to && <p className="text-xs text-gray-500 mt-0.5">{t.assigned_to}</p>}
                                {t.description && <p className="text-xs text-gray-400 mt-1">{t.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {t.category && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{t.category}</span>}
                              <select
                                value={t.status}
                                onChange={e => handleTaskStatus(t.id, e.target.value)}
                                className="text-xs border border-[#eef2f6] rounded-lg px-2 py-1 outline-none focus:border-brand-300"
                              >
                                {Object.entries(TASK_STATUS_MAP).map(([k, v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                              <button onClick={() => handleDeleteTask(t.id)} className="text-red-300 hover:text-red-500 p-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────── */}
      {createModal && (
        <Modal title="عرض سعر جديد" onClose={() => setCreateModal(false)} wide>
          <QuotationForm onSave={handleCreateQ} onClose={() => setCreateModal(false)} />
        </Modal>
      )}

      {editModal && (
        <Modal title="تعديل عرض السعر" onClose={() => setEditModal(null)} wide>
          <QuotationForm
            initial={editModal}
            onSave={handleUpdateQ}
            onClose={() => setEditModal(null)}
          />
        </Modal>
      )}

      {taskModal && (
        <Modal title="إضافة مهمة تنفيذ" onClose={() => setTaskModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">عنوان المهمة *</label>
              <input className={inp} value={taskForm.title} onChange={tf("title")} placeholder="تجهيز القاعة" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">الفئة</label>
                <select className={inp} value={taskForm.category} onChange={tf("category")}>
                  <option value="">اختر...</option>
                  {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">المرحلة</label>
                <select className={inp} value={taskForm.eventPhase} onChange={tf("eventPhase")}>
                  {Object.entries(PHASE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">المسؤول</label>
                <input className={inp} value={taskForm.assignedTo} onChange={tf("assignedTo")} placeholder="اسم الموظف" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">الموعد</label>
                <input className={inp} type="date" value={taskForm.dueDate} onChange={tf("dueDate")} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">وصف</label>
              <textarea className={inp} rows={2} value={taskForm.description} onChange={tf("description")} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setTaskModal(false)} className={clsx(btn, "flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200")}>إلغاء</button>
              <button onClick={handleCreateTask} className={clsx(btn, "flex-1 bg-brand-600 text-white hover:bg-brand-700")}>إضافة المهمة</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
