import { useState, useMemo } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { restaurantApi, customersApi } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import {
  Gift, Plus, Star, Search, X, ChevronLeft,
  Clock, Trophy, Users, Stamp, RotateCcw, Settings,
} from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "الآن";
  if (m < 60)  return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `منذ ${d} يوم`;
  return `منذ ${Math.floor(d / 30)} شهر`;
}

// ─────────────────────────────────────────────────
// StampDots — the visual stamp grid
// ─────────────────────────────────────────────────

function StampDots({ count, goal, size = "sm" }: { count: number; goal: number; size?: "sm" | "lg" }) {
  const filled = Math.min(count, goal);
  const dim = size === "lg" ? "w-7 h-7 text-sm" : "w-5 h-5 text-[10px]";
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: goal }, (_, i) => (
        <div
          key={i}
          className={clsx(
            "rounded-full flex items-center justify-center font-bold transition-all",
            dim,
            i < filled
              ? "bg-brand-500 text-white shadow-sm shadow-brand-300/50"
              : "bg-gray-100 text-gray-300 border border-gray-200"
          )}
        >
          {i < filled ? <Star className="w-2.5 h-2.5 fill-current" /> : null}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────
// LoyaltyCard — single card row
// ─────────────────────────────────────────────────

function LoyaltyCard({
  card,
  onSelect,
  onQuickStamp,
  stamping,
}: {
  card: any;
  onSelect: () => void;
  onQuickStamp: (e: React.MouseEvent) => void;
  stamping: boolean;
}) {
  const progress = Math.min(100, Math.round((card.stampsCount / card.stampsGoal) * 100));
  const ready    = card.stampsCount >= card.stampsGoal;
  const initial  = (card.customerName || "ع")[0];

  return (
    <div
      onClick={onSelect}
      className={clsx(
        "bg-white rounded-2xl border cursor-pointer transition-all hover:shadow-sm group",
        ready
          ? "border-brand-200 shadow-[0_0_0_2px_rgba(91,155,213,0.15)]"
          : "border-gray-100 hover:border-brand-100"
      )}
    >
      <div className="px-4 py-3.5">
        {/* Top row */}
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
            ready ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
          )}>
            {initial}
          </div>

          {/* Name + phone */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{card.customerName}</p>
            <p className="text-xs text-gray-400 tabular-nums" dir="ltr">{card.customerPhone}</p>
          </div>

          {/* Right: count + badge */}
          <div className="flex items-center gap-2 shrink-0">
            {ready && (
              <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100 whitespace-nowrap flex items-center gap-1">
                <Trophy className="w-3 h-3" /> جاهزة
              </span>
            )}
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900 tabular-nums">{card.stampsCount}/{card.stampsGoal}</p>
              <p className="text-[10px] text-gray-400 text-center">طابع</p>
            </div>
          </div>
        </div>

        {/* Progress + quick button */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <div
              className={clsx("h-1.5 rounded-full transition-all", ready ? "bg-brand-500" : "bg-brand-300")}
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            onClick={onQuickStamp}
            disabled={stamping || ready}
            className={clsx(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all text-xs font-bold",
              ready
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-brand-500 text-white hover:bg-brand-600 active:scale-95 shadow-sm shadow-brand-300/40"
            )}
            title="إضافة طابع سريع"
          >
            +
          </button>
        </div>

        {/* Last stamp */}
        {card.lastStampAt && (
          <p className="mt-1.5 text-[10px] text-gray-400 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> {timeAgo(card.lastStampAt)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// DetailModal — full management of one customer
// ─────────────────────────────────────────────────

function DetailModal({
  customer,
  onClose,
  onRefresh,
}: {
  customer: any;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [count, setCount]     = useState(1);
  const [goal, setGoal]       = useState<number>(customer.stampsGoal);
  const [editGoal, setEditGoal] = useState(false);

  const stampMut  = useMutation(({ id, n, g }: any) => restaurantApi.addStamp(id, n, g));
  const redeemMut = useMutation((id: string)        => restaurantApi.redeemReward(id));

  const remaining = Math.max(0, customer.stampsGoal - customer.stampsCount);
  const ready     = customer.stampsCount >= customer.stampsGoal;

  const handleStamp = async () => {
    const res = await stampMut.mutate({ id: customer.customerId, n: count, g: editGoal ? goal : undefined });
    if (!res) return;
    toast.success(`تمت إضافة ${count} طابع`);
    setCount(1);
    onRefresh();
    onClose();
  };

  const handleRedeem = async () => {
    const res = await redeemMut.mutate(customer.customerId);
    if (!res) return;
    toast.success("تم استبدال المكافأة بنجاح");
    onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className={clsx(
            "w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0",
            ready ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
          )}>
            {(customer.customerName || "ع")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{customer.customerName}</p>
            <p className="text-xs text-gray-400 tabular-nums" dir="ltr">{customer.customerPhone}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Stamp visual */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">الطوابع</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-brand-600 tabular-nums">{customer.stampsCount}</span>
                <span className="text-sm text-gray-400">/ {customer.stampsGoal}</span>
              </div>
            </div>
            <StampDots count={customer.stampsCount} goal={customer.stampsGoal} size="lg" />
            {customer.lastStampAt && (
              <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> آخر طابع: {timeAgo(customer.lastStampAt)}
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-purple-600 tabular-nums">{customer.freeItemsRedeemed}</p>
              <p className="text-xs text-purple-500">مكافآت مستبدلة</p>
            </div>
            <div className={clsx("rounded-xl p-3 text-center", ready ? "bg-brand-50" : "bg-gray-50")}>
              <p className={clsx("text-lg font-bold tabular-nums", ready ? "text-brand-600" : "text-gray-700")}>
                {ready ? "جاهزة!" : remaining}
              </p>
              <p className={clsx("text-xs", ready ? "text-brand-500" : "text-gray-400")}>
                {ready ? "مكافأة جاهزة" : "طابع متبقي"}
              </p>
            </div>
          </div>

          {/* Redeem — shown when ready */}
          {ready && (
            <button
              onClick={handleRedeem}
              disabled={redeemMut.loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm shadow-brand-300/40"
            >
              <Trophy className="w-4 h-4" />
              {redeemMut.loading ? "جاري الاستبدال..." : "استبدال المكافأة"}
            </button>
          )}

          {/* Add stamps — always shown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">إضافة طوابع</p>
              <button
                onClick={() => setEditGoal(v => !v)}
                className="text-xs text-gray-400 hover:text-brand-500 flex items-center gap-1 transition-colors"
              >
                <Settings className="w-3 h-3" />
                {editGoal ? "إخفاء الهدف" : "تعديل الهدف"}
              </button>
            </div>

            {editGoal && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-2">عدد الطوابع المطلوبة للمكافأة</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGoal(n => Math.max(3, n - 1))}
                    className="w-8 h-8 rounded-lg border border-gray-200 font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                  >−</button>
                  <span className="flex-1 text-center font-bold text-gray-900 tabular-nums">{goal}</span>
                  <button
                    onClick={() => setGoal(n => Math.min(30, n + 1))}
                    className="w-8 h-8 rounded-lg border border-gray-200 font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                  >+</button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCount(n => Math.max(1, n - 1))}
                className="w-10 h-10 rounded-xl border border-gray-200 font-bold text-xl text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
              >−</button>
              <span className="flex-1 text-center text-2xl font-bold text-gray-900 tabular-nums">{count}</span>
              <button
                onClick={() => setCount(n => n + 1)}
                className="w-10 h-10 rounded-xl border border-gray-200 font-bold text-xl text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
              >+</button>
            </div>

            <button
              onClick={handleStamp}
              disabled={stampMut.loading}
              className={clsx(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60",
                ready
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.98] shadow-sm shadow-brand-300/40"
              )}
            >
              <Stamp className="w-4 h-4" />
              {stampMut.loading ? "جاري الإضافة..." : `إضافة ${count} طابع`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// CustomerPicker modal
// ─────────────────────────────────────────────────

function CustomerPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (c: any) => void;
}) {
  const [search, setSearch] = useState("");
  const { data } = useApi(
    () => customersApi.list({ search, limit: "25" }),
    [search]
  );
  const customers: any[] = data?.data || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">اختر عميلاً</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-50">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الهاتف..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-9 pl-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-72 divide-y divide-gray-50">
          {customers.map(c => (
            <button
              key={c.id}
              onClick={() => onPick(c)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-right transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                {(c.name || "ع")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-400 tabular-nums" dir="ltr">{c.phone}</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-300" />
            </button>
          ))}
          {customers.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">لا توجد نتائج</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────

export function LoyaltyPage() {
  const [search, setSearch]               = useState("");
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);
  const [showPicker, setShowPicker]       = useState(false);
  const [quickStampId, setQuickStampId]   = useState<string | null>(null);

  const { data, loading, refetch } = useApi(
    () => restaurantApi.loyalty(search || undefined),
    [search]
  );

  const stampMut = useMutation(({ id, count }: any) => restaurantApi.addStamp(id, count));

  const cards: any[] = data?.data || [];

  const stats = useMemo(() => ({
    total:    cards.length,
    ready:    cards.filter(c => c.stampsCount >= c.stampsGoal).length,
    redeemed: cards.reduce((s, c) => s + (c.freeItemsRedeemed || 0), 0),
    stamps:   cards.reduce((s, c) => s + (c.stampsCount || 0), 0),
  }), [cards]);

  const handleQuickStamp = async (e: React.MouseEvent, card: any) => {
    e.stopPropagation();
    setQuickStampId(card.customerId);
    const res = await stampMut.mutate({ id: card.customerId, count: 1 });
    setQuickStampId(null);
    if (!res) return;
    toast.success(`طابع لـ ${card.customerName}`);
    refetch();
  };

  const handlePickCustomer = async (customer: any) => {
    setShowPicker(false);
    const res = await restaurantApi.getLoyalty(customer.id);
    setActiveCustomer({
      customerId:       customer.id,
      customerName:     customer.name,
      customerPhone:    customer.phone,
      stampsCount:      0,
      stampsGoal:       10,
      freeItemsRedeemed: 0,
      lastStampAt:      null,
      ...(res?.data || {}),
    });
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-brand-500" /> بطاقة الولاء
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">نظام الطوابع والمكافآت</p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all shadow-sm shadow-brand-300/40"
        >
          <Plus className="w-4 h-4" /> عميل جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "عميل",         value: stats.total,    icon: Users,   color: "text-brand-600",  bg: "bg-brand-50",   border: "border-brand-100" },
          { label: "جاهز للاستبدال", value: stats.ready,  icon: Trophy,  color: "text-amber-600",  bg: "bg-amber-50",   border: "border-amber-100" },
          { label: "مكافأة مستبدلة", value: stats.redeemed, icon: RotateCcw, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
          { label: "إجمالي الطوابع", value: stats.stamps, icon: Stamp,   color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={clsx("rounded-2xl border p-3 text-center", bg, border)}>
            <Icon className={clsx("w-4 h-4 mx-auto mb-1", color)} />
            <p className={clsx("text-lg font-bold tabular-nums leading-none", color)}>{value}</p>
            <p className="text-[10px] text-gray-500 mt-1 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث باسم العميل أو رقم الهاتف..."
          className="w-full bg-white border border-gray-200 rounded-xl pr-9 pl-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 placeholder:text-gray-300"
        />
      </div>

      {/* Cards */}
      {loading ? (
        <SkeletonRows />
      ) : cards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 px-8">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-brand-300" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">
            {search ? "لا توجد نتائج" : "لا توجد بطاقات ولاء بعد"}
          </p>
          <p className="text-sm text-gray-400 mb-5">
            {search ? "جرّب كلمة بحث مختلفة" : "ابدأ بإضافة طابع لأحد عملائك"}
          </p>
          {!search && (
            <button
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> ابدأ الآن
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map(card => (
            <LoyaltyCard
              key={card.customerId}
              card={card}
              onSelect={() => setActiveCustomer(card)}
              onQuickStamp={(e) => handleQuickStamp(e, card)}
              stamping={quickStampId === card.customerId && stampMut.loading}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {activeCustomer && (
        <DetailModal
          customer={activeCustomer}
          onClose={() => setActiveCustomer(null)}
          onRefresh={refetch}
        />
      )}

      {/* Customer picker */}
      {showPicker && (
        <CustomerPicker
          onClose={() => setShowPicker(false)}
          onPick={handlePickCustomer}
        />
      )}
    </div>
  );
}
