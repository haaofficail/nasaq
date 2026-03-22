import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, Plus, Minus, Trash2, Search, Package,
  CreditCard, Banknote, QrCode, Receipt, X, CheckCircle2,
} from "lucide-react";
import { clsx } from "clsx";
import { servicesApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

const paymentMethods = [
  { key: "cash",   label: "نقد",         icon: Banknote  },
  { key: "card",   label: "بطاقة",       icon: CreditCard },
  { key: "tap",    label: "تاب / مدى",   icon: QrCode    },
];

export function POSPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState("cash");
  const [done, setDone] = useState(false);

  const { data: svcRes, loading } = useApi(() => servicesApi.list({ status: "active" }), []);
  const services: any[] = svcRes?.data || [];

  const filtered = services.filter((s) =>
    !search || s.name?.includes(search)
  );

  const addItem = (svc: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === svc.id);
      if (existing) {
        return prev.map((c) => c.id === svc.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { id: svc.id, name: svc.name, price: Number(svc.basePrice || 0), qty: 1 }];
    });
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => c.id === id ? { ...c, qty: c.qty + delta } : c)
        .filter((c) => c.qty > 0)
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));
  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const vat      = Math.round(subtotal * 0.15);
  const total    = subtotal + vat;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setDone(true);
    setTimeout(() => {
      setDone(false);
      clearCart();
    }, 2500);
  };

  return (
    <div className="flex gap-5 h-[calc(100vh-8rem)]">
      {/* Products panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-xl font-bold text-gray-900">نقطة البيع</h1>
          <span className="text-xs bg-brand-50 text-brand-600 font-medium px-2 py-0.5 rounded-full">
            {services.length} خدمة
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث عن خدمة..."
            className="w-full bg-white border border-gray-100 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all"
          />
        </div>

        {/* Services grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <Package className="w-9 h-9 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">لا توجد خدمات</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((svc: any) => {
                const inCart = cart.find((c) => c.id === svc.id);
                return (
                  <button
                    key={svc.id}
                    onClick={() => addItem(svc)}
                    className={clsx(
                      "relative text-right p-4 rounded-2xl border transition-all hover:shadow-sm",
                      inCart
                        ? "border-brand-300 bg-brand-50"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    )}
                  >
                    {inCart && (
                      <span className="absolute top-2 left-2 w-5 h-5 bg-brand-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                        {inCart.qty}
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
                      <Package className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight mb-1">
                      {svc.name}
                    </p>
                    <p className="text-sm font-bold text-brand-600 tabular-nums">
                      {Number(svc.basePrice || 0).toLocaleString("ar-SA")} ر.س
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-80 shrink-0 flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Cart header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4.5 h-4.5 text-brand-500" />
            <span className="font-semibold text-gray-900 text-sm">السلة</span>
            {cart.length > 0 && (
              <span className="w-5 h-5 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> مسح
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-center">
              <ShoppingCart className="w-8 h-8 text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">أضف خدمات من القائمة</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-medium text-gray-900 flex-1 line-clamp-2">{item.name}</p>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQty(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Minus className="w-3 h-3 text-gray-600" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums text-gray-700">{item.qty}</span>
                    <button
                      onClick={() => changeQty(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-brand-500 flex items-center justify-center hover:bg-brand-600 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">
                    {(item.price * item.qty).toLocaleString("ar-SA")} ر.س
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment section */}
        <div className="border-t border-gray-50 p-4 space-y-3">
          {/* Payment method */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">طريقة الدفع</p>
            <div className="grid grid-cols-3 gap-1">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.key}
                  onClick={() => setPayMethod(pm.key)}
                  className={clsx(
                    "flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all",
                    payMethod === pm.key
                      ? "border-brand-300 bg-brand-50 text-brand-600"
                      : "border-gray-100 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <pm.icon className="w-4 h-4" />
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>المجموع</span>
              <span className="tabular-nums">{subtotal.toLocaleString("ar-SA")} ر.س</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>ضريبة 15%</span>
              <span className="tabular-nums">{vat.toLocaleString("ar-SA")} ر.س</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>الإجمالي</span>
              <span className="tabular-nums text-brand-600">{total.toLocaleString("ar-SA")} ر.س</span>
            </div>
          </div>

          {/* Checkout button */}
          {done ? (
            <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 rounded-xl py-3 text-sm font-semibold">
              <CheckCircle2 className="w-4.5 h-4.5" />
              تم بنجاح!
            </div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-brand-500/20"
            >
              <Receipt className="w-4 h-4" />
              إتمام البيع · {total.toLocaleString("ar-SA")} ر.س
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
