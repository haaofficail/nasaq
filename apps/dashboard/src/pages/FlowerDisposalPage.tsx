import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { api, flowerDisposalApi } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { FlowerLossAlertsBanner } from "@/components/dashboard/FlowerLossAlertsBanner";
import {
  Zap, Plus, X, Edit2, Trash2, RefreshCw, CheckCircle,
  AlertTriangle, ChevronDown, Tag, Package, Leaf,
  TrendingDown, BarChart2, ShoppingBag, Info, ToggleLeft, ToggleRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DisposalRule {
  id: string;
  name: string;
  min_age_days: number;
  max_age_days: number; // -1 = unlimited
  discount_percent: number;
  show_as_sale: boolean;
  display_label_ar: string;
  auto_apply: boolean;
  is_active: boolean;
}

interface FreshnessBatch {
  id: string;
  batch_number: string;
  variety_name: string;
  age_days: number;
  quantity_remaining: number;
  original_price: number;
  discounted_price: number;
  discount_percent: number;
  quality_status: string;
  freshness_score: number; // 0-100
}

interface TodayBundle {
  composition: Array<{ name: string; quantity: number; unit: string }>;
  original_value: number;
  sale_price: number;
  discount_percent: number;
  expected_margin: number;
  generated_at: string;
}

// ─── Freshness helpers ────────────────────────────────────────────────────────

function getFreshnessZone(ageDays: number): {
  zone: "fresh" | "good" | "expiring" | "critical";
  label: string;
  color: string;
  bg: string;
  border: string;
  bar: string;
  text: string;
} {
  if (ageDays <= 2)
    return { zone: "fresh", label: "طازج", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", bar: "bg-green-500", text: "text-green-700" };
  if (ageDays <= 4)
    return { zone: "good", label: "جيد", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", bar: "bg-yellow-500", text: "text-yellow-700" };
  if (ageDays <= 6)
    return { zone: "expiring", label: "مقبول", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", bar: "bg-orange-500", text: "text-orange-700" };
  return { zone: "critical", label: "قارب الانتهاء", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", bar: "bg-red-500", text: "text-red-700" };
}

function getDiscountBadgeColor(discount: number): string {
  if (discount === 0) return "bg-green-100 text-green-700";
  if (discount <= 20) return "bg-yellow-100 text-yellow-700";
  if (discount <= 40) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

// ─── Shared components ────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-[#eef2f6]">
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function InputClass() {
  return "w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-brand-500";
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/3" />
    </div>
  );
}

// ─── Rule Form State ──────────────────────────────────────────────────────────

const emptyRuleForm = {
  name: "",
  min_age_days: 0,
  max_age_days: 2,
  discount_percent: 0,
  show_as_sale: true,
  display_label_ar: "عرض خاص",
  auto_apply: true,
  is_active: true,
};

type RuleForm = typeof emptyRuleForm;

// ─── Tab 1: Disposal Rules ────────────────────────────────────────────────────

function DisposalRulesTab() {
  const { data: rulesRes, loading, error, refetch } = useApi(() => flowerDisposalApi.rules(), []);
  const rules: DisposalRule[] = (rulesRes as any)?.data ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<DisposalRule | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyRuleForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { mutate: saveRule, loading: saving } = useMutation(
    (payload: { id?: string; data: Partial<DisposalRule> }) =>
      payload.id ? flowerDisposalApi.updateRule(payload.id, payload.data) : flowerDisposalApi.createRule(payload.data)
  );

  const { mutate: removeRule, loading: deleting } = useMutation((id: string) => flowerDisposalApi.deleteRule(id));

  const { mutate: applyRules, loading: applying } = useMutation(() => flowerDisposalApi.apply());

  const { mutate: toggleRule } = useMutation(
    (payload: { id: string; is_active: boolean }) =>
      flowerDisposalApi.updateRule(payload.id, { is_active: payload.is_active })
  );

  const DEFAULT_RULES = [
    { name: "طازج — سعر عادي",       min_age_days: 0, max_age_days: 2,  discount_percent: 0,  show_as_sale: false, display_label_ar: "طازج",       auto_apply: true, is_active: true },
    { name: "جيد — خصم 15%",          min_age_days: 3, max_age_days: 4,  discount_percent: 15, show_as_sale: true,  display_label_ar: "عرض خاص",    auto_apply: true, is_active: true },
    { name: "مقبول — خصم 30%",        min_age_days: 5, max_age_days: 6,  discount_percent: 30, show_as_sale: true,  display_label_ar: "تصفية",      auto_apply: true, is_active: true },
    { name: "حرج — أوقف البيع",       min_age_days: 7, max_age_days: -1, discount_percent: 100, show_as_sale: false, display_label_ar: "غير متاح",  auto_apply: true, is_active: true },
  ];

  const [seeding, setSeeding] = useState(false);

  async function handleSeedDefaults() {
    setSeeding(true);
    let created = 0;
    for (const rule of DEFAULT_RULES) {
      const res = await saveRule({ data: rule });
      if (res) created++;
    }
    setSeeding(false);
    if (created > 0) {
      toast.success(`تم إضافة ${created} قواعد افتراضية`);
      refetch();
    }
  }

  function openCreate() {
    setEditingRule(null);
    setForm(emptyRuleForm);
    setShowModal(true);
  }

  function openEdit(rule: DisposalRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      min_age_days: rule.min_age_days,
      max_age_days: rule.max_age_days,
      discount_percent: rule.discount_percent,
      show_as_sale: rule.show_as_sale,
      display_label_ar: rule.display_label_ar,
      auto_apply: rule.auto_apply,
      is_active: rule.is_active,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("اسم القاعدة مطلوب");
      return;
    }
    const res = await saveRule({ id: editingRule?.id, data: form });
    if (res) {
      toast.success(editingRule ? "تم تحديث القاعدة" : "تم إضافة القاعدة");
      setShowModal(false);
      refetch();
    }
  }

  async function handleDelete(id: string) {
    const res = await removeRule(id);
    if (res !== null) {
      toast.success("تم حذف القاعدة");
      setDeleteConfirm(null);
      refetch();
    }
  }

  async function handleToggle(rule: DisposalRule) {
    const res = await toggleRule({ id: rule.id, is_active: !rule.is_active });
    if (res) {
      toast.success(rule.is_active ? "تم إيقاف القاعدة" : "تم تفعيل القاعدة");
      refetch();
    }
  }

  async function handleApply() {
    const res = await applyRules(undefined as unknown as void);
    if (res) {
      const count = (res as any)?.data?.batches_updated ?? 0;
      toast.success(`تم تطبيق الخصومات على ${count} دفعة`);
    }
  }

  const sorted = [...rules].sort((a, b) => a.min_age_days - b.min_age_days);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800 leading-relaxed">
          الورد الذي عمره <strong>0-2 يوم</strong> = سعر عادي &nbsp;|&nbsp;
          <strong>3-4 أيام</strong> = خصم 15% &nbsp;|&nbsp;
          <strong>5-6 أيام</strong> = خصم 30% &nbsp;|&nbsp;
          <strong>7+ أيام</strong> = أوقف البيع
        </div>
      </div>

      {/* Freshness Thermometer */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">مقياس الطزاجة</h3>
        <div className="flex rounded-xl overflow-hidden h-8">
          <div className="flex-1 bg-green-500 flex items-center justify-center text-white text-xs font-bold">
            0-2 يوم
          </div>
          <div className="flex-1 bg-yellow-400 flex items-center justify-center text-white text-xs font-bold">
            3-4 أيام
          </div>
          <div className="flex-1 bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
            5-6 أيام
          </div>
          <div className="flex-1 bg-red-500 flex items-center justify-center text-white text-xs font-bold">
            7+ أيام
          </div>
        </div>
        <div className="flex mt-2">
          <div className="flex-1 text-center text-xs text-green-700 font-medium">طازج</div>
          <div className="flex-1 text-center text-xs text-yellow-700 font-medium">جيد</div>
          <div className="flex-1 text-center text-xs text-orange-700 font-medium">منتهٍ قريباً</div>
          <div className="flex-1 text-center text-xs text-red-700 font-medium">حرج</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة قاعدة
        </button>
        <button
          onClick={handleApply}
          disabled={applying}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {applying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          تطبيق على المخزون الحالي
        </button>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="font-medium">حدث خطأ في تحميل القواعد</p>
          <button onClick={refetch} className="mt-3 text-sm text-red-600 underline">إعادة المحاولة</button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl border border-[#eef2f6] p-10 text-center space-y-4">
          <Leaf className="w-12 h-12 mx-auto text-gray-300" />
          <div>
            <p className="text-gray-600 font-semibold text-base">لا توجد قواعد تصريف بعد</p>
            <p className="text-gray-400 text-sm mt-1">ابدأ بالقواعد الافتراضية المجربة، أو أنشئ قاعدة مخصصة</p>
          </div>

          {/* Default rules preview */}
          <div className="bg-white border border-[#eef2f6] rounded-2xl p-4 text-right space-y-2 max-w-sm mx-auto">
            <p className="text-xs font-semibold text-gray-500 mb-3">القواعد الافتراضية</p>
            {DEFAULT_RULES.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{r.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.discount_percent === 0 ? "bg-green-100 text-green-700" : r.discount_percent === 100 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {r.discount_percent === 0 ? "سعر عادي" : r.discount_percent === 100 ? "أوقف البيع" : `خصم ${r.discount_percent}%`}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {seeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              تطبيق الإعدادات الافتراضية
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 border border-[#eef2f6] text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#f8fafc] transition-colors"
            >
              <Plus className="w-4 h-4" />
              إضافة قاعدة مخصصة
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(rule => {
            const zone = getFreshnessZone(rule.min_age_days);
            return (
              <div
                key={rule.id}
                className={`bg-white rounded-2xl border p-5 transition-all ${rule.is_active ? `${zone.border}` : "border-[#eef2f6] opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900">{rule.name}</h4>
                      {!rule.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">متوقف</span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      {/* Age range */}
                      <div className={`flex items-center gap-1.5 text-sm font-medium ${zone.color}`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${zone.bar}`} />
                        من {rule.min_age_days} إلى {rule.max_age_days === -1 ? "ما لا نهاية" : rule.max_age_days} يوم
                      </div>

                      {/* Discount badge */}
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getDiscountBadgeColor(rule.discount_percent)}`}>
                        {rule.discount_percent === 0 ? "بدون خصم" : `خصم ${rule.discount_percent}%`}
                      </span>

                      {/* Customer label speech bubble */}
                      {rule.show_as_sale && (
                        <div className="relative">
                          <div className="bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                            {rule.display_label_ar}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      {rule.auto_apply && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          تطبيق تلقائي
                        </span>
                      )}
                      {rule.show_as_sale && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-blue-500" />
                          يُعرض للعميل كعرض خاص
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(rule)}
                      title={rule.is_active ? "إيقاف" : "تفعيل"}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {rule.is_active
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => openEdit(rule)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(rule.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal
          title={editingRule ? "تعديل قاعدة التصريف" : "إضافة قاعدة تصريف"}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            <Field label="اسم القاعدة">
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="مثال: خصم اليوم الخامس"
                className={InputClass()}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="من اليوم (الحد الأدنى)">
                <input
                  type="number"
                  min={0}
                  value={form.min_age_days}
                  onChange={e => setForm(f => ({ ...f, min_age_days: parseInt(e.target.value) || 0 }))}
                  className={InputClass()}
                />
              </Field>
              <Field label="إلى اليوم (-1 = بدون حد)">
                <input
                  type="number"
                  min={-1}
                  value={form.max_age_days}
                  onChange={e => setForm(f => ({ ...f, max_age_days: parseInt(e.target.value) || -1 }))}
                  className={InputClass()}
                />
              </Field>
            </div>

            <Field label="نسبة الخصم (0-100%)">
              <input
                type="number"
                min={0}
                max={100}
                value={form.discount_percent}
                onChange={e => setForm(f => ({ ...f, discount_percent: parseInt(e.target.value) || 0 }))}
                className={InputClass()}
              />
            </Field>

            <Field label="التسمية الظاهرة للعميل">
              <input
                type="text"
                value={form.display_label_ar}
                onChange={e => setForm(f => ({ ...f, display_label_ar: e.target.value }))}
                placeholder="عرض خاص"
                className={InputClass()}
              />
            </Field>

            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setForm(f => ({ ...f, show_as_sale: !f.show_as_sale }))}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${form.show_as_sale ? "bg-brand-500" : "bg-gray-200"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.show_as_sale ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <span className="text-sm text-gray-700">اعرض للعميل كـ "عرض خاص"</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setForm(f => ({ ...f, auto_apply: !f.auto_apply }))}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${form.auto_apply ? "bg-brand-500" : "bg-gray-200"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.auto_apply ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <span className="text-sm text-gray-700">طبّق تلقائياً عند الحفظ</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-brand-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editingRule ? "حفظ التعديلات" : "إضافة القاعدة"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc] transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal title="تأكيد الحذف" onClose={() => setDeleteConfirm(null)}>
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-gray-700">هل تريد حذف هذه القاعدة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                حذف القاعدة
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc] transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab 2: Today's Freshness Board ──────────────────────────────────────────

function FreshnessTab() {
  const { data: batchesRes, loading, error, refetch } = useApi(
    () => api.get<{ data: any[] }>("/flower-master/batches"),
    []
  );

  const { mutate: applyRules, loading: applying } = useMutation(() => flowerDisposalApi.apply());

  // API returns camelCase from Drizzle — map to display shape
  const batches: FreshnessBatch[] = ((batchesRes as any)?.data ?? []).map((b: any) => {
    const receivedAt = new Date(b.receivedAt ?? b.received_at ?? Date.now());
    const ageDays = Math.max(0, Math.floor((Date.now() - receivedAt.getTime()) / 86_400_000));
    const unitCost = parseFloat(b.unitCost ?? b.unit_cost ?? 0) || 0;
    const discountPct = parseFloat(b.disposalDiscountPct ?? b.disposal_discount_pct ?? 0) || 0;
    const discountedPrice = discountPct > 0 ? unitCost * (1 - discountPct / 100) : unitCost;
    const freshnessScore = Math.max(0, Math.round(100 - (ageDays / 10) * 100));
    const variantName =
      b.variant?.displayNameAr || b.variant?.display_name_ar ||
      b.variant?.flowerType || b.variety_name || "—";
    return {
      id: b.id,
      batch_number:       b.batchNumber       ?? b.batch_number       ?? "—",
      variety_name:       variantName,
      age_days:           ageDays,
      quantity_remaining: b.quantityRemaining  ?? b.quantity_remaining ?? 0,
      original_price:     unitCost,
      discounted_price:   discountedPrice,
      discount_percent:   discountPct,
      quality_status:     b.qualityStatus      ?? b.quality_status     ?? "unknown",
      freshness_score:    freshnessScore,
    };
  });

  const fresh = batches.filter(b => b.age_days <= 2).length;
  const good = batches.filter(b => b.age_days >= 3 && b.age_days <= 4).length;
  const acceptable = batches.filter(b => b.age_days >= 5 && b.age_days <= 6).length;
  const critical = batches.filter(b => b.age_days >= 7).length;

  const kpis = [
    { label: "طازج", sub: "عمر 0-2 يوم", count: fresh, color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500" },
    { label: "جيد", sub: "3-4 أيام", count: good, color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", dot: "bg-yellow-500" },
    { label: "مقبول", sub: "5-6 أيام", count: acceptable, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500" },
    { label: "قارب الانتهاء", sub: "7+ أيام", count: critical, color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
  ];

  async function handleRefresh() {
    const res = await applyRules(undefined as unknown as void);
    if (res) {
      const count = (res as any)?.data?.batches_updated ?? 0;
      toast.success(`تم تحديث الطزاجة — ${count} دفعة`);
      refetch();
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={`${k.bg} border ${k.border} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${k.dot}`} />
              <span className={`text-xs font-medium ${k.color}`}>{k.label}</span>
            </div>
            <div className={`text-3xl font-black ${k.color}`}>{k.count}</div>
            <div className="text-xs text-gray-500 mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={applying}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {applying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          تحديث الطزاجة
        </button>
      </div>

      {/* Batches Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="font-medium">حدث خطأ في تحميل الدفعات</p>
          <button onClick={refetch} className="mt-3 text-sm text-red-600 underline">إعادة المحاولة</button>
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl border border-[#eef2f6] p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">لا توجد دفعات في المخزون</p>
          <p className="text-gray-400 text-sm mt-1">أضف دفعات ورد من صفحة المخزون لعرضها هنا</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(batch => {
            const zone = getFreshnessZone(batch.age_days);
            const freshnessWidth = Math.max(5, Math.min(100, 100 - (batch.age_days / 10) * 100));

            return (
              <div
                key={batch.id}
                className={`bg-white border ${zone.border} rounded-2xl p-4 transition-all`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900">{batch.variety_name}</h4>
                      <span className="text-xs text-gray-400">{batch.batch_number}</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${zone.bg} ${zone.text}`}>
                        {zone.label}
                      </span>
                      {batch.discount_percent > 0 && (
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${getDiscountBadgeColor(batch.discount_percent)}`}>
                          خصم {batch.discount_percent}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="text-xs text-gray-500">العمر</div>
                    <div className={`text-xl font-black ${zone.color}`}>{batch.age_days} أيام</div>
                  </div>
                </div>

                {/* Freshness progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>مقياس الطزاجة</span>
                    <span>{Math.round(freshnessWidth)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${zone.bar}`}
                      style={{ width: `${freshnessWidth}%` }}
                    />
                  </div>
                </div>

                {/* Pricing row */}
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div>
                    <span className="text-gray-400 text-xs">الكمية المتبقية</span>
                    <div className="font-bold text-gray-800">{batch.quantity_remaining} وحدة</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">السعر الأصلي</span>
                    <div className="font-bold text-gray-600">{batch.original_price.toFixed(2)} ر.س</div>
                  </div>
                  {batch.discount_percent > 0 && (
                    <div>
                      <span className="text-gray-400 text-xs">السعر بعد الخصم</span>
                      <div className="font-black text-green-700 text-lg">{batch.discounted_price.toFixed(2)} ر.س</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Today's Bundle ────────────────────────────────────────────────────

function TodayBundleTab() {
  const { data: bundleRes, loading, error, refetch } = useApi(() => flowerDisposalApi.todayBundle(), []);
  const bundle: TodayBundle | null = (bundleRes as any)?.data ?? null;

  const { mutate: publish, loading: publishing } = useMutation(
    (b: TodayBundle) => flowerDisposalApi.publishBundle(b)
  );

  async function handlePublish() {
    if (!bundle) return;
    const res = await publish(bundle);
    if (res) {
      toast.success("تم نشر باقة اليوم كتنسيقة مميزة");
    }
  }

  async function handleRegenerate() {
    refetch();
    toast.info("جارٍ توليد باقة جديدة...");
  }

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800 leading-relaxed">
          هذه الباقة مكوّنة من الورد الأقرب للانتهاء — العميل لن يعرف التفاصيل، سيرى فقط "باقة اليوم" بسعر مميز.
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#eef2f6] p-8 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
            <div className="h-10 bg-gray-200 rounded w-1/3 mb-4 mt-6" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="font-medium">حدث خطأ في تحميل باقة اليوم</p>
          <button onClick={refetch} className="mt-3 text-sm text-red-600 underline">إعادة المحاولة</button>
        </div>
      ) : !bundle ? (
        <div className="bg-gray-50 rounded-2xl border border-[#eef2f6] p-12 text-center">
          <ShoppingBag className="w-14 h-14 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium text-lg">لا توجد باقة لليوم</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            تأكد من وجود ورد في المخزون يقترب من انتهاء صلاحيته لتوليد باقة اليوم
          </p>
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium mx-auto hover:bg-blue-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            محاولة التوليد
          </button>
        </div>
      ) : (
        <>
          {/* Bundle Main Card */}
          <div className="bg-gradient-to-br from-brand-500/10 via-white to-green-50 border border-brand-500/30 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-xl">باقة اليوم</h3>
                <p className="text-xs text-gray-500">مولّدة تلقائياً من الورد القارب من الانتهاء</p>
              </div>
            </div>

            {/* Composition */}
            <div className="bg-white/80 rounded-xl p-4 mb-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">تكوين الباقة</h4>
              <div className="space-y-2">
                {bundle.composition.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                      <span className="text-gray-700 font-medium">{item.name}</span>
                    </div>
                    <span className="text-gray-500">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">القيمة الأصلية</div>
                <div className="text-lg font-bold text-gray-500 line-through">
                  {bundle.original_value.toFixed(0)} ر.س
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className="text-xs text-green-600 mb-1">السعر الآن</div>
                <div className="text-2xl font-black text-green-700">
                  {bundle.sale_price.toFixed(0)} ر.س
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-xs text-blue-600 mb-1">هامش الربح</div>
                <div className="text-2xl font-black text-brand-500">
                  {bundle.expected_margin.toFixed(0)} ر.س
                </div>
              </div>
            </div>

            {/* Discount badge */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-gray-500">
                خصم {bundle.discount_percent}% من السعر الأصلي
              </span>
              <span className="bg-red-100 text-red-700 text-sm font-black px-4 py-1.5 rounded-full">
                وفّر {(bundle.original_value - bundle.sale_price).toFixed(0)} ر.س
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 bg-brand-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {publishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                نشر باقة اليوم
              </button>
              <button
                onClick={handleRegenerate}
                className="px-5 py-3 rounded-xl font-bold border-2 border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc] transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                توليد جديد
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
            <h4 className="font-semibold text-gray-700 mb-4 text-sm">ملخص التوفير</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>نسبة الخصم</span>
                  <span>{bundle.discount_percent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-brand-500 transition-all"
                    style={{ width: `${bundle.discount_percent}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>هامش الربح</span>
                  <span>{bundle.sale_price > 0 ? Math.round((bundle.expected_margin / bundle.sale_price) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-green-500 transition-all"
                    style={{ width: `${bundle.sale_price > 0 ? Math.min(100, (bundle.expected_margin / bundle.sale_price) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = "rules" | "freshness" | "bundle";

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: "rules", label: "قواعد الخصم التلقائي", icon: BarChart2 },
  { id: "freshness", label: "حالة المخزون الآن", icon: Leaf },
  { id: "bundle", label: "باقة اليوم", icon: ShoppingBag },
];

export function FlowerDisposalPage() {
  const [activeTab, setActiveTab] = useState<TabId>("rules");

  const { mutate: applyDisposal } = useMutation(() => flowerDisposalApi.apply());

  async function handleApplyDisposal() {
    const res = await applyDisposal(undefined as unknown as void);
    if (res) {
      const count = (res as any)?.data?.batches_updated ?? 0;
      toast.success(`تم تطبيق الخصومات على ${count} دفعة`);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">

        <FlowerLossAlertsBanner onApplyDisposal={handleApplyDisposal} />

        {/* Page Header */}
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-black text-gray-900">تخفيضات الورد الطازج</h1>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
                سعّر الورد تلقائياً حسب طزاجته — العميل يشوف "عرض خاص" فقط
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-700">نشط</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-1.5 flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-gray-500 hover:bg-[#f8fafc] hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "rules" && <DisposalRulesTab />}
          {activeTab === "freshness" && <FreshnessTab />}
          {activeTab === "bundle" && <TodayBundleTab />}
        </div>
      </div>
    </div>
  );
}
