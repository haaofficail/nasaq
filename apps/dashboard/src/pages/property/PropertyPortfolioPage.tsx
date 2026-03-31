import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonCards } from "@/components/ui/Skeleton";
import clsx from "clsx";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PORTFOLIO_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  investment: { label: "استثماري",       color: "text-brand-700",   bg: "bg-brand-50",   border: "border-brand-200" },
  land:       { label: "أرض",            color: "text-yellow-700",  bg: "bg-yellow-50",  border: "border-yellow-200" },
  under_construction: { label: "تحت الإنشاء", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  personal:   { label: "شخصي",           color: "text-purple-700",  bg: "bg-purple-50",  border: "border-purple-200" },
  for_sale:   { label: "للبيع",          color: "text-red-700",     bg: "bg-red-50",     border: "border-red-200" },
};

const PROPERTY_TYPE_AR: Record<string, string> = {
  residential: "سكني", commercial: "تجاري", industrial: "صناعي", mixed: "مختلط",
  land: "أرض", villa: "فيلا", apartment_building: "عمارة", compound: "مجمع",
};

const PIE_COLORS = ["#5b9bd5", "#059669", "#f59e0b", "#8b5cf6", "#ef4444", "#0d9488", "#f97316", "#6366f1"];

export function PropertyPortfolioPage() {
  const { data, loading, error } = useApi(() => propertyApi.properties.list(), []);
  const properties: any[] = (data as any)?.data ?? [];

  if (loading) {
    return (
      <div className="p-6" dir="rtl">
        <SkeletonCards count={5} cols={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" dir="rtl">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          حدث خطأ أثناء تحميل البيانات
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="p-6 text-center py-20 text-gray-400" dir="rtl">
        <p className="text-base">لا توجد عقارات في المحفظة</p>
      </div>
    );
  }

  // Group by portfolioType
  const portfolioGroups: Record<string, any[]> = {};
  for (const p of properties) {
    const pt = p.portfolioType ?? "investment";
    if (!portfolioGroups[pt]) portfolioGroups[pt] = [];
    portfolioGroups[pt].push(p);
  }

  // Total market value
  const totalMarketValue = properties.reduce(
    (sum: number, p: any) => sum + Number(p.marketValue ?? 0), 0
  );

  // Pie data by type
  const typeCount: Record<string, number> = {};
  for (const p of properties) {
    const t = p.type ?? "residential";
    typeCount[t] = (typeCount[t] ?? 0) + 1;
  }
  const pieData = Object.entries(typeCount).map(([type, count], i) => ({
    name: PROPERTY_TYPE_AR[type] ?? type,
    value: count,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">محفظة العقارات</h1>
        <p className="text-sm text-gray-400 mt-0.5">نظرة شاملة على جميع العقارات</p>
      </div>

      {/* Total market value */}
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
        <p className="text-xs text-brand-600 font-medium">إجمالي القيمة السوقية التقديرية</p>
        <p className="text-3xl font-bold text-brand-800 mt-1">
          {totalMarketValue.toLocaleString("en-US")} ريال
        </p>
        <p className="text-xs text-brand-500 mt-1">{properties.length} عقار في المحفظة</p>
      </div>

      {/* Portfolio type cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(PORTFOLIO_TYPE_CONFIG).map(([key, cfg]) => {
          const group = portfolioGroups[key] ?? [];
          const groupValue = group.reduce((s: number, p: any) => s + Number(p.marketValue ?? 0), 0);
          return (
            <div key={key} className={clsx("border rounded-2xl p-4 shadow-sm", cfg.bg, cfg.border)}>
              <p className={clsx("text-xs font-semibold", cfg.color)}>{cfg.label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">{group.length}</p>
              <p className="text-xs text-gray-500 mt-1">عقار</p>
              {groupValue > 0 && (
                <p className="text-xs text-gray-500 mt-1">{groupValue.toLocaleString("en-US")} ريال</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Pie chart + table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pie */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">توزيع أنواع العقارات</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={false}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => `${v} عقار`} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Properties table */}
        <div className="md:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-500">العقار</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">النوع</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">المدينة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">الوحدات</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">الإشغال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {properties.map((p: any) => {
                const occupancy = p.totalUnits > 0
                  ? Math.round(((p.occupiedUnits ?? 0) / p.totalUnits) * 100)
                  : 0;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{PROPERTY_TYPE_AR[p.type] ?? p.type}</td>
                    <td className="px-4 py-3 text-gray-500">{p.city ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{p.totalUnits ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              "h-full rounded-full",
                              occupancy >= 80 ? "bg-emerald-500" :
                              occupancy >= 50 ? "bg-yellow-400" : "bg-red-400"
                            )}
                            style={{ width: `${occupancy}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-left">{occupancy}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
