import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowRight, Pencil, Trash2, Package, Star, CalendarCheck, Banknote,
  Loader2, AlertCircle, Copy, Eye, Plus, ChevronUp, ChevronDown, Save, HelpCircle, Settings2,
  Boxes, Wrench, FlaskConical, TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";
import { servicesApi, questionsApi, inventoryApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { EditServiceForm } from "@/components/services/EditServiceForm";
import { Modal, Input, TextArea, Select, Button, Toggle, Toast } from "@/components/ui";

type Tab = "info" | "questions" | "booking-settings" | "components";

const QUESTION_TYPES = [
  { value: "text", label: "نص قصير" },
  { value: "textarea", label: "نص طويل" },
  { value: "select", label: "قائمة اختيار" },
  { value: "multi", label: "اختيار متعدد" },
  { value: "number", label: "رقم" },
  { value: "date", label: "تاريخ" },
];

const EMPTY_Q = {
  question: "",
  questionEn: "",
  type: "text",
  options: [] as string[],
  isRequired: false,
  price: 0,
};

export function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("info");

  const { data: res, loading, error, refetch } = useApi(() => servicesApi.get(id!), [id]);
  const { data: qRes, refetch: refetchQ } = useApi(() => questionsApi.list(id!), [id]);
  const { data: compRes, refetch: refetchComp } = useApi(() => servicesApi.getComponents(id!), [id]);
  const { data: assetTypesRes } = useApi(() => inventoryApi.assetTypes());
  const assetTypes: any[] = assetTypesRes?.data ?? [];
  const { mutate: deleteService, loading: deleting } = useMutation((sid: string) => servicesApi.delete(sid));
  const { mutate: duplicateService } = useMutation((sid: string) => servicesApi.duplicate(sid));

  const service = res?.data;
  const questions = qRes?.data || [];
  const components: any[] = compRes?.data ?? [];
  const componentsTotalCost: number = compRes?.totalCost ?? 0;

  // Components state
  const COMP_DEFAULT = { sourceType: "manual", inventoryItemId: "", name: "", description: "", quantity: 1, unit: "حبة", unitCost: 0, isOptional: false, showToCustomer: true };
  const [compModal, setCompModal] = useState<{ open: boolean; item?: any } | null>(null);
  const [compForm, setCompForm] = useState<any>(COMP_DEFAULT);
  const [compSaving, setCompSaving] = useState(false);

  const openAddComp = () => { setCompForm({ ...COMP_DEFAULT }); setCompModal({ open: true }); };
  const openEditComp = (c: any) => {
    setCompForm({
      sourceType: c.sourceType ?? "manual",
      inventoryItemId: c.inventoryItemId ?? "",
      name: c.name ?? "",
      description: c.description ?? "",
      quantity: Number(c.quantity ?? 1),
      unit: c.unit ?? "حبة",
      unitCost: Number(c.unitCost ?? 0),
      isOptional: c.isOptional ?? false,
      showToCustomer: c.showToCustomer ?? true,
    });
    setCompModal({ open: true, item: c });
  };

  const handleSaveComp = async () => {
    if (!compForm.name?.trim()) { setToast({ msg: "الاسم مطلوب", type: "error" }); return; }
    setCompSaving(true);
    try {
      const payload = {
        ...compForm,
        inventoryItemId: compForm.inventoryItemId || null,
        quantity: Number(compForm.quantity),
        unitCost: Number(compForm.unitCost),
      };
      if (compModal?.item) {
        await servicesApi.updateComponent(id!, compModal.item.id, payload);
      } else {
        await servicesApi.addComponent(id!, payload);
      }
      setCompModal(null);
      refetchComp();
      setToast({ msg: "تم الحفظ", type: "success" });
    } catch {
      setToast({ msg: "فشل الحفظ", type: "error" });
    } finally {
      setCompSaving(false);
    }
  };

  const handleDeleteComp = async (compId: string) => {
    if (!confirm("حذف هذا المكوّن؟")) return;
    await servicesApi.deleteComponent(id!, compId);
    refetchComp();
    setToast({ msg: "تم الحذف", type: "success" });
  };

  // Custom questions state
  const [showQModal, setShowQModal] = useState(false);
  const [editingQ, setEditingQ] = useState<any>(null);
  const [qForm, setQForm] = useState({ ...EMPTY_Q });
  const [optionInput, setOptionInput] = useState("");
  const [qSaving, setQSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Booking settings state
  const [bsForm, setBsForm] = useState<any>(null);
  const [bsSaving, setBsSaving] = useState(false);

  const updateQ = (field: string, val: any) => setQForm((f) => ({ ...f, [field]: val }));

  const openAddQ = () => {
    setEditingQ(null);
    setQForm({ ...EMPTY_Q });
    setOptionInput("");
    setShowQModal(true);
  };

  const openEditQ = (q: any) => {
    setEditingQ(q);
    setQForm({
      question: q.question || "",
      questionEn: q.question_en || "",
      type: q.type || "text",
      options: q.options || [],
      isRequired: q.is_required || false,
      price: q.price || 0,
    });
    setOptionInput("");
    setShowQModal(true);
  };

  const handleSaveQ = async () => {
    if (!qForm.question.trim()) { setToast({ msg: "نص السؤال مطلوب", type: "error" }); return; }
    setQSaving(true);
    try {
      if (editingQ) {
        await questionsApi.update(editingQ.id, { ...qForm, serviceId: id });
      } else {
        await questionsApi.create(id!, { ...qForm });
      }
      setShowQModal(false);
      refetchQ();
      setToast({ msg: editingQ ? "تم تحديث السؤال" : "تم إضافة السؤال", type: "success" });
    } catch {
      setToast({ msg: "فشل الحفظ", type: "error" });
    } finally {
      setQSaving(false);
    }
  };

  const handleDeleteQ = async (qId: string) => {
    if (!confirm("حذف هذا السؤال؟")) return;
    await questionsApi.delete(qId);
    refetchQ();
    setToast({ msg: "تم الحذف", type: "success" });
  };

  const handleMoveQ = async (idx: number, dir: "up" | "down") => {
    const newQuestions = [...questions];
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= newQuestions.length) return;
    [newQuestions[idx], newQuestions[target]] = [newQuestions[target], newQuestions[idx]];
    const items = newQuestions.map((q: any, i: number) => ({ id: q.id, sortOrder: i }));
    await questionsApi.reorder(items);
    refetchQ();
  };

  const addOption = () => {
    if (optionInput.trim()) {
      updateQ("options", [...qForm.options, optionInput.trim()]);
      setOptionInput("");
    }
  };

  const removeOption = (i: number) => {
    updateQ("options", qForm.options.filter((_: any, idx: number) => idx !== i));
  };

  // Initialize booking settings when service loads
  const initBS = (svc: any) => ({
    allowLateBooking: svc.allow_late_booking ?? true,
    bufferMinutes: svc.buffer_minutes ?? 0,
    maxConcurrentBookings: svc.max_concurrent_bookings ?? 1,
    fullDayBooking: svc.full_day_booking ?? true,
    advanceBookingDays: svc.advance_booking_days ?? 365,
    allowProviderSelection: svc.allow_provider_selection ?? false,
  });

  const handleSaveBS = async () => {
    if (!bsForm) return;
    setBsSaving(true);
    try {
      await servicesApi.update(id!, bsForm);
      setToast({ msg: "تم حفظ الإعدادات", type: "success" });
      refetch();
    } catch {
      setToast({ msg: "فشل الحفظ", type: "error" });
    } finally {
      setBsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("حذف هذه الخدمة؟")) return;
    await deleteService(id!);
    navigate("/services");
  };

  const handleDuplicate = async () => { await duplicateService(id!); navigate("/services"); };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /><span className="mr-3 text-gray-500">جاري التحميل...</span></div>;
  if (error) return <div className="flex flex-col items-center justify-center h-64 gap-3"><AlertCircle className="w-10 h-10 text-red-400" /><p className="text-red-500">{error}</p><button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button></div>;
  if (!service) return <div className="text-center py-12 text-gray-500">الخدمة غير موجودة</div>;

  // Init bsForm lazily
  if (!bsForm && service) {
    setBsForm(initBS(service));
  }

  const statusConfig: Record<string, { label: string; cls: string }> = {
    active: { label: "نشطة", cls: "bg-green-50 text-green-600" },
    draft: { label: "مسودة", cls: "bg-gray-100 text-gray-500" },
    paused: { label: "معلقة", cls: "bg-amber-50 text-amber-600" },
  };
  const sc = statusConfig[service.status] || statusConfig.draft;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "info", label: "معلومات الخدمة", icon: Package },
    { key: "components", label: "المكونات والتكاليف", icon: Boxes },
    { key: "questions", label: "أسئلة مخصصة", icon: HelpCircle },
    { key: "booking-settings", label: "إعدادات الحجز", icon: Settings2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/services" className="p-2 rounded-lg hover:bg-gray-100"><ArrowRight className="w-5 h-5 text-gray-400" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
          <p className="text-sm text-gray-500">{service.categoryName || "بدون تصنيف"}</p>
        </div>
        <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", sc.cls)}>{sc.label}</span>
        <button onClick={() => setShowEdit(true)} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm hover:bg-gray-50"><Pencil className="w-4 h-4" /> تعديل</button>
        <button onClick={handleDuplicate} className="p-2 rounded-lg hover:bg-gray-100"><Copy className="w-4 h-4 text-gray-400" /></button>
        <button onClick={handleDelete} disabled={deleting} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.key
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">معلومات الخدمة</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-400">السعر الأساسي</span><p className="font-bold text-lg text-brand-600 mt-1">{Number(service.basePrice || 0).toLocaleString()} ر.س</p></div>
                <div><span className="text-gray-400">وحدة التسعير</span><p className="font-medium mt-1">{service.pricingUnit || "لكل حدث"}</p></div>
                <div><span className="text-gray-400">السعة</span><p className="font-medium mt-1">{service.capacity || "—"} شخص</p></div>
                <div><span className="text-gray-400">المدة</span><p className="font-medium mt-1">{service.durationHours || "—"} ساعة</p></div>
              </div>
              {service.description && <div className="mt-4 pt-4 border-t border-gray-100"><span className="text-gray-400 text-sm">الوصف</span><p className="text-sm text-gray-600 mt-1 leading-relaxed">{service.description}</p></div>}
            </div>
            {(service.includes?.length > 0 || service.excludes?.length > 0) && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">يشمل / لا يشمل</h2>
                <div className="grid grid-cols-2 gap-6">
                  {service.includes?.length > 0 && <div><h3 className="text-sm font-medium text-green-600 mb-2">يشمل</h3>{service.includes.map((item: string, i: number) => <p key={i} className="text-sm text-gray-600 py-1">✓ {item}</p>)}</div>}
                  {service.excludes?.length > 0 && <div><h3 className="text-sm font-medium text-red-500 mb-2">لا يشمل</h3>{service.excludes.map((item: string, i: number) => <p key={i} className="text-sm text-gray-600 py-1">✗ {item}</p>)}</div>}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">الإحصائيات</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-sm text-gray-500 flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> الحجوزات</span><span className="font-bold">{service.totalBookings || 0}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-gray-500 flex items-center gap-2"><Banknote className="w-4 h-4" /> الإيرادات</span><span className="font-bold">{Number(service.totalRevenue || 0).toLocaleString()} ر.س</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-gray-500 flex items-center gap-2"><Star className="w-4 h-4" /> التقييم</span><span className="font-bold">{service.avgRating ? Number(service.avgRating).toFixed(1) : "—"}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-gray-500 flex items-center gap-2"><Eye className="w-4 h-4" /> المشاهدات</span><span className="font-bold">{service.viewCount || 0}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">معلومات إضافية</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">الرابط</span><span className="font-mono text-xs text-brand-500">/book/{service.slug}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">SKU</span><span>{service.sku || "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">تاريخ الإنشاء</span><span>{service.createdAt ? new Date(service.createdAt).toLocaleDateString("ar-SA") : "—"}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Custom Questions */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">الأسئلة التي تظهر للعميل عند الحجز</p>
            <Button icon={Plus} size="sm" onClick={openAddQ}>إضافة سؤال</Button>
          </div>

          {questions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
              <HelpCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">لا توجد أسئلة مخصصة</p>
              <p className="text-sm text-gray-400 mt-1">أضف أسئلة لجمع معلومات إضافية من العملاء</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q: any, idx: number) => (
                <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleMoveQ(idx, "up")} disabled={idx === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => handleMoveQ(idx, "down")} disabled={idx === questions.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm text-gray-900">{q.question}</p>
                      {q.is_required && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">مطلوب</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{QUESTION_TYPES.find((t) => t.value === q.type)?.label || q.type}</span>
                      {q.price > 0 && <span className="text-green-600">+ {Number(q.price).toLocaleString()} ر.س</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditQ(q)} className="p-2 rounded-lg hover:bg-gray-100"><Pencil className="w-4 h-4 text-gray-400" /></button>
                    <button onClick={() => handleDeleteQ(q.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Booking Settings */}
      {activeTab === "booking-settings" && bsForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl">
          <div className="space-y-5">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900 text-sm">السماح بالحجز المتأخر</p>
                <p className="text-xs text-gray-400 mt-0.5">قبول الحجوزات في نفس اليوم</p>
              </div>
              <Toggle checked={bsForm.allowLateBooking} onChange={(v) => setBsForm({ ...bsForm, allowLateBooking: v })} />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900 text-sm">حجز يوم كامل</p>
                <p className="text-xs text-gray-400 mt-0.5">الخدمة تشغل اليوم بالكامل</p>
              </div>
              <Toggle checked={bsForm.fullDayBooking} onChange={(v) => setBsForm({ ...bsForm, fullDayBooking: v })} />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900 text-sm">السماح باختيار المزود</p>
                <p className="text-xs text-gray-400 mt-0.5">يختار العميل مزود الخدمة</p>
              </div>
              <Toggle checked={bsForm.allowProviderSelection} onChange={(v) => setBsForm({ ...bsForm, allowProviderSelection: v })} />
            </div>
            <div className="py-3 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-900 mb-2">وقت الفاصل (دقيقة)</label>
              <input
                type="number"
                min={0}
                value={bsForm.bufferMinutes}
                onChange={(e) => setBsForm({ ...bsForm, bufferMinutes: parseInt(e.target.value) || 0 })}
                className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">فترة الراحة بين الحجوزات</p>
            </div>
            <div className="py-3 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-900 mb-2">الحجوزات المتزامنة</label>
              <input
                type="number"
                min={1}
                value={bsForm.maxConcurrentBookings}
                onChange={(e) => setBsForm({ ...bsForm, maxConcurrentBookings: parseInt(e.target.value) || 1 })}
                className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">أقصى عدد حجوزات في نفس الوقت</p>
            </div>
            <div className="py-3">
              <label className="block text-sm font-medium text-gray-900 mb-2">أيام الحجز المسبق</label>
              <input
                type="number"
                min={1}
                value={bsForm.advanceBookingDays}
                onChange={(e) => setBsForm({ ...bsForm, advanceBookingDays: parseInt(e.target.value) || 365 })}
                className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">كم يوماً مسبقاً يمكن الحجز</p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Button onClick={handleSaveBS} loading={bsSaving} icon={Save}>حفظ الإعدادات</Button>
          </div>
        </div>
      )}

      {/* Tab: Components */}
      {activeTab === "components" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">المواد والأصول والعمالة اللازمة لتنفيذ هذه الخدمة</p>
            <Button icon={Plus} size="sm" onClick={openAddComp}>إضافة مكوّن</Button>
          </div>

          {/* Summary */}
          {components.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "عدد المكونات", value: components.length, sub: `${components.filter(c => !c.isOptional).length} إلزامي` },
                { label: "إجمالي التكلفة", value: componentsTotalCost.toLocaleString() + " ر.س", sub: "تكلفة المواد" },
                {
                  label: "هامش الربح",
                  value: service?.basePrice
                    ? (((Number(service.basePrice) - componentsTotalCost) / Number(service.basePrice)) * 100).toFixed(1) + "%"
                    : "—",
                  sub: service?.basePrice ? `${(Number(service.basePrice) - componentsTotalCost).toLocaleString()} ر.س` : "",
                  highlight: service?.basePrice && Number(service.basePrice) > componentsTotalCost,
                },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className={clsx("text-lg font-bold", (s as any).highlight ? "text-green-600" : "text-gray-900")}>{s.value}</p>
                  {s.sub && <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Components list */}
          {components.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
              <Boxes className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">لا توجد مكونات</p>
              <p className="text-sm text-gray-400 mt-1">أضف الأصول والمواد التي تحتاجها هذه الخدمة</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">المكوّن</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">النوع</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">الكمية</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">التكلفة/وحدة</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">الإجمالي</th>
                    <th className="py-3 px-4 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((comp: any) => {
                    const total = Number(comp.quantity ?? 1) * Number(comp.unitCost ?? 0);
                    const srcConfig: Record<string, { label: string; cls: string; icon: any }> = {
                      inventory: { label: "أصل", cls: "bg-blue-50 text-blue-600", icon: Package },
                      manual:    { label: "يدوي", cls: "bg-gray-100 text-gray-600", icon: Wrench },
                      flower:    { label: "ورد", cls: "bg-pink-50 text-pink-600", icon: FlaskConical },
                    };
                    const src = srcConfig[comp.sourceType] ?? srcConfig.manual;
                    return (
                      <tr key={comp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{comp.name}</p>
                            {comp.isOptional && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">اختياري</span>}
                          </div>
                          {comp.assetTypeName && comp.assetTypeName !== comp.name && (
                            <p className="text-xs text-gray-400 mt-0.5">{comp.assetTypeName}</p>
                          )}
                          {comp.description && <p className="text-xs text-gray-400 truncate max-w-xs">{comp.description}</p>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", src.cls)}>
                            <src.icon className="w-3 h-3" />
                            {src.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 tabular-nums text-gray-700">{Number(comp.quantity).toLocaleString()} {comp.unit}</td>
                        <td className="py-3 px-4 tabular-nums text-gray-700">{Number(comp.unitCost).toLocaleString()} ر.س</td>
                        <td className="py-3 px-4 tabular-nums font-semibold text-gray-900">{total.toLocaleString()} ر.س</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <button onClick={() => openEditComp(comp)} className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors"><Pencil className="w-3.5 h-3.5 text-brand-500" /></button>
                            <button onClick={() => handleDeleteComp(comp.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50/50 border-t border-gray-200">
                    <td colSpan={4} className="py-3 px-4 text-sm font-semibold text-gray-700">إجمالي التكلفة</td>
                    <td className="py-3 px-4 font-bold text-brand-600 tabular-nums">{componentsTotalCost.toLocaleString()} ر.س</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Component Add/Edit Modal */}
      {compModal && (
        <Modal
          open={true}
          onClose={() => setCompModal(null)}
          title={compModal.item ? "تعديل المكوّن" : "إضافة مكوّن جديد"}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setCompModal(null)}>إلغاء</Button>
              <Button onClick={handleSaveComp} loading={compSaving}>حفظ</Button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Source type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">نوع المكوّن</label>
              <div className="flex gap-2">
                {[
                  { v: "inventory", label: "أصل من المخزون", icon: Package, cls: "blue" },
                  { v: "manual",    label: "عنصر يدوي",      icon: Wrench,  cls: "gray" },
                ].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setCompForm((p: any) => ({ ...p, sourceType: opt.v, inventoryItemId: "", name: "" }))}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                      compForm.sourceType === opt.v
                        ? "border-brand-400 bg-brand-50 text-brand-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset type selector */}
            {compForm.sourceType === "inventory" && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">نوع الأصل</label>
                <select
                  value={compForm.inventoryItemId}
                  onChange={e => {
                    const t = assetTypes.find((a: any) => a.id === e.target.value);
                    setCompForm((p: any) => ({ ...p, inventoryItemId: e.target.value, name: t?.name ?? p.name }));
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                >
                  <option value="">اختر نوع الأصل</option>
                  {assetTypes.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.totalAssets ?? 0} وحدة)</option>
                  ))}
                </select>
              </div>
            )}

            {/* Name */}
            <Input
              label="الاسم *"
              name="name"
              value={compForm.name}
              onChange={(e: any) => setCompForm((p: any) => ({ ...p, name: e.target.value }))}
              placeholder={compForm.sourceType === "inventory" ? "يُملأ تلقائياً من نوع الأصل" : "مثال: عمالة تركيب، تغليف فاخر"}
              required
            />

            {/* Quantity + unit */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="الكمية"
                name="quantity"
                type="number"
                value={compForm.quantity}
                onChange={(e: any) => setCompForm((p: any) => ({ ...p, quantity: parseFloat(e.target.value) || 1 }))}
                min={0}
              />
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">الوحدة</label>
                <select
                  value={compForm.unit}
                  onChange={e => setCompForm((p: any) => ({ ...p, unit: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                >
                  {["حبة", "قطعة", "متر", "كيلو", "لتر", "يوم", "ساعة", "طن"].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="التكلفة لكل وحدة (ر.س)"
              name="unitCost"
              type="number"
              value={compForm.unitCost}
              onChange={(e: any) => setCompForm((p: any) => ({ ...p, unitCost: parseFloat(e.target.value) || 0 }))}
              min={0}
              suffix="ر.س"
              hint={`الإجمالي: ${(Number(compForm.quantity) * Number(compForm.unitCost)).toLocaleString()} ر.س`}
            />

            <div className="flex gap-4 pt-1">
              <div className="flex items-center gap-2">
                <Toggle checked={compForm.isOptional} onChange={(v: boolean) => setCompForm((p: any) => ({ ...p, isOptional: v }))} />
                <span className="text-sm text-gray-700">مكوّن اختياري</span>
              </div>
              <div className="flex items-center gap-2">
                <Toggle checked={compForm.showToCustomer} onChange={(v: boolean) => setCompForm((p: any) => ({ ...p, showToCustomer: v }))} />
                <span className="text-sm text-gray-700">يظهر للعميل</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Question Modal */}
      <Modal
        open={showQModal}
        onClose={() => setShowQModal(false)}
        title={editingQ ? "تعديل السؤال" : "إضافة سؤال مخصص"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowQModal(false)}>إلغاء</Button>
            <Button onClick={handleSaveQ} loading={qSaving}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextArea
            label="نص السؤال"
            name="question"
            value={qForm.question}
            onChange={(e) => updateQ("question", e.target.value)}
            placeholder="ما اسم العريس والعروس؟"
            rows={2}
            required
          />
          <Select
            label="نوع الإجابة"
            name="type"
            value={qForm.type}
            onChange={(e) => updateQ("type", e.target.value)}
            options={QUESTION_TYPES}
          />
          {(qForm.type === "select" || qForm.type === "multi") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">خيارات الإجابة</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                  placeholder="أدخل خياراً واضغط Enter"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                />
                <button onClick={addOption} className="px-4 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600">
                  إضافة
                </button>
              </div>
              <div className="space-y-1">
                {qForm.options.map((opt: string, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">{opt}</span>
                    <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500"><span className="text-xs">✕</span></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">سؤال إلزامي</span>
            <Toggle checked={qForm.isRequired} onChange={(v) => updateQ("isRequired", v)} />
          </div>
          <Input
            label="رسوم إضافية (اختياري)"
            name="price"
            type="number"
            value={qForm.price}
            onChange={(e) => updateQ("price", parseFloat(e.target.value) || 0)}
            suffix="ر.س"
            hint="أدخل 0 إذا لم تكن هناك رسوم"
          />
        </div>
      </Modal>

      {showEdit && <EditServiceForm open={showEdit} serviceId={id!} onClose={() => setShowEdit(false)} onSuccess={() => { setShowEdit(false); refetch(); }} />}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
