import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import { flowerIntelligenceApi, flowerBuilderApi } from "@/lib/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "صباح الخير";
  if (h >= 12 && h < 18) return "مساء الخير";
  return "مساء النور";
}

function formatDateAr(): string {
  return new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatElapsed(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `منذ ${secs} ثانية`;
  const mins = Math.floor(secs / 60);
  return `منذ ${mins} دقيقة`;
}

function occasionBg(color: string): string {
  const map: Record<string, string> = {
    rose: "bg-rose-50",
    pink: "bg-pink-50",
    amber: "bg-amber-50",
    green: "bg-green-50",
    violet: "bg-violet-50",
    blue: "bg-blue-50",
  };
  return map[color] ?? "bg-[#f8fafc]";
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-3 rounded-2xl px-4 py-3 bg-gray-50">
      <div className="w-9 h-9 rounded-xl bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-3/5" />
        <div className="h-3 bg-gray-100 rounded w-2/5" />
      </div>
    </div>
  );
}

// ─── main widget ──────────────────────────────────────────────────────────────

export function FlowerMorningBriefWidget() {
  const navigate = useNavigate();

  // ── state per API ──────────────────────────────────────────────────────────
  const [lossData, setLossData] = useState<any>(null);
  const [lossLoading, setLossLoading] = useState(true);

  const [occasionsData, setOccasionsData] = useState<any>(null);
  const [occasionsLoading, setOccasionsLoading] = useState(true);

  const [customersData, setCustomersData] = useState<any>(null);
  const [customersLoading, setCustomersLoading] = useState(true);

  const [deliveryData, setDeliveryData] = useState<any>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(true);

  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [elapsed, setElapsed] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // ── fetchers ───────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    setLossLoading(true);
    setOccasionsLoading(true);
    setCustomersLoading(true);
    setDeliveryLoading(true);

    await Promise.allSettled([
      flowerIntelligenceApi
        .lossAlerts()
        .then((r) => setLossData(r))
        .finally(() => setLossLoading(false)),
      flowerIntelligenceApi
        .occasionsUpcoming(30)
        .then((r) => setOccasionsData(r))
        .finally(() => setOccasionsLoading(false)),
      flowerIntelligenceApi
        .customersIntelligence(100)
        .then((r) => setCustomersData(r))
        .finally(() => setCustomersLoading(false)),
      flowerBuilderApi
        .delivery()
        .then((r) => setDeliveryData(r))
        .finally(() => setDeliveryLoading(false)),
    ]);

    setLastRefreshed(new Date());
    setElapsed(0);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── elapsed timer ──────────────────────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - lastRefreshed.getTime());
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lastRefreshed]);

  // ── derived values ─────────────────────────────────────────────────────────
  const summary = lossData?.summary ?? {};
  const batchCount: number = summary.batchCount ?? 0;
  const totalCostAtRisk: number = summary.totalCostAtRisk ?? 0;
  const undiscountedCount: number = summary.undiscountedCount ?? 0;
  const isUrgentLoss = batchCount > 0 && undiscountedCount > 0;

  const occasionsList: any[] = occasionsData?.data ?? [];
  const nextOccasion: any | null = occasionsList[0] ?? null;

  const customerSummary = customersData?.summary ?? {};
  const dueReturn: number = customerSummary.dueReturn ?? customerSummary.due_return ?? 0;

  const deliveryStats = deliveryData?.stats ?? {};
  const totalDelivery: number =
    deliveryStats.total ?? deliveryStats.totalCount ?? 0;
  const readyDelivery: number =
    deliveryStats.ready ?? deliveryStats.readyCount ?? 0;
  const outDelivery: number =
    deliveryStats.out_for_delivery ??
    deliveryStats.outForDelivery ??
    deliveryStats.out ??
    0;
  const deliveredCount: number =
    deliveryStats.delivered ?? deliveryStats.deliveredCount ?? 0;

  const anyLoading =
    lossLoading || occasionsLoading || customersLoading || deliveryLoading;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-l from-[#5b9bd5]/10 to-[#5b9bd5]/5 px-5 py-4 border-b border-[#eef2f6] flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            ماذا يحدث الآن؟
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{formatDateAr()}</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-[#5b9bd5] hover:text-[#4a8bc4] font-medium px-3 py-1.5 rounded-xl hover:bg-[#5b9bd5]/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={clsx("w-3.5 h-3.5", refreshing && "animate-spin")}
          />
          تحديث
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {anyLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : (
          <>
            {/* Row 1 — الخسارة المحتملة */}
            <div
              className={clsx(
                "rounded-2xl px-4 py-3 border-r-4 flex items-start gap-3 transition-colors",
                batchCount === 0
                  ? "bg-green-50 border-green-300"
                  : isUrgentLoss
                  ? "bg-red-50 border-red-400"
                  : "bg-amber-50 border-amber-400"
              )}
            >
              <div
                className={clsx(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  batchCount === 0
                    ? "bg-green-100"
                    : isUrgentLoss
                    ? "bg-red-100"
                    : "bg-amber-100"
                )}
              >
                {batchCount === 0 ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                ) : (
                  <AlertTriangle
                    className={clsx(
                      "w-4.5 h-4.5",
                      isUrgentLoss ? "text-red-500" : "text-amber-500"
                    )}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={clsx(
                    "text-sm font-semibold",
                    batchCount === 0
                      ? "text-green-700"
                      : isUrgentLoss
                      ? "text-red-700"
                      : "text-amber-700"
                  )}
                >
                  {batchCount === 0
                    ? "لا خسارة متوقعة اليوم"
                    : `${batchCount} دفعة تنتهي اليوم أو غداً — ${totalCostAtRisk.toLocaleString("en-US")} ر.س في خطر`}
                </p>
                {batchCount > 0 && undiscountedCount > 0 && (
                  <button
                    onClick={() =>
                      navigate("/dashboard/flower-disposal")
                    }
                    className="mt-1.5 text-xs font-medium px-3 py-1 rounded-lg bg-amber-200 text-amber-800 hover:bg-amber-300 transition-colors"
                  >
                    طبّق التصريف
                  </button>
                )}
              </div>
            </div>

            {/* Row 2 — المناسبة القادمة */}
            <div
              className={clsx(
                "rounded-2xl px-4 py-3 border-r-4 flex items-start gap-3 transition-colors",
                nextOccasion
                  ? clsx(
                      occasionBg(nextOccasion.color ?? ""),
                      nextOccasion.is_urgent
                        ? "border-red-400"
                        : "border-[#5b9bd5]/50"
                    )
                  : "bg-green-50 border-green-300"
              )}
            >
              <div
                className={clsx(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  nextOccasion ? "bg-white/60" : "bg-green-100"
                )}
              >
                {nextOccasion ? (
                  <Calendar className="w-4.5 h-4.5 text-[#5b9bd5]" />
                ) : (
                  <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {nextOccasion ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">
                        {nextOccasion.name_ar} بعد{" "}
                        {nextOccasion.days_until} يوم
                      </p>
                      {nextOccasion.is_urgent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                          استعدّ الآن
                        </span>
                      )}
                    </div>
                    {nextOccasion.stock_increase_pct && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        يُنصح بزيادة المخزون{" "}
                        {nextOccasion.stock_increase_pct}%
                      </p>
                    )}
                    <button
                      onClick={() =>
                        navigate("/dashboard/flower-occasions")
                      }
                      className="mt-1.5 text-xs text-[#5b9bd5] hover:text-[#4a8bc4] font-medium underline underline-offset-2"
                    >
                      عرض المناسبات
                    </button>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-green-700">
                    لا مناسبات في الـ 30 يوم القادمة
                  </p>
                )}
              </div>
            </div>

            {/* Row 3 — العملاء المرشحون للعودة */}
            <div
              className={clsx(
                "rounded-2xl px-4 py-3 border-r-4 flex items-start gap-3 transition-colors",
                dueReturn > 0
                  ? "bg-violet-50 border-violet-400"
                  : "bg-green-50 border-green-300"
              )}
            >
              <div
                className={clsx(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  dueReturn > 0 ? "bg-violet-100" : "bg-green-100"
                )}
              >
                {dueReturn > 0 ? (
                  <Users className="w-4.5 h-4.5 text-violet-500" />
                ) : (
                  <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={clsx(
                    "text-sm font-semibold",
                    dueReturn > 0 ? "text-violet-700" : "text-green-700"
                  )}
                >
                  {dueReturn > 0
                    ? `${dueReturn} عميل لم يشترِ منذ فترة — تواصل معهم اليوم`
                    : "لا عملاء يحتاجون متابعة اليوم"}
                </p>
                {dueReturn > 0 && (
                  <button
                    onClick={() =>
                      navigate("/dashboard/flower-customers")
                    }
                    className="mt-1.5 text-xs font-medium px-3 py-1 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
                  >
                    عرض العملاء
                  </button>
                )}
              </div>
            </div>

            {/* Row 4 — التوصيل اليوم */}
            <div
              className={clsx(
                "rounded-2xl px-4 py-3 border-r-4 flex items-start gap-3 transition-colors",
                totalDelivery === 0
                  ? "bg-gray-50 border-[#eef2f6]"
                  : readyDelivery > 0
                  ? "bg-amber-50 border-amber-400"
                  : "bg-blue-50 border-blue-300"
              )}
            >
              <div
                className={clsx(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  totalDelivery === 0
                    ? "bg-gray-100"
                    : readyDelivery > 0
                    ? "bg-amber-100"
                    : "bg-blue-100"
                )}
              >
                <Truck
                  className={clsx(
                    "w-4.5 h-4.5",
                    totalDelivery === 0
                      ? "text-gray-400"
                      : readyDelivery > 0
                      ? "text-amber-500"
                      : "text-blue-500"
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                {totalDelivery === 0 ? (
                  <p className="text-sm font-semibold text-gray-500">
                    لا توصيلات اليوم
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-800">
                      {totalDelivery} طلب توصيل اليوم
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        جاهز: {readyDelivery}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        في الطريق: {outDelivery}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        مُسلَّم: {deliveredCount}
                      </span>
                    </div>
                    {readyDelivery > 0 && (
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <p className="text-xs text-amber-600 font-medium">
                          يوجد طلبات جاهزة للإرسال
                        </p>
                        <button
                          onClick={() =>
                            navigate("/dashboard/flower-delivery")
                          }
                          className="text-xs font-medium px-3 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                        >
                          قائمة التوصيل
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
        <p className="text-[11px] text-gray-400">
          آخر تحديث: {formatElapsed(elapsed)}
        </p>
        <button
          onClick={() => navigate("/dashboard/flower-reports")}
          className="text-[11px] text-[#5b9bd5] hover:text-[#4a8bc4] font-medium underline underline-offset-2"
        >
          الانتقال إلى لوحة التحكم الكاملة
        </button>
      </div>
    </div>
  );
}
