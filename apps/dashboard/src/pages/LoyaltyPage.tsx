import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { restaurantApi, customersApi } from "@/lib/api";
import { Gift, Plus, Star, Search, Check, X } from "lucide-react";
import { clsx } from "clsx";

function StampVisual({ count, goal }: { count: number; goal: number }) {
  const filled = Math.min(count, goal);
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: goal }, (_, i) => (
        <div
          key={i}
          className={clsx(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs",
            i < filled
              ? "bg-brand-500 border-brand-500 text-white"
              : "border-gray-200 bg-gray-50 text-gray-300"
          )}
        >
          {i < filled ? "★" : "·"}
        </div>
      ))}
    </div>
  );
}

export function LoyaltyPage() {
  const [search, setSearch] = useState("");
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);
  const [stampsToAdd, setStampsToAdd] = useState(1);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const { data, loading, refetch } = useApi(
    () => restaurantApi.loyalty(search || undefined),
    [search]
  );
  const { data: customersData } = useApi(
    () => showCustomerPicker ? customersApi.list({ search: pickerSearch, limit: "20" }) : Promise.resolve(null),
    [showCustomerPicker, pickerSearch]
  );

  const stampMut  = useMutation(({ id, count }: any) => restaurantApi.addStamp(id, count));
  const redeemMut = useMutation((id: string) => restaurantApi.redeemReward(id));

  const cards: any[] = data?.data || [];
  const customers: any[] = customersData?.data || [];

  const handleStamp = async () => {
    if (!activeCustomer) return;
    await stampMut.mutate({ id: activeCustomer.customer_id, count: stampsToAdd });
    setActiveCustomer(null);
    setStampsToAdd(1);
    refetch();
  };

  const handleRedeem = async () => {
    if (!activeCustomer) return;
    try {
      await redeemMut.mutate(activeCustomer.customer_id);
      setActiveCustomer(null);
      refetch();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePickCustomer = async (customer: any) => {
    try {
      const res = await restaurantApi.getLoyalty(customer.id);
      setActiveCustomer({
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        stamps_count: 0,
        stamps_goal: 10,
        free_items_redeemed: 0,
        ...(res?.data || {}),
      });
    } catch {
      setActiveCustomer({ customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone, stamps_count: 0, stamps_goal: 10, free_items_redeemed: 0 });
    }
    setShowCustomerPicker(false);
    setPickerSearch("");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-brand-500" /> بطاقة الولاء
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">نظام طوابع المكافآت للعملاء</p>
        </div>
        <button
          onClick={() => setShowCustomerPicker(true)}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600"
        >
          <Plus className="w-4 h-4" /> إضافة طابع
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث باسم العميل أو رقم الهاتف..."
          className="w-full border border-gray-200 rounded-xl pr-9 pl-4 py-2.5 text-sm outline-none focus:border-brand-300"
        />
      </div>

      {/* Stats */}
      {cards.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "عملاء الولاء", value: cards.length, color: "text-brand-500 bg-brand-50" },
            { label: "مكافآت مُستبدلة", value: cards.reduce((s, c) => s + (c.free_items_redeemed || 0), 0), color: "text-purple-600 bg-purple-50" },
            { label: "إجمالي الطوابع", value: cards.reduce((s, c) => s + (c.stamps_count || 0), 0), color: "text-emerald-600 bg-emerald-50" },
          ].map(({ label, value, color }) => (
            <div key={label} className={clsx("rounded-2xl border p-3 text-center", color.split(" ")[1], "border-gray-100")}>
              <p className={clsx("text-xl font-bold tabular-nums", color.split(" ")[0])}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cards list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">جاري التحميل...</div>
      ) : cards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
          <Gift className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 mb-1">لا توجد بطاقات ولاء</p>
          <p className="text-xs text-gray-300">ابدأ بإضافة طابع لأحد عملائك</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map(card => {
            const progress = Math.min(100, Math.round((card.stamps_count / card.stamps_goal) * 100));
            const ready = card.stamps_count >= card.stamps_goal;
            return (
              <div
                key={card.customer_id}
                onClick={() => setActiveCustomer(card)}
                className={clsx(
                  "bg-white rounded-2xl border px-5 py-4 cursor-pointer hover:border-brand-200 transition-all",
                  ready ? "border-brand-200 ring-1 ring-brand-100" : "border-gray-100"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                      {card.customer_name?.[0] || "ع"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{card.customer_name}</p>
                      <p className="text-xs text-gray-400" dir="ltr">{card.customer_phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {ready && (
                      <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> مكافأة جاهزة
                      </span>
                    )}
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 tabular-nums">{card.stamps_count}/{card.stamps_goal}</p>
                      <p className="text-xs text-gray-400">طابع</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="bg-gray-100 rounded-full h-2">
                    <div
                      className={clsx("h-2 rounded-full transition-all", ready ? "bg-brand-500" : "bg-brand-300")}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active customer modal */}
      {activeCustomer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">{activeCustomer.customer_name}</h3>
                <p className="text-xs text-gray-400" dir="ltr">{activeCustomer.customer_phone}</p>
              </div>
              <button onClick={() => { setActiveCustomer(null); setStampsToAdd(1); }}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Stamp visual */}
              <div>
                <p className="text-xs text-gray-400 mb-2">{activeCustomer.stamps_count} / {activeCustomer.stamps_goal} طابع</p>
                <StampVisual count={activeCustomer.stamps_count} goal={activeCustomer.stamps_goal} />
              </div>

              {activeCustomer.stamps_count >= activeCustomer.stamps_goal ? (
                <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center">
                  <Star className="w-6 h-6 text-brand-500 mx-auto mb-1" />
                  <p className="font-bold text-brand-700 text-sm">المكافأة جاهزة للاستبدال!</p>
                  <p className="text-xs text-brand-500 mt-1">استُبدل {activeCustomer.free_items_redeemed} مرة سابقاً</p>
                  <button
                    onClick={handleRedeem}
                    disabled={redeemMut.loading}
                    className="mt-3 w-full bg-brand-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-60"
                  >
                    استبدال المكافأة
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">إضافة طوابع</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setStampsToAdd(n => Math.max(1, n - 1))} className="w-9 h-9 rounded-xl border border-gray-200 font-bold text-lg text-gray-700">−</button>
                    <span className="text-lg font-bold tabular-nums w-8 text-center">{stampsToAdd}</span>
                    <button onClick={() => setStampsToAdd(n => Math.min(activeCustomer.stamps_goal - activeCustomer.stamps_count, n + 1))} className="w-9 h-9 rounded-xl border border-gray-200 font-bold text-lg text-gray-700">+</button>
                  </div>
                  <button
                    onClick={handleStamp}
                    disabled={stampMut.loading}
                    className="w-full flex items-center justify-center gap-2 bg-brand-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-60"
                  >
                    <Check className="w-4 h-4" /> إضافة {stampsToAdd} طابع
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer picker modal */}
      {showCustomerPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">اختر عميلاً</h3>
              <button onClick={() => { setShowCustomerPicker(false); setPickerSearch(""); }}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-5 py-3 border-b border-gray-50">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="بحث..."
                  className="w-full border border-gray-200 rounded-xl pr-9 pl-4 py-2 text-sm outline-none focus:border-brand-300"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-72">
              {customers.map(c => (
                <button key={c.id} onClick={() => handlePickCustomer(c)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-right">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs shrink-0">
                    {c.name?.[0] || "ع"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400" dir="ltr">{c.phone}</p>
                  </div>
                </button>
              ))}
              {customers.length === 0 && pickerSearch && (
                <p className="text-gray-400 text-sm text-center py-8">لا توجد نتائج</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
