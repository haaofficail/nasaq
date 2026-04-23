import { useState, useEffect, useMemo } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { flowerMasterApi, flowerBuilderApi, arrangementsApi, settingsApi } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { VAT_RATE } from "@/lib/constants";
import { confirmDialog } from "@/components/ui";
import {
  Flower2, Gift, Layers, ShoppingBag, Truck,
  Banknote, CreditCard, Clock, Plus, Minus, Trash2,
  CheckCircle2, Printer, RefreshCw, AlertTriangle,
  Loader2, ShoppingCart, X, Search, PackageOpen,
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

// Categories for POS catalog filtering
const DEFAULT_CATEGORIES: { id: string; label: string; icon: React.ElementType | null }[] = [
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

// Default delivery fees — overridden by settings when available
const DEFAULT_DELIVERY_FEES = [30, 50, 70];

// VAT_RATE is imported from @/lib/constants (single source of truth)

// Map builder catalog English types → Arabic POS categories
const CATALOG_TYPE_MAP: Record<string, string> = {
  packaging: "هدايا وإكسسوارات",
  gift:      "هدايا وإكسسوارات",
  card:      "هدايا وإكسسوارات",
  delivery:  "توصيل وخدمات",
};

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
          ? "border-[#eef2f6] bg-[#f8fafc] opacity-50 cursor-not-allowed"
          : "border-[#eef2f6] bg-white hover:border-brand-300 hover:shadow-sm cursor-pointer"
      )}
    >
      <span className="font-semibold text-gray-800 text-sm leading-snug">{item.name}</span>
      <span className="text-base font-bold text-brand-500">{fmtPrice(item.price)}</span>
      <StockBadge stock={item.stock} />
    </button>
  );
}

function SkeletonProductCard() {
  return (
    <div className="rounded-2xl border border-[#eef2f6] bg-white p-3 flex flex-col gap-2 animate-pulse">
      <div className="h-4 bg-[#f1f5f9] rounded-lg w-3/4" />
      <div className="h-5 bg-[#f1f5f9] rounded-lg w-1/2" />
      <div className="h-3 bg-[#f1f5f9] rounded-lg w-1/3" />
    </div>
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
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onDecrease}
          className="w-9 h-9 rounded-[10px] border border-[#eef2f6] flex items-center justify-center text-gray-500 hover:bg-[#f8fafc] active:scale-95 transition-all"
        >
          <Minus size={14} />
        </button>
        <span className="w-7 text-center text-sm font-semibold text-gray-800">{item.qty}</span>
        <button
          onClick={onIncrease}
          className="w-9 h-9 rounded-[10px] border border-brand-500 flex items-center justify-center text-brand-500 hover:bg-brand-50 active:scale-95 transition-all"
        >
          <Plus size={14} />
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
  const [searchQuery, setSearchQuery] = useState("");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<SaleType>("regular");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");

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
  const [lastOrderData, setLastOrderData] = useState<any>(null);

  // ─── Fetch settings (dynamic delivery fees / VAT) ──────────────────────────

  const { data: settingsData } = useApi(() => settingsApi.bookingSettings(), []);
  const deliveryFees: number[] = useMemo(() => {
    const fees = (settingsData?.data as any)?.delivery_fees ?? (settingsData?.data as any)?.deliveryFees;
    if (Array.isArray(fees) && fees.length > 0) return fees.map(Number);
    return DEFAULT_DELIVERY_FEES;
  }, [settingsData]);

  const vatRate: number = useMemo(() => {
    const rate = (settingsData?.data as any)?.vat_rate ?? (settingsData?.data as any)?.vatRate;
    return typeof rate === "number" && rate >= 0 ? rate : VAT_RATE;
  }, [settingsData]);

  const vatPercent = Math.round(vatRate * 100);

  // ─── Fetch catalog ──────────────────────────────────────────────────────────

  const { data: posCatalogData, loading: invLoading, error: invError, refetch: refetchPosCatalog } = useApi(
    () => flowerMasterApi.posCatalog(),
    []
  );
  const { data: catalogData, loading: catLoading } = useApi(
    () => flowerBuilderApi.catalog(),
    []
  );
  const { data: arrangementsData } = useApi(
    () => arrangementsApi.list(),
    []
  );

  useEffect(() => {
    const items: CatalogItem[] = [];

    // 1. Individual flower variants → "ورد مفرد" (via pos-catalog: display_name, sell_price, total_stock)
    const variants: any[] = posCatalogData?.data ?? [];
    variants.forEach((v: any) => {
      items.push({
        id: `variant-${v.variant_id}`,
        name: v.display_name,
        price: Number(v.sell_price ?? 0),
        type: "ورد مفرد",
        stock: Number(v.total_stock ?? 0),
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

    setCatalogItems(items);
  }, [catalogData, arrangementsData, posCatalogData]);

  // ─── Derived values ─────────────────────────────────────────────────────────

  // منشأة جديدة: ما استلمت ورداً بعد (API يرجع فارغ لأنه INNER JOIN على batches)
  const hasNoInventoryHistory = !isLoading && !invError &&
    (posCatalogData?.data ?? []).length === 0 &&
    (arrangementsData?.data ?? []).length === 0 &&
    (catalogData?.data ? Object.values(catalogData.data as Record<string, any[]>).flat().length === 0 : true);

  const filteredItems = catalogItems.filter((item) => {
    const matchesCategory = activeCategory === "الكل" || item.type === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || item.name.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryExtra = saleType === "delivery" ? deliveryDetails.deliveryFee : 0;
  const baseTotal = subtotal + deliveryExtra;
  const vat = parseFloat((baseTotal * vatRate).toFixed(2));
  const total = parseFloat((baseTotal + vat).toFixed(2));

  const cartEmpty = cart.length === 0;

  // ─── Cart operations ─────────────────────────────────────────────────────────
  // NOTE: Stock checks below are UI-level only (optimistic).
  // Backend MUST validate stock availability at checkout to prevent overselling
  // in concurrent scenarios. See: POST /flower-builder/orders

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        // UI-level stock guard (stock=999 means unlimited e.g. packages)
        if (item.stock < 999 && existing.qty >= item.stock) {
          toast.error(`الكمية المتاحة من "${item.name}" هي ${item.stock} فقط`);
          return prev;
        }
        return prev.map((c) =>
          c.id === item.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, type: item.type }];
    });
  }

  function increaseQty(id: string) {
    setCart((prev) => {
      const item = prev.find((c) => c.id === id);
      if (!item) return prev;
      // UI-level stock guard
      const catalogItem = catalogItems.find((ci) => ci.id === id);
      if (catalogItem && catalogItem.stock < 999 && item.qty >= catalogItem.stock) {
        toast.error(`الكمية المتاحة من "${item.name}" هي ${catalogItem.stock} فقط`);
        return prev;
      }
      return prev.map((c) => (c.id === id ? { ...c, qty: c.qty + 1 } : c));
    });
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
    setCustomerName("");
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

    // Pre-checkout stock validation — check items with finite stock
    const outOfStock = cart.filter(ci => {
      const catItem = catalogItems.find(c => c.id === ci.id);
      return catItem && catItem.stock < 999 && ci.qty > catItem.stock;
    });
    if (outOfStock.length > 0) {
      toast.error(`الكمية المطلوبة من "${outOfStock[0].name}" تتجاوز المخزون المتاح`);
      return;
    }

    // Validate required fields per sale type
    if (saleType === "delivery") {
      if (!deliveryDetails.recipientName.trim()) {
        toast.error("اسم المستلم مطلوب للتوصيل");
        return;
      }
      if (!deliveryDetails.recipientPhone.trim()) {
        toast.error("رقم جوال المستلم مطلوب للتوصيل");
        return;
      }
      if (!deliveryDetails.address.trim()) {
        toast.error("عنوان التوصيل مطلوب");
        return;
      }
    }

    if (saleType === "gift") {
      if (!giftDetails.recipientName.trim()) {
        toast.error("اسم المستلم مطلوب للهدية");
        return;
      }
      if (!giftDetails.recipientPhone.trim()) {
        toast.error("رقم جوال المستلم مطلوب للهدية");
        return;
      }
    }

    if (saleType === "pickup") {
      if (!pickupDetails.pickupTime) {
        toast.error("وقت الاستلام مطلوب");
        return;
      }
    }

    // Confirm checkout before processing
    const ok = await confirmDialog({
      title: "تأكيد عملية البيع",
      message: `إجمالي ${fmtPrice(total)} — ${PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label ?? paymentMethod}`,
      confirmLabel: "تأكيد البيع",
    });
    if (!ok) return;

    setProcessing(true);
    try {
      const mappedPayment = paymentMethod === "cash" ? "cash" : "card";
      const orderPayload: any = {
        customerName: customerName.trim() || "زائر",
        customerPhone: "",
        items: cart.map((item) => ({
          product_id: item.id,
          id: item.id,
          name: item.name,
          qty: item.qty,
          quantity: item.qty,
          price: item.price,
          unit_price: item.price,
        })),
        subtotal,
        total,
        totalPrice: total,
        paymentMethod: mappedPayment,
        paidAmount: total,
        orderType: saleType,
      };

      if (saleType === "gift") {
        orderPayload.recipientName = giftDetails.recipientName;
        orderPayload.recipientPhone = giftDetails.recipientPhone;
        orderPayload.giftMessage = giftDetails.message;
        orderPayload.isSurprise = giftDetails.isSurprise;
        orderPayload.customerPhone = giftDetails.recipientPhone;
      }
      if (saleType === "delivery") {
        orderPayload.recipientName = deliveryDetails.recipientName;
        orderPayload.recipientPhone = deliveryDetails.recipientPhone;
        orderPayload.deliveryAddress = { street: deliveryDetails.address };
        orderPayload.deliveryTime = deliveryDetails.deliveryTime;
        orderPayload.deliveryFee = deliveryDetails.deliveryFee;
        orderPayload.giftMessage = deliveryDetails.message;
        orderPayload.customerPhone = deliveryDetails.recipientPhone;
      }
      if (saleType === "pickup") {
        orderPayload.deliveryTime = pickupDetails.pickupTime;
        if (pickupDetails.recipientName) orderPayload.recipientName = pickupDetails.recipientName;
      }

      const res = await flowerBuilderApi.createOrder(orderPayload);
      setLastOrderData(res?.data ?? orderPayload);
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
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-10 max-w-md w-full text-center flex flex-col items-center gap-6">
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
              onClick={() => {
                const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
                const orderNo = esc(lastOrderData?.order_number ?? `FLW-${Date.now().toString(36).toUpperCase()}`);
                const receiptItems = cart.length > 0 ? cart : [];
                const escapedCustomer = esc(customerName.trim());
                const receiptHtml = `
                  <html dir="rtl"><head><meta charset="utf-8">
                  <style>
                    body { font-family: 'IBM Plex Sans Arabic', sans-serif; width: 280px; margin: 0 auto; padding: 12px; font-size: 12px; color: #222; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .line { border-top: 1px dashed #999; margin: 8px 0; }
                    .row { display: flex; justify-content: space-between; padding: 2px 0; }
                    .total-row { font-weight: bold; font-size: 14px; }
                    h2 { margin: 4px 0; font-size: 16px; }
                    p { margin: 2px 0; }
                  </style></head><body>
                  <div class="center">
                    <h2>ترميز OS</h2>
                    <p>فاتورة مبسّطة</p>
                    <p>${orderNo}</p>
                    <p>${esc(new Date().toLocaleDateString("ar-SA"))} ${esc(new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }))}</p>
                    ${escapedCustomer ? `<p>العميل: ${escapedCustomer}</p>` : ""}
                  </div>
                  <div class="line"></div>
                  ${receiptItems.map(ci => `<div class="row"><span>${esc(ci.name)} × ${ci.qty}</span><span>${(ci.price * ci.qty).toFixed(2)}</span></div>`).join("")}
                  <div class="line"></div>
                  <div class="row"><span>المجموع الفرعي</span><span>${subtotal.toFixed(2)} ر.س</span></div>
                  <div class="row"><span>ضريبة القيمة المضافة</span><span>${vat.toFixed(2)} ر.س</span></div>
                  <div class="line"></div>
                  <div class="row total-row"><span>الإجمالي</span><span>${total.toFixed(2)} ر.س</span></div>
                  <div class="line"></div>
                  <div class="row"><span>طريقة الدفع</span><span>${esc(PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label ?? paymentMethod)}</span></div>
                  <div class="center" style="margin-top:12px">
                    <p>شكراً لزيارتكم</p>
                    <p style="font-size:10px;color:#999">ترميز OS — نظام نقاط البيع</p>
                  </div>
                  </body></html>`;
                const printWin = window.open("", "_blank", "width=320,height=600");
                if (printWin) {
                  printWin.document.write(receiptHtml);
                  printWin.document.close();
                  printWin.focus();
                  printWin.print();
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#eef2f6] py-3 text-sm font-medium text-gray-600 hover:bg-[#f8fafc] transition-colors"
            >
              <Printer size={16} />
              طباعة الفاتورة
            </button>
            <button
              onClick={clearCart}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
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

  const isLoading = invLoading || catLoading;

  // ─── Main POS Layout ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-[#eef2f6] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Flower2 size={20} className="text-brand-500" />
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
        <div className="w-3/5 flex flex-col border-l border-[#eef2f6] overflow-hidden">

          {/* Category tabs */}
          <div className="bg-white border-b border-[#eef2f6] px-4 py-2 flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
            {DEFAULT_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={clsx(
                    "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0",
                    active
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {Icon && <Icon size={14} />}
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="bg-white px-4 pt-3 pb-2 shrink-0">
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300/30 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <SkeletonProductCard key={i} />
                ))}
              </div>
            ) : invError && catalogItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <AlertTriangle className="w-9 h-9 text-red-400" />
                <p className="text-sm text-red-500">حدث خطأ في تحميل المنتجات</p>
                <button onClick={refetchPosCatalog} className="text-sm text-brand-500 hover:underline">
                  إعادة المحاولة
                </button>
              </div>
            ) : hasNoInventoryHistory ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6 py-12">
                <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
                  <PackageOpen size={28} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-gray-700 font-medium text-sm">لا يوجد مخزون بعد</p>
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                    استلم دفعتك الأولى من الورد من صفحة<br />
                    <span className="font-medium text-brand-500">مخزون الورد الطازج</span> لتبدأ البيع
                  </p>
                </div>
                <a
                  href="/flower-inventory"
                  className="text-xs bg-brand-500 text-white px-4 py-2 rounded-xl hover:bg-brand-600 transition-colors"
                >
                  استلم دفعة ورد
                </a>
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
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#f8fafc] flex items-center justify-center">
                  <ShoppingCart size={24} className="text-gray-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">السلة فارغة</p>
                  <p className="text-xs text-gray-300 mt-0.5">أضف منتجات للسلة</p>
                </div>
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
          <div className="border-t border-[#eef2f6] px-4 pt-3 pb-4 flex flex-col gap-3 shrink-0">

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
                  <span>ضريبة القيمة المضافة {vatPercent}%</span>
                  <span>{fmtPrice(vat)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-800 text-base border-t border-[#eef2f6] pt-1.5 mt-0.5">
                  <span>الإجمالي</span>
                  <span className="text-brand-500">{fmtPrice(total)}</span>
                </div>
              </div>
            )}

            {/* Customer name */}
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1.5">اسم العميل</p>
              <input
                type="text"
                placeholder="اسم العميل (اختياري)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300/30 focus:border-brand-500"
              />
            </div>

            {/* Sale type tabs */}
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1.5">نوع العملية</p>
              <div className="grid grid-cols-4 gap-1">
                {SALE_TYPES.map((st) => (
                  <button
                    key={st.value}
                    onClick={() => setSaleType(st.value)}
                    className={clsx(
                      "py-3 rounded-xl text-xs font-medium transition-all",
                      saleType === st.value
                        ? "bg-brand-500 text-white"
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
                  className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500"
                />
                <input
                  type="tel"
                  placeholder="جوال المستلم"
                  value={giftDetails.recipientPhone}
                  onChange={(e) => setGiftDetails((g) => ({ ...g, recipientPhone: e.target.value }))}
                  className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500"
                />
                <textarea
                  placeholder="كل عام وأنتِ بخير..."
                  rows={2}
                  value={giftDetails.message}
                  onChange={(e) => setGiftDetails((g) => ({ ...g, message: e.target.value }))}
                  className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500 resize-none"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={giftDetails.isSurprise}
                    onChange={(e) => setGiftDetails((g) => ({ ...g, isSurprise: e.target.checked }))}
                    className="w-4 h-4 rounded accent-brand-500"
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
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500"
                  />
                  <input
                    type="tel"
                    placeholder="جوال المستلم"
                    value={deliveryDetails.recipientPhone}
                    onChange={(e) => setDeliveryDetails((d) => ({ ...d, recipientPhone: e.target.value }))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="عنوان التوصيل"
                  value={deliveryDetails.address}
                  onChange={(e) => setDeliveryDetails((d) => ({ ...d, address: e.target.value }))}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="datetime-local"
                    value={deliveryDetails.deliveryTime}
                    onChange={(e) => setDeliveryDetails((d) => ({ ...d, deliveryTime: e.target.value }))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-brand-500"
                  />
                  <select
                    value={deliveryDetails.deliveryFee}
                    onChange={(e) => setDeliveryDetails((d) => ({ ...d, deliveryFee: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-brand-500"
                  >
                    {deliveryFees.map((fee) => (
                      <option key={fee} value={fee}>{fee} ر.س</option>
                    ))}
                  </select>
                </div>
                <textarea
                  placeholder="نص البطاقة (اختياري)"
                  rows={2}
                  value={deliveryDetails.message}
                  onChange={(e) => setDeliveryDetails((d) => ({ ...d, message: e.target.value }))}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500 resize-none"
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
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500"
                />
                <input
                  type="datetime-local"
                  value={pickupDetails.pickupTime}
                  onChange={(e) => setPickupDetails((p) => ({ ...p, pickupTime: e.target.value }))}
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-brand-500"
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
                          ? "bg-brand-500 text-white shadow-sm"
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
