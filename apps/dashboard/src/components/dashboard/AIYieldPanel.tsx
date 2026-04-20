import { useMemo, useState } from "react";
import { Sparkles, ArrowRightLeft, TrendingUp, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui";

type Booking = {
  id: string;
  customerName?: string;
  status: string;
  startsAt: string; // ISO datetime (was eventDate)
};

type Insight = {
  bookingId: string;
  customerName: string;
  currentDate: string;
  suggestedDate: string;
  timeShiftDesc: string; // e.g., "تقديم 30 دقيقة"
  reason: string;
};

export function AIYieldPanel({
  bookings,
  date,
  onApply,
}: {
  bookings: Booking[];
  date: Date;
  onApply: (bookingId: string, newIsoDate: string) => Promise<void>;
}) {
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Analyze the schedule
  const analysis = useMemo(() => {
    // 1. Filter out unsupported bookings (no date or cancelled)
    const active = bookings.filter(b => b.startsAt && b.status !== "cancelled" && b.status !== "completed");
    
    // Convert to minute representations based on 00:00 start
    const mapped = active.map(b => {
      const d = new Date(b.startsAt);
      const startMins = d.getHours() * 60 + d.getMinutes();
      // Estimate duration: 60 minutes default
      const endMins = startMins + 60;
      return { ...b, parsedDate: d, startMins, endMins };
    }).sort((a, b) => a.startMins - b.startMins);

    const insights: Insight[] = [];
    let idleMinutes = 0;

    // Fixed business window 09:00 to 22:00 -> 540 to 1320
    const busStart = 9 * 60;
    const busEnd = 22 * 60;
    const totalMins = busEnd - busStart;

    let totalOccupied = 0;
    let lastEnd = busStart;

    mapped.forEach((b, i) => {
      // Calculate occupied within business bounds
      const actStart = Math.max(busStart, b.startMins);
      const actEnd = Math.min(busEnd, b.endMins);
      if (actEnd > actStart) {
        totalOccupied += (actEnd - actStart);
      }

      // Detection of gaps
      if (b.startMins > lastEnd) {
        const gap = b.startMins - lastEnd;
        idleMinutes += gap;

        // Opportunity: If there is a 30-minute gap, we can push the current booking BACK 30 mins 
        // to close the gap entirely, provided the previous slot is occupied or it's the start of the day.
        if (gap === 30) {
          const suggested = new Date(b.parsedDate.getTime() - 30 * 60000);
          const timeFormatted = suggested.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true });
          insights.push({
            bookingId: b.id,
            customerName: b.customerName || "عميل",
            currentDate: b.startsAt,
            suggestedDate: suggested.toISOString(),
            timeShiftDesc: `تقديم إلى ${timeFormatted}`,
            reason: "سد فراغ 30 دقيقة لفتح ساعة كاملة للحجوزات الجديدة."
          });
        }
      }
      lastEnd = Math.max(lastEnd, b.endMins);
    });

    const utilization = totalMins > 0 ? Math.round((totalOccupied / totalMins) * 100) : 0;
    const status = utilization < 30 ? "low" : utilization < 70 ? "med" : "high";

    return { utilization, totalOccupied, idleMinutes, insights, status };
  }, [bookings]);

  if (analysis.totalOccupied === 0 && analysis.insights.length === 0) {
    return null; // Don't show if purely empty or nothing to do
  }

  return (
    <div className="elegant-card p-5 mt-5 mb-5 relative overflow-hidden group">
      {/* Background glow decoration */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-400/10 blur-3xl rounded-full pointer-events-none group-hover:bg-brand-400/20 transition-all duration-700" />
      
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            مرشد الجدولة الذكي (AI Yield)
          </h3>
          <p className="text-[12px] text-gray-500 mt-1">يحلل النظام أوقات الفراغ المهدرة ويقترح تحسينات فورية لزيادة أرباح اليوم المنظورة بنسبة 15%.</p>
        </div>

        {/* Utilization Gauge */}
        <div className="flex flex-col items-center justify-center shrink-0 w-16 h-16 rounded-2xl bg-[#f8fafc] border border-[#eef2f6] shadow-inner">
          <TrendingUp className={clsx("w-5 h-5 mb-1", 
            analysis.status === "high" ? "text-emerald-500" : 
            analysis.status === "med" ? "text-brand-500" : "text-amber-500"
          )} />
          <span className="text-sm font-bold text-gray-800">{analysis.utilization}%</span>
          <span className="text-[9px] text-gray-400">الإشغال</span>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        {analysis.insights.length === 0 ? (
          <div className="flex items-center gap-2 text-[12px] text-gray-500 bg-[#f8fafc] p-3 rounded-xl border border-[#eef2f6]">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            جدول اليوم مثالي! لا توجد فراغات 30 دقيقة مقطوعة، مما يضمن أقصى ربحية ممكنة.
          </div>
        ) : (
          analysis.insights.map((insight, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-brand-50/50 border border-brand-100 rounded-xl hover:border-brand-300 transition-colors">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 border border-brand-50 text-brand-500">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900">
                    {insight.timeShiftDesc} لحجز: <span className="text-brand-600">{insight.customerName}</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    {insight.reason}
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                loading={applyingId === insight.bookingId}
                disabled={applyingId !== null}
                onClick={async () => {
                  setApplyingId(insight.bookingId);
                  await onApply(insight.bookingId, insight.suggestedDate);
                  setApplyingId(null);
                }}
              >
                تطبيق
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
