import { useState } from "react";
import { toast } from "@/hooks/useToast";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowRight, Pencil, Trash2, Package, Star, CalendarCheck, Banknote,
  Loader2, AlertCircle, Copy, Eye, Plus, ChevronUp, ChevronDown, Save, HelpCircle, Settings2,
  Boxes, Wrench, FlaskConical, TrendingUp, Users, Layers, AlignLeft, ClipboardList,
} from "lucide-react";
import { clsx } from "clsx";
import { servicesApi, questionsApi, inventoryApi, teamApi, salonApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { EditServiceForm } from "@/components/services/EditServiceForm";
import { Modal, Input, TextArea, Select, Button, Toggle } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";

type Tab = "info" | "questions" | "booking-settings" | "components" | "requirements" | "recipes" | "staff";
type ReqType = "employee" | "asset" | "text";

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
  const { data: reqRes, refetch: refetchReq } = useApi(() => servicesApi.getRequirements(id!), [id]);
  const { data: assetTypesRes } = useApi(() => inventoryApi.assetTypes());
  const { data: assetsListRes } = useApi(() => inventoryApi.assets());
  const { data: membersRes } = useApi(() => teamApi.members());
  const { data: serviceStaffRes, refetch: refetchServiceStaff } = useApi(() => servicesApi.listStaff(id!), [id]);
  const assetTypes: any[] = assetTypesRes?.data ?? [];
  const assetsList: any[] = assetsListRes?.data ?? [];
  const membersList: any[] = membersRes?.data ?? [];
  const serviceStaff: any[] = serviceStaffRes?.data ?? [];
  const { mutate: deleteService, loading: deleting } = useMutation((sid: string) => servicesApi.delete(sid));
  const { mutate: duplicateService } = useMutation((sid: string) => servicesApi.duplicate(sid));

  // Recipes (salon supplies)
  const { data: recipesRes, refetch: refetchRecipes } = useApi(() => salonApi.recipes(id!), [id]);
  const { data: suppliesRes } = useApi(() => salonApi.supplies(), []);
  const recipes: any[] = recipesRes?.data ?? [];
  const supplies: any[] = suppliesRes?.data ?? [];
  const [recipeForm, setRecipeForm] = useState({ supplyId: "", quantity: "1" });
  const { mutate: addRecipe } = useMutation((data: any) => salonApi.addRecipe(data));
  const { mutate: deleteRecipe } = useMutation((recipeId: string) => salonApi.deleteRecipe(recipeId));

  const service = res?.data;
  const questions = qRes?.data || [];
  const components: any[] = compRes?.data ?? [];
  const componentsTotalCost: number = compRes?.totalCost ?? 0;
  const requirements: any[] = reqRes?.data ?? [];

  // Requirements state
  const REQ_DEFAULT = { requirementType: "employee" as ReqType, userId: "", employeeRole: "", assetId: "", assetTypeId: "", label: "", quantity: 1, notes: "", isRequired: true };
  const [reqModal, setReqModal] = useState<{ open: boolean; item?: any } | null>(null);
  const [reqForm, setReqForm] = useState<any>(REQ_DEFAULT);
  const [reqSaving, setReqSaving] = useState(false);

  const openAddReq = (type: ReqType) => { setReqForm({ ...REQ_DEFAULT, requirementType: type }); setReqModal({ open: true }); };
  const openEditReq = (r: any) => {
    setReqForm({
      requirementType: r.requirementType ?? "text",
      userId: r.userId ?? "",
      employeeRole: r.employeeRole ?? "",
      assetId: r.assetId ?? "",
      assetTypeId: r.assetTypeId ?? "",
      label: r.label ?? "",
      quantity: r.quantity ?? 1,
      notes: r.notes ?? "",
      isRequired: r.isRequired ?? true,
    });
    setReqModal({ open: true, item: r });
  };

  const handleSaveReq = async () => {
    if (!reqForm.label?.trim()) { toast.error("الاسم/الوصف مطلوب"); return; }
    setReqSaving(true);
    try {
      const payload = {
        ...reqForm,
        userId: reqForm.userId || null,
        assetId: reqForm.assetId || null,
        assetTypeId: reqForm.assetTypeId || null,
        quantity: Number(reqForm.quantity),
      };
      if (reqModal?.item) {
        await servicesApi.updateRequirement(id!, reqModal.item.id, payload);
      } else {
        await servicesApi.addRequirement(id!, payload);
      }
      setReqModal(null);
      refetchReq();
      toast.success("تم الحفظ");
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setReqSaving(false);
    }
  };

  const handleDeleteReq = async (reqId: string) => {
    if (!confirm("حذف هذا المتطلب؟")) return;
    await servicesApi.deleteRequirement(id!, reqId);
    refetchReq();
    toast.success("تم الحذف");
  };

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
    if (!compForm.name?.trim()) { toast.error("الاسم مطلوب"); return; }
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
      toast.success("تم الحفظ");
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setCompSaving(false);
    }
  };

  const handleDeleteComp = async (compId: string) => {
    if (!confirm("حذف هذا المكوّن؟")) return;
    await servicesApi.deleteComponent(id!, compId);
    refetchComp();
    toast.success("تم الحذف");
  };

  // Custom questions state
  const [showQModal, setShowQModal] = useState(false);
  const [editingQ, setEditingQ] = useState<any>(null);
  const [qForm, setQForm] = useState({ ...EMPTY_Q });
  const [optionInput, setOptionInput] = useState("");
  const [qSaving, setQSaving] = useState(false);

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
    if (!qForm.question.trim()) { toast.error("نص السؤال مطلوب"); return; }
    setQSaving(true);
    try {
      if (editingQ) {
        await questionsApi.update(editingQ.id, { ...qForm, serviceId: id });
      } else {
        await questionsApi.create(id!, { ...qForm });
      }
      setShowQModal(false);
      refetchQ();
      toast.success(editingQ ? "تم تحديث السؤال" : "تم إضافة السؤال");
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setQSaving(false);
    }
  };

  const handleDeleteQ = async (qId: string) => {
    if (!confirm("حذف هذا السؤال؟")) return;
    await questionsApi.delete(qId);
    refetchQ();
    toast.success("تم الحذف");
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
      toast.success("تم حفظ الإعدادات");
      refetch();
    } catch {
      toast.error("فشل الحفظ");
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

  if (loading) return <PageSkeleton />;
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

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: "info", label: "معلومات الخدمة", icon: Package },
    { key: "components", label: "المكونات والتكاليف", icon: Boxes },
    { key: "requirements", label: "المتطلبات", icon: ClipboardList, badge: requirements.length || undefined },
    { key: "recipes", label: "وصفة المستلزمات", icon: FlaskConical, badge: recipes.length || undefined },
    { key: "staff", label: "الموظفون", icon: Users, badge: serviceStaff.length || undefined },
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
            {tab.badge ? <span className="bg-brand-100 text-brand-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{tab.badge}</span> : null}
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

      {/* Tab: Requirements */}
      {activeTab === "requirements" && (() => {
        const empReqs = requirements.filter(r => r.requirementType === "employee");
        const assetReqs = requirements.filter(r => r.requirementType === "asset");
        const textReqs = requirements.filter(r => r.requirementType === "text");

        const ReqSection = ({ title, icon: Icon, color, items, type, emptyMsg }: any) => (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className={clsx("flex items-center justify-between px-5 py-4 border-b border-gray-100")}>
              <div className="flex items-center gap-2.5">
                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", color.bg)}>
                  <Icon className={clsx("w-4 h-4", color.text)} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                {items.length > 0 && (
                  <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full", color.badge)}>{items.length}</span>
                )}
              </div>
              <button
                onClick={() => openAddReq(type)}
                className={clsx("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors", color.btnBorder, color.btnText, color.btnHover)}
              >
                <Plus className="w-3.5 h-3.5" /> إضافة
              </button>
            </div>
            {items.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">{emptyMsg}</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50">
                    {type === "employee" && (
                      <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0", color.avatar)}>
                        {(r.userName || r.label || "م")[0]}
                      </div>
                    )}
                    {type === "asset" && (
                      <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", color.avatar)}>
                        <Layers className={clsx("w-4 h-4", color.text)} />
                      </div>
                    )}
                    {type === "text" && (
                      <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", color.avatar)}>
                        <AlignLeft className={clsx("w-4 h-4", color.text)} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {type === "employee" ? (r.userName || r.label) : r.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {type === "employee" && (r.employeeRole || r.userJobTitle || "—")}
                        {type === "asset" && (r.assetSerial ? `${r.assetName || ""} · ${r.assetSerial}` : (r.assetTypeName || "—"))}
                        {type === "text" && (r.notes || "")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-500 tabular-nums">{r.quantity} {type === "employee" ? "شخص" : type === "asset" ? "قطعة" : "بند"}</span>
                      {!r.isRequired && <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">اختياري</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditReq(r)} className="p-1.5 rounded-lg hover:bg-brand-50"><Pencil className="w-3.5 h-3.5 text-brand-500" /></button>
                      <button onClick={() => handleDeleteReq(r.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">الموظفون والأصول والبنود المطلوبة لتنفيذ هذه الخدمة</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{requirements.length} متطلب</span>
                <span>·</span>
                <span>{requirements.filter(r => r.isRequired).length} إلزامي</span>
              </div>
            </div>

            <ReqSection
              title="الموظفون المطلوبون"
              icon={Users}
              type="employee"
              items={empReqs}
              emptyMsg="لم يُحدَّد موظفون لهذه الخدمة بعد"
              color={{
                bg: "bg-indigo-50", text: "text-indigo-600", badge: "bg-indigo-100 text-indigo-700",
                avatar: "bg-indigo-100 text-indigo-700",
                btnBorder: "border-indigo-200", btnText: "text-indigo-600", btnHover: "hover:bg-indigo-50",
              }}
            />
            <ReqSection
              title="الأصول المطلوبة"
              icon={Layers}
              type="asset"
              items={assetReqs}
              emptyMsg="لم تُحدَّد أصول لهذه الخدمة بعد"
              color={{
                bg: "bg-blue-50", text: "text-blue-600", badge: "bg-blue-100 text-blue-700",
                avatar: "bg-blue-50 text-blue-600",
                btnBorder: "border-blue-200", btnText: "text-blue-600", btnHover: "hover:bg-blue-50",
              }}
            />
            <ReqSection
              title="متطلبات نصية"
              icon={AlignLeft}
              type="text"
              items={textReqs}
              emptyMsg="لا توجد متطلبات نصية مضافة"
              color={{
                bg: "bg-gray-100", text: "text-gray-600", badge: "bg-gray-200 text-gray-700",
                avatar: "bg-gray-100 text-gray-600",
                btnBorder: "border-gray-200", btnText: "text-gray-600", btnHover: "hover:bg-gray-50",
              }}
            />
          </div>
        );
      })()}

      {/* Tab: Supply Recipes */}
      {activeTab === "recipes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">المستلزمات التي تُستهلك تلقائياً عند إتمام هذه الخدمة</p>
          </div>

          {/* Add recipe row */}
          {supplies.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">إضافة مستلزم للوصفة</p>
              <div className="flex gap-2 flex-wrap">
                <select
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                  value={recipeForm.supplyId}
                  onChange={e => setRecipeForm(f => ({ ...f, supplyId: e.target.value }))}
                >
                  <option value="">— اختر مستلزم —</option>
                  {supplies.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  value={recipeForm.quantity}
                  onChange={e => setRecipeForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="الكمية"
                />
                <Button
                  size="sm"
                  disabled={!recipeForm.supplyId}
                  onClick={async () => {
                    if (!recipeForm.supplyId) return;
                    await addRecipe({ serviceId: id!, supplyId: recipeForm.supplyId, quantity: recipeForm.quantity });
                    setRecipeForm({ supplyId: "", quantity: "1" });
                    refetchRecipes();
                  }}
                >
                  إضافة
                </Button>
              </div>
            </div>
          )}

          {/* Recipes list */}
          {recipes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-12">
              <FlaskConical className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لم تُحدَّد مستلزمات لهذه الخدمة</p>
              <p className="text-xs text-gray-300 mt-1">أضف مستلزمات لتُخصم تلقائياً عند إتمام الحجز</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {recipes.map((r: any) => {
                const supply = supplies.find((s: any) => s.id === r.supplyId);
                return (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{supply?.name || r.supplyId.slice(0, 8)}</p>
                      <p className="text-xs text-gray-400">{supply?.category} · {supply?.unit}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-700 tabular-nums">{parseFloat(r.quantity).toFixed(2)}</span>
                      <button
                        onClick={async () => { await deleteRecipe(r.id); refetchRecipes(); }}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="px-5 py-3 bg-gray-50/50">
                <p className="text-xs text-gray-400">
                  عند إتمام الحجز سيُخصم تلقائياً {recipes.length} مستلزم من المخزون
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Staff */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">الموظفون المعيّنون لهذه الخدمة وإعدادات العمولة الخاصة بهم</p>
          </div>

          {/* Add staff from members not yet assigned */}
          {membersList.filter(m => !serviceStaff.find(ss => ss.userId === m.id)).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">إضافة موظف</p>
              <div className="flex flex-wrap gap-2">
                {membersList
                  .filter(m => !serviceStaff.find(ss => ss.userId === m.id))
                  .map((m: any) => (
                    <button
                      key={m.id}
                      onClick={async () => {
                        await servicesApi.addStaff(id!, { userId: m.id, commissionMode: "inherit" });
                        refetchServiceStaff();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-sm transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {m.name?.[0] || "م"}
                      </div>
                      {m.name}
                      <Plus className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Assigned staff list */}
          {serviceStaff.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-12">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لم يُعيَّن موظفون لهذه الخدمة بعد</p>
              {service.assignmentMode === "open" && (
                <p className="text-xs text-gray-300 mt-1">وضع التعيين: مفتوح — أي موظف يمكنه تنفيذ الخدمة</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {serviceStaff.map((ss: any) => (
                <div key={ss.id} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {ss.userName?.[0] || "م"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{ss.userName || ss.userId}</p>
                      <p className="text-xs text-gray-400">{ss.jobTitle || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <select
                      value={ss.commissionMode}
                      onChange={async (e) => {
                        await servicesApi.updateStaff(id!, ss.userId, { commissionMode: e.target.value });
                        refetchServiceStaff();
                      }}
                      className="border border-gray-200 rounded-xl px-2 py-1 text-xs bg-white"
                    >
                      <option value="inherit">يرث من الخدمة</option>
                      <option value="none">بلا عمولة</option>
                      <option value="percentage">نسبة %</option>
                      <option value="fixed">مبلغ ثابت</option>
                    </select>
                    {(ss.commissionMode === "percentage" || ss.commissionMode === "fixed") && (
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        defaultValue={ss.commissionValue || ""}
                        onBlur={async (e) => {
                          await servicesApi.updateStaff(id!, ss.userId, { commissionMode: ss.commissionMode, commissionValue: parseFloat(e.target.value) || 0 });
                          refetchServiceStaff();
                        }}
                        className="w-20 border border-gray-200 rounded-xl px-2 py-1 text-xs"
                        placeholder={ss.commissionMode === "percentage" ? "%" : "ر.س"}
                      />
                    )}
                    <button
                      onClick={async () => {
                        await servicesApi.removeStaff(id!, ss.userId);
                        refetchServiceStaff();
                      }}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Requirements Add/Edit Modal */}
      {reqModal && (
        <Modal
          open={true}
          onClose={() => setReqModal(null)}
          title={reqModal.item ? "تعديل المتطلب" : "إضافة متطلب جديد"}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setReqModal(null)}>إلغاء</Button>
              <Button onClick={handleSaveReq} loading={reqSaving}>حفظ</Button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">نوع المتطلب</label>
              <div className="flex gap-2">
                {([
                  { v: "employee", label: "موظف",  icon: Users,     cls: "indigo" },
                  { v: "asset",    label: "أصل",    icon: Layers,    cls: "blue"   },
                  { v: "text",     label: "نص حر",  icon: AlignLeft, cls: "gray"   },
                ] as { v: ReqType; label: string; icon: any; cls: string }[]).map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setReqForm((p: any) => ({ ...REQ_DEFAULT, requirementType: opt.v }))}
                    className={clsx(
                      "flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors",
                      reqForm.requirementType === opt.v
                        ? "border-brand-400 bg-brand-50 text-brand-700"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Employee selector */}
            {reqForm.requirementType === "employee" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">اختر الموظف</label>
                  <select
                    value={reqForm.userId}
                    onChange={e => {
                      const m = membersList.find((u: any) => u.id === e.target.value);
                      setReqForm((p: any) => ({ ...p, userId: e.target.value, label: m?.name ?? p.label }));
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="">— اختر موظفاً —</option>
                    {membersList.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name}{m.jobTitle ? ` · ${m.jobTitle}` : ""}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="الدور في هذه الخدمة"
                  name="employeeRole"
                  value={reqForm.employeeRole}
                  onChange={(e: any) => setReqForm((p: any) => ({ ...p, employeeRole: e.target.value }))}
                  placeholder="مثال: مصور، مرافق، طباخ"
                />
              </>
            )}

            {/* Asset selector */}
            {reqForm.requirementType === "asset" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">اختر أصلاً محدداً</label>
                  <select
                    value={reqForm.assetId}
                    onChange={e => {
                      const a = assetsList.find((x: any) => x.id === e.target.value);
                      setReqForm((p: any) => ({ ...p, assetId: e.target.value, assetTypeId: "", label: a ? (a.name || a.serialNumber || a.assetTypeName) : p.label }));
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="">— اختر أصلاً بعينه —</option>
                    {assetsList.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.serialNumber && `[${a.serialNumber}] `}{a.name || a.assetTypeName || "أصل"}
                        {a.status === "available" ? " ✓" : a.status === "in_use" ? " (مستخدم)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>أو اختر حسب النوع:</span>
                </div>
                <div>
                  <select
                    value={reqForm.assetTypeId}
                    onChange={e => {
                      const t = assetTypes.find((x: any) => x.id === e.target.value);
                      setReqForm((p: any) => ({ ...p, assetTypeId: e.target.value, assetId: "", label: t?.name ?? p.label }));
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="">— اختر نوع أصل —</option>
                    {assetTypes.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.totalAssets ?? 0} وحدة)</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Label (always shown) */}
            <Input
              label={reqForm.requirementType === "employee" ? "الاسم (يُملأ تلقائياً)" : reqForm.requirementType === "asset" ? "الاسم / الوصف" : "وصف المتطلب *"}
              name="label"
              value={reqForm.label}
              onChange={(e: any) => setReqForm((p: any) => ({ ...p, label: e.target.value }))}
              placeholder={reqForm.requirementType === "text" ? "مثال: شاشة LED عرض 4m، إضاءة مسرحية" : ""}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="الكمية"
                name="quantity"
                type="number"
                value={reqForm.quantity}
                onChange={(e: any) => setReqForm((p: any) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                min={1}
              />
              <div className="flex flex-col justify-end pb-1">
                <div className="flex items-center gap-2">
                  <Toggle checked={reqForm.isRequired} onChange={(v: boolean) => setReqForm((p: any) => ({ ...p, isRequired: v }))} />
                  <span className="text-sm text-gray-700">إلزامي</span>
                </div>
              </div>
            </div>

            {reqForm.requirementType === "text" && (
              <TextArea
                label="ملاحظات"
                name="notes"
                value={reqForm.notes}
                onChange={(e: any) => setReqForm((p: any) => ({ ...p, notes: e.target.value }))}
                placeholder="تفاصيل إضافية..."
                rows={2}
              />
            )}
          </div>
        </Modal>
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

      {showEdit && <EditServiceForm open={showEdit} serviceId={id!} onClose={() => setShowEdit(false)} onSuccess={() => { setShowEdit(false); refetch(); }} />}    </div>
  );
}
