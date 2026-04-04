import { useState, useEffect } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import {
  Flower2, Gift, Layers, ShoppingBag, Truck,
  Banknote, CreditCard, Clock, Plus, Minus, Trash2,
  CheckCircle2, Printer, RefreshCw, AlertTriangle,
  Loader2, ShoppingCart, X,
} from "lucide-react";
import { clsx } from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaleType = "regular" | "gift" | "delivery" | "pickup";
type PaymentMethod = "cash" | "network" | "mada" | "credit";

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  type: string;
}

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  type: string;
  stock: number;
}

interface GiftDetails {
  recipientName: string;
  recipientPhone: string;
  message: string;
  isSurprise: boolean;
}

interface DeliveryDetails {
  recipientName: string;
  recipientPhone: string;
  address: string;
  deliveryTime: string;
  deliveryFee: number;
  message: string;
}

interface PickupDetails {
  pickupTime: string;
  recipientName: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "الكل", label: "الكل", icon: null },
  { id: "ورد مفرد", label: "ورد مفرد", icon: Flower2 },
  { id: "باقات", label: "باقات", icon: Gift },
  { id: "تنسيقات", label: "تنسيقات", icon: Layers },
  { id: "هدايا وإكسسوارات", label: "هدايا وإكسسوارات", icon: ShoppingBag },
  { id: "توصيل وخدمات", label: "توصيل وخدمات", icon: Truck },
];

const SALE_TYPES: { value: SaleType; label: string }[] = [
  { value: "regular", label: "بيع عادي" },
  { value: "gift", label: "هدية" },
  { value: "delivery", label: "توصيل" },
  { value: "pickup", label: "استلام لاحق" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: "cash", label: "نقداً", icon: Banknote },
  { value: "network", label: "شبكة", icon: CreditCard },
  { value: "mada", label: "مدى", icon: CreditCard },
  { value: "credit", label: "آجل", icon: Clock },
];

const DELIVERY_FEES = [30, 50, 70];

const MOCK_CATALOG: CatalogItem[] = [
  { id: "1", name: "وردة حمراء", price: 8, type: "ورد مفرد", stock: 45 },
  { id: "2", name: "وردة وردية", price: 7, type: "ورد مفرد", stock: 30 },
  { id: "3", name: "أوركيد أبيض", price: 25, type: "ورد مفرد", stock: 8 },
  { id: "4", name: "باقة رومانسية", price: 150, type: "باقات", stock: 5 },
  { id: "5", name: "باقة العروس", price: 350, type: "باقات", stock: 3 },
  { id: "6", name: "تنسيق طاولة", price: 280, type: "تنسيقات", stock: 4 },
  { id: "7", name: "بالون قلب", price: 15, type: "هدايا وإكسسوارات", stock: 20 },
  { id: "8", name: "شوكولاتة فيريرو", price: 45, type: "هدايا وإكسسوارات", stock: 10 },
  { id: "9", name: "دباب صغير", price: 35, type: "هدايا وإكسسوارات", stock: 7 },
  { id: "10", name: "توصيل الرياض", price: 30, type: "توصيل وخدمات", stock: 999 },
];

const VAT_RATE = 0.15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number | undefined | null) {
  return `${(n ?? 0).toLocaleString("ar-SA")} ر.س`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  if (stock > 10) {
    return (
      <span className="text-xs text-gray-400">{stock} متبقي</span>
    );
  }
  if (stock === 0) {
    return <span className="text-xs text-red-500 font-medium">نفد</span>;
  }
  return (
    <span className="text-xs text-red-500 font-medium">آخر {stock}</span>
  );
}

function ProductCard({ item, onAdd }: { item: CatalogItem; onAdd: (item: CatalogItem) => void }) {
  const soldOut = item.stock === 0;
  return (
    <button
      onClick={() => !soldOut && onAdd(item)}
      disabled={soldOut}
      className={clsx(
        "rounded-2xl border p-3 text-right flex flex-col gap-1 transition-all active:scale-95 focus:outline-none",
        soldOut
          ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
          : "border-gray-100 bg-white hover:border-brand-300 hover:shadow-sm cursor-pointer"
      )}
    >
      <span className="font-semibold text-gray-800 text-sm leading-snug">{item.name}</span>
      <span className="text-base font-bold text-[#5b9bd5]">{fmtPrice(item.price)}</span>
      <StockBadge stock={item.stock} />
    </button>
  );
}

function CartRow({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: CartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
        <p className="text-xs text-gray-400">{fmtPrice(item.price)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onDecrease}
          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 active:scale-95 transition-all"
        >
          <Minus size={12} />
        </button>
        <span className="w-6 text-center text-sm font-semibold text-gray-800">{item.qty}</span>
        <button
          onClick={onIncrease}
          className="w-7 h-7 rounded-lg border border-[#5b9bd5] flex items-center justify-center text-[#5b9bd5] hover:bg-blue-50 active:scale-95 transition-all"
        >
          <Plus size={12} />
        </button>
      </div>
      <span className="text-sm font-bold text-gray-800 w-16 text-left shrink-0">
        {fmtPrice(item.price * item.qty)}
      </span>
      <button
        onClick={onRemove}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all active:scale-95"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlowerPOSPage() {
  // Catalog state
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<SaleType>("regular");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  // Form states
  const [giftDetails, setGiftDetails] = useState<GiftDetails>({
    recipientName: "",
    recipientPhone: "",
    message: "",
    isSurprise: false,
  });
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails>({
    recipientName: "",
    recipientPhone: "",
    address: "",
    deliveryTime: "",
    deliveryFee: 30,
    message: "",
  });
  const [pickupDetails, setPickupDetails] = useState<PickupDetails>({
    pickupTime: "",
    recipientName: "",
  });

  // UI state
  const [showSuccess, setShowSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  // ─── Fetch catalog ──────────────────────────────────────────────────────────

  // Map builder catalog English types → Arabic POS categories
  const CATALOG_TYPE_MAP: Record<string, string> = {
    packaging: "هدايا وإكسسوارات",
    gift:      "هدايا وإكسسوارات",
    card:      "هدايا وإكسسوارات",
    delivery:  "توصيل وخدمات",
  };

  const { data: inventoryData, loading: invLoading, error: invError } = useApi(
    () => api.get<any>("/flower-master/batches"),
    []
  );
  const { data: catalogData, loading: catLoading } = useApi(
    () => api.get<any>("/flower-builder/catalog"),
    []
  );
  const { data: arrangementsData } = useApi(
    () => api.get<any>("/arrangements"),
    []
  );
  const { data: variantsData } = useApi(
    () => api.get<any>("/flower-master/variants"),
    []
  );

  useEffect(() => {
    const items: CatalogItem[] = [];

    // 1. Individual flower variants → "ورد مفرد"
    const variants: any[] = variantsData?.data ?? [];
    variants.filter((v: any) => v.is_active !== false).forEach((v: any) => {
      const label = v.display_name_ar || v.flower_type || v.flowerType || v.displayNameAr || "";
      items.push({
        id: `variant-${v.id}`,
        name: label,
        price: Number(v.price_per_stem ?? v.pricePerStem ?? 0),
        type: "ورد مفرد",
        stock: v.total_stock ?? v.totalStock ?? 999,
      });
    });

    // 2. Packages & arrangements → "باقات"
    const arrangements: any[] = arrangementsData?.data ?? [];
    arrangements.filter((a: any) => a.is_active !== false).forEach((a: any) => {
      items.push({
        id: `pkg-${a.id}`,
        name: a.name,
        price: Number(a.base_price ?? 0),
        type: "باقات",
        stock: 999,
      });
    });

    // 3. Builder catalog (packaging, gift, card, delivery)
    const grouped = catalogData?.data;
    if (grouped && typeof grouped === "object" && !Array.isArray(grouped)) {
      Object.values(grouped as Record<string, any[]>)
        .flat()
        .filter((item: any) => item.is_active !== false)
        .forEach((item: any) => {
          items.push({
            id: item.id,
            name: item.name,
            price: Number(item.price) || 0,
            type: CATALOG_TYPE_MAP[item.type] ?? item.type ?? "هدايا وإكسسوارات",
            stock: item.stock ?? 999,
          });
        });
    }

    if (items.length > 0) {
      setCatalogItems(items);
    } else {
      setCatalogItems(MOCK_CATALOG);
    }
  }, [catalogData, arrangementsData, variantsData]);

  // ─── Derived values ─────────────────────────────────────────────────────────

  const filteredItems =
    activeCategory === "الكل"
      ? catalogItems
      : catalogItems.filter((item) => item.type === activeCategory);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryExtra = saleType === "delivery" ? deliveryDetails.deliveryFee : 0;
  const baseTotal = subtotal + deliveryExtra;
  const vat = parseFloat((baseTotal * VAT_RATE).toFixed(2));
  const total = parseFloat((baseTotal + vat).toFixed(2));

  const cartEmpty = cart.length === 0;

  // ─── Cart operations ─────────────────────────────────────────────────────────

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, type: item.type }];
    });
  }

  function increaseQty(id: string) {
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, qty: c.qty + 1 } : c))
    );
  }

  function decreaseQty(id: string) {
    setCart((prev) => {
      const item = prev.find((c) => c.id === id);
      if (!item) return prev;
      if (item.qty === 1) return prev.filter((c) => c.id !== id);
      return prev.map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c));
    });
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((c) => c.id !== id));
  }

  function clearCart() {
    setCart([]);
    setSaleType("regular");
    setPaymentMethod("cash");
    setGiftDetails({ recipientName: "", recipientPhone: "", message: "", isSurprise: false });
    setDeliveryDetails({ recipientName: "", recipientPhone: "", address: "", deliveryTime: "", deliveryFee: 30, message: "" });
    setPickupDetails({ pickupTime: "", recipientName: "" });
    setShowSuccess(false);
  }

  // ─── Checkout ───────────────────────────────────────────────────────────────

  async function handleCheckout() {
    if (cartEmpty) {
      toast.error("السلة فارغة");
      return;
    }

    setProcessing(true);
    try {
      const orderPayload = {
        items: cart.map((item) => ({
          product_id: item.id,
          name: item.name,
          qty: item.qty,
          unit_price: item.price,
        })),
        subtotal,
        vat,
        total,
        payment_method: paymentMethod,
        sale_type: saleType,
        ...(saleType === "gift" && { gift_details: giftDetails }),
        ...(saleType === "delivery" && { delivery_details: deliveryDetails }),
        ...(saleType === "pickup" && { pickup_details: pickupDetails }),
      };

      await api.post("/flower-builder/orders", orderPayload);
      setShowSuccess(true);
      toast.success("تم إتمام البيع بنجاح");
    } catch {
      toast.error("فشل إتمام البيع، حاول مرة أخرى");
    } finally {
      setProcessing(false);
    }
  }

  // ─── Success Screen ──────────────────────────────────────────────────────────

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">تم البيع بنجاح</h2>
            <p className="text-gray-500 text-sm">
              {saleType === "delivery" && "سيتم التوصيل في الوقت المحدد"}
              {saleType === "gift" && "تم تسجيل تفاصيل الهدية"}
              {saleType === "pickup" && "سيتم إعداد الطلب للاستلام"}
              {saleType === "regular" && "شكراً للعميل"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 w-full text-right">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>الإجمالي</span>
              <span className="font-bold text-gray-800 text-base">{fmtPrice(total)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>طريقة الدفع</span>
              <span>{PAYMENT_METHODS.find((p) => p.value === paymentMethod)?.label}</span>
            </div>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => toast.info("جاري الطباعة...")}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Printer size={16} />
              طباعة الفاتورة
            </button>
            <button
              onClick={clearCart}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#5b9bd5] py-3 text-sm font-medium text-white hover:bg-[#4a8ac4] transition-colors"
            >
              <RefreshCw size={16} />
              بيع جديد
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading skeleton ────────────────────────────────────────────────────────

  const isLoading = invLoading && catLoading;

  // ─── Main POS Layout ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Flower2 size={20} className="text-[#5b9bd5]" />
          <span className="font-bold text-gray-800 text-lg">كاشير الورد</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <ShoppingCart size={14} />
          <span>{cart.reduce((s, c) => s + c.qty, 0)} صنف في السلة</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── RIGHT: Catalog (60%) ── */}
        <div className="w-3/5 flex flex-col border-l border-gray-100 overflow-hidden">

          {/* Category tabs */}
          <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={clsx(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0",
                    active
                      ? "bg-[#5b9bd5] text-white shadow-sm"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {Icon && <Icon size={14} />}
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-gray-100 bg-white p-3 h-24 animate-pulse">
                    <div className="h-4 bg-gray-100 rounded-lg w-3/4 mb-2" />
                    <div className="h-5 bg-gray-100 rounded-lg w-1/2 mb-2" />
                    <div className="h-3 bg-gray-100 rounded-lg w-1/3" />
                  </div>
                ))}
              </div>
            ) : invError && catalogItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                <AlertTriangle size={32} className="text-amber-400" />
                <p className="text-gray-500 text-sm">تعذّر تحميل المنتجات</p>
                <p className="text-gray-400 text-xs">يتم عرض الكتالوج الافتراضي</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                <Layers size={32} className="text-gray-200" />
                <p className="text-gray-400 text-sm">لا توجد منتجات في هذه الفئة</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredItems.map((item) => (
                  <ProductCard key={item.id} item={item} onAdd={addToCart} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── LEFT: Cart + Checkout (40%) ── */}
        <div className="w-2/5 flex flex-col bg-white overflow-hidden">

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-gray-700 text-sm">السلة</span>
              {!cartEmpty && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1"
                >
                  <X size={12} />
                  مسح الكل
                </button>
              )}
            </div>

            {cartEmpty ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                <ShoppingCart size={28} className="text-gray-200" />
                <p className="text-gray-400 text-sm">السلة فارغة</p>
                <p className="text-gray-300 text-xs">اضغط على منتج لإضافته</p>
              </div>
            ) : (
              <div>
                {cart.map((item) => (
                  <CartRow
                    key={item.id}
                    item={item}
                    onIncrease={() => increaseQty(item.id)}
                    onDecrease={() => decreaseQty(item.id)}
                    onRemove={() => removeFromCart(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Totals + Forms + Payment */}
          <div className="border-t border-gray-100 px-4 pt-3 pb-4 flex flex-col gap-3 shrink-0">

            {/* Totals */}
            {!cartEmpty && (
              <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>المجموع الفرعي</span>
                  <span>{fmtPrice(subtotal)}</span>
                </div>
                {saleType === "delivery" && (
                  <div className="flex justify-between text-gray-500">
                    <span>رسوم التوصيل</span>
                    <span>{fmtPrice(deliveryExtra)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>ضريبة القيمة المضافة 15%</span>
                  <span>{fmtPrice(vat)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-800 text-base border-t border-gray-200 pt-1.5 mt-0.5">
                  <span>الإجمالي</span>
                  <span className="text-[#5b9bd5]">{fmtPrice(total)}</span>
                </div>
              </div>
            )}

            {/* Sale type tabs */}
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1.5">نوع العملية</p>
              <div className="grid grid-cols-4 gap-1">
                {SALE_TYPES.map((st) => (
                  <button
                    key={st.value}
                    onClick={() => setSaleType(st.value)}
                    className={clsx(
                      "py-2 rounded-xl text-xs font-medium transition-all",
                      saleType === st.value
                        ? "bg-[#5b9bd5] text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gift form */}
            {saleType === "gift" && (
              <div className="bg-pink-50 rounded-xl p-3 flex flex-col gap-2 border border-pink-100">
                <p className="text-xs font-semibold text-pink-700 mb-0.5">تفاصيل الهدية</p>
                <input
                  type="text"
                  placeholder="اسم المستلم"
                  value={giftDetails.recipientName}
                  onChange={(e) => setGiftDetails((g) => ({ ...g, recipientName: e.target.value }))}
                  className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5b9bd5]"
                />
                <input
                  type="tel"
                  placeholder="جوال المستلم"
                  value={giftDetails.recipientPhone}
                  onChange={(e) => setGiftDetails((g) => ({ ...g, recipientPhone: e.target.value }))}
                  className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5b9bd5]"
                />
                <textarea
                  placeholder="كل عام وأنتِ بخير..."
                  rows={2}
                  value={giftDetails.message}
                  onChange={(e) => setGiftDetails((g) => ({ ...g, message: e.target.value }))}
                  className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5b9bd5] resize-none"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={giftDetails.isSurprise}
                    onChange={(e) => setGiftDetails((g) => ({ ...g, isSurprise: e.target.checked }))}
                    className="w-4 h-4 rounded accent-[#5b9bd5]"
                  />
                  <span className="text-xs text-gray-600">مفاجأة — لا تتصل بالمستلم مسبقاً</span>
                </label>
              </div>
            )}

            {/* Delivery form */}
            {saleType === "delivery" && (
              <div className="bg-blue-50 rounded-xl p-3 flex flex-col gap-2 border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-0.5">تفاصيل التوصيل</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="اسم المستلم"
                    value={deliveryDetails.recipientName}
                    onChange={(e) => setDeliveryDetails((d) => ({ ...d, recipientName: e.target.value }))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5b9bd5]"
                  />
                  <input
                    type="tel"
                    placeholder="جوال المستلم"
                    value={deliveryDetails.recipientPhone}
                    onChange={(e) => setDeliveryDetails((d) => ({ ...d, recipientPhone: e.target.value }))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5b9bd5]"
                  />
                </div>
                <input
                  type="text"
                  placeholder="عنوان التوصيل"
                  value={deliveryDetails.address}
                  onChange={(e) => setDeliveryDetails((d) => ({ ...d, address: e.target.value }))}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5b9bd5]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="datetime-local"
                    value={deliveryDetails.deliveryTime}
                    onChange={(e) => setDeliveryDetails((d) => ({ ...d, deliveryTime: e.target.value }))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#5b9bd5]"
                  />
                  <select
                    value={deliveryDetails.deliveryFee}
                    onChange={(e) => setDeliveryDetails((d) => ({ ...d, deliveryFee: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#5b9bd5]"
                  >
                    {DELIVERY_FEES.map((fee) => (
                      <option key={fee} value={fee}>{fee} ر.س</option>
                    ))}
                  </select>
                </div>
                <textarea
                  placeholder="نص البطاقة (اختياري)"
                  rows={2}
                  value={deliveryDetails.message}
                  onChange={(e) => setDeliveryDetails((d) => ({ ...d, message: e.target.value }))}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5b9bd5] resize-none"
                />
              </div>
            )}

            {/* Pickup form */}
            {saleType === "pickup" && (
              <div className="bg-amber-50 rounded-xl p-3 flex flex-col gap-2 border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">تفاصيل الاستلام</p>
                <input
                  type="text"
                  placeholder="اسم المستلم"
                  value={pickupDetails.recipientName}
                  onChange={(e) => setPickupDetails((p) => ({ ...p, recipientName: e.target.value }))}
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5b9bd5]"
                />
                <input
                  type="datetime-local"
                  value={pickupDetails.pickupTime}
                  onChange={(e) => setPickupDetails((p) => ({ ...p, pickupTime: e.target.value }))}
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#5b9bd5]"
                />
              </div>
            )}

            {/* Payment method */}
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1.5">طريقة الدفع</p>
              <div className="grid grid-cols-4 gap-1.5">
                {PAYMENT_METHODS.map((pm) => {
                  const Icon = pm.icon;
                  const active = paymentMethod === pm.value;
                  return (
                    <button
                      key={pm.value}
                      onClick={() => setPaymentMethod(pm.value)}
                      className={clsx(
                        "flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all",
                        active
                          ? "bg-[#5b9bd5] text-white shadow-sm"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <Icon size={16} />
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkout button */}
            <button
              onClick={handleCheckout}
              disabled={cartEmpty || processing}
              className={clsx(
                "w-full rounded-2xl py-4 text-base font-bold transition-all flex items-center justify-center gap-2",
                cartEmpty || processing
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600 active:scale-[0.98] shadow-sm"
              )}
            >
              {processing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  {cartEmpty ? "السلة فارغة" : `إتمام البيع — ${fmtPrice(total)}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
