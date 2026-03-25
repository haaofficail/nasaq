import { useState } from "react";
import {
  CreditCard, CheckCircle2, Clock, Package, History,
  ArrowUp, ArrowDown, Minus, RefreshCw, AlertCircle, X,
} from "lucide-react";
import { clsx } from "clsx";
import { orgSubscriptionApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PLANS, ADDONS, PLAN_MAP } from "@/lib/constants";
import { toast } from "@/hooks/useToast";
import { Modal } from "@/components/ui";

// ── helpers ────────────────────────────────────────────────

function annualPrice(monthly: number) { return monthly * 12; }
function fmtPrice(n: number) { return n === 0 ? "حسب الطلب" : `${n.toLocaleString("en-US")} ر.س`; }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:           { label: "نشط",              cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    trialing:         { label: "تجربة",            cls: "bg-brand-50 text-brand-700 border-brand-200" },
    past_due:         { label: "متأخر",            cls: "bg-amber-50 text-amber-700 border-amber-200" },
    cancelled:        { label: "ملغي",             cls: "bg-gray-50 text-gray-600 border-gray-200" },
    suspended:        { label: "موقوف",            cls: "bg-red-50 text-red-700 border-red-200" },
    paid:             { label: "مدفوع",            cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    pending_payment:  { label: "بانتظار الدفع",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
    expired:          { label: "منتهي",            cls: "bg-gray-100 text-gray-500 border-gray-200" },
  };
  const m = map[status] ?? { label: status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold", m.cls)}>
      {m.label}
    </span>
  );
}

function DaysBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  const cls = days <= 7
    ? "bg-red-50 text-red-600 border-red-100"
    : days <= 30
    ? "bg-amber-50 text-amber-600 border-amber-100"
    : "bg-emerald-50 text-emerald-600 border-emerald-100";
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium", cls)}>
      <Clock className="w-3 h-3" />
      {days} يوم متبقي
    </span>
  );
}

type ModalType = "renew" | "upgrade" | "addon" | null;

interface PendingOrder {
  orderId: string;
  title: string;
  price: number;
  type: ModalType;
}

// ── main page ──────────────────────────────────────────────

export function SubscriptionPage() {
  const [modalType, setModalType]         = useState<ModalType>(null);
  const [selectedPlan, setSelectedPlan]   = useState<string | null>(null);
  const [selectedAddon, setSelectedAddon] = useState<string | null>(null);
  const [confirming, setConfirming]       = useState(false);
  const [pendingOrder, setPendingOrder]   = useState<PendingOrder | null>(null);

  const { data: subRes, loading, refetch: refetchSub } = useApi(() => orgSubscriptionApi.get(), []);
  const { data: ordersRes, refetch: refetchOrders }     = useApi(() => orgSubscriptionApi.orders(), []);

  const sub     = subRes?.data;
  const orders: any[] = ordersRes?.data ?? [];

  const activeAddonKeys = new Set((sub?.addons ?? []).map((a: any) => a.addonKey));
  const currentPlan     = PLAN_MAP[sub?.plan ?? "basic"];
  const currentPlanIdx  = PLANS.findIndex(p => p.key === sub?.plan);

  // ── actions ────────────────────────────────────────────

  const closeModal = () => {
    setModalType(null);
    setSelectedPlan(null);
    setSelectedAddon(null);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      let res: any;
      if (modalType === "renew") {
        res = await orgSubscriptionApi.renew();
      } else if (modalType === "upgrade" && selectedPlan) {
        res = await orgSubscriptionApi.upgrade(selectedPlan);
      } else if (modalType === "addon" && selectedAddon) {
        res = await orgSubscriptionApi.purchaseAddon(selectedAddon);
      }

      const order = res?.data;
      if (!order) throw new Error("استجابة غير متوقعة");

      // Build pending order display
      let title = "";
      let price = 0;
      if (modalType === "renew") {
        title = `تجديد باقة ${currentPlan?.name ?? ""}`;
        price = annualPrice(currentPlan?.price ?? 0);
      } else if (modalType === "upgrade" && selectedPlan) {
        const plan = PLAN_MAP[selectedPlan];
        title = `الانتقال إلى باقة ${plan?.name ?? ""}`;
        price = annualPrice(plan?.price ?? 0);
      } else if (modalType === "addon" && selectedAddon) {
        const addon = ADDONS.find(a => a.key === selectedAddon);
        title = `تفعيل إضافة: ${addon?.name ?? ""}`;
        price = addon?.price ?? 0;
      }

      setPendingOrder({ orderId: order.orderId, title, price, type: modalType });
      closeModal();
      refetchSub();
      refetchOrders();
    } catch (err: any) {
      toast.error(err?.message ?? "حدث خطأ، حاول مجدداً");
    } finally {
      setConfirming(false);
    }
  };

  const handleDeactivateAddon = async (addonKey: string) => {
    // TODO: add deactivate-addon endpoint when needed
    toast.info("للإلغاء تواصل مع الدعم");
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 bg-gray-100 rounded-xl w-48" />
        <div className="h-40 bg-gray-100 rounded-2xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  // Selected plan/addon details for modal
  const upgradePlan = selectedPlan ? PLAN_MAP[selectedPlan] : null;
  const upgradeAddon = selectedAddon ? ADDONS.find(a => a.key === selectedAddon) : null;

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-brand-500" /> إدارة الباقة
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">تفاصيل اشتراكك، الإضافات، وطلبات الشراء</p>
      </div>

      {/* ── Pending order notice ── */}
      {pendingOrder && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">{pendingOrder.title}</p>
            <p className="text-xs text-amber-700 mt-0.5">
              تم إنشاء طلب التجديد بنجاح — في انتظار الدفع
            </p>
            <p className="text-xs font-mono text-amber-600 mt-1">رقم الطلب: {pendingOrder.orderId}</p>
            {/* TODO: Moyasar payment gateway — وجّه المستخدم هنا لإتمام الدفع مع orderId */}
          </div>
          <button onClick={() => setPendingOrder(null)} className="text-amber-400 hover:text-amber-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Current plan card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">الباقة الحالية</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl font-bold text-brand-600">
                {currentPlan?.name ?? sub?.plan}
              </span>
              {sub?.status && <StatusBadge status={sub.status} />}
              <DaysBadge days={sub?.daysRemaining ?? null} />
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-gray-900">
              {currentPlan?.price ? fmtPrice(annualPrice(currentPlan.price)) : "حسب الطلب"}
            </p>
            {currentPlan?.price ? <p className="text-xs text-gray-400 mt-0.5">سنوياً</p> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">تاريخ الانتهاء</p>
            <p className="text-sm font-medium text-gray-700">
              {sub?.endDate ? new Date(sub.endDate).toLocaleDateString("ar-SA") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">الإضافات المفعّلة</p>
            <p className="text-sm font-medium text-gray-700">{(sub?.addons ?? []).length} إضافة</p>
          </div>
        </div>

        {(sub?.addons ?? []).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs font-medium text-gray-500 mb-2">الإضافات النشطة</p>
            <div className="flex flex-wrap gap-2">
              {(sub?.addons ?? []).map((a: any) => (
                <span key={a.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium border border-brand-100">
                  <CheckCircle2 className="w-3 h-3" /> {a.addonName}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-gray-50">
          <button
            onClick={() => setModalType("renew")}
            className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            تجديد الاشتراك
          </button>
        </div>
      </div>

      {/* ── Available plans ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-base font-semibold text-gray-800">الباقات المتاحة</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100">
          {PLANS.map((plan, idx) => {
            const isCurrent = plan.key === sub?.plan;
            const isHigher  = idx > currentPlanIdx;
            const isLower   = idx < currentPlanIdx;
            return (
              <div
                key={plan.key}
                className={clsx(
                  "bg-white p-5",
                  isCurrent && "border-2 border-brand-400 bg-brand-50/30"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-800">{plan.name}</p>
                  {isCurrent && (
                    <span className="inline-block px-2 py-0.5 bg-brand-100 text-brand-700 rounded-md text-[10px] font-semibold">
                      باقتك الحالية
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {plan.price === 0 ? "حسب الطلب" : fmtPrice(annualPrice(plan.price))}
                </p>
                {plan.price > 0 && <p className="text-xs text-gray-400 mb-3">ر.س / سنوياً</p>}
                {!isCurrent && plan.price > 0 && (
                  <button
                    onClick={() => { setSelectedPlan(plan.key); setModalType("upgrade"); }}
                    className={clsx(
                      "mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
                      isHigher
                        ? "bg-brand-500 text-white border-brand-500 hover:bg-brand-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    {isHigher ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {isHigher ? "ترقية" : "تغيير"}
                  </button>
                )}
                {!isCurrent && plan.price === 0 && (
                  <p className="mt-2 text-xs text-gray-400">تواصل مع الدعم</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Available add-ons ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" /> الإضافات المتاحة
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
          {ADDONS.map((addon) => {
            const active = activeAddonKeys.has(addon.key);
            return (
              <div key={addon.key} className="bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-800">{addon.name}</p>
                      {active && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-semibold border border-emerald-100">
                          <CheckCircle2 className="w-2.5 h-2.5" /> مفعّل
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{addon.description}</p>
                    <p className="text-xs font-medium text-gray-600 mt-2">
                      {addon.price === 0 ? "مجاناً" : `${fmtPrice(addon.price)} / سنوياً`}
                    </p>
                  </div>
                  {active ? (
                    <button
                      onClick={() => handleDeactivateAddon(addon.key)}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-xl text-xs transition-all"
                    >
                      <X className="w-3 h-3" /> إلغاء
                    </button>
                  ) : (
                    <button
                      onClick={() => { setSelectedAddon(addon.key); setModalType("addon"); }}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-brand-50 hover:text-brand-600 text-gray-600 border border-gray-200 hover:border-brand-200 rounded-xl text-xs font-medium transition-all"
                    >
                      تفعيل
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Orders + History ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
          <History className="w-4 h-4 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-800">سجل العمليات</h2>
        </div>
        {orders.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">لا توجد عمليات بعد</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-right text-xs text-gray-500 font-medium">
                  <th className="px-5 py-3">نوع العملية</th>
                  <th className="px-5 py-3">التفاصيل</th>
                  <th className="px-5 py-3">المبلغ</th>
                  <th className="px-5 py-3">الحالة</th>
                  <th className="px-5 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((row: any) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {row.orderType === "upgrade"  ? "ترقية باقة"  :
                       row.orderType === "renewal"  ? "تجديد"       :
                       row.orderType === "addon"    ? "إضافة"       : row.orderType}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{row.itemName}</td>
                    <td className="px-5 py-3 text-gray-600 tabular-nums">
                      {row.price ? `${Number(row.price).toLocaleString("en-US")} ر.س` : "—"}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleDateString("ar-SA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {/* Renew modal */}
      <Modal
        open={modalType === "renew"}
        onClose={closeModal}
        title="تجديد الاشتراك"
        footer={
          <>
            <button onClick={closeModal} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">إلغاء</button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-5 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {confirming ? "جارٍ الإنشاء..." : "تأكيد التجديد"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">الباقة</span>
              <span className="font-semibold text-gray-800">{currentPlan?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">فترة التجديد</span>
              <span className="font-semibold text-gray-800">سنة كاملة</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-600 font-medium">المبلغ الإجمالي</span>
              <span className="font-bold text-brand-600 text-base">
                {currentPlan?.price ? fmtPrice(annualPrice(currentPlan.price)) : "حسب الطلب"}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            بعد التأكيد سيتم إنشاء طلب الدفع — يمكنك إتمام الدفع عبر بوابة الدفع المتاحة.
          </p>
          {/* TODO: Moyasar payment gateway — وجّه المستخدم هنا لإتمام الدفع مع orderId */}
        </div>
      </Modal>

      {/* Upgrade/change plan modal */}
      <Modal
        open={modalType === "upgrade"}
        onClose={closeModal}
        title="تغيير الباقة"
        footer={
          <>
            <button onClick={closeModal} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">إلغاء</button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-5 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {confirming ? "جارٍ الإنشاء..." : "تأكيد الترقية"}
            </button>
          </>
        }
      >
        {upgradePlan && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">الباقة الحالية</span>
                <span className="font-medium text-gray-700">{currentPlan?.name}</span>
              </div>
              <div className="flex justify-center">
                <Minus className="w-4 h-4 text-gray-300" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">الباقة الجديدة</span>
                <span className="font-semibold text-brand-700">{upgradePlan.name}</span>
              </div>
              {currentPlan && upgradePlan.price > 0 && (
                <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                  <span className="text-gray-500">فرق السعر (سنوياً)</span>
                  <span className={clsx(
                    "font-bold text-base",
                    upgradePlan.price > (currentPlan.price ?? 0) ? "text-brand-600" : "text-emerald-600"
                  )}>
                    {upgradePlan.price > (currentPlan.price ?? 0) ? "+" : ""}
                    {fmtPrice(annualPrice(upgradePlan.price - (currentPlan.price ?? 0)))}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="font-medium text-gray-600">المبلغ الإجمالي (سنوياً)</span>
                <span className="font-bold text-brand-600 text-base">
                  {fmtPrice(annualPrice(upgradePlan.price))}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              بعد التأكيد سيتم إنشاء طلب الدفع — يمكنك إتمام الدفع عبر بوابة الدفع المتاحة.
            </p>
            {/* TODO: Moyasar payment gateway — وجّه المستخدم هنا لإتمام الدفع مع orderId */}
          </div>
        )}
      </Modal>

      {/* Addon purchase modal */}
      <Modal
        open={modalType === "addon"}
        onClose={closeModal}
        title="تفعيل إضافة"
        footer={
          <>
            <button onClick={closeModal} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">إلغاء</button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-5 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {confirming ? "جارٍ الإنشاء..." : "تأكيد التفعيل"}
            </button>
          </>
        }
      >
        {upgradeAddon && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">الإضافة</span>
                <span className="font-semibold text-gray-800">{upgradeAddon.name}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{upgradeAddon.description}</p>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="font-medium text-gray-600">السعر السنوي</span>
                <span className="font-bold text-brand-600 text-base">
                  {upgradeAddon.price === 0 ? "مجاناً" : fmtPrice(upgradeAddon.price)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              بعد التأكيد سيتم إنشاء طلب الدفع — يمكنك إتمام الدفع عبر بوابة الدفع المتاحة.
            </p>
            {/* TODO: Moyasar payment gateway — وجّه المستخدم هنا لإتمام الدفع مع orderId */}
          </div>
        )}
      </Modal>
    </div>
  );
}
