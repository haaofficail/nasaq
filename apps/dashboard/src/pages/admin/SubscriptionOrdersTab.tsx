import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/utils";
import { PlanBadge } from "./shared";

function SubscriptionOrdersTab() {
  const [statusFilter, setStatusFilter] = useState("pending_payment");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [paymentRef, setPaymentRef]     = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState<any>(null);

  const { data: ordersRes, loading, refetch } = useApi(
    () => adminApi.subscriptionOrders(statusFilter),
    [statusFilter]
  );
  const orders: any[] = ordersRes?.data ?? [];

  const ORDER_STATUS_TABS = [
    { key: "pending_payment", label: "بانتظار الدفع" },
    { key: "paid",            label: "مدفوعة" },
    { key: "cancelled",       label: "ملغاة" },
    { key: "all",             label: "الكل" },
  ];

  const TYPE_LABELS: Record<string, string> = {
    upgrade: "ترقية باقة",
    renewal: "تجديد",
    addon:   "إضافة",
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
      paid:            "bg-emerald-50 text-emerald-700 border-emerald-200",
      cancelled:       "bg-gray-100 text-gray-500 border-gray-200",
      expired:         "bg-gray-100 text-gray-500 border-gray-200",
    };
    const labels: Record<string, string> = {
      pending_payment: "بانتظار الدفع",
      paid: "مدفوع", cancelled: "ملغي", expired: "منتهي",
    };
    return (
      <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-lg border text-[11px] font-semibold", m[s] ?? m.cancelled)}>
        {labels[s] ?? s}
      </span>
    );
  };

  const handleConfirm = async () => {
    if (!showConfirmModal) return;
    setConfirmingId(showConfirmModal.id);
    try {
      await adminApi.confirmSubscriptionOrder(showConfirmModal.id, paymentRef || undefined);
      toast.success("تم تأكيد الدفع وتفعيل الاشتراك");
      setShowConfirmModal(null);
      setPaymentRef("");
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "فشل التأكيد");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm("إلغاء هذا الطلب؟")) return;
    try {
      await adminApi.cancelSubscriptionOrder(orderId);
      toast.success("تم إلغاء الطلب");
      refetch();
    } catch { toast.error("فشل الإلغاء"); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">طلبات الشراء</h2>
        <p className="text-sm text-gray-400">تأكيد الدفع اليدوي للطلبات المعلّقة</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {ORDER_STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
              statusFilter === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">جارٍ التحميل...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">لا توجد طلبات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-right text-xs text-gray-500 font-medium border-b border-gray-100">
                  <th className="px-5 py-3">المنشأة</th>
                  <th className="px-5 py-3">نوع العملية</th>
                  <th className="px-5 py-3">التفاصيل</th>
                  <th className="px-5 py-3">المبلغ</th>
                  <th className="px-5 py-3">الحالة</th>
                  <th className="px-5 py-3">التاريخ</th>
                  <th className="px-5 py-3 w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800 text-sm">{o.orgName}</p>
                      {o.orgCode && <p className="text-[11px] font-mono text-gray-400">{o.orgCode}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{TYPE_LABELS[o.orderType] ?? o.orderType}</td>
                    <td className="px-5 py-3 text-gray-600">{o.itemName}</td>
                    <td className="px-5 py-3 text-gray-700 font-medium tabular-nums">
                      {o.price ? `${Number(o.price).toLocaleString("en-US")} ر.س` : "—"}
                    </td>
                    <td className="px-5 py-3">{statusBadge(o.status)}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {fmtDate(o.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      {o.status === "pending_payment" && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setShowConfirmModal(o); setPaymentRef(""); }}
                            disabled={confirmingId === o.id}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 disabled:opacity-50"
                          >
                            تأكيد الدفع
                          </button>
                          <button
                            onClick={() => handleCancel(o.id)}
                            className="px-2.5 py-1 text-gray-400 text-[11px] rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors border border-gray-200"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm payment modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">تأكيد الدفع</h3>
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">المنشأة</span>
                <span className="font-medium">{showConfirmModal.orgName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">العملية</span>
                <span className="font-medium">{showConfirmModal.itemName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">المبلغ</span>
                <span className="font-bold text-emerald-600">
                  {showConfirmModal.price ? `${Number(showConfirmModal.price).toLocaleString("en-US")} ر.س` : "—"}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">رقم مرجع الدفع (اختياري)</label>
              <input
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="رقم الحوالة أو مرجع بوابة الدفع"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                dir="ltr"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowConfirmModal(null); setPaymentRef(""); }}
                className="flex-1 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirm}
                disabled={!!confirmingId}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {confirmingId ? "جارٍ التأكيد..." : "تأكيد الدفع"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionOrdersTab;
