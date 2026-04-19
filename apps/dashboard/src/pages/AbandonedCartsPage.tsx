import { useState } from "react";
import { ShoppingCart, CheckCircle, TrendingUp, DollarSign, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { marketingApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";
import { fmtDate, fmtMoney } from "@/lib/utils";
import {
  Button,
  EmptyState,
  PageSkeleton,
  SkeletonCards,
} from "@/components/ui";

// ── Types ──────────────────────────────────────────────────────

interface AbandonedCart {
  id: string;
  phone?: string;
  email?: string;
  items: any[];
  totalAmount?: string;
  recoveryStatus: "abandoned" | "reminder_sent" | "recovered" | "expired";
  remindersSent: number;
  lastReminderAt?: string;
  recoveredAt?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  recovered: number;
  totalValue: string;
  recoveredValue: string;
  recoveryRate: number;
}

// ── Constants ──────────────────────────────────────────────────

const STATUS_FILTERS = [
  { id: "",              label: "الكل" },
  { id: "abandoned",     label: "متروكة" },
  { id: "reminder_sent", label: "تم الإشعار" },
  { id: "recovered",     label: "مسترجعة" },
  { id: "expired",       label: "منتهية" },
];

const STATUS_BADGE: Record<
  AbandonedCart["recoveryStatus"],
  { label: string; className: string }
> = {
  abandoned:     { label: "متروكة",      className: "bg-amber-50 text-amber-700" },
  reminder_sent: { label: "تم الإشعار", className: "bg-blue-50 text-blue-700" },
  recovered:     { label: "مسترجعة",    className: "bg-emerald-50 text-emerald-700" },
  expired:       { label: "منتهية",      className: "bg-gray-100 text-gray-500" },
};

// ── Main component ─────────────────────────────────────────────

export function AbandonedCartsPage() {
  const [activeStatus, setActiveStatus] = useState("");

  const {
    data: statsRes,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApi(() => marketingApi.abandonedCartsStats(), []);

  const {
    data: listRes,
    loading: listLoading,
    error: listError,
    refetch: refetchList,
  } = useApi(
    () => marketingApi.abandonedCartsList(activeStatus || undefined),
    [activeStatus]
  );

  const { mutate: updateStatus, loading: updating } = useMutation(
    (payload: { id: string; status: string }) =>
      marketingApi.updateAbandonedCartStatus(payload.id, payload.status)
  );

  const stats: Stats = statsRes?.data ?? {
    total: 0,
    recovered: 0,
    totalValue: "0",
    recoveredValue: "0",
    recoveryRate: 0,
  };

  const carts: AbandonedCart[] = listRes?.data ?? [];

  // ── Handlers ────────────────────────────────────────────────

  async function handleMarkRecovered(cart: AbandonedCart) {
    const res = await updateStatus({ id: cart.id, status: "recovered" });
    if (res !== null) {
      toast.success("تم تعيين العربة كمسترجعة");
      refetchList();
      refetchStats();
    }
  }

  // ── Loading / Error ──────────────────────────────────────────

  const isLoading = statsLoading || listLoading;
  const hasError  = statsError || listError;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <SkeletonCards count={4} cols={4} />
        <PageSkeleton rows={5} />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <ShoppingCart className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-sm text-red-500 mb-3">{statsError ?? listError}</p>
        <Button
          variant="secondary"
          onClick={() => {
            refetchStats();
            refetchList();
          }}
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">العربات المتروكة</h1>
          <p className="text-sm text-gray-400">تتبّع واسترجاع عربات الحجز غير المكتملة</p>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <ShoppingCart className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-amber-600">{stats.total}</p>
          <p className="text-xs text-gray-400 mt-0.5">إجمالي العربات المتروكة</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-emerald-600">
            {stats.recoveryRate != null ? `${Number(stats.recoveryRate).toFixed(1)}%` : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">معدل الاسترجاع</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-blue-600">
            {fmtMoney(stats.totalValue)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">إجمالي القيمة</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
            <CheckCircle className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-violet-600">
            {fmtMoney(stats.recoveredValue)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">القيمة المسترجعة</p>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 border-b border-[#eef2f6] overflow-x-auto">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveStatus(f.id)}
            className={clsx(
              "px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap relative shrink-0",
              activeStatus === f.id
                ? "text-brand-600 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-brand-500"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      {carts.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="لا توجد عربات متروكة"
          description="العربات المتروكة ستظهر هنا عند إضافة عملاء خدمات دون إكمال الحجز"
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[#eef2f6]">
                <tr>
                  <th className="px-5 py-[6px] text-right text-xs font-medium text-gray-500">
                    الجوال / البريد
                  </th>
                  <th className="px-5 py-[6px] text-right text-xs font-medium text-gray-500">
                    المنتجات
                  </th>
                  <th className="px-5 py-[6px] text-right text-xs font-medium text-gray-500">
                    المبلغ
                  </th>
                  <th className="px-5 py-[6px] text-right text-xs font-medium text-gray-500">
                    الحالة
                  </th>
                  <th className="px-5 py-[6px] text-right text-xs font-medium text-gray-500">
                    التذكيرات
                  </th>
                  <th className="px-5 py-[6px] text-right text-xs font-medium text-gray-500">
                    التاريخ
                  </th>
                  <th className="px-5 py-[6px] text-right text-xs font-medium text-gray-500">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {carts.map((cart) => {
                  const badge = STATUS_BADGE[cart.recoveryStatus] ?? STATUS_BADGE.abandoned;
                  const canRecover =
                    cart.recoveryStatus === "abandoned" ||
                    cart.recoveryStatus === "reminder_sent";

                  return (
                    <tr key={cart.id} className="hover:bg-[#f8fafc] transition-colors">
                      {/* Contact */}
                      <td className="px-5 py-4">
                        <p className="text-gray-900 tabular-nums" dir="ltr">
                          {cart.phone ?? cart.email ?? "—"}
                        </p>
                      </td>

                      {/* Items count */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          {cart.items?.length ?? 0} منتج
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4 tabular-nums text-gray-900">
                        {cart.totalAmount != null ? fmtMoney(cart.totalAmount) : "—"}
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-4">
                        <span
                          className={clsx(
                            "text-xs px-2.5 py-1 rounded-full font-medium",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Reminders count */}
                      <td className="px-5 py-4 tabular-nums text-gray-500">
                        {cart.remindersSent ?? 0}
                        {cart.lastReminderAt && (
                          <span className="block text-xs text-gray-400 mt-0.5">
                            آخر: {fmtDate(cart.lastReminderAt)}
                          </span>
                        )}
                      </td>

                      {/* Created date */}
                      <td className="px-5 py-4 text-gray-500 tabular-nums">
                        {fmtDate(cart.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        {canRecover && (
                          <button
                            onClick={() => handleMarkRecovered(cart)}
                            disabled={updating}
                            className={clsx(
                              "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                              "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                              updating && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <RefreshCw className="w-3 h-3" />
                            تعيين مسترجعة
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
        <div className="space-y-3">
          {[
            { q: "ما هي «السلة المتروكة»؟", a: "هي عملية حجز أو شراء بدأها عميل (أو زائر) ثم أغلق الصفحة قبل إتمامها. يسجّلها النظام تلقائياً." },
            { q: "ما المقصود بـ «تم الإشعار»؟", a: "يعني أُرسلت للعميل رسالة تذكير بسلته المتروكة." },
            { q: "ما «معدل الاسترجاع»؟", a: "نسبة السلات التي أكمل أصحابها عملية الحجز بعد التذكير من إجمالي السلات المتروكة." },
            { q: "كيف أحسّن معدل استرجاع السلات؟", a: "أرسل رسائل تذكير مخصصة في أقل من ساعة من ترك السلة، وقدّم كوبون خصم صغيراً لتشجيع الإتمام." },
          ].map(faq => (
            <details key={faq.q} className="border border-[#eef2f6] rounded-xl">
              <summary className="px-[10px] py-[6px] text-sm text-gray-700 cursor-pointer font-medium hover:bg-[#f8fafc] rounded-xl">{faq.q}</summary>
              <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
