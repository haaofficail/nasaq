import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";

interface ComplianceItem {
  id: string;
  label: string;
  platform?: string;
  platformUrl?: string;
  requiredStep?: string;
}

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  {
    id: "rer_registered",
    label: "مسجل في السجل العيني",
    platform: "rer.sa",
    platformUrl: "https://www.rer.sa",
    requiredStep: "تسجيل العقار في منصة السجل العيني العقاري",
  },
  {
    id: "building_permit",
    label: "رخصة بناء سارية",
    platform: "بلدي",
    platformUrl: "https://balady.gov.sa",
    requiredStep: "تجديد رخصة البناء عبر منصة بلدي",
  },
  {
    id: "occupancy_certificate",
    label: "شهادة إشغال",
    platform: "بلدي",
    platformUrl: "https://balady.gov.sa",
    requiredStep: "استخراج شهادة الإشغال من منصة بلدي",
  },
  {
    id: "civil_defense_permit",
    label: "رخصة دفاع مدني سارية",
    platform: "نجاز",
    platformUrl: "https://najiz.sa",
    requiredStep: "تجديد رخصة الدفاع المدني عبر منصة نجاز",
  },
  {
    id: "insurance_active",
    label: "تأمين ساري",
    requiredStep: "التواصل مع شركة التأمين لتجديد الوثيقة",
  },
  {
    id: "contracts_ejar",
    label: "كل العقود موثقة في إيجار",
    platform: "إيجار",
    platformUrl: "https://www.ejar.sa",
    requiredStep: "توثيق عقود الإيجار في منصة إيجار",
  },
  {
    id: "white_land_fees",
    label: "رسوم أراضي بيضاء مسددة",
    platform: "هيئة الإسكان",
    platformUrl: "https://www.rega.gov.sa",
    requiredStep: "سداد رسوم الأراضي البيضاء عبر هيئة الإسكان",
  },
  {
    id: "malak_registered",
    label: "مسجل في ملاك",
    platform: "ملاك",
    platformUrl: "https://www.rega.gov.sa",
    requiredStep: "تسجيل العقار في منظومة ملاك",
  },
  {
    id: "building_code_compliant",
    label: "مطابق لكود البناء السعودي",
    platform: "هيئة المهندسين",
    requiredStep: "مراجعة مهندس معتمد للتحقق من المطابقة",
  },
];

export function ComplianceDashboardPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [actionItem, setActionItem] = useState<ComplianceItem | null>(null);

  const { data: propertiesData } = useApi(() => propertyApi.properties.list(), []);
  const properties: any[] = (propertiesData as any)?.data ?? [];

  const { data: complianceData, loading, error } = useApi(
    () => selectedPropertyId ? propertyApi.properties.compliance(selectedPropertyId) : Promise.resolve(null),
    [selectedPropertyId]
  );

  const { data: alertsData } = useApi(() => propertyApi.compliance.alerts(), []);
  const alerts: any[] = (alertsData as any)?.data ?? [];

  const complianceRecord: Record<string, boolean> = (complianceData as any)?.data ?? {};

  const passedCount = COMPLIANCE_ITEMS.filter((item) => complianceRecord[item.id] === true).length;
  const totalCount = COMPLIANCE_ITEMS.length;
  const percentage = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">لوحة الامتثال التنظيمي</h1>
        <p className="text-gray-500 text-sm mt-1">مراجعة الامتثال للمتطلبات التنظيمية والقانونية</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert: any, i: number) => (
            <div key={i} className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 text-sm flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">!</span>
              <span>{alert.message ?? JSON.stringify(alert)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Property Selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">اختر العقار</label>
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="w-full max-w-sm border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">اختر عقاراً للمراجعة</option>
            {properties.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {selectedPropertyId && !loading && (
          <div className="space-y-3">
            {/* Progress */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">نسبة الامتثال</span>
              <span className={`text-lg font-bold ${percentage >= 80 ? "text-emerald-600" : percentage >= 50 ? "text-amber-600" : "text-red-600"}`}>
                {percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  percentage >= 80 ? "bg-emerald-500" :
                  percentage >= 50 ? "bg-amber-400" : "bg-red-400"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">{passedCount} من {totalCount} بند مستوفى</div>
          </div>
        )}
      </div>

      {/* Compliance Items */}
      {selectedPropertyId && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-4"><SkeletonRows rows={9} /></div>
          ) : error ? (
            <div className="p-6 text-red-600 bg-red-50">{error}</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {COMPLIANCE_ITEMS.map((item) => {
                const passed = complianceRecord[item.id] === true;
                return (
                  <div key={item.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        passed ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                      }`}>
                        {passed ? "✓" : "✗"}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{item.label}</span>
                        {item.platform && (
                          <span className="text-xs text-gray-400 mr-2">({item.platform})</span>
                        )}
                      </div>
                    </div>
                    {!passed && (
                      <button
                        onClick={() => setActionItem(item)}
                        className="text-xs px-3 py-1.5 text-white rounded-lg whitespace-nowrap transition-colors"
                        style={{ backgroundColor: "#5b9bd5" }}
                      >
                        اتخذ إجراء
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!selectedPropertyId && (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400 text-lg">اختر عقاراً لعرض حالة الامتثال</p>
        </div>
      )}

      {/* Action Modal */}
      {actionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">اتخاذ إجراء</h2>
              <button onClick={() => setActionItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="bg-red-50 rounded-xl p-4 space-y-1">
              <p className="font-medium text-red-800">{actionItem.label}</p>
              <p className="text-sm text-red-600">هذا البند غير مستوفى</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">الخطوة المطلوبة:</p>
              <p className="text-sm text-gray-600">{actionItem.requiredStep}</p>
            </div>

            {actionItem.platformUrl && (
              <a
                href={actionItem.platformUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full py-3 text-center text-white rounded-xl text-sm font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: "#5b9bd5" }}
              >
                الانتقال إلى {actionItem.platform}
              </a>
            )}

            <button
              onClick={() => setActionItem(null)}
              className="w-full py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
