import { useMemo } from "react";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { flowerBuilderApi, flowerIntelligenceApi, flowerMasterApi } from "@/lib/api";
import {
  TrendingUp, TrendingDown, Printer, DollarSign,
  ShoppingBag, Users, Star, Clock, AlertCircle,
  Leaf, RefreshCw, Award, BarChart3,
} from "lucide-react";
import { clsx } from "clsx";
import { fmtDate } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────

type Period = "today" | "week" | "month" | "3months";

// ─── Helpers ───────────────────────────────────────────────────

function getStartDate(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "today":   { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    case "week":    { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case "month":   { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
    case "3months": { const d = new Date(now); d.setDate(d.getDate() - 90); return d; }
  }
}

function fmtSAR(n: number) {
  return `${n.toLocaleString("en-US")} ر.س`;
}

function trendBadge(pct: number | null) {
  if (pct === null) return null;
  const isUp = pct >= 0;
  return (
    <span className={clsx(
      "flex items-center gap-0.5 text-xs font-semibold rounded-full px-2 py-0.5",
      isUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
    )}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-5 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
      <div className="h-8 bg-gray-100 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/3" />
    </div>
  );
}

function SectionCard({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
      <h2 className="text-base font-bold text-gray-800 mb-1 border-r-4 border-brand-500 pr-3">{title}</h2>
      {hint && <p className="text-xs text-gray-400 mb-4 mr-4">{hint}</p>}
      {!hint && <div className="mb-4" />}
      {children}
    </div>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export function FlowerReportsPage() {
  const [period, setPeriod] = useState<Period>("month");

  const { data: ordersRes, loading: ordersLoading, error: ordersError, refetch } = useApi(
    () => flowerBuilderApi.orders({ limit: "500" }),
    []
  );
  const { data: statsRes, loading: statsLoading } = useApi(
    () => flowerBuilderApi.orderStats(),
    []
  );
  const { data: customersRes, loading: customersLoading } = useApi(
    () => flowerIntelligenceApi.customersIntelligence(20),
    []
  );
  const { data: stockRes } = useApi(
    () => flowerMasterApi.stockReport(),
    []
  );

  const isLoading = ordersLoading || statsLoading || customersLoading;

  const periodStart = getStartDate(period);

  // ─── Computed metrics from real orders ──────────────────────

  const { kpis, topFlowers, peakHours } = useMemo(() => {
    const allOrders: any[] = ordersRes?.data ?? [];
    const filtered = allOrders.filter(o => {
      const d = new Date(o.created_at);
      return d >= periodStart && o.status !== "cancelled";
    });

    const totalSales = filtered.reduce((s, o) => s + Number(o.total ?? o.subtotal ?? 0), 0);
    const avgOrderValue = filtered.length > 0 ? totalSales / filtered.length : 0;

    // Top flowers from items
    const itemsMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const order of filtered) {
      const items: any[] = Array.isArray(order.items) ? order.items :
        typeof order.items === "string" ? JSON.parse(order.items || "[]") : [];
      for (const item of items) {
        const name = item.name ?? item.nameAr ?? "غير معروف";
        const qty = Number(item.qty ?? item.quantity ?? 1);
        const price = Number(item.price ?? 0);
        if (!itemsMap[name]) itemsMap[name] = { name, qty: 0, revenue: 0 };
        itemsMap[name].qty += qty;
        itemsMap[name].revenue += qty * price;
      }
    }
    const topFlowersList = Object.values(itemsMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
    const maxQty = Math.max(...topFlowersList.map(f => f.qty), 1);

    // Peak hours
    const hourMap: Record<number, number> = {};
    for (const order of filtered) {
      const h = new Date(order.created_at).getHours();
      hourMap[h] = (hourMap[h] ?? 0) + 1;
    }
    const peakHoursList = Array.from({ length: 15 }, (_, i) => {
      const h = i + 8; // 8am to 10pm
      return { hour: h, label: h < 12 ? `${h}ص` : h === 12 ? "12م" : `${h - 12}م`, orders: hourMap[h] ?? 0 };
    });
    const maxPeakOrders = Math.max(...peakHoursList.map(h => h.orders), 1);

    const stats = statsRes?.data ?? {};

    return {
      kpis: {
        totalOrders: filtered.length,
        totalSales,
        avgOrderValue,
        totalRevenue: Number(stats.total_revenue ?? 0),
        delivered: Number(stats.delivered ?? 0),
        pending: Number(stats.pending ?? 0),
      },
      topFlowers: topFlowersList.map(f => ({ ...f, pct: Math.round((f.qty / maxQty) * 100) })),
      peakHours: { list: peakHoursList, maxOrders: maxPeakOrders },
    };
  }, [ordersRes, statsRes, period, periodStart]);

  const customers: any[] = customersRes?.data ?? [];
  const topCustomers = customers.filter(c => c.customer_tier === "vip" || Number(c.order_count) >= 3).slice(0, 5);
  const stock: any[] = stockRes?.data ?? [];

  const periodLabels: Record<Period, string> = {
    today: "اليوم", week: "هذا الأسبوع", month: "هذا الشهر", "3months": "3 أشهر",
  };

  // ─── Error state ─────────────────────────────────────────────

  if (!isLoading && ordersError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" dir="rtl">
        <AlertCircle className="w-10 h-10 text-red-300 mb-3" />
        <p className="text-sm font-semibold text-gray-700">حدث خطأ في تحميل التقارير</p>
        <p className="text-xs text-gray-400 mt-1">{ordersError}</p>
        <button onClick={refetch} className="mt-3 px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 transition-colors">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">تقارير الورد</h1>
            <p className="text-xs text-gray-400">ملخص الأداء والمبيعات والمخزون</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#f1f5f9] rounded-xl p-1 gap-1">
            {(["today", "week", "month", "3months"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  period === p ? "bg-brand-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <button
            onClick={refetch}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#eef2f6] hover:bg-[#f8fafc] text-gray-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#eef2f6] rounded-xl text-sm text-gray-600 hover:bg-[#f8fafc] transition-colors"
          >
            <Printer className="w-4 h-4" />
            طباعة
          </button>
        </div>
      </div>

      {/* ── Section 1: الملخص المالي ──────────────────────────── */}
      <section>
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "إجمالي المبيعات",
                value: fmtSAR(kpis.totalSales),
                sub: `${kpis.totalOrders} طلب`,
                icon: DollarSign,
                bg: "bg-brand-500",
                trend: null,
              },
              {
                label: "متوسط قيمة الطلب",
                value: fmtSAR(Math.round(kpis.avgOrderValue)),
                sub: "متوسط كل طلب",
                icon: ShoppingBag,
                bg: "bg-purple-500",
                trend: null,
              },
              {
                label: "الطلبات المُسلَّمة",
                value: String(kpis.delivered),
                sub: `${kpis.pending} معلق`,
                icon: TrendingUp,
                bg: "bg-green-500",
                trend: null,
              },
              {
                label: "إجمالي الإيرادات",
                value: fmtSAR(kpis.totalRevenue),
                sub: "منذ البداية",
                icon: Award,
                bg: "bg-amber-500",
                trend: null,
              },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-2xl border border-[#eef2f6] p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={clsx("w-9 h-9 rounded-[10px] flex items-center justify-center", card.bg)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {trendBadge(card.trend)}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-0.5">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 2: أكثر الأصناف مبيعاً ───────────────────── */}
      <SectionCard title="أكثر الأصناف مبيعاً" hint="مرتبة حسب عدد الوحدات المباعة">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="space-y-1">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : topFlowers.length === 0 ? (
          <EmptySection text="لا توجد بيانات مبيعات في هذه الفترة" />
        ) : (
          <div className="space-y-4">
            {topFlowers.map((item, idx) => {
              const colors = ["bg-red-400","bg-pink-400","bg-purple-400","bg-brand-500","bg-indigo-400","bg-teal-400"];
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{item.qty} وحدة</span>
                      <span className="font-semibold text-gray-700">{item.revenue.toLocaleString("en-US")} ر.س</span>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={clsx("h-full rounded-full transition-all duration-700", colors[idx] ?? "bg-gray-400")} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Section 3: ساعات الذروة ───────────────────────────── */}
      <SectionCard title="ساعات الذروة" hint="عدد الطلبات حسب الساعة">
        {isLoading ? (
          <div className="flex gap-2 animate-pulse">
            {Array.from({ length: 15 }).map((_, i) => <div key={i} className="w-10 h-10 bg-[#f1f5f9] rounded-xl" />)}
          </div>
        ) : (ordersRes?.data ?? []).filter(o => {
          const d = new Date(o.created_at); return d >= periodStart && o.status !== "cancelled";
        }).length === 0 ? (
          <EmptySection text="لا توجد بيانات في هذه الفترة" />
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {peakHours.list.map(h => {
                const intensity = peakHours.maxOrders > 0 ? h.orders / peakHours.maxOrders : 0;
                let bg = "bg-gray-100";
                if (intensity > 0.8) bg = "bg-green-600";
                else if (intensity > 0.6) bg = "bg-green-500";
                else if (intensity > 0.4) bg = "bg-green-400";
                else if (intensity > 0.2) bg = "bg-green-300";
                else if (intensity > 0) bg = "bg-green-200";
                return (
                  <div key={h.hour} className="flex flex-col items-center gap-1">
                    <div className={clsx("w-9 h-9 rounded-[10px] flex items-center justify-center", bg)} title={`${h.orders} طلب`}>
                      {h.orders > 0 && (
                        <span className={clsx("text-xs font-bold", intensity > 0.4 ? "text-white" : "text-green-800")}>
                          {h.orders}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{h.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>أقل نشاطاً</span>
              <div className="flex gap-1">
                {["bg-gray-100","bg-green-200","bg-green-300","bg-green-400","bg-green-500","bg-green-600"].map((c, i) => (
                  <div key={i} className={clsx("w-4 h-4 rounded", c)} />
                ))}
              </div>
              <span>أكثر نشاطاً</span>
            </div>
          </>
        )}
      </SectionCard>

      {/* ── Section 4: المخزون الحالي ─────────────────────────── */}
      <SectionCard title="المخزون الحالي" hint="كميات الورد المتوفرة حالياً">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-[#f1f5f9] rounded-xl" />)}
          </div>
        ) : stock.length === 0 ? (
          <EmptySection text="لا توجد بيانات مخزون — أضف دفعات من صفحة الموردين" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-[#eef2f6]">
                  <th className="text-right py-2 pb-3 font-medium">الصنف</th>
                  <th className="text-right py-2 pb-3 font-medium">الكمية المتبقية</th>
                  <th className="text-right py-2 pb-3 font-medium">الحالة</th>
                  <th className="text-right py-2 pb-3 font-medium">أقرب انتهاء</th>
                </tr>
              </thead>
              <tbody>
                {stock.slice(0, 10).map((item: any, idx: number) => {
                  const qty = Number(item.totalRemaining ?? item.total_remaining ?? item.quantityRemaining ?? 0);
                  const isLow = qty < 10;
                  const expiryDate = item.nearestExpiry ?? item.nearest_expiry;
                  return (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 font-medium text-gray-800">
                        {item.displayNameAr ?? item.display_name_ar ?? item.flowerType ?? item.flower_type ?? "—"}
                      </td>
                      <td className="py-3">
                        <span className={clsx("font-semibold tabular-nums", isLow ? "text-red-500" : "text-gray-700")}>
                          {qty}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={clsx("text-xs rounded-full px-2 py-0.5 font-medium", isLow ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
                          {isLow ? "منخفض" : "جيد"}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-400">
                        {expiryDate ? fmtDate(expiryDate) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── Section 5: أفضل العملاء ───────────────────────────── */}
      <SectionCard title="أفضل العملاء" hint="بناءً على عدد الطلبات والإنفاق">
        {customersLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-[#f1f5f9] rounded-xl" />)}
          </div>
        ) : topCustomers.length === 0 ? (
          <EmptySection text="ستظهر بيانات العملاء بعد تجميع الطلبات" />
        ) : (
          <div className="space-y-3">
            {topCustomers.map((c: any, idx: number) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#f8fafc] rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {(c.customer_name || "؟").charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{c.customer_name || "—"}</p>
                    <p className="text-xs text-gray-400" dir="ltr">{c.customer_phone}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="text-center">
                    <p className="font-bold text-gray-700 tabular-nums">{c.order_count}</p>
                    <p className="text-gray-400">طلب</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-700 tabular-nums">{Number(c.total_spent ?? 0).toLocaleString("en-US")} ر.س</p>
                    <p className="text-gray-400">إجمالي</p>
                  </div>
                  {c.customer_tier === "vip" && (
                    <span className="flex items-center gap-1 bg-violet-100 text-violet-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                      <Star className="w-3 h-3 fill-violet-400" />
                      VIP
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Section 6: ملاحظة الإيرادات الحقيقية ─────────────── */}
      {!isLoading && kpis.totalOrders === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">لا توجد طلبات في هذه الفترة</p>
            <p className="text-xs text-amber-600 mt-0.5">
              غيّر الفترة الزمنية أو انتظر حتى تتراكم الطلبات لرؤية التقارير
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlowerReportsPage;
