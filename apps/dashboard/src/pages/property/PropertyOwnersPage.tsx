import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";

export function PropertyOwnersPage() {
  const [reportOwnerId, setReportOwnerId] = useState<string | null>(null);

  const { data, loading, error } = useApi(() => propertyApi.owners.list(), []);
  const owners: any[] = (data as any)?.data ?? [];

  const { data: reportData, loading: reportLoading } = useApi(
    () => reportOwnerId ? propertyApi.owners.report(reportOwnerId) : Promise.resolve(null),
    [reportOwnerId]
  );
  const report = (reportData as any)?.data ?? null;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الملاك</h1>
        <p className="text-gray-500 text-sm mt-1">ملاك العقارات المُدارة من قبل المكتب</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonRows rows={6} /></div>
        ) : error ? (
          <div className="p-6 text-red-600 bg-red-50">{error}</div>
        ) : owners.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg">لا يوجد ملاك مسجلون</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#f8fafc]">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الاسم</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">نوع المالك</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">رسوم الإدارة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">العقارات المُدارة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">التقرير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {owners.map((owner: any) => (
                <tr key={owner.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-[10px] py-[6px]">
                    <div className="font-medium text-gray-900">{owner.name}</div>
                    {owner.phone && <div className="text-xs text-gray-500">{owner.phone}</div>}
                  </td>
                  <td className="px-[10px] py-[6px] text-gray-600">
                    {owner.ownerType === "individual" ? "فرد" :
                     owner.ownerType === "company" ? "شركة" : owner.ownerType ?? "—"}
                  </td>
                  <td className="px-[10px] py-[6px] text-gray-700">
                    {owner.managementFeeRate ? `${owner.managementFeeRate}%` : "—"}
                  </td>
                  <td className="px-[10px] py-[6px]">
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {owner.propertiesCount ?? 0} عقار
                    </span>
                  </td>
                  <td className="px-[10px] py-[6px]">
                    <button
                      onClick={() => setReportOwnerId(owner.id)}
                      className="text-xs px-3 py-1 text-white rounded-lg transition-colors"
                      style={{ backgroundColor: "#5b9bd5" }}
                    >
                      عرض التقرير
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Owner Report Modal */}
      {reportOwnerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                تقرير المالك: {owners.find((o) => o.id === reportOwnerId)?.name}
              </h2>
              <button
                onClick={() => setReportOwnerId(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            {reportLoading ? (
              <SkeletonRows rows={5} />
            ) : report ? (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                    <div className="font-bold text-emerald-700 text-lg">
                      {Number(report.totalRevenue ?? 0).toLocaleString("en-US")}
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">الإيرادات (ر.س)</div>
                  </div>
                  <div className="bg-red-50 rounded-2xl p-4 text-center">
                    <div className="font-bold text-red-700 text-lg">
                      {Number(report.totalExpenses ?? 0).toLocaleString("en-US")}
                    </div>
                    <div className="text-xs text-red-600 mt-1">المصروفات (ر.س)</div>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-4 text-center">
                    <div className="font-bold text-amber-700 text-lg">
                      {Number(report.officeCommission ?? 0).toLocaleString("en-US")}
                    </div>
                    <div className="text-xs text-amber-600 mt-1">عمولة المكتب (ر.س)</div>
                  </div>
                </div>

                {/* Net Amount */}
                <div className="bg-blue-50 rounded-2xl p-4 flex items-center justify-between">
                  <span className="font-semibold text-blue-800">صافي المالك</span>
                  <span className="text-2xl font-bold text-blue-700">
                    {Number(report.netOwnerAmount ?? 0).toLocaleString("en-US")} ر.س
                  </span>
                </div>

                {/* Calculation note */}
                <div className="text-xs text-gray-500 bg-[#f8fafc] rounded-xl p-3">
                  الصافي = الإيرادات ({Number(report.totalRevenue ?? 0).toLocaleString("en-US")})
                  - المصروفات ({Number(report.totalExpenses ?? 0).toLocaleString("en-US")})
                  - عمولة المكتب ({Number(report.officeCommission ?? 0).toLocaleString("en-US")})
                  = {Number(report.netOwnerAmount ?? 0).toLocaleString("en-US")} ر.س
                </div>

                {/* Properties List */}
                {report.properties?.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2 text-sm">العقارات المُدارة</h3>
                    <div className="space-y-2">
                      {report.properties.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center bg-[#f8fafc] rounded-xl px-3 py-2 text-sm">
                          <span className="text-gray-800">{p.name}</span>
                          <span className="text-emerald-600 font-medium">
                            {Number(p.netIncome ?? 0).toLocaleString("en-US")} ر.س
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">لا توجد بيانات لهذا المالك</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
