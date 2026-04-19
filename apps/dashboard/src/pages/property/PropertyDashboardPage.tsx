import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import clsx from "clsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";

export function PropertyDashboardPage() {
  const { data, loading, error } = useApi(() => propertyApi.dashboard(), []);

  if (loading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-[#f1f5f9] rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-[#f1f5f9] rounded-2xl animate-pulse" />
          <div className="h-64 bg-[#f1f5f9] rounded-2xl animate-pulse" />
        </div>
        <SkeletonRows />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" dir="rtl">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
          حدث خطأ أثناء تحميل البيانات: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      label: "نسبة الإشغال",
      value: `${(data as any).occupancyRate ?? 0}%`,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "إيرادات الشهر",
      value: `${Number((data as any).monthRevenue ?? 0).toLocaleString("en-US")} ريال`,
      color: "bg-teal-50 text-teal-700",
    },
    {
      label: "مصروفات الشهر",
      value: `${Number((data as any).monthExpenses ?? 0).toLocaleString("en-US")} ريال`,
      color: "bg-orange-50 text-orange-700",
    },
    {
      label: "صافي الدخل",
      value: `${Number((data as any).netIncome ?? 0).toLocaleString("en-US")} ريال`,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "فواتير متأخرة",
      value: `${(data as any).overdueInvoicesCount ?? 0} فاتورة`,
      sub: `${Number((data as any).overdueInvoicesAmount ?? 0).toLocaleString("en-US")} ريال`,
      color: "bg-red-50 text-red-700",
    },
    {
      label: "عقود تنتهي قريباً",
      value: `${(data as any).expiringContracts ?? 0} عقد`,
      color: "bg-yellow-50 text-yellow-700",
    },
  ];

  const revenueChart: any[] = (data as any).revenueChart ?? [];
  const occupancyTrend: any[] = (data as any).occupancyTrend ?? [];
  const alerts: any[] = (data as any).alerts ?? [];
  const recentPayments: any[] = (data as any).recentPayments ?? [];

  const alertColors: Record<string, string> = {
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    danger: "bg-red-50 border-red-200 text-red-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">لوحة العقارات</h1>
        <p className="text-sm text-gray-500 mt-1">نظرة شاملة على أداء محفظتك العقارية</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={clsx("rounded-2xl p-4", kpi.color)}>
            <div className="text-2xl font-bold">{kpi.value}</div>
            {kpi.sub && <div className="text-sm opacity-70 mt-0.5">{kpi.sub}</div>}
            <div className="text-sm mt-1 opacity-80">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue vs Expenses */}
        <div className="bg-white border border-[#eef2f6] rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">الإيرادات مقابل المصروفات (آخر 12 شهر)</h3>
          {revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" name="الإيرادات" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="المصروفات" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات</div>
          )}
        </div>

        {/* Occupancy Trend */}
        <div className="bg-white border border-[#eef2f6] rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">معدل الإشغال الشهري</h3>
          {occupancyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={occupancyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Line type="monotone" dataKey="rate" name="الإشغال" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات</div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">التنبيهات</h3>
          {alerts.map((alert: any, i: number) => (
            <div
              key={i}
              className={clsx(
                "rounded-2xl border px-4 py-3 text-sm",
                alertColors[alert.type] ?? "bg-gray-50 border-[#eef2f6] text-gray-700"
              )}
            >
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Recent Payments */}
      <div className="bg-white border border-[#eef2f6] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-[10px] py-[6px] border-b border-[#eef2f6]">
          <h3 className="text-sm font-semibold text-gray-700">آخر المدفوعات</h3>
        </div>
        {recentPayments.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">لا توجد مدفوعات حديثة</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#f8fafc]">
              <tr>
                <th className="px-4 py-2 text-right font-medium text-gray-500">المستأجر</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">العقار</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">المبلغ</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">التاريخ</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">الطريقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentPayments.slice(0, 10).map((p: any) => (
                <tr key={p.id} className="hover:bg-[#f8fafc]">
                  <td className="px-[10px] py-[6px] font-medium text-gray-900">{p.tenantName ?? "—"}</td>
                  <td className="px-[10px] py-[6px] text-gray-500">{p.propertyName ?? "—"}</td>
                  <td className="px-[10px] py-[6px] font-medium text-emerald-700">
                    {Number(p.amount ?? 0).toLocaleString("en-US")} ريال
                  </td>
                  <td className="px-[10px] py-[6px] text-gray-500">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString("ar-SA") : "—"}
                  </td>
                  <td className="px-[10px] py-[6px] text-gray-500">{p.method ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
