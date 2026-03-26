import { useState } from "react";
import { Users, Eye, Pencil, Trash2, Plus } from "lucide-react";
import { clsx } from "clsx";
import { marketingApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/utils";
import {
  Button,
  Modal,
  Input,
  Select,
  TextArea,
  EmptyState,
  PageSkeleton,
  SkeletonCards,
  Toggle,
} from "@/components/ui";

// ── Types ──────────────────────────────────────────────────────

interface Segment {
  id: string;
  name: string;
  description?: string;
  color?: string;
  rules: any;
  customerCount: number;
  lastCalculatedAt?: string;
  isActive: boolean;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { value: "red",    label: "أحمر" },
  { value: "blue",   label: "أزرق" },
  { value: "green",  label: "أخضر" },
  { value: "purple", label: "بنفسجي" },
  { value: "amber",  label: "ذهبي" },
  { value: "gray",   label: "رمادي" },
];

const COLOR_BORDER: Record<string, string> = {
  red:    "border-red-400",
  blue:   "border-blue-400",
  green:  "border-green-400",
  purple: "border-purple-400",
  amber:  "border-amber-400",
  gray:   "border-gray-400",
};

const COLOR_BG: Record<string, string> = {
  red:    "bg-red-50 text-red-700",
  blue:   "bg-blue-50 text-blue-700",
  green:  "bg-green-50 text-green-700",
  purple: "bg-purple-50 text-purple-700",
  amber:  "bg-amber-50 text-amber-700",
  gray:   "bg-gray-100 text-gray-600",
};

function getColorBorder(color?: string) {
  return COLOR_BORDER[color ?? ""] ?? COLOR_BORDER.blue;
}

function getColorBg(color?: string) {
  return COLOR_BG[color ?? ""] ?? COLOR_BG.blue;
}

// ── Default form state ─────────────────────────────────────────

const DEFAULT_FORM = {
  name: "",
  description: "",
  color: "blue",
  rules: "{}",
  isActive: true,
};

// ── Main component ─────────────────────────────────────────────

export function CustomerSegmentsPage() {
  const { data: res, loading, error, refetch } = useApi(() => marketingApi.segments(), []);
  const segments: Segment[] = res?.data ?? [];

  const [showForm, setShowForm]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Segment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Segment | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Segment | null>(null);

  const [form, setForm] = useState(DEFAULT_FORM);

  // Preview state
  const {
    data: previewRes,
    loading: previewLoading,
    error: previewError,
  } = useApi(
    () => (previewTarget ? marketingApi.segmentPreview(previewTarget.id) : Promise.resolve(null)),
    [previewTarget?.id]
  );

  const { mutate: createSegment, loading: creating } = useMutation((data: any) =>
    marketingApi.createSegment(data)
  );
  const { mutate: updateSegment, loading: updating } = useMutation((data: { id: string; payload: any }) =>
    marketingApi.updateSegment(data.id, data.payload)
  );
  const { mutate: deleteSegment, loading: deleting } = useMutation((id: string) =>
    marketingApi.deleteSegment(id)
  );

  // ── Handlers ────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  }

  function openEdit(seg: Segment) {
    setEditTarget(seg);
    setForm({
      name:        seg.name,
      description: seg.description ?? "",
      color:       seg.color ?? "blue",
      rules:       JSON.stringify(seg.rules ?? {}, null, 2),
      isActive:    seg.isActive,
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("اسم الشريحة مطلوب");
      return;
    }

    let parsedRules: any = {};
    try {
      parsedRules = JSON.parse(form.rules || "{}");
    } catch {
      toast.error("صيغة JSON للقواعد غير صحيحة");
      return;
    }

    const payload = {
      name:        form.name.trim(),
      description: form.description.trim() || undefined,
      color:       form.color,
      rules:       parsedRules,
      isActive:    form.isActive,
    };

    if (editTarget) {
      const res = await updateSegment({ id: editTarget.id, payload });
      if (res) {
        toast.success("تم تحديث الشريحة");
        setShowForm(false);
        refetch();
      }
    } else {
      const res = await createSegment(payload);
      if (res) {
        toast.success("تم إنشاء الشريحة");
        setShowForm(false);
        refetch();
      }
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await deleteSegment(deleteTarget.id);
    if (res !== null) {
      toast.success("تم حذف الشريحة");
      setDeleteTarget(null);
      refetch();
    }
  }

  // ── Stats ────────────────────────────────────────────────────

  const totalSegments   = segments.length;
  const activeSegments  = segments.filter((s) => s.isActive).length;
  const totalCustomers  = segments.reduce((acc, s) => acc + (s.customerCount ?? 0), 0);

  const stats = [
    { label: "إجمالي الشرائح",      value: totalSegments,  color: "text-brand-600",  bg: "bg-brand-50" },
    { label: "الشرائح النشطة",       value: activeSegments, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "إجمالي العملاء",       value: totalCustomers, color: "text-violet-600",  bg: "bg-violet-50" },
  ];

  // ── Render ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonCards count={3} cols={3} />
        <PageSkeleton rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <Users className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <Button variant="secondary" onClick={refetch}>إعادة المحاولة</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">شرائح العملاء</h1>
            <p className="text-sm text-gray-400">مجموعات الجمهور الديناميكية</p>
          </div>
        </div>
        <Button icon={Plus} onClick={openCreate}>شريحة جديدة</Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className={clsx("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Segment cards ── */}
      {segments.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا توجد شرائح بعد"
          description="أنشئ شريحتك الأولى لتصنيف عملائك بشكل ذكي"
          action={<Button icon={Plus} onClick={openCreate}>أنشئ شريحتك الأولى</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className={clsx(
                "bg-white rounded-2xl border border-gray-100 overflow-hidden flex",
                "border-r-4",
                getColorBorder(seg.color)
              )}
            >
              <div className="flex-1 p-5">
                {/* Name + status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{seg.name}</h3>
                  <span
                    className={clsx(
                      "shrink-0 text-xs px-2 py-0.5 rounded-full font-medium",
                      seg.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {seg.isActive ? "نشطة" : "معطّلة"}
                  </span>
                </div>

                {seg.description && (
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">{seg.description}</p>
                )}

                {/* Customer count badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={clsx("inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium", getColorBg(seg.color))}>
                    <Users className="w-3 h-3" />
                    {seg.customerCount ?? 0} عميل
                  </span>
                </div>

                {/* Last calculated */}
                {seg.lastCalculatedAt && (
                  <p className="text-xs text-gray-400">
                    آخر حساب: {fmtDate(seg.lastCalculatedAt)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col items-center justify-center gap-1 px-3 border-r border-gray-50">
                <button
                  onClick={() => setPreviewTarget(seg)}
                  className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                  title="معاينة"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEdit(seg)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                  title="تعديل"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(seg)}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
        <div className="space-y-3">
          {[
            { q: "ما هي «الشريحة المستهدفة»؟", a: "مجموعة ديناميكية من العملاء تلتقي بشرط محدد تحدده أنت، مثل: «عملاء أنفقوا أكثر من 5,000 ر.س» أو «عملاء لم يحجزوا منذ 60 يوماً»." },
            { q: "هل تتحدث الشريحة تلقائياً؟", a: "نعم، عند استخدام الشريحة في حملة تسويقية يحسب النظام أعضاءها لحظياً بناءً على القواعد المحددة." },
            { q: "كيف أستخدم الشرائح في الحملات التسويقية؟", a: "عند إنشاء حملة جديدة في قسم «التسويق» اختر الشريحة المستهدفة وسترسل الرسالة لكل أعضائها تلقائياً." },
          ].map(faq => (
            <details key={faq.q} className="border border-gray-100 rounded-xl">
              <summary className="px-4 py-3 text-sm text-gray-700 cursor-pointer font-medium hover:bg-gray-50 rounded-xl">{faq.q}</summary>
              <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTarget ? "تعديل الشريحة" : "شريحة جديدة"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button loading={creating || updating} onClick={handleSubmit}>
              {editTarget ? "حفظ التعديلات" : "إنشاء الشريحة"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="اسم الشريحة"
            name="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="مثال: العملاء المميزون"
            required
          />

          <TextArea
            label="الوصف"
            name="description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="وصف اختياري للشريحة"
            rows={2}
          />

          <Select
            label="اللون"
            name="color"
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            options={COLOR_OPTIONS}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              قواعد الشريحة
              <span className="mr-2 text-xs font-normal text-gray-400">قواعد متقدمة (JSON)</span>
            </label>
            <textarea
              value={form.rules}
              onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))}
              rows={5}
              dir="ltr"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-100 resize-none bg-gray-50"
              placeholder="{}"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Toggle
              checked={form.isActive}
              onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              label="الشريحة نشطة"
            />
          </div>
        </div>
      </Modal>

      {/* ── Preview Modal ── */}
      <Modal
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        title={`معاينة: ${previewTarget?.name ?? ""}`}
        size="lg"
      >
        {previewLoading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-xl" />
            ))}
          </div>
        ) : previewError ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-500">{previewError}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Count badge */}
            <div className="flex items-center gap-3 p-4 bg-brand-50 rounded-2xl">
              <Users className="w-5 h-5 text-brand-500" />
              <div>
                <p className="text-lg font-bold text-brand-700 tabular-nums">
                  {previewRes?.data?.count ?? 0}
                </p>
                <p className="text-xs text-brand-500">عميل يطابق هذه الشريحة</p>
              </div>
            </div>

            {/* Sample table */}
            {(previewRes?.data?.sample?.length ?? 0) > 0 ? (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">عينة من العملاء</p>
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-right font-medium">الاسم</th>
                        <th className="px-4 py-3 text-right font-medium">الجوال</th>
                        <th className="px-4 py-3 text-right font-medium">إجمالي الإنفاق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {previewRes!.data.sample.map((customer: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-900">{customer.name ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-500 tabular-nums" dir="ltr">
                            {customer.phone ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-900 tabular-nums">
                            {customer.totalSpent != null
                              ? `${Number(customer.totalSpent).toLocaleString("ar-SA")} ر.س`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="لا يوجد عملاء يطابقون هذه الشريحة"
                description="جرّب تعديل قواعد الشريحة"
              />
            )}
          </div>
        )}
      </Modal>

      {/* ── Delete confirm Modal ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف الشريحة"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              تأكيد الحذف
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          هل أنت متأكد من حذف شريحة{" "}
          <span className="font-semibold text-gray-900">"{deleteTarget?.name}"</span>؟
          <br />
          لا يمكن التراجع عن هذا الإجراء.
        </p>
      </Modal>
    </div>
  );
}
