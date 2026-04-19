import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";

interface ReportCard {
  id: string;
  title: string;
  description: string;
  fetcher: () => Promise<any>;
  color: string;
  bg: string;
}

const REPORTS: ReportCard[] = [
  {
    id: "occupancy",
    title: "تقرير الشغور",
    description: "نسبة الإشغال والوحدات الشاغرة",
    fetcher: () => propertyApi.reports.occupancy(),
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  {
    id: "collection",
    title: "تقرير التحصيل",
    description: "الفواتير المسددة والمتبقية",
    fetcher: () => propertyApi.reports.collection(),
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  {
    id: "profitLoss",
    title: "الربح والخسارة",
    description: "الإيرادات مقابل المصروفات",
    fetcher: () => propertyApi.reports.profitLoss(),
    color: "text-violet-700",
    bg: "bg-violet-50",
  },
  {
    id: "roi",
    title: "تقرير ROI",
    description: "عائد الاستثمار لكل عقار",
    fetcher: () => propertyApi.reports.roi(),
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  {
    id: "overduePayments",
    title: "المدفوعات المتأخرة",
    description: "المستأجرون المتأخرون وقيم الديون",
    fetcher: () => propertyApi.reports.overduePayments(),
    color: "text-red-700",
    bg: "bg-red-50",
  },
  {
    id: "maintenanceSummary",
    title: "ملخص الصيانة",
    description: "طلبات الصيانة وتكاليفها",
    fetcher: () => propertyApi.reports.maintenanceSummary(),
    color: "text-teal-700",
    bg: "bg-teal-50",
  },
];

function ReportViewer({ report, onClose }: { report: ReportCard; onClose: () => void }) {
  const { data, loading, error } = useApi(report.fetcher, [report.id]);
  const rows: any[] = (data as any)?.data ?? [];

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eef2f6]">
          <h2 className="text-lg font-bold text-gray-900">{report.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <SkeletonRows rows={6} />
          ) : error ? (
            <div className="text-red-600 bg-red-50 rounded-xl p-4">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400">لا توجد بيانات لهذا التقرير</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc]">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="text-right px-4 py-2 font-medium text-gray-600">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-[#f8fafc]">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-2 text-gray-700">
                        {typeof row[col] === "number"
                          ? Number(row[col]).toLocaleString("en-US")
                          : String(row[col] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function PropertyReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportCard | null>(null);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
        <p className="text-gray-500 text-sm mt-1">تقارير الأداء المالي والتشغيلي للعقارات</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <div
            key={report.id}
            className="bg-white rounded-2xl border border-[#eef2f6] p-6 space-y-3 hover:border-[#eef2f6] hover:shadow-sm transition-all"
          >
            <div className={`w-9 h-9 rounded-[10px] ${report.bg} flex items-center justify-center`}>
              <span className={`text-lg font-bold ${report.color}`}>
                {report.title.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className={`font-semibold ${report.color}`}>{report.title}</h3>
              <p className="text-gray-500 text-sm">{report.description}</p>
            </div>
            <button
              onClick={() => setActiveReport(report)}
              className="w-full py-2 border border-[#eef2f6] rounded-xl text-sm text-gray-700 hover:bg-[#f8fafc] transition-colors"
            >
              عرض التقرير
            </button>
          </div>
        ))}
      </div>

      {activeReport && (
        <ReportViewer report={activeReport} onClose={() => setActiveReport(null)} />
      )}
    </div>
  );
}
