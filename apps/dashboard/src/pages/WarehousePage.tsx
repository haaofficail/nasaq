import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { clsx } from "clsx";
import { toast } from "@/hooks/useToast";
import { fulfillmentsApi, inventoryApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select, PageHeader } from "@/components/ui";
import { SkeletonRows } from "@/components/ui/Skeleton";
import {
  ClipboardList, Plus, ChevronLeft, Truck, Package, ArrowRight, CheckCircle2,
  AlertTriangle, Clock, RotateCcw, Search, X, Boxes,
} from "lucide-react";
import { fmtDate } from "@/lib/utils";

// ============================================================
// Constants
// ============================================================

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; next: string }> = {
  reserved:    { label: "محجوز",       color: "text-gray-600",     bg: "bg-gray-100",    icon: Clock,          next: "بدء الجمع" },
  picking:     { label: "جمع المعدات", color: "text-blue-600",     bg: "bg-blue-100",    icon: Boxes,          next: "انتهاء التجهيز" },
  preparation: { label: "تجهيز",       color: "text-purple-600",   bg: "bg-purple-100",  icon: Package,        next: "تم الإرسال" },
  dispatched:  { label: "مرسل",        color: "text-orange-600",   bg: "bg-orange-100",  icon: Truck,          next: "قيد الاستخدام" },
  in_use:      { label: "قيد الاستخدام", color: "text-emerald-600", bg: "bg-emerald-100", icon: CheckCircle2,   next: "استلام الإرجاع" },
  returned:    { label: "تم الإرجاع",  color: "text-teal-600",     bg: "bg-teal-100",    icon: RotateCcw,      next: "بدء الفحص" },
  inspection:  { label: "تحت الفحص",  color: "text-amber-600",    bg: "bg-amber-100",   icon: Search,         next: "اكتمل" },
  completed:   { label: "مكتمل",       color: "text-emerald-700",  bg: "bg-emerald-50",  icon: CheckCircle2,   next: "" },
  maintenance_required: { label: "يحتاج صيانة", color: "text-red-600", bg: "bg-red-100", icon: AlertTriangle, next: "" },
};

const ALLOC_STATUS: Record<string, { label: string; color: string }> = {
  allocated:  { label: "مخصص",       color: "text-gray-600" },
  picked:     { label: "تم الجمع",   color: "text-blue-600" },
  dispatched: { label: "مرسل",       color: "text-orange-600" },
  in_use:     { label: "قيد الاستخدام", color: "text-emerald-600" },
  returned:   { label: "مُرجع",      color: "text-teal-600" },
  inspected:  { label: "مفحوص",      color: "text-purple-600" },
};

const ALLOC_NEXT_STATUS: Record<string, string> = {
  allocated:  "picked",
  picked:     "dispatched",
  dispatched: "in_use",
  in_use:     "returned",
  returned:   "inspected",
};

// ============================================================
// FULFILLMENTS LIST
// ============================================================

function FulfillmentsTab() {
  const [stageFilter, setStageFilter] = useState("");
  const [detail,      setDetail]      = useState<any>(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [createForm,  setCreateForm]  = useState({ bookingId: "", notes: "" });
  const [creating,    setCreating]    = useState(false);
  const [advancing,   setAdvancing]   = useState(false);
  const [showInspect, setShowInspect] = useState(false);
  const [inspectForm, setInspectForm] = useState({ result: "completed", notes: "" });
  const [addAssetModal, setAddAssetModal] = useState(false);
  const [assetSearch,   setAssetSearch]   = useState("");
  const [addingAsset,   setAddingAsset]   = useState(false);

  const params: Record<string, string> = {};
  if (stageFilter) params.stage = stageFilter;

  const { data, loading, refetch } = useApi(
    () => fulfillmentsApi.list(Object.keys(params).length ? params : undefined),
    [stageFilter],
  );
  const { data: statsData } = useApi(() => fulfillmentsApi.stats(), []);
  const { data: detailData, loading: detailLoading, refetch: refetchDetail } = useApi(
    () => detail ? fulfillmentsApi.get(detail) : Promise.resolve(null),
    [detail],
  );
  const { data: assetsRes } = useApi(
    () => assetSearch ? inventoryApi.assets({ search: assetSearch, status: "available" }) : Promise.resolve(null),
    [assetSearch],
  );

  const fulfillments: any[] = data?.data || [];
  const stats: any[]        = statsData?.data || [];
  const detailRow           = detailData?.data;
  const availableAssets: any[] = assetsRes?.data || [];

  const stageCount = (stage: string) => stats.find((s: any) => s.stage === stage)?.count || 0;

  const handleCreate = async () => {
    if (!createForm.bookingId.trim()) return;
    setCreating(true);
    try {
      const res = await fulfillmentsApi.create(createForm);
      toast.success("تم إنشاء طلب التنفيذ");
      setShowCreate(false);
      setCreateForm({ bookingId: "", notes: "" });
      refetch();
      setDetail(res.data?.id);
    } catch (err: any) {
      toast.error(err?.message || "فشل الإنشاء");
    } finally { setCreating(false); }
  };

  const handleAdvance = async (targetStage?: string) => {
    if (!detailRow) return;
    setAdvancing(true);
    try {
      await fulfillmentsApi.advanceStage(detailRow.id, targetStage ? { targetStage } : undefined);
      toast.success("تم تحديث المرحلة");
      refetchDetail();
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "فشل التحديث");
    } finally { setAdvancing(false); }
  };

  const handleInspect = async () => {
    if (!detailRow) return;
    setAdvancing(true);
    try {
      await fulfillmentsApi.advanceStage(detailRow.id, {
        targetStage: inspectForm.result,
        inspectionResult: inspectForm.result,
        inspectionNotes: inspectForm.notes,
      });
      toast.success("تم تسجيل نتيجة الفحص");
      setShowInspect(false);
      refetchDetail();
      refetch();
    } catch { toast.error("فشل تسجيل الفحص"); } finally { setAdvancing(false); }
  };

  const handleUpdateAlloc = async (allocId: string, status: string) => {
    if (!detailRow) return;
    try {
      await fulfillmentsApi.updateAllocation(detailRow.id, allocId, { status });
      toast.success("تم التحديث");
      refetchDetail();
    } catch { toast.error("فشل التحديث"); }
  };

  const handleAddAsset = async (assetId: string) => {
    if (!detailRow) return;
    setAddingAsset(true);
    try {
      await fulfillmentsApi.addAllocation(detailRow.id, { assetId });
      toast.success("تمت إضافة الأصل");
      setAddAssetModal(false);
      setAssetSearch("");
      refetchDetail();
    } catch { toast.error("فشل الإضافة"); } finally { setAddingAsset(false); }
  };

  const handleRemoveAlloc = async (allocId: string) => {
    if (!detailRow || !confirm("إزالة هذا الأصل من الطلب؟")) return;
    await fulfillmentsApi.removeAllocation(detailRow.id, allocId);
    toast.success("تمت الإزالة");
    refetchDetail();
  };

  const currentStage = detailRow?.stage;
  const stageConf    = currentStage ? STAGE_CONFIG[currentStage] : null;
  const nextLabel    = stageConf?.next;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {["", "reserved", "picking", "preparation", "dispatched", "in_use", "returned", "inspection"].map(s => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
                stageFilter === s ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
              )}
            >
              {s ? STAGE_CONFIG[s]?.label : "الكل"}
              {s && stageCount(s) > 0 && (
                <span className={clsx("mr-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
                  stageFilter === s ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                )}>{stageCount(s)}</span>
              )}
            </button>
          ))}
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>طلب تنفيذ جديد</Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2"><SkeletonRows rows={4} /></div>
      ) : fulfillments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد طلبات تنفيذ</h3>
          <p className="text-sm text-gray-400 mb-4">أنشئ طلب تنفيذ عند تأكيد حجز يحتاج معدات</p>
          <Button icon={Plus} onClick={() => setShowCreate(true)}>طلب تنفيذ جديد</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {fulfillments.map((f: any) => {
            const sc = STAGE_CONFIG[f.stage] || STAGE_CONFIG.reserved;
            return (
              <div
                key={f.id}
                onClick={() => setDetail(f.id)}
                className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-all"
              >
                <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", sc.bg)}>
                  <sc.icon className={clsx("w-4 h-4", sc.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{f.booking_number || f.booking_id?.slice(-8)}</p>
                    <span className={clsx("px-2 py-0.5 rounded-full text-[11px] font-medium", sc.bg, sc.color)}>{sc.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {f.customer_name && <span>{f.customer_name} · </span>}
                    {f.event_date && <span>{fmtDate(f.event_date)} · </span>}
                    {f.allocation_count > 0 && <span>{f.allocation_count} أصل</span>}
                  </p>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-300" />
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="طلب تنفيذ جديد" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowCreate(false)}>إلغاء</Button><Button onClick={handleCreate} loading={creating}>إنشاء</Button></>}
      >
        <div className="space-y-4">
          <Input label="رقم الحجز (UUID)" name="bookingId" value={createForm.bookingId}
            onChange={e => setCreateForm(p => ({ ...p, bookingId: e.target.value }))}
            placeholder="الصق معرف الحجز هنا" dir="ltr" required />
          <Input label="ملاحظات (اختياري)" name="notes" value={createForm.notes}
            onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))} placeholder="أي ملاحظات..." />
        </div>
      </Modal>

      {/* DETAIL DRAWER */}
      {detail && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {detailLoading || !detailRow ? (
              <div className="p-8 text-center text-gray-400">جارٍ التحميل…</div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{detailRow.booking_number || detailRow.booking_id?.slice(-8)}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{detailRow.customer_name} · {detailRow.event_date && fmtDate(detailRow.event_date)}</p>
                  </div>
                  <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Stage progress */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {stageConf && (
                        <span className={clsx("px-3 py-1 rounded-full text-sm font-semibold", stageConf.bg, stageConf.color)}>
                          {stageConf.label}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {currentStage === "inspection" ? (
                        <Button onClick={() => setShowInspect(true)} loading={advancing}>تسجيل نتيجة الفحص</Button>
                      ) : nextLabel ? (
                        <Button onClick={() => handleAdvance()} loading={advancing} icon={ArrowRight}>{nextLabel}</Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Mini timeline */}
                  <div className="flex items-center gap-1 overflow-x-auto py-1">
                    {["reserved","picking","preparation","dispatched","in_use","returned","inspection","completed"].map((s, i, arr) => {
                      const stagesOrder = ["reserved","picking","preparation","dispatched","in_use","returned","inspection","completed"];
                      const currentIdx  = stagesOrder.indexOf(currentStage);
                      const thisIdx     = stagesOrder.indexOf(s);
                      const done        = thisIdx < currentIdx;
                      const active      = s === currentStage;
                      const sc2         = STAGE_CONFIG[s];
                      return (
                        <div key={s} className="flex items-center gap-1 shrink-0">
                          <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                            active ? "bg-brand-600 text-white" : done ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
                          )}>{i + 1}</div>
                          {i < arr.length - 1 && <div className={clsx("h-0.5 w-4", done ? "bg-emerald-300" : "bg-gray-200")} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Asset Allocations */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">الأصول المخصصة</h3>
                    {!["completed","maintenance_required"].includes(currentStage) && (
                      <button onClick={() => setAddAssetModal(true)} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> إضافة أصل
                      </button>
                    )}
                  </div>

                  {detailRow.allocations?.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">لم تُضف أصولاً بعد</p>
                  ) : (
                    <div className="space-y-2">
                      {detailRow.allocations?.map((alloc: any) => {
                        const aStatus = ALLOC_STATUS[alloc.status] || ALLOC_STATUS.allocated;
                        const nextSt  = ALLOC_NEXT_STATUS[alloc.status];
                        return (
                          <div key={alloc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100 shrink-0">
                              <Package className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{alloc.asset_name || alloc.type_name || "—"}</p>
                              <p className="text-xs text-gray-400 font-mono">{alloc.serial_number || alloc.type_category || ""}</p>
                            </div>
                            <span className={clsx("text-xs font-medium", aStatus.color)}>{aStatus.label}</span>
                            {nextSt && !["completed","maintenance_required"].includes(currentStage) && (
                              <button
                                onClick={() => handleUpdateAlloc(alloc.id, nextSt)}
                                className="text-xs bg-brand-50 text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-100 transition-colors"
                              >
                                {ALLOC_STATUS[nextSt]?.label}
                              </button>
                            )}
                            {!["completed","maintenance_required"].includes(currentStage) && (
                              <button onClick={() => handleRemoveAlloc(alloc.id)} className="p-1 hover:bg-red-50 rounded-lg transition-colors">
                                <X className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {detailRow.notes && (
                  <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700">{detailRow.notes}</div>
                )}
                {detailRow.inspection_result && (
                  <div className={clsx("rounded-xl p-3 text-sm", detailRow.inspection_result === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    نتيجة الفحص: {detailRow.inspection_result === "completed" ? "جاهز للاستخدام" : "يحتاج صيانة"}
                    {detailRow.inspection_notes && ` — ${detailRow.inspection_notes}`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INSPECTION MODAL */}
      <Modal open={showInspect} onClose={() => setShowInspect(false)} title="نتيجة الفحص" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowInspect(false)}>إلغاء</Button><Button onClick={handleInspect} loading={advancing}>تأكيد الفحص</Button></>}
      >
        <div className="space-y-4">
          <Select label="نتيجة الفحص" name="result" value={inspectForm.result}
            onChange={e => setInspectForm(p => ({ ...p, result: e.target.value }))}
            options={[
              { value: "completed",             label: "✓ جاهز للاستخدام" },
              { value: "maintenance_required",  label: "⚠ يحتاج صيانة" },
            ]} />
          <Input label="ملاحظات الفحص" name="iNotes" value={inspectForm.notes}
            onChange={e => setInspectForm(p => ({ ...p, notes: e.target.value }))} placeholder="وصف الحالة..." />
        </div>
      </Modal>

      {/* ADD ASSET MODAL */}
      {addAssetModal && (
        <Modal open={addAssetModal} onClose={() => { setAddAssetModal(false); setAssetSearch(""); }} title="إضافة أصل للطلب" size="sm">
          <div className="space-y-3">
            <Input
              label="البحث عن أصل"
              name="assetSearch"
              value={assetSearch}
              onChange={e => setAssetSearch(e.target.value)}
              placeholder="اسم الأصل أو الرقم التسلسلي..."
            />
            {availableAssets.length === 0 && assetSearch && (
              <p className="text-sm text-gray-400 text-center py-2">لا توجد نتائج</p>
            )}
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {availableAssets.map((a: any) => (
                <button
                  key={a.id}
                  onClick={() => handleAddAsset(a.id)}
                  disabled={addingAsset}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50 border border-gray-100 transition-colors text-right"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Package className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{a.name || a.assetTypeName || "—"}</p>
                    {a.serialNumber && <p className="text-xs text-gray-400 font-mono">{a.serialNumber}</p>}
                  </div>
                  <Plus className="w-4 h-4 text-brand-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

const TABS = [
  { id: "fulfillments", label: "طلبات التنفيذ" },
];

export function WarehousePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "fulfillments";
  return (
    <div dir="rtl">
      <PageHeader
        title="المستودع"
        description="إدارة دورة حياة المعدات من الحجز حتى الإرجاع والفحص"
        tabs={TABS}
        activeTab={tab}
        onTabChange={(id) => setSearchParams({ tab: id })}
      />
      {tab === "fulfillments" && <FulfillmentsTab />}
    </div>
  );
}
