import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { financeApi } from "@/lib/api";
import { Percent, TrendingUp, DollarSign, Users, ChevronDown, ChevronUp, Settings2, X, Check } from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";

// ── Tiered commission calculator ────────────────────────────
// Tiers: array of { upTo: number (revenue ceiling), rate: number (%) }
// Last tier has upTo = Infinity
// Example: [{upTo:10000,rate:8},{upTo:20000,rate:10},{upTo:Infinity,rate:12}]
// → first 10k at 8%, next 10k at 10%, rest at 12%

const DEFAULT_TIERS = [
  { upTo: 10000,    rate: 8  },
  { upTo: 20000,    rate: 10 },
  { upTo: Infinity, rate: 12 },
];

function calcTieredCommission(revenue: number, tiers: typeof DEFAULT_TIERS): number {
  let remaining = revenue;
  let prev = 0;
  let total = 0;
  for (const tier of tiers) {
    const ceiling = tier.upTo === Infinity ? remaining : Math.min(remaining, tier.upTo - prev);
    const chunk = Math.max(0, Math.min(remaining, ceiling));
    total += chunk * (tier.rate / 100);
    remaining -= chunk;
    prev = tier.upTo === Infinity ? prev : tier.upTo;
    if (remaining <= 0) break;
  }
  return total;
}

function effectiveRate(revenue: number, tiers: typeof DEFAULT_TIERS): number {
  if (revenue <= 0) return tiers[0].rate;
  return (calcTieredCommission(revenue, tiers) / revenue) * 100;
}

const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export function CommissionsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [useTiers, setUseTiers] = useState(false);
  const [showTierSettings, setShowTierSettings] = useState(false);
  const [tiers, setTiers] = useState(DEFAULT_TIERS.map(t => ({ ...t })));

  const { data: summaryData, loading: summaryLoading } = useApi(
    () => financeApi.commissionSummary(year, month + 1),
    [year, month]
  );

  const rawList: any[] = summaryData?.data || [];

  // Build commission rows — apply tiered override if enabled, else use API-computed rate
  const commissions = rawList.map(staff => {
    const totalRevenue = parseFloat(staff.totalRevenue || 0);
    const staffRate    = parseFloat(staff.staffRate || 10);
    const commission = useTiers
      ? calcTieredCommission(totalRevenue, tiers)
      : parseFloat(staff.commissionAmount || 0);
    const commissionRate = useTiers ? effectiveRate(totalRevenue, tiers) : staffRate;
    const salary    = parseFloat(staff.salary || 0);
    const totalCost = salary + commission;
    const roi       = totalCost > 0 ? totalRevenue / totalCost : 0;
    return {
      id:             staff.userId,
      name:           staff.userName,
      role:           staff.jobTitle,
      bookingsCount:  parseInt(staff.bookingCount || staff.booking_count || 0),
      totalRevenue,
      commissionRate,
      commission,
      salary,
      totalCost,
      roi,
      flatRate:       staffRate,
      bookings:       [],  // detail not needed — aggregated by API
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);

  const totalRevenue = commissions.reduce((s, c) => s + c.totalRevenue, 0);
  const totalCommission = commissions.reduce((s, c) => s + c.commission, 0);
  const totalBookings = commissions.reduce((s, c) => s + c.bookingsCount, 0);
  const totalSalaries = commissions.reduce((s, c) => s + c.salary, 0);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Percent className="w-5 h-5 text-brand-500" /> العمولات
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">ملخص عمولات الموظفين</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseTiers(!useTiers)}
            className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5",
              useTiers ? "bg-brand-500 text-white border-brand-500" : "border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc]")}
          >
            <Percent className="w-3.5 h-3.5" /> {useTiers ? "تصاعدي" : "ثابت"}
          </button>
          {useTiers && (
            <button
              onClick={() => setShowTierSettings(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#eef2f6] hover:bg-[#f8fafc] text-gray-500"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#eef2f6] hover:bg-[#f8fafc] text-gray-500">
            <ChevronUp className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#eef2f6] hover:bg-[#f8fafc] text-gray-500">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الإيرادات", value: `${totalRevenue.toFixed(0)} ر.س`, icon: DollarSign, color: "text-brand-500 bg-brand-50" },
          { label: "إجمالي العمولات", value: `${totalCommission.toFixed(0)} ر.س`, icon: TrendingUp, color: "text-green-600 bg-green-50" },
          { label: "إجمالي الرواتب", value: `${totalSalaries.toFixed(0)} ر.س`, icon: DollarSign, color: "text-blue-600 bg-blue-50" },
          { label: "إجمالي الحجوزات", value: totalBookings, icon: Users, color: "text-purple-600 bg-purple-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#eef2f6] p-4 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
            <div className={clsx("w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0", color.split(" ")[1])}>
              <Icon className={clsx("w-5 h-5", color.split(" ")[0])} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Commissions */}
      {summaryLoading ? (
        <SkeletonRows />
      ) : (
        <div className="space-y-2">
          {commissions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#eef2f6] text-center py-16">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا يوجد موظفون</p>
            </div>
          ) : (
            commissions.map(staff => (
              <div key={staff.id} className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f8fafc] transition-colors"
                  onClick={() => setExpanded(expanded === staff.id ? null : staff.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                      {staff.name?.[0] || "م"}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{staff.name}</p>
                      <p className="text-xs text-gray-400">{staff.role || "موظف"} · {staff.bookingsCount} حجز</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">الإيرادات</p>
                      <p className="font-semibold text-gray-900 tabular-nums">{staff.totalRevenue.toFixed(0)} ر.س</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-gray-400">نسبة العمولة</p>
                      <p className="font-semibold text-brand-600 tabular-nums">{staff.commissionRate}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">العمولة</p>
                      <p className="font-bold text-green-600 tabular-nums">{staff.commission.toFixed(0)} ر.س</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-gray-400">التكلفة الإجمالية</p>
                      <p className="font-semibold text-gray-700 tabular-nums">{staff.totalCost.toFixed(0)} ر.س</p>
                    </div>
                    {staff.roi > 0 && (
                      <div className="text-right hidden lg:block">
                        <p className="text-xs text-gray-400">العائد</p>
                        <p className={clsx("font-bold tabular-nums text-sm", staff.roi >= 3 ? "text-emerald-600" : staff.roi >= 1.5 ? "text-amber-600" : "text-red-500")}>
                          {staff.roi.toFixed(1)}×
                        </p>
                      </div>
                    )}
                    {expanded === staff.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {expanded === staff.id && (
                  <div className="border-t border-gray-50 px-5 py-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><p className="text-xs text-gray-400">عدد الحجوزات</p><p className="font-semibold text-gray-800 tabular-nums">{staff.bookingsCount}</p></div>
                      <div><p className="text-xs text-gray-400">نسبة العمولة الفعلية</p><p className="font-semibold text-brand-600 tabular-nums">{staff.commissionRate.toFixed(1)}%</p></div>
                      <div><p className="text-xs text-gray-400">الراتب الأساسي</p><p className="font-semibold text-gray-800 tabular-nums">{staff.salary.toFixed(0)} ر.س</p></div>
                      <div><p className="text-xs text-gray-400">التكلفة الإجمالية</p><p className="font-semibold text-gray-800 tabular-nums">{staff.totalCost.toFixed(0)} ر.س</p></div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      {/* Tier Settings Modal */}
      {showTierSettings && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f6]">
              <h3 className="font-bold text-gray-900">شرائح العمولة التصاعدية</h3>
              <button onClick={() => setShowTierSettings(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {tiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">{i === 0 ? "أول" : i === tiers.length - 1 ? "أكثر من" : "حتى"}</label>
                    {tier.upTo === Infinity ? (
                      <p className="text-sm font-medium text-gray-700 py-1">بلا حد أعلى</p>
                    ) : (
                      <input
                        type="number"
                        className="w-full border border-[#eef2f6] rounded-xl px-3 py-1.5 text-sm"
                        value={tier.upTo}
                        onChange={e => {
                          const updated = [...tiers];
                          updated[i] = { ...updated[i], upTo: parseInt(e.target.value) || 0 };
                          setTiers(updated);
                        }}
                      />
                    )}
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-gray-400">النسبة %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="w-full border border-[#eef2f6] rounded-xl px-3 py-1.5 text-sm"
                      value={tier.rate}
                      onChange={e => {
                        const updated = [...tiers];
                        updated[i] = { ...updated[i], rate: parseFloat(e.target.value) || 0 };
                        setTiers(updated);
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-2">
                مثال: أول 10,000 ر.س بنسبة 8%، ثم 10,000 التالية بنسبة 10%، وما فوق 20,000 بنسبة 12%
              </p>
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button
                onClick={() => setShowTierSettings(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium"
              >
                <Check className="w-4 h-4" /> تطبيق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
