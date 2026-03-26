import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, Clock, CalendarCheck, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/ui/Skeleton";

function today()      { return new Date().toISOString().split("T")[0]; }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; }

const HOUR_LABELS: Record<number, string> = {
  0:"12 ص",1:"1 ص",2:"2 ص",3:"3 ص",4:"4 ص",5:"5 ص",6:"6 ص",
  7:"7 ص",8:"8 ص",9:"9 ص",10:"10 ص",11:"11 ص",
  12:"12 م",13:"1 م",14:"2 م",15:"3 م",16:"4 م",17:"5 م",18:"6 م",
  19:"7 م",20:"8 م",21:"9 م",22:"10 م",23:"11 م",
};

export function PeakTimesReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo,   setDateTo]   = useState(today());

  const { data: res, loading } = useApi(() => financeApi.peakTimesReport({ dateFrom, dateTo }), [dateFrom, dateTo]);
  const report   = res?.data;
  const summary  = report?.summary  || {};
  const byDay:  any[] = report?.byDay  || [];
  const byHour: any[] = report?.byHour || [];

  const maxDay  = Math.max(...byDay.map((d: any)  => Number(d.bookingCount || 0)), 1);
  const maxHour = Math.max(...byHour.map((h: any) => Number(h.bookingCount || 0)), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> التقارير</Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقرير أوقات الذروة</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">من تاريخ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">إلى تاريخ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-400" />
          </div>
        </div>
      </div>

      {loading ? <PageSkeleton /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: CalendarCheck, label: "يوم الذروة",       value: summary.peakDay  || "—", color: "text-brand-600",   bg: "bg-brand-50" },
              { icon: Clock,         label: "ساعة الذروة",      value: summary.peakHour != null ? (HOUR_LABELS[Number(summary.peakHour)] || `${summary.peakHour}:00`) : "—", color: "text-violet-600", bg: "bg-violet-50" },
              { icon: TrendingUp,    label: "إجمالي محلّل",     value: `${Number(summary.totalAnalyzed || 0).toLocaleString()} حجز`, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-3", card.bg)}>
                    <Icon className={clsx("w-4 h-4", card.color)} />
                  </div>
                  <p className={clsx("text-xl font-bold", card.color)}>{card.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* By Day */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900 text-sm">الحجوزات حسب يوم الأسبوع</h2>
              </div>
              {byDay.length === 0 ? (
                <div className="p-10 text-center"><CalendarCheck className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">لا توجد بيانات</p></div>
              ) : (
                <div className="p-5 space-y-3">
                  {byDay.map((d: any) => {
                    const pct = Math.round((Number(d.bookingCount || 0) / maxDay) * 100);
                    return (
                      <div key={d.dayName} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-16 shrink-0 text-right">{d.dayName}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-gray-500 w-12 text-left shrink-0">{d.bookingCount} حجز</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* By Hour */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900 text-sm">الحجوزات حسب ساعة اليوم</h2>
              </div>
              {byHour.length === 0 ? (
                <div className="p-10 text-center"><Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">لا توجد بيانات</p></div>
              ) : (
                <div className="p-5 space-y-2 overflow-y-auto max-h-80">
                  {byHour.map((h: any) => {
                    const pct = Math.round((Number(h.bookingCount || 0) / maxHour) * 100);
                    const label = HOUR_LABELS[Number(h.hourOfDay)] || `${h.hourOfDay}:00`;
                    return (
                      <div key={h.hourOfDay} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-12 shrink-0 text-right tabular-nums" dir="ltr">{label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-violet-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-gray-500 shrink-0">{h.bookingCount}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
            <div className="space-y-3">
              {[
                { q: "كيف أستفيد من تقرير أوقات الذروة؟", a: "حدّد الأيام والساعات الأكثر طلباً وخطّط عدد الموظفين وفقاً لها. خفّض العروض في أوقات الذروة وشجّع الحجز في الأوقات الهادئة." },
                { q: "لماذا قد تظهر بعض الساعات فارغة؟", a: "هذه الساعات لا يوجد فيها حجوزات في الفترة المحددة. حاول توسيع نطاق التاريخ للحصول على صورة أشمل." },
                { q: "هل الأوقات بالتوقيت المحلي؟", a: "نعم، تُعرض الأوقات بتوقيت المنطقة الزمنية للخادم. تحقق من إعداد المنطقة الزمنية في الإعدادات إذا كانت هناك فروقات." },
              ].map(faq => (
                <details key={faq.q} className="border border-gray-100 rounded-xl">
                  <summary className="px-4 py-3 text-sm text-gray-700 cursor-pointer font-medium hover:bg-gray-50 rounded-xl">{faq.q}</summary>
                  <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
