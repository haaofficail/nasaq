import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";

export function PropertyInvestmentPage() {
  const { data, loading, error } = useApi(
    () => propertyApi.reports.investmentAnalysis(),
    []
  );

  const analysis: any[] = (data as any)?.data ?? [];

  function getRecommendation(item: any): { text: string; color: string } {
    const roi = Number(item.roi ?? item.annualYield ?? 0);
    if (roi >= 8) return { text: "هذا العقار يعطي أعلى عائد", color: "text-emerald-700 bg-emerald-50" };
    if (roi >= 5) return { text: "عائد جيد ومستقر", color: "text-blue-700 bg-blue-50" };
    return { text: "هذا العقار يحتاج مراجعة", color: "text-amber-700 bg-amber-50" };
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">تحليل الاستثمار</h1>
        <p className="text-gray-500 text-sm mt-1">مقارنة عوائد العقارات وتحليل الأداء الاستثماري</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 bg-[#f1f5f9] rounded-2xl animate-pulse" />
            ))}
          </div>
          <SkeletonRows rows={5} />
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl">{error}</div>
      ) : analysis.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#eef2f6]">
          <p className="text-gray-400 text-lg">لا توجد بيانات استثمارية</p>
          <p className="text-gray-300 text-sm mt-1">أضف عقارات وعقوداً لتحليل العوائد</p>
        </div>
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.map((item: any) => {
              const rec = getRecommendation(item);
              return (
                <div key={item.propertyId ?? item.id} className="bg-white rounded-2xl border border-[#eef2f6] p-5 space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.propertyName ?? "عقار"}</h3>
                    <p className="text-gray-500 text-xs">{item.propertyType ?? ""}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-emerald-50 rounded-xl p-2">
                      <div className="text-emerald-700 font-bold text-lg">
                        {Number(item.annualYield ?? item.roi ?? 0).toFixed(1)}%
                      </div>
                      <div className="text-xs text-emerald-600">عائد سنوي</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-2">
                      <div className="text-blue-700 font-bold text-lg">
                        {Number(item.paybackPeriod ?? 0).toFixed(1)}
                      </div>
                      <div className="text-xs text-blue-600">سنة استرداد</div>
                    </div>
                    <div className="bg-violet-50 rounded-xl p-2">
                      <div className="text-violet-700 font-bold text-lg">
                        {Number(item.roi ?? 0).toFixed(1)}%
                      </div>
                      <div className="text-xs text-violet-600">ROI</div>
                    </div>
                  </div>

                  <div className={`text-xs rounded-xl px-3 py-2 font-medium ${rec.color}`}>
                    {rec.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
            <div className="px-[10px] py-[6px] border-b border-[#eef2f6]">
              <h2 className="font-semibold text-gray-800">مقارنة جدولية</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">العقار</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">إيراد سنوي</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">مصاريف سنوية</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">صافي الدخل</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">العائد %</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">ROI %</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الاسترداد (سنة)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analysis.map((item: any) => (
                  <tr key={item.propertyId ?? item.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-[10px] py-[6px] font-medium text-gray-900">{item.propertyName ?? "—"}</td>
                    <td className="px-[10px] py-[6px] text-gray-600">
                      {Number(item.annualIncome ?? 0).toLocaleString("en-US")} ر.س
                    </td>
                    <td className="px-[10px] py-[6px] text-gray-600">
                      {Number(item.annualExpenses ?? 0).toLocaleString("en-US")} ر.س
                    </td>
                    <td className="px-[10px] py-[6px] font-medium text-emerald-700">
                      {Number(item.netIncome ?? 0).toLocaleString("en-US")} ر.س
                    </td>
                    <td className="px-[10px] py-[6px] font-semibold text-blue-700">
                      {Number(item.annualYield ?? 0).toFixed(1)}%
                    </td>
                    <td className="px-[10px] py-[6px] font-semibold text-violet-700">
                      {Number(item.roi ?? 0).toFixed(1)}%
                    </td>
                    <td className="px-[10px] py-[6px] text-gray-600">
                      {Number(item.paybackPeriod ?? 0).toFixed(1)} سنة
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
