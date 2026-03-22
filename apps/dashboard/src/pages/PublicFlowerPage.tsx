import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Flower2, Gift, CreditCard, Truck, ChevronLeft, ChevronRight,
  Plus, Minus, Check, Phone, MapPin, User, Calendar, MessageSquare,
  ShoppingBag, Loader2, Package, AlertCircle, Star, Sparkles,
  ArrowUp, Info, Heart,
} from "lucide-react";
import { clsx } from "clsx";

/* ─── Types ──────────────────────────────────────────────────── */
interface FlowerItem {
  id: string; name: string; color: string; type: string;
  sellPrice: number; stock: number; imageUrl?: string;
}
interface CatalogItem {
  id: string; name: string; nameEn?: string; description?: string;
  price: number; icon?: string; isDefault?: boolean; maxQuantity?: number;
}
interface FlowerPackage {
  id: string; name: string; description?: string;
  basePrice: number; image?: string; components?: any[];
}
interface OrgInfo {
  name: string; slug: string; phone?: string; logo?: string; primaryColor?: string; city?: string;
}
interface PageConfig {
  heroTitle: string; heroSubtitle: string; heroImage: string | null;
  accentColor: string;
  features: { showPackages: boolean; showGifts: boolean; showCard: boolean; deliveryEnabled: boolean; pickupEnabled: boolean };
  minFlowers: number; maxFlowers: number;
  cardTemplates: string[];
  deliveryNote: string; thankYouMessage: string;
  upsellThreshold: number; showUrgencyBadge: boolean; showPricePerStem: boolean;
}
interface PublicData {
  org: OrgInfo;
  inventory: FlowerItem[];
  catalog: { packaging: CatalogItem[]; gift: CatalogItem[]; card: CatalogItem[]; delivery: CatalogItem[] };
  packages: FlowerPackage[];
  pageConfig: PageConfig;
}

/* ─── Default config ──────────────────────────────────────────── */
const DEFAULT_CFG: PageConfig = {
  heroTitle: "باقة ورود مخصصة", heroSubtitle: "اصنع لحظتك بيدك",
  heroImage: null, accentColor: "#e11d48",
  features: { showPackages: true, showGifts: true, showCard: true, deliveryEnabled: true, pickupEnabled: true },
  minFlowers: 1, maxFlowers: 50,
  cardTemplates: ["بكل الحب والتقدير", "بمناسبة عيد ميلادك", "تهانينا من القلب"],
  deliveryNote: "", thankYouMessage: "شكراً لطلبك! سنتواصل معك قريباً",
  upsellThreshold: 5, showUrgencyBadge: true, showPricePerStem: true,
};

/* ─── Color dot map ───────────────────────────────────────────── */
const COLOR_DOT: Record<string, string> = {
  أحمر: "#ef4444", وردي: "#ec4899", أبيض: "#e5e7eb",
  أصفر: "#eab308", برتقالي: "#f97316", بنفسجي: "#a855f7",
  أزرق: "#3b82f6", أخضر: "#22c55e", مختلط: "#8b5cf6",
};

/* ─── Storage key ─────────────────────────────────────────────── */
const STORAGE_KEY = (slug: string) => `flower_builder_${slug}`;

/* ─── Step definitions (dynamic) ─────────────────────────────── */
function getSteps(cfg: PageConfig) {
  return [
    { id: 1, label: "الورود",   icon: Flower2    },
    { id: 2, label: "التغليف",  icon: Package    },
    ...(cfg.features.showGifts ? [{ id: 3, label: "الهدايا", icon: Gift }] : []),
    ...(cfg.features.showCard  ? [{ id: 4, label: "الكرت",   icon: CreditCard }] : []),
    { id: 5, label: "التوصيل", icon: Truck       },
    { id: 6, label: "الملخص",  icon: ShoppingBag },
  ];
}

/* ═══════════════════════════════════════════════════════════════ */
export function PublicFlowerPage() {
  const { slug } = useParams<{ slug: string }>();

  const [data,    setData]    = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  /* builder */
  const [step, setStep]           = useState(1);
  const [flowers, setFlowers]     = useState<Record<string, number>>({});
  const [packaging, setPackaging] = useState("");
  const [gifts, setGifts]         = useState<Record<string, number>>({});
  const [cardId, setCardId]       = useState("");
  const [cardMsg, setCardMsg]     = useState("");
  const [delivType, setDelivType] = useState<"delivery" | "pickup">("delivery");
  const [delivDate, setDelivDate] = useState("");
  const [delivAddr, setDelivAddr] = useState("");
  const [recipName, setRecipName] = useState("");
  const [recipPhone, setRecipPhone] = useState("");
  const [custName, setCustName]   = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [notes, setNotes]         = useState("");

  /* packages */
  const [pkgMode, setPkgMode] = useState(false);
  const [selPkg,  setSelPkg]  = useState("");

  /* submission */
  const [submitting, setSubmitting] = useState(false);
  const [orderNum,   setOrderNum]   = useState("");
  const [submitErr,  setSubmitErr]  = useState("");

  /* smart upsell banner */
  const [upsellShown, setUpsellShown] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  /* ── Fetch ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/v1/flower-builder/public/${slug}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) { setData(json.data); restoreProgress(slug, json.data); }
        else setError("لم يتم العثور على متجر الورود");
      })
      .catch(() => setError("تعذّر الاتصال بالخادم"))
      .finally(() => setLoading(false));
  }, [slug]);

  /* ── Persist progress to localStorage ────────────────────── */
  const saveProgress = useCallback(() => {
    if (!slug) return;
    localStorage.setItem(STORAGE_KEY(slug), JSON.stringify({
      flowers, packaging, gifts, cardId, cardMsg,
      delivType, delivDate, delivAddr, recipName, recipPhone, custName, custPhone, notes,
    }));
  }, [slug, flowers, packaging, gifts, cardId, cardMsg, delivType, delivDate, delivAddr, recipName, recipPhone, custName, custPhone, notes]);

  useEffect(() => { saveProgress(); }, [saveProgress]);

  function restoreProgress(s: string, d: PublicData) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY(s));
      if (!saved) return;
      const p = JSON.parse(saved);
      // validate flower IDs still exist in inventory
      const validFlowers: Record<string, number> = {};
      Object.entries(p.flowers || {}).forEach(([id, qty]) => {
        if (d.inventory.find(f => f.id === id)) validFlowers[id] = qty as number;
      });
      if (Object.keys(validFlowers).length) setFlowers(validFlowers);
      if (p.packaging) setPackaging(p.packaging);
      if (p.gifts) setGifts(p.gifts);
      if (p.cardId)   setCardId(p.cardId);
      if (p.cardMsg)  setCardMsg(p.cardMsg);
      if (p.delivType) setDelivType(p.delivType);
      if (p.delivDate) setDelivDate(p.delivDate);
      if (p.delivAddr) setDelivAddr(p.delivAddr);
      if (p.recipName) setRecipName(p.recipName);
      if (p.recipPhone) setRecipPhone(p.recipPhone);
      if (p.custName) setCustName(p.custName);
      if (p.custPhone) setCustPhone(p.custPhone);
      if (p.notes) setNotes(p.notes);
    } catch { /* ignore corrupt saved state */ }
  }

  /* ── Step scroll to top ───────────────────────────────────── */
  const goToStep = (n: number) => {
    setStep(n);
    setTimeout(() => contentRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  /* ── Derived values ───────────────────────────────────────── */
  const cfg: PageConfig  = { ...DEFAULT_CFG, ...(data?.pageConfig || {}) };
  const accent           = cfg.accentColor || "#e11d48";
  const steps            = data ? getSteps(cfg) : getSteps(DEFAULT_CFG);
  const maxStepId        = steps[steps.length - 1].id;

  const flowerCount = Object.values(flowers).reduce((s, v) => s + v, 0);

  const flowerTotal = data ? Object.entries(flowers).reduce((s, [id, qty]) => {
    const f = data.inventory.find(x => x.id === id);
    return s + (f ? f.sellPrice * qty : 0);
  }, 0) : 0;

  const packagingTotal = (() => {
    if (!data || !packaging) return 0;
    return data.catalog.packaging.find(x => x.id === packaging)?.price || 0;
  })();

  const giftsTotal = data ? Object.entries(gifts).reduce((s, [id, qty]) => {
    return s + (data.catalog.gift.find(x => x.id === id)?.price || 0) * qty;
  }, 0) : 0;

  const cardTotal = (() => {
    if (!data || !cardId) return 0;
    return data.catalog.card.find(x => x.id === cardId)?.price || 0;
  })();

  const grandTotal = flowerTotal + packagingTotal + giftsTotal + cardTotal;

  /* ── Smart upsell: show banner when >= threshold ──────────── */
  useEffect(() => {
    if (data && flowerCount >= cfg.upsellThreshold && !pkgMode && data.packages.length > 0 && !upsellShown) {
      setUpsellShown(true);
    }
  }, [flowerCount, cfg.upsellThreshold, pkgMode, data?.packages.length]);

  /* ── Flower step available types ──────────────────────────── */
  const flowerTypes  = [...new Set((data?.inventory || []).map(f => f.type).filter(Boolean))];
  const [typeFilter, setTypeFilter]   = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const filteredInventory = (data?.inventory || []).filter(f =>
    (!typeFilter  || f.type  === typeFilter) &&
    (!colorFilter || f.color === colorFilter)
  );
  const allColors = [...new Set((data?.inventory || []).map(f => f.color).filter(Boolean))];

  /* ── Quantity helpers ─────────────────────────────────────── */
  const setFlowerQty = (id: string, delta: number) => {
    const fl = data?.inventory.find(x => x.id === id);
    if (!fl) return;
    const cur  = flowers[id] || 0;
    const next = Math.max(0, Math.min(fl.stock, Math.min(cfg.maxFlowers, cur + delta)));
    if (next === 0) { const { [id]: _, ...rest } = flowers; setFlowers(rest); }
    else setFlowers(p => ({ ...p, [id]: next }));
  };

  const setGiftQty = (id: string, delta: number) => {
    const g   = data?.catalog.gift.find(x => x.id === id);
    const max = g?.maxQuantity ?? 10;
    const cur = gifts[id] || 0;
    const next = Math.max(0, Math.min(max, cur + delta));
    if (next === 0) { const { [id]: _, ...rest } = gifts; setGifts(rest); }
    else setGifts(p => ({ ...p, [id]: next }));
  };

  const handlePickPackage = (pkg: FlowerPackage) => {
    setSelPkg(pkg.id); setPkgMode(true); setUpsellShown(true);
    if (pkg.components?.length) {
      const map: Record<string, number> = {};
      pkg.components.forEach((c: any) => { if (c.flowerId) map[c.flowerId] = c.quantity || 1; });
      setFlowers(map);
    }
    goToStep(2);
  };

  /* ── Submit ───────────────────────────────────────────────── */
  const handleSubmit = async () => {
    setSubmitErr("");
    if (!custName.trim() || !custPhone.trim()) { setSubmitErr("يرجى إدخال اسمك ورقم جوالك"); return; }
    if (flowerCount < cfg.minFlowers && !pkgMode) {
      setSubmitErr(`يرجى اختيار ${cfg.minFlowers} ورود على الأقل`); return;
    }
    setSubmitting(true);
    const itemsPayload = Object.entries(flowers).filter(([, q]) => q > 0).map(([id, qty]) => {
      const f = data!.inventory.find(x => x.id === id);
      return { flowerId: id, quantity: qty, price: f ? f.sellPrice : 0, lineTotal: f ? f.sellPrice * qty : 0 };
    });
    const packagingItem = data?.catalog.packaging.find(x => x.id === packaging);
    const cardItem      = data?.catalog.card.find(x => x.id === cardId);
    const addonsPayload = Object.entries(gifts).filter(([, q]) => q > 0).map(([id, q]) => {
      const g = data!.catalog.gift.find(x => x.id === id);
      return { itemId: id, name: g?.name, quantity: q, price: g ? g.price * q : 0 };
    });
    try {
      const res = await fetch(`/api/v1/flower-builder/public/${slug}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: custName, customerPhone: custPhone,
          items:            itemsPayload,
          packaging:        packagingItem?.name || "بدون",
          packagingPrice:   packagingItem?.price || 0,
          addons:           addonsPayload,
          giftMessage:      cardMsg || undefined,
          deliveryType:     delivType,
          deliveryDate:     delivDate || undefined,
          deliveryAddress:  delivAddr ? { address: delivAddr } : undefined,
          recipientName:    recipName || undefined,
          recipientPhone:   recipPhone || undefined,
          subtotal: grandTotal, total: grandTotal,
          notes: notes || undefined,
          selections: { packagingItemId: packaging || undefined, cardItemId: cardId || undefined, cardMessage: cardMsg || undefined },
          ...(pkgMode && selPkg ? { packageId: selPkg } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل إرسال الطلب");
      // Clear saved progress
      if (slug) localStorage.removeItem(STORAGE_KEY(slug));
      setOrderNum(json.data?.orderNumber || json.data?.id?.slice(0, 8).toUpperCase() || "OK");
    } catch (e: any) {
      setSubmitErr(e.message || "تعذّر إرسال الطلب");
    } finally { setSubmitting(false); }
  };

  /* ── Can advance ──────────────────────────────────────────── */
  const canNext = () => {
    if (step === 1 && flowerCount < cfg.minFlowers && !pkgMode) return false;
    return true;
  };

  const nextStep = () => {
    const idx = steps.findIndex(s => s.id === step);
    if (idx < steps.length - 1) goToStep(steps[idx + 1].id);
  };
  const prevStep = () => {
    const idx = steps.findIndex(s => s.id === step);
    if (idx > 0) goToStep(steps[idx - 1].id);
  };

  /* ── Loading / Error / Confirmed ─────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fdf2f5" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: DEFAULT_CFG.accentColor }} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6" style={{ background: "#fdf2f5" }}>
      <AlertCircle className="w-12 h-12 text-rose-300" />
      <p className="text-rose-700 font-medium text-lg">{error}</p>
    </div>
  );

  if (!data) return null;

  if (orderNum) return (
    <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: `linear-gradient(135deg, ${accent}15, ${accent}05)` }}>
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5 shadow">
        <Heart className="w-10 h-10 text-green-600" fill="currentColor" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">تم استلام طلبك!</h1>
      <p className="text-gray-500 mb-1">رقم الطلب</p>
      <p className="font-mono font-black text-2xl text-gray-800 mb-4">#{orderNum}</p>
      <p className="text-gray-400 text-sm max-w-xs leading-relaxed">{cfg.thankYouMessage}</p>
      {data.org.phone && (
        <a href={`tel:${data.org.phone}`}
          className="mt-6 flex items-center gap-2 text-white px-6 py-3 rounded-2xl font-medium shadow-lg text-sm"
          style={{ background: accent }}>
          <Phone className="w-4 h-4" />
          {data.org.phone}
        </a>
      )}
    </div>
  );

  const currentStepIdx = steps.findIndex(s => s.id === step);
  const isLastStep     = step === maxStepId;

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, ${accent}10 0%, #fff 40%)` }}>

      {/* ── Sticky header ────────────────────────────────────── */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {data.org.logo
            ? <img src={data.org.logo} className="w-9 h-9 rounded-full object-cover border border-gray-100" alt="" />
            : <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0"
                style={{ background: accent }}>{data.org.name[0]}</div>}
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-sm leading-none truncate">{data.org.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{cfg.heroSubtitle}</p>
          </div>
          {grandTotal > 0 && (
            <div className="text-sm font-black text-white px-3 py-1.5 rounded-xl shadow"
              style={{ background: accent }}>
              {grandTotal.toLocaleString("ar-SA")} ر.س
            </div>
          )}
        </div>

        {/* Step progress bar */}
        <div className="max-w-lg mx-auto px-2 pb-2 pt-1">
          <div className="flex items-center gap-0.5">
            {steps.map((s, i) => {
              const Icon    = s.icon;
              const done    = currentStepIdx > i;
              const active  = step === s.id;
              const pct     = done ? 100 : active ? 50 : 0;
              return (
                <div key={s.id} className="flex-1 flex flex-col items-center gap-0.5">
                  <button onClick={() => done && goToStep(s.id)} disabled={!done}
                    className="flex flex-col items-center gap-0.5 w-full">
                    <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center transition-all",
                      active  ? "text-white shadow-md" : "",
                      done    ? "bg-green-100 text-green-600" : !active ? "bg-gray-100 text-gray-400" : "")}
                      style={active ? { background: accent } : {}}>
                      {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className={clsx("text-[9px] font-semibold leading-none",
                      active ? "text-gray-800" : done ? "text-green-600" : "text-gray-400")}>
                      {s.label}
                    </span>
                  </button>
                  {/* connector line */}
                  {i < steps.length - 1 && (
                    <div className="w-full h-0.5 bg-gray-100 rounded absolute" style={{ display: "none" }} />
                  )}
                </div>
              );
            })}
          </div>
          {/* progress fill */}
          <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${((currentStepIdx + 1) / steps.length) * 100}%`, background: accent }} />
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main ref={contentRef} className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-28 overflow-x-hidden">

        {/* Smart upsell banner (shows when flower count passes threshold) */}
        {upsellShown && !pkgMode && step === 1 && data.packages.length > 0 && (
          <div className="flex items-start gap-3 p-3.5 rounded-2xl border mb-4 text-sm"
            style={{ background: `${accent}10`, borderColor: `${accent}30` }}>
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: accent }} />
            <div className="flex-1">
              <p className="font-bold" style={{ color: accent }}>هل تريد توفير أكثر؟</p>
              <p className="text-gray-600 text-xs mt-0.5">لديك {flowerCount} ورود — جرّب إحدى باقاتنا الجاهزة للحصول على أفضل قيمة</p>
            </div>
            <button onClick={() => { const pkg = data.packages[0]; handlePickPackage(pkg); }}
              className="shrink-0 px-3 py-1.5 rounded-xl text-white text-xs font-bold"
              style={{ background: accent }}>
              شاهد الباقات
            </button>
          </div>
        )}

        {/* ── STEP 1: Flowers ─────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Hero */}
            <div className="text-center py-2">
              <h1 className="text-xl font-black text-gray-900">{cfg.heroTitle}</h1>
              {flowerCount > 0 && (
                <p className="text-sm mt-1 font-medium" style={{ color: accent }}>
                  اخترت {flowerCount} قطعة · {flowerTotal.toLocaleString("ar-SA")} ر.س
                </p>
              )}
            </div>

            {/* Packages section */}
            {cfg.features.showPackages && data.packages.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" /> باقات جاهزة
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {data.packages.map(pkg => (
                    <button key={pkg.id} onClick={() => handlePickPackage(pkg)}
                      className="flex-none w-36 bg-white rounded-2xl border border-gray-100 overflow-hidden text-right shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95">
                      <div className="h-24 flex items-center justify-center overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}08)` }}>
                        {pkg.image
                          ? <img src={pkg.image} className="h-full w-full object-cover" alt={pkg.name} />
                          : <Flower2 className="w-10 h-10" style={{ color: `${accent}88` }} />}
                      </div>
                      <div className="p-2.5">
                        <p className="font-bold text-gray-900 text-xs leading-snug line-clamp-2">{pkg.name}</p>
                        <p className="text-xs font-black mt-1" style={{ color: accent }}>
                          {(pkg.basePrice || 0).toLocaleString("ar-SA")} ر.س
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">أو اختر ورودك يدوياً</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              </div>
            )}

            {/* Filters */}
            {(allColors.length > 2 || flowerTypes.length > 2) && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allColors.map(color => {
                  const dot = COLOR_DOT[color] || "#d1d5db";
                  return (
                    <button key={color} onClick={() => setColorFilter(colorFilter === color ? "" : color)}
                      className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all flex-none",
                        colorFilter === color ? "border-gray-400 bg-gray-100 text-gray-800" : "border-gray-200 text-gray-500 bg-white")}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />
                      {color}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Inventory grid */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Flower2 className="w-3.5 h-3.5 text-rose-400" />
                اختر الورود
                {cfg.minFlowers > 1 && flowerCount < cfg.minFlowers && (
                  <span className="text-gray-400 font-normal">(الحد الأدنى: {cfg.minFlowers})</span>
                )}
              </p>
              {filteredInventory.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
                  لا توجد ورود متاحة حالياً
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredInventory.map(fl => {
                    const qty     = flowers[fl.id] || 0;
                    const dot     = COLOR_DOT[fl.color] || "#d1d5db";
                    const lowStock = fl.stock <= 5;
                    return (
                      <div key={fl.id}
                        className={clsx("bg-white rounded-2xl border overflow-hidden transition-all",
                          qty > 0 ? "shadow-md" : "border-gray-100 shadow-sm")}
                        style={qty > 0 ? { borderColor: accent } : {}}>
                        <div className="h-28 flex items-center justify-center relative overflow-hidden"
                          style={{ background: `linear-gradient(135deg, ${dot}22, ${dot}08)` }}>
                          {fl.imageUrl
                            ? <img src={fl.imageUrl} className="h-full w-full object-cover" alt={fl.name} />
                            : <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                style={{ background: `${dot}33` }}>
                                <Flower2 className="w-8 h-8" style={{ color: dot }} />
                              </div>}
                          {cfg.showUrgencyBadge && lowStock && (
                            <span className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
                              آخر {fl.stock}
                            </span>
                          )}
                          {qty > 0 && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-black shadow"
                              style={{ background: accent }}>{qty}</div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />
                            <p className="font-bold text-gray-900 text-sm leading-none truncate">{fl.name}</p>
                          </div>
                          {fl.color && <p className="text-xs text-gray-400 mb-2">{fl.color}{fl.type ? ` · ${fl.type}` : ""}</p>}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black" style={{ color: accent }}>
                              {fl.sellPrice.toLocaleString("ar-SA")} ر.س
                            </span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setFlowerQty(fl.id, -1)} disabled={qty === 0}
                                className={clsx("w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                  qty > 0 ? "text-white" : "bg-gray-100 text-gray-300")}
                                style={qty > 0 ? { background: accent } : {}}>
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center text-sm font-black text-gray-800">{qty}</span>
                              <button onClick={() => setFlowerQty(fl.id, 1)}
                                disabled={qty >= fl.stock || flowerCount >= cfg.maxFlowers}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30"
                                style={{ background: accent }}>
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Packaging ───────────────────────────────── */}
        {step === 2 && (
          <div>
            <div className="text-center py-2 mb-4">
              <h2 className="text-lg font-black text-gray-900">اختر التغليف</h2>
              <p className="text-xs text-gray-400 mt-0.5">كيف تريد تقديم الورود؟</p>
            </div>
            <div className="space-y-2">
              <button onClick={() => setPackaging("")}
                className={clsx("w-full flex items-center gap-3 p-4 rounded-2xl border text-right transition-all",
                  !packaging ? "shadow-md" : "border-gray-100 bg-white hover:border-gray-200")}
                style={!packaging ? { borderColor: accent, background: `${accent}08` } : {}}>
                <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all")}
                  style={!packaging ? { borderColor: accent, background: accent } : { borderColor: "#d1d5db" }}>
                  {!packaging && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">بدون تغليف</p>
                  <p className="text-xs text-gray-400">الورود كما هي</p>
                </div>
                <span className="text-sm font-bold text-emerald-600">مجاناً</span>
              </button>

              {data.catalog.packaging.map(pkg => (
                <button key={pkg.id} onClick={() => setPackaging(pkg.id)}
                  className={clsx("w-full flex items-center gap-3 p-4 rounded-2xl border text-right transition-all",
                    packaging === pkg.id ? "shadow-md" : "border-gray-100 bg-white hover:border-gray-200")}
                  style={packaging === pkg.id ? { borderColor: accent, background: `${accent}08` } : {}}>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                    style={packaging === pkg.id ? { borderColor: accent, background: accent } : { borderColor: "#d1d5db" }}>
                    {packaging === pkg.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-2xl shrink-0">{pkg.icon || "🎁"}</span>
                  <div className="flex-1 text-right">
                    <p className="font-bold text-gray-800 text-sm">{pkg.name}</p>
                    {pkg.description && <p className="text-xs text-gray-400 mt-0.5">{pkg.description}</p>}
                  </div>
                  <span className="text-sm font-black shrink-0" style={{ color: accent }}>
                    +{pkg.price.toLocaleString("ar-SA")} ر.س
                  </span>
                </button>
              ))}
              {data.catalog.packaging.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">لا يوجد خيارات تغليف متاحة</p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Gifts ───────────────────────────────────── */}
        {step === 3 && cfg.features.showGifts && (
          <div>
            <div className="text-center py-2 mb-4">
              <h2 className="text-lg font-black text-gray-900">أضف هدية مرافقة</h2>
              <p className="text-xs text-gray-400 mt-0.5">اختياري — يمكنك التخطي</p>
            </div>
            {data.catalog.gift.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">لا توجد هدايا متاحة</p>
            ) : (
              <div className="space-y-2">
                {data.catalog.gift.map(g => {
                  const qty = gifts[g.id] || 0;
                  const max = g.maxQuantity ?? 10;
                  return (
                    <div key={g.id}
                      className={clsx("flex items-center gap-3 p-4 rounded-2xl border bg-white transition-all",
                        qty > 0 ? "shadow-md" : "border-gray-100")}
                      style={qty > 0 ? { borderColor: accent } : {}}>
                      <span className="text-2xl shrink-0">{g.icon || "🎁"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm">{g.name}</p>
                        {g.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{g.description}</p>}
                        <p className="text-sm font-black mt-1" style={{ color: accent }}>
                          {g.price.toLocaleString("ar-SA")} ر.س
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setGiftQty(g.id, -1)} disabled={qty === 0}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-30 text-white"
                          style={qty > 0 ? { background: accent } : { background: "#e5e7eb" }}>
                          <Minus className="w-3.5 h-3.5" style={qty === 0 ? { color: "#9ca3af" } : {}} />
                        </button>
                        <span className="w-5 text-center text-sm font-black text-gray-800">{qty}</span>
                        <button onClick={() => setGiftQty(g.id, 1)} disabled={qty >= max}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30"
                          style={{ background: accent }}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Card ────────────────────────────────────── */}
        {step === 4 && cfg.features.showCard && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <h2 className="text-lg font-black text-gray-900">بطاقة التهنئة</h2>
              <p className="text-xs text-gray-400 mt-0.5">اختياري — أضف لمسة شخصية</p>
            </div>

            {/* Card type selection */}
            {data.catalog.card.length > 0 && (
              <div className="space-y-2">
                <button onClick={() => setCardId("")}
                  className={clsx("w-full flex items-center gap-3 p-4 rounded-2xl border text-right transition-all",
                    !cardId ? "shadow-md" : "border-gray-100 bg-white")}
                  style={!cardId ? { borderColor: accent, background: `${accent}08` } : {}}>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={!cardId ? { borderColor: accent, background: accent } : { borderColor: "#d1d5db" }}>
                    {!cardId && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <p className="font-bold text-gray-800 text-sm flex-1">بدون بطاقة</p>
                  <span className="text-sm font-bold text-emerald-600">مجاناً</span>
                </button>
                {data.catalog.card.map(c => (
                  <button key={c.id} onClick={() => setCardId(c.id)}
                    className={clsx("w-full flex items-center gap-3 p-4 rounded-2xl border text-right transition-all",
                      cardId === c.id ? "shadow-md" : "border-gray-100 bg-white")}
                    style={cardId === c.id ? { borderColor: accent, background: `${accent}08` } : {}}>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={cardId === c.id ? { borderColor: accent, background: accent } : { borderColor: "#d1d5db" }}>
                      {cardId === c.id && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-2xl shrink-0">{c.icon || "💌"}</span>
                    <div className="flex-1 text-right">
                      <p className="font-bold text-gray-800 text-sm">{c.name}</p>
                      {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                    </div>
                    <span className="text-sm font-black shrink-0" style={{ color: accent }}>
                      +{c.price.toLocaleString("ar-SA")} ر.س
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick message templates */}
            {cfg.cardTemplates.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">قوالب جاهزة — اضغط للاختيار</p>
                <div className="flex flex-wrap gap-2">
                  {cfg.cardTemplates.map((t, i) => (
                    <button key={i} onClick={() => setCardMsg(t)}
                      className={clsx("px-3 py-2 rounded-xl border text-sm transition-all",
                        cardMsg === t ? "text-white font-medium shadow-sm" : "border-gray-200 text-gray-600 bg-white hover:border-gray-300")}
                      style={cardMsg === t ? { background: accent, borderColor: accent } : {}}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message input */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" style={{ color: accent }} />
                رسالتك المخصصة
              </label>
              <textarea value={cardMsg} onChange={e => setCardMsg(e.target.value)} rows={4}
                placeholder="اكتب رسالتك هنا..."
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none resize-none leading-relaxed bg-white"
                style={{ "--tw-ring-color": accent } as any}
                onFocus={e => (e.target.style.borderColor = accent)}
                onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
              <p className="text-xs text-gray-400 mt-1">{cardMsg.length} / 200 حرف</p>
            </div>
          </div>
        )}

        {/* ── STEP 5: Delivery ────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <h2 className="text-lg font-black text-gray-900">طريقة الاستلام</h2>
            </div>

            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              {cfg.features.deliveryEnabled && (
                <button onClick={() => setDelivType("delivery")}
                  className={clsx("p-4 rounded-2xl border text-center transition-all",
                    delivType === "delivery" ? "shadow-md text-white" : "border-gray-100 bg-white text-gray-600")}
                  style={delivType === "delivery" ? { background: accent, borderColor: accent } : {}}>
                  <Truck className="w-6 h-6 mx-auto mb-1.5" />
                  <p className="font-bold text-sm">توصيل للمنزل</p>
                </button>
              )}
              {cfg.features.pickupEnabled && (
                <button onClick={() => setDelivType("pickup")}
                  className={clsx("p-4 rounded-2xl border text-center transition-all",
                    delivType === "pickup" ? "shadow-md text-white" : "border-gray-100 bg-white text-gray-600")}
                  style={delivType === "pickup" ? { background: accent, borderColor: accent } : {}}>
                  <ShoppingBag className="w-6 h-6 mx-auto mb-1.5" />
                  <p className="font-bold text-sm">استلام من المتجر</p>
                </button>
              )}
            </div>

            {/* Delivery note */}
            {cfg.deliveryNote && delivType === "delivery" && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
                style={{ background: `${accent}10`, color: accent }}>
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{cfg.deliveryNote}</p>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" style={{ color: accent }} />
                {delivType === "delivery" ? "تاريخ التوصيل" : "تاريخ الاستلام"}
              </label>
              <input type="date" value={delivDate} onChange={e => setDelivDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none bg-white"
                dir="ltr"
                onFocus={e => (e.target.style.borderColor = accent)}
                onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
            </div>

            {/* Address (delivery only) */}
            {delivType === "delivery" && (
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" style={{ color: accent }} />
                  عنوان التوصيل
                </label>
                <input type="text" value={delivAddr} onChange={e => setDelivAddr(e.target.value)}
                  placeholder="الحي، الشارع، رقم المبنى..."
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none bg-white"
                  onFocus={e => (e.target.style.borderColor = accent)}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
              </div>
            )}

            {/* Recipient */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">اسم المستلم</label>
                <input value={recipName} onChange={e => setRecipName(e.target.value)} placeholder="اختياري"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">جوال المستلم</label>
                <input type="tel" value={recipPhone} onChange={e => setRecipPhone(e.target.value)}
                  placeholder="05XX" dir="ltr"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white" />
              </div>
            </div>

            {/* Customer info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" style={{ color: accent }} /> معلوماتك الشخصية
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">اسمك *</label>
                  <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="اسمك الكريم"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-gray-50"
                    onFocus={e => (e.target.style.borderColor = accent)}
                    onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">جوالك *</label>
                  <input type="tel" value={custPhone} onChange={e => setCustPhone(e.target.value)}
                    placeholder="05XXXXXXXX" dir="ltr"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-gray-50"
                    onFocus={e => (e.target.style.borderColor = accent)}
                    onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">ملاحظات إضافية</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="أي تفاصيل إضافية..."
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none resize-none bg-white" />
            </div>
          </div>
        )}

        {/* ── STEP 6: Summary ─────────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <h2 className="text-lg font-black text-gray-900">ملخص طلبك</h2>
              <p className="text-xs text-gray-400 mt-0.5">راجع تفاصيل طلبك قبل التأكيد</p>
            </div>

            {/* Flowers */}
            {Object.keys(flowers).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                  <Flower2 className="w-4 h-4 text-rose-400" />
                  <span className="text-sm font-bold text-gray-700">الورود ({flowerCount} قطعة)</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {Object.entries(flowers).map(([id, qty]) => {
                    const fl = data.inventory.find(x => x.id === id);
                    if (!fl) return null;
                    const dot = COLOR_DOT[fl.color] || "#d1d5db";
                    return (
                      <div key={id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: dot }} />
                        <span className="text-sm text-gray-700 flex-1">{fl.name} × {qty}</span>
                        <span className="text-sm font-bold text-gray-800">
                          {(fl.sellPrice * qty).toLocaleString("ar-SA")} ر.س
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extras */}
            {(packaging || Object.keys(gifts).length > 0 || cardId) && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {packaging && (() => {
                    const p = data.catalog.packaging.find(x => x.id === packaging);
                    return p ? (
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <span className="text-lg">{p.icon || "🎁"}</span>
                        <span className="flex-1 text-sm text-gray-600">{p.name}</span>
                        <span className="text-sm font-bold text-gray-800">+{p.price.toLocaleString("ar-SA")} ر.س</span>
                      </div>
                    ) : null;
                  })()}
                  {Object.entries(gifts).filter(([, q]) => q > 0).map(([id, qty]) => {
                    const g = data.catalog.gift.find(x => x.id === id);
                    return g ? (
                      <div key={id} className="flex items-center gap-2 px-4 py-2.5">
                        <span className="text-lg">{g.icon || "🎁"}</span>
                        <span className="flex-1 text-sm text-gray-600">{g.name} × {qty}</span>
                        <span className="text-sm font-bold text-gray-800">+{(g.price * qty).toLocaleString("ar-SA")} ر.س</span>
                      </div>
                    ) : null;
                  })}
                  {cardId && (() => {
                    const c = data.catalog.card.find(x => x.id === cardId);
                    return c ? (
                      <div className="flex items-start gap-2 px-4 py-2.5">
                        <span className="text-lg">{c.icon || "💌"}</span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">{c.name}</p>
                          {cardMsg && <p className="text-xs text-gray-400 mt-0.5 italic">"{cardMsg.slice(0, 40)}{cardMsg.length > 40 ? "..." : ""}"</p>}
                        </div>
                        <span className="text-sm font-bold text-gray-800 shrink-0">+{c.price.toLocaleString("ar-SA")} ر.س</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            {/* Delivery info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
              <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" style={{ color: accent }} />
                {delivType === "delivery" ? "التوصيل" : "الاستلام من المتجر"}
              </p>
              {delivDate && (
                <p className="text-sm text-gray-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {new Date(delivDate).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
              {delivAddr && (
                <p className="text-sm text-gray-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" /> {delivAddr}
                </p>
              )}
              {(recipName || custName) && (
                <p className="text-sm text-gray-600 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  {custName}{custPhone && ` — ${custPhone}`}
                  {recipName && ` · المستلم: ${recipName}`}
                </p>
              )}
            </div>

            {/* Grand total */}
            <div className="p-5 rounded-2xl text-white text-right shadow-lg flex items-center justify-between"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
              <span className="font-bold text-lg">المجموع</span>
              <span className="text-3xl font-black">{grandTotal.toLocaleString("ar-SA")} <span className="text-base font-medium opacity-80">ر.س</span></span>
            </div>

            {/* Validation */}
            {(!custName || !custPhone) && (
              <div className="flex items-start gap-2 p-3.5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>يرجى العودة لخطوة التوصيل وإدخال اسمك ورقم جوالك</p>
              </div>
            )}

            {submitErr && (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {submitErr}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Sticky bottom bar ────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-2xl z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {/* Back */}
          <button onClick={prevStep} disabled={step === steps[0].id}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold disabled:opacity-40 hover:bg-gray-50 transition-all shrink-0">
            <ChevronRight className="w-4 h-4" />
            رجوع
          </button>

          {/* Running total */}
          {grandTotal > 0 && (
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-400">{flowerCount} قطعة</p>
              <p className="text-sm font-black text-gray-900 leading-none">{grandTotal.toLocaleString("ar-SA")} ر.س</p>
            </div>
          )}

          {/* Next / Submit */}
          {!isLastStep ? (
            <button onClick={() => canNext() && nextStep()} disabled={!canNext()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-black shadow-lg disabled:opacity-40 transition-all active:scale-95 shrink-0"
              style={{ background: accent }}>
              التالي
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit}
              disabled={submitting || !custName.trim() || !custPhone.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-black shadow-lg disabled:opacity-40 transition-all active:scale-95 shrink-0"
              style={{ background: accent }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {submitting ? "جاري الإرسال..." : "تأكيد الطلب"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
