import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";

const STATUSES = [
  { value: "new", label: "جديد", color: "bg-blue-100 text-blue-700" },
  { value: "contacted", label: "تم التواصل", color: "bg-indigo-100 text-indigo-700" },
  { value: "viewing_scheduled", label: "موعد معاينة", color: "bg-amber-100 text-amber-700" },
  { value: "qualified", label: "مؤهل", color: "bg-violet-100 text-violet-700" },
  { value: "converted", label: "تحول لعقد", color: "bg-emerald-100 text-emerald-700" },
  { value: "lost", label: "فُقد", color: "bg-red-100 text-red-700" },
];

const PRIORITIES = [
  { value: "low", label: "منخفض", color: "bg-gray-100 text-gray-600" },
  { value: "normal", label: "عادي", color: "bg-blue-50 text-blue-600" },
  { value: "high", label: "عالي", color: "bg-orange-100 text-orange-700" },
  { value: "urgent", label: "عاجل", color: "bg-red-100 text-red-700" },
];

export function PropertyInquiriesPage() {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(() => propertyApi.inquiries.list(), []);
  const inquiries: any[] = (data as any)?.data ?? [];

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    try {
      await propertyApi.inquiries.update(id, { status });
      toast.success("تم تحديث الحالة");
      refetch();
    } catch (e: any) {
      toast.error(`فشل التحديث: ${e.message}`);
    } finally {
      setUpdatingId(null);
    }
  }

  function getStatusInfo(value: string) {
    return STATUSES.find((s) => s.value === value) ?? { label: value, color: "bg-gray-100 text-gray-600" };
  }

  function getPriorityInfo(value: string) {
    return PRIORITIES.find((p) => p.value === value) ?? { label: value, color: "bg-gray-100 text-gray-600" };
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الاستفسارات</h1>
        <p className="text-gray-500 text-sm mt-1">متابعة استفسارات العملاء وإدارة خط المبيعات</p>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATUSES.slice(0, 4).map((s) => {
            const count = inquiries.filter((i: any) => i.status === s.value).length;
            return (
              <div key={s.value} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${s.color}`}>{s.label}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonRows rows={6} /></div>
        ) : error ? (
          <div className="p-6 text-red-600 bg-red-50">{error}</div>
        ) : inquiries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg">لا توجد استفسارات</p>
            <p className="text-gray-300 text-sm mt-1">الاستفسارات ستظهر هنا عند ورودها</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الاسم</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الجوال</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">المصدر</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الأولوية</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">تاريخ المعاينة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inquiries.map((inq: any) => {
                const statusInfo = getStatusInfo(inq.status);
                const priorityInfo = getPriorityInfo(inq.priority);
                return (
                  <tr key={inq.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{inq.clientName ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{inq.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{inq.source ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityInfo.color}`}>
                        {priorityInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {inq.viewingDate ? new Date(inq.viewingDate).toLocaleDateString("ar-SA") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={inq.status}
                        onChange={(e) => handleStatusChange(inq.id, e.target.value)}
                        disabled={updatingId === inq.id}
                        className={`text-xs px-2 py-1 rounded-lg border-0 cursor-pointer font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 ${statusInfo.color}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
