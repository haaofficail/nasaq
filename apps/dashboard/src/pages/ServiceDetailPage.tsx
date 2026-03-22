import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowRight, Pencil, Trash2, Package, Star, CalendarCheck, Banknote,
  Loader2, AlertCircle, Copy, Eye, Plus, ChevronUp, ChevronDown, Save, HelpCircle, Settings2,
} from "lucide-react";
import { clsx } from "clsx";
import { servicesApi, questionsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { EditServiceForm } from "@/components/services/EditServiceForm";
import { Modal, Input, TextArea, Select, Button, Toggle, Toast } from "@/components/ui";

type Tab = "info" | "questions" | "booking-settings";

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
  const { mutate: deleteService, loading: deleting } = useMutation((sid: string) => servicesApi.delete(sid));
  const { mutate: duplicateService } = useMutation((sid: string) => servicesApi.duplicate(sid));

  const service = res?.data;
  const questions = qRes?.data || [];

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
