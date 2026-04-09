import { useState, useEffect, useCallback } from "react";
import { accountingApi } from "../lib/api";
import { toast } from "@/hooks/useToast";

const CATEGORY_LABELS: Record<string, string> = {
  land: "أراضي",
  building: "مباني",
  vehicle: "مركبات",
  furniture: "أثاث",
  equipment: "معدات",
  computer: "أجهزة حاسب",
  machinery: "آلات",
  other: "أخرى",
};

const CATEGORY_COLORS: Record<string, string> = {
  land: "bg-yellow-100 text-yellow-700",
  building: "bg-orange-100 text-orange-700",
  vehicle: "bg-blue-100 text-blue-700",
  furniture: "bg-purple-100 text-purple-700",
  equipment: "bg-cyan-100 text-cyan-700",
  computer: "bg-indigo-100 text-indigo-700",
  machinery: "bg-green-100 text-green-700",
  other: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  fully_depreciated: "مستهلك بالكامل",
  disposed: "مُتخلص منه",
  sold: "مُباع",
  maintenance: "صيانة",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  fully_depreciated: "bg-gray-100 text-gray-500",
  disposed: "bg-red-100 text-red-600",
  sold: "bg-orange-100 text-orange-600",
  maintenance: "bg-yellow-100 text-yellow-700",
};

const FILTER_TABS = [
  { key: "", label: "الكل" },
  { key: "land", label: "أراضي" },
  { key: "building", label: "مباني" },
  { key: "vehicle", label: "مركبات" },
  { key: "furniture", label: "أثاث" },
  { key: "computer", label: "أجهزة" },
  { key: "other", label: "أخرى" },
];

const EMPTY_FORM = {
  name: "",
  category: "equipment",
  purchaseDate: "",
  purchasePrice: "",
  salvageValue: "",
  usefulLifeMonths: "60",
  depreciationMethod: "straight_line",
  vendorName: "",
  location: "",
  serialNumber: "",
  notes: "",
  costCenterId: "",
};

function fmt(n: any) {
  const num = Number(n);
  if (isNaN(num)) return "—";
  return num.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function FixedAssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [scheduleAsset, setScheduleAsset] = useState<any | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [depreciating, setDepreciating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (activeTab) params.category = activeTab;
      const res = await accountingApi.assets.list(params);
      setAssets(res.data ?? []);
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await accountingApi.assets.summary();
      setSummary(res.data);
    } catch {
      // silent
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadCostCenters = async () => {
    try {
      const res = await accountingApi.costCenters.list();
      setCostCenters(res.data ?? []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadSummary();
    loadCostCenters();
  }, []);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (asset: any) => {
    setEditing(asset);
    setForm({
      name: asset.name,
      category: asset.category,
      purchaseDate: asset.purchase_date ? asset.purchase_date.slice(0, 10) : "",
      purchasePrice: asset.purchase_price?.toString() || "",
      salvageValue: asset.salvage_value?.toString() || "",
      usefulLifeMonths: asset.useful_life_months?.toString() || "60",
      depreciationMethod: asset.depreciation_method || "straight_line",
      vendorName: asset.vendor_name || "",
      location: asset.location || "",
      serialNumber: asset.serial_number || "",
      notes: asset.notes || "",
      costCenterId: asset.cost_center_id || "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("الاسم حقل مطلوب");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        purchaseDate: form.purchaseDate || undefined,
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        salvageValue: parseFloat(form.salvageValue) || 0,
        usefulLifeMonths: parseInt(form.usefulLifeMonths) || 60,
        depreciationMethod: form.depreciationMethod,
        vendorName: form.vendorName.trim() || undefined,
        location: form.location.trim() || undefined,
        serialNumber: form.serialNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
        costCenterId: form.costCenterId || undefined,
      };
      if (editing) {
        await accountingApi.assets.update(editing.id, { ...payload, status: editing.status });
      } else {
        await accountingApi.assets.create(payload);
      }
      setShowModal(false);
      loadAssets();
      loadSummary();
    } catch (e: any) {
      setFormError(e.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await accountingApi.assets.delete(id);
      setDeleteConfirm(null);
      loadAssets();
      loadSummary();
    } catch (e: any) {
      toast.error("فشل حذف الأصل. قد يكون مرتبطاً بقيود محاسبية.");
    }
  };

  const openSchedule = async (asset: any) => {
    setScheduleAsset(asset);
    setScheduleLoading(true);
    try {
      const res = await accountingApi.assets.schedule(asset.id);
      setSchedule(res.data ?? []);
    } catch {
      setSchedule([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDepreciateMonthly = async () => {
    setDepreciating(true);
    try {
      const res = await accountingApi.assets.depreciateMonthly();
      const count = res.data?.processed ?? 0;
      showToast(`تم تشغيل الإهلاك الشهري بنجاح — ${count} أصل تمت معالجته`);
      loadAssets();
      loadSummary();
    } catch (e: any) {
      showToast("حدث خطأ أثناء تشغيل الإهلاك");
    } finally {
      setDepreciating(false);
    }
  };

  const kpiCards = [
    {
      label: "إجمالي التكلفة",
      value: summaryLoading ? null : fmt(summary?.total_cost),
      color: "text-brand-500",
      bg: "bg-blue-50",
    },
    {
      label: "مجمع الإهلاك",
      value: summaryLoading ? null : fmt(summary?.total_accumulated),
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "صافي القيمة الدفترية",
      value: summaryLoading ? null : fmt(summary?.total_net_value),
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "الأصول النشطة",
      value: summaryLoading ? null : (summary?.active_count ?? 0).toString(),
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الأصول الثابتة</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة الأصول والإهلاك الدوري</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDepreciateMonthly}
            disabled={depreciating}
            className="flex items-center gap-2 border border-brand-500 text-brand-500 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
          >
            {depreciating ? "جارٍ التشغيل..." : "شغّل إهلاك هذا الشهر"}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            إضافة أصل
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-2xl p-5`}>
            <p className="text-xs font-medium text-gray-500 mb-1">{card.label}</p>
            {card.value === null ? (
              <div className="h-7 w-28 bg-white/60 rounded animate-pulse" />
            ) : (
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          {error}
          <button onClick={loadAssets} className="mr-3 underline text-red-600">إعادة المحاولة</button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-brand-500 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 animate-pulse">
              <div className="w-16 h-4 bg-gray-200 rounded" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
              <div className="w-20 h-6 bg-gray-200 rounded-full" />
              <div className="w-24 h-4 bg-gray-200 rounded" />
              <div className="w-24 h-4 bg-gray-200 rounded" />
              <div className="w-24 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && assets.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="text-4xl text-gray-300 mb-4 select-none">&#9632;</div>
          <p className="text-gray-500 text-lg font-medium">لا توجد أصول</p>
          <p className="text-gray-400 text-sm mt-2">
            {activeTab ? "لا توجد أصول في هذا التصنيف" : "ابدأ بتسجيل أول أصل ثابت"}
          </p>
          {!activeTab && (
            <button onClick={openAdd} className="mt-6 bg-brand-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              إضافة أصل
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && assets.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">الكود</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">الاسم</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">التصنيف</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">تاريخ الشراء</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">سعر الشراء</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">مجمع الإهلاك</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">صافي القيمة</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">الحالة</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-semibold text-brand-500">{asset.asset_code}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{asset.name}</div>
                      {asset.cost_center_name && (
                        <div className="text-xs text-gray-400">{asset.cost_center_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[asset.category] || "bg-gray-100 text-gray-600"}`}>
                        {CATEGORY_LABELS[asset.category] || asset.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString("ar-SA") : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-4 text-gray-900 font-medium">{fmt(asset.purchase_price)}</td>
                    <td className="px-4 py-4 text-orange-600">{fmt(asset.accumulated_depreciation)}</td>
                    <td className="px-4 py-4 text-green-600 font-semibold">{fmt(asset.net_book_value)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[asset.status] || "bg-gray-100 text-gray-500"}`}>
                        {STATUS_LABELS[asset.status] || asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openSchedule(asset)}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                          title="جدول الإهلاك"
                        >
                          الجدول
                        </button>
                        <button
                          onClick={() => openEdit(asset)}
                          className="text-xs text-brand-500 hover:text-[#4a87c0] font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(asset.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            {assets.length} أصل
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? "تعديل الأصل" : "إضافة أصل ثابت"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الأصل <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="مثال: سيارة تويوتا لاندكروزر"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الإهلاك</label>
                  <select
                    value={form.depreciationMethod}
                    onChange={(e) => setForm({ ...form, depreciationMethod: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="straight_line">القسط الثابت</option>
                    <option value="declining_balance">القسط المتناقص</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الشراء</label>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العمر الإنتاجي (شهر)</label>
                  <input
                    type="number"
                    value={form.usefulLifeMonths}
                    onChange={(e) => setForm({ ...form, usefulLifeMonths: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    min="1"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر الشراء</label>
                  <input
                    type="number"
                    value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">قيمة الخردة</label>
                  <input
                    type="number"
                    value={form.salvageValue}
                    onChange={(e) => setForm({ ...form, salvageValue: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">مركز التكلفة</label>
                  <select
                    value={form.costCenterId}
                    onChange={(e) => setForm({ ...form, costCenterId: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="">بدون مركز تكلفة</option>
                    {costCenters.filter((cc) => cc.is_active).map((cc) => (
                      <option key={cc.id} value={cc.id}>{cc.code} — {cc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المورد</label>
                  <input
                    type="text"
                    value={form.vendorName}
                    onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="اسم المورد أو الشركة"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموقع</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="مكان الأصل"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الرقم التسلسلي</label>
                  <input
                    type="text"
                    value={form.serialNumber}
                    onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="رقم تسلسلي أو موديل"
                    dir="ltr"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                    placeholder="ملاحظات إضافية..."
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {saving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة الأصل"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Depreciation Schedule Modal */}
      {scheduleAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">جدول الإهلاك</h2>
                <p className="text-sm text-gray-500">{scheduleAsset.name} — {scheduleAsset.asset_code}</p>
              </div>
              <button onClick={() => setScheduleAsset(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {scheduleLoading ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : schedule.length === 0 ? (
                <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b border-gray-100">
                      <th className="text-right text-xs font-semibold text-gray-500 px-4 py-2">الشهر</th>
                      <th className="text-right text-xs font-semibold text-gray-500 px-4 py-2">التاريخ</th>
                      <th className="text-right text-xs font-semibold text-gray-500 px-4 py-2">قسط الإهلاك</th>
                      <th className="text-right text-xs font-semibold text-gray-500 px-4 py-2">مجمع الإهلاك</th>
                      <th className="text-right text-xs font-semibold text-gray-500 px-4 py-2">صافي القيمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {schedule.map((row) => (
                      <tr key={row.month} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-600">{row.month}</td>
                        <td className="px-4 py-2 text-gray-600" dir="ltr">{row.date}</td>
                        <td className="px-4 py-2 text-orange-600">{fmt(row.depreciation)}</td>
                        <td className="px-4 py-2 text-red-500">{fmt(row.accumulated)}</td>
                        <td className="px-4 py-2 text-green-600 font-semibold">{fmt(row.netBookValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setScheduleAsset(null)}
                className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-6 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">تأكيد الحذف</h3>
            <p className="text-sm text-gray-600">هل تريد حذف هذا الأصل نهائياً؟ لا يمكن التراجع عن هذه العملية.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-sm font-medium transition-colors"
              >
                حذف
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
