import { useState } from "react";
import { flowerIntelligenceApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { AlertTriangle, TrendingDown, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface LossAlertBatch {
  id: string;
  display_name: string;
  days_left: number;
  cost_at_risk: number;
  discount_percent: number;
}

interface LossAlertSummary {
  batchCount: number;
  totalCostAtRisk: number;
  totalRevenueIfWasted: number;
  undiscountedCount: number;
  recommendation: string;
}

interface LossAlertsResponse {
  data: LossAlertBatch[];
  summary: LossAlertSummary;
}

export function FlowerLossAlertsBanner({ onApplyDisposal }: { onApplyDisposal?: () => void }) {
  const { data, loading } = useApi(
    () => flowerIntelligenceApi.lossAlerts() as Promise<LossAlertsResponse>,
    []
  );

  const [expanded, setExpanded] = useState(false);

  if (loading) return null;

  const summary: LossAlertSummary | null = (data as any)?.summary ?? null;
  const batches: LossAlertBatch[] = (data as any)?.data ?? [];

  if (!summary || summary.batchCount === 0) return null;

  const isUrgent = summary.undiscountedCount > 0;

  const gradientClass = isUrgent
    ? "bg-gradient-to-l from-red-600 to-red-500"
    : "bg-gradient-to-l from-amber-500 to-amber-400";

  const borderClass = isUrgent ? "border-red-700" : "border-amber-600";

  return (
    <div className={`${gradientClass} border ${borderClass} rounded-2xl overflow-hidden mb-2`} dir="rtl">
      {/* Main Banner Row */}
      <div className="p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">

          {/* Left: Icon + Title + Subtitle */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg leading-tight">تحذير خسارة وشيكة</h3>
              <p className="text-white/90 text-sm mt-0.5">
                {summary.batchCount} دفعة تنتهي خلال 3 أيام
              </p>
              {summary.recommendation && (
                <p className="text-white/80 text-xs mt-1.5 italic leading-relaxed max-w-sm">
                  {summary.recommendation}
                </p>
              )}
            </div>
          </div>

          {/* Right: Stat Boxes */}
          <div className="flex gap-3 shrink-0 flex-wrap">
            <div className="bg-white/20 rounded-xl px-4 py-3 text-center min-w-[130px]">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-white/80" />
                <span className="text-white/80 text-xs">تكلفة الشراء المعرضة</span>
              </div>
              <div className="text-white font-black text-xl">
                {summary.totalCostAtRisk.toFixed(0)}
                <span className="text-sm font-medium mr-1">ر.س</span>
              </div>
            </div>

            <div className="bg-white/20 rounded-xl px-4 py-3 text-center min-w-[130px]">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-white/80" />
                <span className="text-white/80 text-xs">خسارة الإيراد المتوقعة</span>
              </div>
              <div className="text-white font-black text-xl">
                {summary.totalRevenueIfWasted.toFixed(0)}
                <span className="text-sm font-medium mr-1">ر.س</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
          {/* Apply Disposal Button */}
          {isUrgent && onApplyDisposal && (
            <button
              onClick={onApplyDisposal}
              className="flex items-center gap-2 bg-white text-red-600 font-black px-5 py-2.5 rounded-xl text-sm hover:bg-red-50 transition-colors shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              طبّق التصريف الآن
            </button>
          )}

          {/* Expand/Collapse Batches */}
          {batches.length > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1.5 text-white/90 text-xs font-medium hover:text-white transition-colors mr-auto"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  إخفاء التفاصيل
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  عرض {batches.length} دفعة
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Collapsed Batch List */}
      {expanded && batches.length > 0 && (
        <div className="border-t border-white/20 bg-black/15">
          <div className="divide-y divide-white/10">
            {batches.map(batch => (
              <div key={batch.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <span className="text-white font-semibold text-sm truncate block">
                    {batch.display_name}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs shrink-0">
                  <div className="text-white/80 text-center">
                    <div className="font-black text-white text-base leading-tight">{batch.days_left}</div>
                    <div>يوم متبقي</div>
                  </div>
                  <div className="text-white/80 text-center">
                    <div className="font-black text-white text-base leading-tight">
                      {batch.cost_at_risk.toFixed(0)} ر.س
                    </div>
                    <div>تكلفة</div>
                  </div>
                  <div className="text-center">
                    {batch.discount_percent > 0 ? (
                      <span className="bg-green-400/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        خصم {batch.discount_percent}%
                      </span>
                    ) : (
                      <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        بدون خصم
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
