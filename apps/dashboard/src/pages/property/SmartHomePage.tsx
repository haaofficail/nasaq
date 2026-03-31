import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";

const today = new Date().toLocaleDateString("ar-SA", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

function KpiCard({
  label, value, sub, color = "bg-white",
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className={clsx("border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-2", color)}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export function SmartHomePage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(() => propertyApi.dashboard(), []);
  const dash: any = (data as any)?.data ?? {};

  const { mutate: sendReminder, loading: reminding } = useMutation((id: string) =>
    propertyApi.sendInvoice(id)
  );

  const kpis = [
    { label: "الإيرادات الشهرية", value: `${Number(dash.monthlyRevenue ?? 0).toLocaleString("en-US")} ريال`, color: "bg-brand-50" },
    { label: "المبالغ المعلقة", value: `${Number(dash.pendingAmount ?? 0).toLocaleString("en-US")} ريال`, color: "bg-yellow-50" },
    { label: "فواتير متأخرة", value: dash.overdueInvoicesCount ?? 0, color: "bg-red-50" },
    { label: "نسبة الإشغال", value: `${dash.occupancyRate ?? 0}%`, color: "bg-emerald-50" },
    { label: "وحدات شاغرة", value: dash.vacantUnitsCount ?? 0, color: "bg-gray-50" },
    { label: "عقود تنتهي قريباً", value: dash.expiringContractsCount ?? 0, color: "bg-orange-50" },
  ];

  const tasks: any[] = dash.tasks ?? [];
  const complianceRate: number = dash.complianceRate ?? 0;

  const complianceColor =
    complianceRate >= 80 ? "bg-emerald-500" :
    complianceRate >= 50 ? "bg-yellow-400" : "bg-red-500";

  async function handleRemind(invoiceId: string) {
    const res = await sendReminder(invoiceId);
    if (res) { toast.success("تم إرسال التذكير"); refetch(); }
  }

  return (
    <div className="p-6 space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة العقارات الذكية</h1>
          <p className="text-sm text-gray-400 mt-0.5">{today}</p>
        </div>
        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate("/property/contracts/new")}
            className="bg-brand-500 text-white hover:bg-brand-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            عقد جديد
          </button>
          <button
            onClick={() => navigate("/property/payments/quick")}
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            سجّل دفعة
          </button>
          <button
            onClick={() => navigate("/property/maintenance")}
            className="border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            طلب صيانة
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <SkeletonCards count={6} cols={3} />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          حدث خطأ أثناء تحميل البيانات
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} label={k.label} value={k.value} color={k.color} />
          ))}
        </div>
      )}

      {/* Tasks + Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">المطلوب منك اليوم</h2>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">لا توجد مهام اليوم</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task: any) => (
                <div key={task.id ?? task.type} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                    {task.subtitle && <p className="text-xs text-gray-400 mt-0.5">{task.subtitle}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {task.type === "overdue_invoice" && (
                      <button
                        onClick={() => handleRemind(task.refId)}
                        disabled={reminding}
                        className="text-xs text-yellow-700 border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 px-2 py-1 rounded-lg transition-colors"
                      >
                        ذكّر
                      </button>
                    )}
                    {task.type === "expiring_contract" && (
                      <button
                        onClick={() => navigate(`/property/contracts/${task.refId}`)}
                        className="text-xs text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded-lg transition-colors"
                      >
                        وثّق
                      </button>
                    )}
                    {task.type === "pending_payment" && (
                      <button
                        onClick={() => navigate(`/property/payments/quick?contractId=${task.refId}`)}
                        className="text-xs text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
                      >
                        ادفع
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compliance */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">نسبة الامتثال التنظيمي</h2>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-8 bg-gray-100 rounded-xl w-24" />
              <div className="h-4 bg-gray-100 rounded-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-gray-900">{complianceRate}%</p>
                <p className="text-sm text-gray-400">امتثال</p>
              </div>
              <div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full transition-all duration-500", complianceColor)}
                    style={{ width: `${complianceRate}%` }}
                  />
                </div>
                <p className={clsx(
                  "text-xs mt-2 font-medium",
                  complianceRate >= 80 ? "text-emerald-600" :
                  complianceRate >= 50 ? "text-yellow-600" : "text-red-600"
                )}>
                  {complianceRate >= 80 ? "ممتاز — معظم العقود موثقة في إيجار" :
                   complianceRate >= 50 ? "متوسط — يوجد عقود تحتاج توثيق" :
                   "منخفض — يجب توثيق العقود في إيجار"}
                </p>
              </div>
              {(dash.complianceBreakdown ?? []).length > 0 && (
                <div className="space-y-2 mt-2">
                  {(dash.complianceBreakdown as any[]).map((item: any) => (
                    <div key={item.label} className="flex justify-between text-xs">
                      <span className="text-gray-500">{item.label}</span>
                      <span className={clsx(
                        "font-medium",
                        item.ok ? "text-emerald-600" : "text-red-500"
                      )}>{item.ok ? "مكتمل" : "ناقص"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
