import { useState, useEffect } from "react";
import { toast } from "@/hooks/useToast";
import { clsx } from "clsx";
import {
  Gift, Plus, Pencil, Trash2, Copy, ToggleLeft, ToggleRight, Search, Flower2,
  X, ShoppingBag, TrendingUp, Package, CreditCard, Truck, ClipboardList,
  Check, Clock, Phone, User, Settings, ExternalLink, RefreshCw, Eye,
  MapPin, ChevronDown, ChevronRight, DollarSign, AlertCircle,
  Palette, Globe, Sliders, MessageSquare, Save, Sparkles,
  Box, Heart, Star, Tag, Archive, Layers, Ribbon, Candy,
  type LucideIcon,
} from "lucide-react";

// ─── Lucide Icon Registry for catalog items ────────────────────────────────────
const ICON_REGISTRY: Record<string, LucideIcon> = {
  Package, Gift, CreditCard, Truck, Box, ShoppingBag,
  Heart, Star, Sparkles, Tag, Flower2, Archive, Layers,
  Ribbon, Candy, Check, Plus,
};
const ICON_OPTIONS: { name: string; icon: LucideIcon }[] = Object.entries(ICON_REGISTRY).map(([name, icon]) => ({ name, icon }));

function CatalogIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICON_REGISTRY[name]) ? ICON_REGISTRY[name] : Package;
  return <Icon className={className || "w-5 h-5 text-gray-400"} />;
}
import { arrangementsApi, flowerBuilderApi, settingsApi, flowerMasterApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Modal, Button, Input, Toggle, ImageUpload } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_TAGS = [
  { value: "",           label: "الكل",          color: "bg-gray-100 text-gray-600" },
  { value: "love",       label: "حب ورومانسية",  color: "bg-pink-50 text-pink-700" },
  { value: "congrats",   label: "تهاني",          color: "bg-amber-50 text-amber-700" },
  { value: "condolence", label: "تعازي",          color: "bg-gray-100 text-gray-600" },
  { value: "occasions",  label: "مناسبات",        color: "bg-violet-50 text-violet-700" },
  { value: "general",    label: "عام",            color: "bg-emerald-50 text-emerald-700" },
];
const TAG_LABELS: Record<string, string> = {
  love: "حب ورومانسية", congrats: "تهاني",
  condolence: "تعازي", occasions: "مناسبات", general: "عام",
};

const CATALOG_TYPES = [
  { value: "packaging", label: "تغليف",   icon: Package,    color: "text-violet-600 bg-violet-50", hint: "كيس، علبة، صندوق فاخر..." },
  { value: "gift",      label: "هدايا",   icon: Gift,       color: "text-pink-600 bg-pink-50",    hint: "شوكولاتة، دبدوب، بالون..." },
  { value: "card",      label: "كروت",    icon: CreditCard, color: "text-blue-600 bg-blue-50",    hint: "كرت مطبوع، ورقي، رقمي..." },
  { value: "delivery",  label: "توصيل",   icon: Truck,      color: "text-amber-600 bg-amber-50",  hint: "توصيل داخل المدينة، خارجي..." },
];

// ─── Package Builder Modal ─────────────────────────────────────────────────────

interface FlowerSelection { variantId: string; quantity: number; }

function PackageModal({ item, onClose, onSave }: { item?: any; onClose: () => void; onSave: (d: any) => void }) {
  const { data: variantsRes } = useApi(() => flowerMasterApi.variants(), []);
  const { data: catalogRes }  = useApi(() => flowerBuilderApi.catalog(), []);

  const allVariants: any[] = variantsRes?.data ?? [];
  const rawCatalogForModal  = catalogRes?.data ?? {};
  const packagingOpts: any[] = (rawCatalogForModal as any).packaging ?? [];
  const giftOpts: any[]      = (rawCatalogForModal as any).gift ?? [];
  const cardOpts: any[]      = (rawCatalogForModal as any).card ?? [];

  const [form, setForm] = useState({
    name:        item?.name || "",
    description: item?.description || "",
    categoryTag: item?.categoryTag ?? item?.category_tag ?? "general",
    basePrice:   String(item?.basePrice ?? item?.base_price ?? ""),
    isActive:    item?.isActive ?? item?.is_active ?? true,
  });
  const [flowerItems, setFlowerItems] = useState<FlowerSelection[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());
  const [priceMode, setPriceMode] = useState<"manual" | "auto">("manual");

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const addFlower = (variantId: string) => {
    if (flowerItems.find(fi => fi.variantId === variantId)) return;
    setFlowerItems(prev => [...prev, { variantId, quantity: 1 }]);
  };
  const updateQty = (variantId: string, qty: number) =>
    setFlowerItems(prev => prev.map(fi => fi.variantId === variantId ? { ...fi, quantity: Math.max(1, qty) } : fi));
  const removeFlower = (variantId: string) =>
    setFlowerItems(prev => prev.filter(fi => fi.variantId !== variantId));

  const toggleExtra = (id: string) =>
    setSelectedExtras(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const variantName = (id: string) => allVariants.find(v => v.id === id)?.displayNameAr ?? id.slice(0, 8);

  const allExtras = [...packagingOpts, ...giftOpts, ...cardOpts];
  const autoPrice = flowerItems.reduce((sum, fi) => {
    const v = allVariants.find(v => v.id === fi.variantId);
    return sum + fi.quantity * parseFloat(v?.basePricePerStem ?? "0");
  }, 0) + [...selectedExtras].reduce((sum, id) => {
    const e = allExtras.find((e: any) => e.id === id);
    return sum + parseFloat(e?.price ?? "0");
  }, 0);

  const buildComponents = (): string[] => [
    ...flowerItems.map(fi => `${fi.quantity}× ${variantName(fi.variantId)}`),
    ...[...selectedExtras].map(id => {
      const e = allExtras.find((e: any) => e.id === id);
      return e?.name ?? id;
    }),
  ];

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("اسم الباقة مطلوب"); return; }
    const price = priceMode === "auto" ? autoPrice.toFixed(2) : form.basePrice;
    if (!price || parseFloat(price) <= 0) { toast.error("السعر يجب أن يكون أكبر من صفر"); return; }
    onSave({
      ...form,
      basePrice: parseFloat(price),
      components: buildComponents(),
      items: flowerItems,
      extraIds: [...selectedExtras],
    });
  };

  return (
    <Modal open title={item ? "تعديل الباقة" : "بناء باقة جديدة"} onClose={onClose} size="xl">
      <div className="space-y-5">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="اسم الباقة *" name="name" value={form.name} onChange={e => f("name", e.target.value)} placeholder="مثال: باقة الورد الأحمر الملكية" required />
          </div>
          <div className="col-span-2">
            <p className="text-xs font-medium text-gray-600 mb-1.5">الفئة</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_TAGS.filter(t => t.value).map(t => (
                <button key={t.value} onClick={() => f("categoryTag", t.value)}
                  className={clsx("px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                    form.categoryTag === t.value ? "bg-brand-500 border-brand-500 text-white" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Flowers Section */}
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <Flower2 className="w-3.5 h-3.5 text-pink-500" /> الورود والنباتات
          </p>
          {allVariants.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">لا توجد أصناف — أضف من صفحة أنواع الورد</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
                {allVariants.map(v => {
                  const selected = flowerItems.find(fi => fi.variantId === v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => selected ? removeFlower(v.id) : addFlower(v.id)}
                      className={clsx(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors text-right",
                        selected ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      )}
                    >
                      <span className={clsx("w-3 h-3 rounded-sm border flex-shrink-0", selected ? "bg-brand-500 border-brand-500" : "border-gray-300")} />
                      <span className="truncate">{v.displayNameAr ?? v.flowerType}</span>
                    </button>
                  );
                })}
              </div>
              {flowerItems.length > 0 && (
                <div className="space-y-1.5">
                  {flowerItems.map(fi => (
                    <div key={fi.variantId} className="flex items-center gap-3 px-3 py-2 bg-pink-50 rounded-xl">
                      <span className="text-xs font-medium text-pink-800 flex-1">{variantName(fi.variantId)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(fi.variantId, fi.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-pink-200 text-pink-600 text-sm font-bold">−</button>
                        <span className="w-8 text-center text-xs font-bold text-pink-800 tabular-nums">{fi.quantity}</span>
                        <button onClick={() => updateQty(fi.variantId, fi.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-pink-200 text-pink-600 text-sm font-bold">+</button>
                      </div>
                      <span className="text-[10px] text-pink-600">ساق</span>
                      <button onClick={() => removeFlower(fi.variantId)} className="text-pink-400 hover:text-pink-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Packaging & Extras */}
        {(packagingOpts.length > 0 || giftOpts.length > 0 || cardOpts.length > 0) && (
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-violet-500" /> التغليف والإضافات
            </p>
            <div className="space-y-2">
              {[
                { label: "تغليف", opts: packagingOpts },
                { label: "هدايا", opts: giftOpts },
                { label: "كروت", opts: cardOpts },
              ].filter(g => g.opts.length > 0).map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.opts.map((opt: any) => {
                      const id = opt.id;
                      const on = selectedExtras.has(id);
                      return (
                        <button key={id} onClick={() => toggleExtra(id)}
                          className={clsx(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors",
                            on ? "border-violet-400 bg-violet-50 text-violet-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          )}>
                          <span className={clsx("w-3 h-3 rounded-sm border flex-shrink-0", on ? "bg-violet-500 border-violet-500" : "border-gray-300")} />
                          {opt.name}
                          {parseFloat(opt.price ?? "0") > 0 && <span className="text-gray-400">+{parseFloat(opt.price).toFixed(0)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">وصف الباقة</label>
          <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2}
            placeholder="صف محتوى الباقة للعميل..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 resize-none leading-relaxed" />
        </div>

        {/* Price */}
        <div className="p-3 bg-gray-50 rounded-xl space-y-2">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-medium text-gray-700">السعر</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={priceMode === "manual"} onChange={() => setPriceMode("manual")} className="accent-brand-500" />
              يدوي
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={priceMode === "auto"} onChange={() => setPriceMode("auto")} className="accent-brand-500" />
              حساب تلقائي ({autoPrice.toFixed(0)} ر.س)
            </label>
          </div>
          {priceMode === "manual" && (
            <Input label="" name="basePrice" type="number" value={form.basePrice}
              onChange={e => f("basePrice", e.target.value)} placeholder="0.00" dir="ltr" />
          )}
          {priceMode === "auto" && (
            <div className="text-2xl font-bold text-brand-600 tabular-nums">{autoPrice.toFixed(0)} ر.س</div>
          )}
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-3">
          <Toggle checked={form.isActive} onChange={v => f("isActive", v)} />
          <span className="text-sm text-gray-700">متاح للبيع</span>
        </div>

        <div className="flex gap-3 pt-1">
          <Button className="flex-1" onClick={handleSave}>حفظ الباقة</Button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Catalog Item Modal ────────────────────────────────────────────────────────

function CatalogItemModal({ item, onClose, onSave }: { item?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    type: item?.type || "packaging", name: item?.name || "", nameEn: item?.nameEn ?? item?.name_en ?? "",
    description: item?.description || "", price: item?.price || "", icon: item?.icon || "",
    image: item?.image || "",
    isDefault: item?.isDefault ?? item?.is_default ?? false,
    isActive: item?.isActive ?? item?.is_active ?? true,
    maxQuantity: item?.maxQuantity ?? item?.max_quantity ?? 1,
  });
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const curType = CATALOG_TYPES.find(t => t.value === form.type);

  return (
    <Modal open title={item ? "تعديل العنصر" : "عنصر جديد"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">النوع</p>
          <div className="grid grid-cols-2 gap-2">
            {CATALOG_TYPES.map(t => (
              <button key={t.value} onClick={() => f("type", t.value)}
                className={clsx("flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                  form.type === t.value ? "bg-brand-500 border-brand-500 text-white" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>
          {curType && <p className="text-xs text-gray-400 mt-1.5">{curType.hint}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="الاسم *" name="name" value={form.name} onChange={e => f("name", e.target.value)} placeholder="اسم العنصر" required />
          <Input label="الاسم بالإنجليزية" name="nameEn" value={form.nameEn} onChange={e => f("nameEn", e.target.value)} dir="ltr" placeholder="English name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="السعر (ر.س)" name="price" type="number" value={form.price}
            onChange={e => f("price", e.target.value)} placeholder="0" dir="ltr" />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">الأيقونة</p>
            <div className="grid grid-cols-8 gap-1 p-2 border border-gray-200 rounded-xl">
              {ICON_OPTIONS.map(({ name, icon: Icon }) => (
                <button key={name} type="button" onClick={() => f("icon", name)}
                  title={name}
                  className={clsx("w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                    form.icon === name ? "bg-brand-500 text-white" : "hover:bg-gray-100 text-gray-500")}>
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
        {form.type === "gift" && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">أقصى كمية:</label>
            <input type="number" min={1} max={10} value={form.maxQuantity}
              onChange={e => f("maxQuantity", parseInt(e.target.value) || 1)}
              className="w-16 border border-gray-200 rounded-xl px-2 py-1.5 text-sm text-center outline-none focus:border-brand-300" dir="ltr" />
          </div>
        )}
        <Input label="وصف مختصر" name="description" value={form.description} onChange={e => f("description", e.target.value)} placeholder="اختياري" />
        <ImageUpload label="صورة العنصر" value={form.image} onChange={v => f("image", v)} aspectRatio="square" />
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <Toggle checked={form.isDefault} onChange={v => f("isDefault", v)} />
            <span className="text-sm text-gray-700">افتراضي</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Toggle checked={form.isActive} onChange={v => f("isActive", v)} />
            <span className="text-sm text-gray-700">مفعّل</span>
          </label>
        </div>
        <div className="flex gap-3 pt-1">
          <Button className="flex-1" onClick={() => { if (form.name.trim()) onSave({ ...form, price: parseFloat(form.price) || 0 }); }}>حفظ</Button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Tab: Packages (Pre-made) ──────────────────────────────────────────────────

function PackagesTab() {
  const { data: res, loading, refetch } = useApi(() => arrangementsApi.list(), []);
  const { data: statsRes }              = useApi(() => arrangementsApi.stats(), []);
  const { mutate: create }              = useMutation((d: any) => arrangementsApi.create(d));
  const { mutate: update }              = useMutation((d: any) => arrangementsApi.update(d.id, d));
  const { mutate: toggle }              = useMutation((id: string) => arrangementsApi.toggle(id));
  const { mutate: remove }              = useMutation((id: string) => arrangementsApi.delete(id));
  const { mutate: duplicate }           = useMutation((id: string) => arrangementsApi.duplicate(id));

  const [search, setSearch]   = useState("");
  const [tag, setTag]         = useState("");
  const [modal, setModal]     = useState<{ open: boolean; item?: any }>({ open: false });
  const [importing, setImporting] = useState(false);

  const STARTER_PACKAGES = [
    // حب ورومانسية
    { name: "باقة الورد الأحمر",           description: "50 وردة حمراء في فازة كريستال مع بطاقة رومانسية",          categoryTag: "love",       basePrice: 199,  components: ["50× وردة حمراء", "فازة كريستال", "بطاقة رومانسية", "ورق تغليف شفاف"] },
    { name: "قلب الورد الأحمر",            description: "تنسيقة على شكل قلب من 100 وردة حمراء",                    categoryTag: "love",       basePrice: 349,  components: ["100× وردة حمراء", "قاعدة إسفنج بشكل قلب", "ورق كرافت"] },
    { name: "باقة الجوري الوردي",          description: "30 وردة وردية فاتحة مع إكسسوارات ذهبية",                  categoryTag: "love",       basePrice: 249,  components: ["30× وردة وردية", "إكسسوارات ذهبية", "شريط ساتان وردي", "ورق كرافت"] },
    { name: "رومانسية الليل",              description: "ورود حمراء وبيضاء مع شموع وشوكولاتة بلجيكية",              categoryTag: "love",       basePrice: 459,  components: ["25× وردة حمراء", "25× وردة بيضاء", "شمعتان رومانسيتان", "علبة شوكولاتة بلجيكية", "شريط ساتان"] },
    { name: "أحبك إلى القمر",             description: "تنسيقة راقية من 200 وردة حمراء في علبة فاخرة",             categoryTag: "love",       basePrice: 699,  components: ["200× وردة حمراء", "علبة هدايا فاخرة", "ورق تشرين", "بطاقة فاخرة"] },
    { name: "باقة الخطوبة الذهبية",        description: "ورود أحمر وذهبي مع خاتم تقديم وشوكولاتة",                 categoryTag: "love",       basePrice: 899,  components: ["60× وردة حمراء", "20× وردة ذهبية", "علبة خاتم تقديم", "علبة شوكولاتة فاخرة", "شريط ذهبي", "بطاقة تهنئة"] },
    // تهاني
    { name: "باقة التخرج",                description: "ورود ملونة مبهجة مع بالونات التخرج",                       categoryTag: "congrats",   basePrice: 199,  components: ["30× وردة ملونة مشكّلة", "3 بالونات تخرج", "بطاقة تهنئة", "شريط مزخرف"] },
    { name: "باقة المولود الجديد",         description: "ورود وردية أو زرقاء حسب جنس المولود مع دبدوب",             categoryTag: "congrats",   basePrice: 229,  components: ["30× وردة وردية أو زرقاء", "دبدوب صغير", "بطاقة تهنئة بالمولود", "ورق تغليف ناعم"] },
    { name: "عيد ميلاد سعيد",             description: "تنسيقة فاخرة بألوان العيد مع بالونات ملونة",               categoryTag: "congrats",   basePrice: 279,  components: ["40× وردة ملونة", "5 بالونات عيد ميلاد", "شريط ملون", "بطاقة عيد ميلاد"] },
    { name: "مبروك الترقية",              description: "باقة من الورود الصفراء والبيضاء مع بطاقة تهنئة",            categoryTag: "congrats",   basePrice: 189,  components: ["20× وردة صفراء", "15× وردة بيضاء", "بطاقة تهنئة مطبوعة", "شريط ذهبي"] },
    { name: "مبروك المنزل الجديد",        description: "ترتيب زهري راقٍ يناسب المنزل الجديد",                      categoryTag: "congrats",   basePrice: 249,  components: ["35× وردة مشكّلة", "أوركيد أبيض", "فازة زجاجية", "بطاقة تهنئة"] },
    { name: "مبروك النجاح",               description: "ورود صفراء ملكية رمز النجاح والتفوق",                      categoryTag: "congrats",   basePrice: 159,  components: ["25× وردة صفراء", "بطاقة تهنئة بالنجاح", "شريط أصفر", "ورق كرافت كريمي"] },
    // تعازي
    { name: "إكليل الورد الأبيض",         description: "إكليل أبيض كلاسيكي للعزاء يعبّر عن الاحترام",              categoryTag: "condolence", basePrice: 299,  components: ["60× وردة بيضاء", "أوراق خضراء", "قاعدة إكليل دائرية", "شريط أبيض"] },
    { name: "باقة التعزية البيضاء",        description: "ورود بيضاء هادئة في فازة بلورية",                          categoryTag: "condolence", basePrice: 199,  components: ["30× وردة بيضاء", "فازة بلورية", "أوراق خضراء هادئة"] },
    { name: "لوحة الورد للعزاء",          description: "لوحة زهرية بيضاء وخضراء للمآتم",                           categoryTag: "condolence", basePrice: 399,  components: ["80× وردة بيضاء", "نباتات خضراء هادئة", "قاعدة لوحة خشبية", "شريط أبيض"] },
    // مناسبات
    { name: "باقة العيد الكبرى",          description: "تشكيلة فاخرة متعددة الألوان لأيام العيد",                   categoryTag: "occasions",  basePrice: 349,  components: ["20× وردة حمراء", "20× وردة بيضاء", "20× وردة وردية", "شريط ذهبي", "بطاقة عيد"] },
    { name: "مائدة الأفراح",             description: "ترتيب زهري لتزيين طاولات الزفاف",                           categoryTag: "occasions",  basePrice: 799,  components: ["80× وردة بيضاء", "30× وردة زهرية", "أوراق أوكاليبتوس", "حامل طاولة معدني", "شمع أبيض"] },
    { name: "باقة رأس السنة",            description: "تنسيقة احتفالية ذهبية وحمراء لليلة رأس السنة",              categoryTag: "occasions",  basePrice: 319,  components: ["30× وردة حمراء", "20× وردة ذهبية", "خيوط براق ذهبي", "بالونات احتفالية", "شريط ذهبي"] },
    { name: "ورود رمضان",               description: "تنسيقة زهرية تناسب ديكور رمضان",                            categoryTag: "occasions",  basePrice: 229,  components: ["30× وردة أرجوانية", "20× وردة ذهبية", "فوانيس صغيرة ديكورية", "شريط ذهبي"] },
    { name: "باقة اليوم الوطني",         description: "تنسيقة خضراء وبيضاء احتفالاً باليوم الوطني",                categoryTag: "occasions",  basePrice: 199,  components: ["30× وردة بيضاء", "نباتات خضراء زاهية", "شريط أخضر", "بطاقة اليوم الوطني"] },
    { name: "زينة حفل الأطفال",          description: "ورود ملونة وبالونات لحفلات الأطفال",                        categoryTag: "occasions",  basePrice: 179,  components: ["20× وردة ملونة مشكّلة", "5 بالونات ملونة", "شريط ملون", "بطاقة مرحة"] },
    { name: "باقة الوالدين",             description: "ورود كلاسيكية راقية مناسبة لإهداء الوالدين",                categoryTag: "occasions",  basePrice: 259,  components: ["25× وردة حمراء", "15× وردة بيضاء", "شريط كلاسيكي", "بطاقة شكر للوالدين"] },
    { name: "تنسيقة المنصة",             description: "تنسيقات زهرية كبيرة لتزيين المنصات والحفلات",               categoryTag: "occasions",  basePrice: 999,  components: ["200× وردة بيضاء وزهرية", "أوراق أوكاليبتوس كبيرة", "قاعدة معدنية كبيرة", "أوريجامي ورقي ذهبي"] },
    // عام
    { name: "باقة الورد المتنوعة",       description: "مزيج من أجمل الورود الملونة لأي مناسبة",                    categoryTag: "general",    basePrice: 149,  components: ["10× وردة حمراء", "10× وردة وردية", "10× وردة صفراء", "ورق تغليف كرافت"] },
    { name: "تنسيق الفازة",              description: "ورود في فازة زجاجية شفافة مناسبة للمنازل والمكاتب",          categoryTag: "general",    basePrice: 179,  components: ["20× وردة مشكّلة", "فازة زجاجية شفافة", "أوراق خضراء هادئة"] },
    { name: "باقة الأوركيد",             description: "أوركيد بنفسجي في وعاء فخار",                               categoryTag: "general",    basePrice: 329,  components: ["3 غصن أوركيد بنفسجي", "وعاء فخار فاخر", "تربة مخصصة", "حصى زخرفية"] },
    { name: "ورد الزهور البرية",         description: "تشكيلة طبيعية من زهور برية ملونة",                          categoryTag: "general",    basePrice: 139,  components: ["15× زهرة برية مشكّلة", "أعشاب طبيعية", "ورق كرافت بني", "خيط خيش"] },
    { name: "باقة اللافندر",             description: "لافندر طبيعي بعطر هادئ للمكاتب والمنازل",                  categoryTag: "general",    basePrice: 119,  components: ["5 غصون لافندر طبيعي", "ورق كرافت أبيض", "خيط كتان", "بطاقة صغيرة"] },
    { name: "التورتة الزهرية",           description: "تنسيقة على شكل تورتة من ورود متعددة الأطباق",               categoryTag: "general",    basePrice: 449,  components: ["50× وردة حمراء", "30× وردة وردية", "30× وردة بيضاء", "قاعدة أسطوانية متعددة الطوابق", "شريط ساتان"] },
    { name: "صندوق الفاخر",             description: "ورود مرتبة في صندوق فاخر مع غطاء شفاف",                    categoryTag: "general",    basePrice: 389,  components: ["40× وردة مشكّلة", "صندوق فاخر بغطاء شفاف", "ورق أكريليك", "شريط ساتان"] },
    { name: "باقة النجمة",              description: "تنسيقة نجمة خماسية من ورود ملونة",                          categoryTag: "general",    basePrice: 219,  components: ["50× وردة ملونة مشكّلة", "قاعدة نجمة خماسية", "خيوط لامعة", "بطاقة مرفقة"] },
  ];

  async function handleImportStarter() {
    if (!confirm(`سيتم إضافة ${STARTER_PACKAGES.length} باقة جاهزة إلى قائمتك — هل تريد المتابعة؟`)) return;
    setImporting(true);
    let added = 0;
    for (const pkg of STARTER_PACKAGES) {
      try {
        await create({ ...pkg, isActive: true, components: [] });
        added++;
      } catch { /* skip duplicates */ }
    }
    setImporting(false);
    toast.success(`تم إضافة ${added} باقة جاهزة`);
    refetch();
  }

  const all: any[]  = (res?.data || []).map((a: any) => ({
    ...a,
    isActive:    a.isActive    ?? a.is_active    ?? false,
    basePrice:   a.basePrice   ?? a.base_price   ?? 0,
    categoryTag: a.categoryTag ?? a.category_tag ?? "",
    totalOrders: a.totalOrders ?? a.total_orders ?? 0,
    components:  a.components  ?? [],
  }));
  const stats       = statsRes?.data;
  const filtered    = all.filter(a =>
    (!tag || a.categoryTag === tag) &&
    (!search || a.name.includes(search) || a.description?.includes(search))
  );

  const handleSave = async (form: any) => {
    try {
      modal.item ? await update({ ...form, id: modal.item.id }) : await create(form);
      toast.success("تم الحفظ");
      setModal({ open: false });
      refetch();
    } catch { toast.error("فشل الحفظ"); }
  };

  const handleToggle = async (item: any) => {
    try { await toggle(item.id); refetch(); } catch { toast.error("فشل التحديث"); }
  };
  const handleDelete = async (item: any) => {
    if (!confirm(`حذف "${item.name}"؟`)) return;
    try { await remove(item.id); toast.success("تم الحذف"); refetch(); }
    catch { toast.error("فشل الحذف"); }
  };
  const handleDuplicate = async (item: any) => {
    try { await duplicate(item.id); toast.success("تم تكرار الباقة"); refetch(); }
    catch { toast.error("فشل التكرار"); }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "الباقات",       value: stats?.total ?? all.length,                         icon: Flower2,    color: "text-brand-500 bg-brand-50" },
          { label: "نشط",          value: stats?.active ?? all.filter(a => a.isActive).length, icon: ToggleRight, color: "text-emerald-600 bg-emerald-50" },
          { label: "متوسط السعر",  value: stats?.avgPrice ? `${stats.avgPrice} ر.س` : "—",    icon: TrendingUp, color: "text-violet-600 bg-violet-50" },
          { label: "إجمالي الطلبات", value: stats?.totalOrders ?? 0,                           icon: ShoppingBag, color: "text-amber-600 bg-amber-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الباقات..."
            className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-500" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORY_TAGS.map(t => (
            <button key={t.value} onClick={() => setTag(t.value)}
              className={clsx("px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                tag === t.value ? "bg-brand-500 border-brand-500 text-white shadow-sm" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white")}>
              {t.label}
            </button>
          ))}
        </div>
        <Button icon={Plus} onClick={() => setModal({ open: true })}>باقة جديدة</Button>
        <button
          onClick={handleImportStarter}
          disabled={importing}
          className="flex items-center gap-2 border border-brand-300 text-brand-600 hover:bg-brand-50 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          استيراد باقات جاهزة
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-44" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 space-y-4">
          <Flower2 className="w-12 h-12 mx-auto text-gray-200" />
          <div>
            <p className="text-sm font-medium text-gray-600">لا توجد باقات</p>
            <p className="text-xs text-gray-400 mt-1">ابدأ بالباقات الجاهزة أو أنشئ باقة مخصصة</p>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button onClick={handleImportStarter} disabled={importing}
              className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50">
              {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              استيراد {STARTER_PACKAGES.length} باقة جاهزة
            </button>
            <button onClick={() => setModal({ open: true })}
              className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              <Plus className="w-4 h-4" /> باقة مخصصة
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item: any) => (
            <div key={item.id} className={clsx("bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-all",
              item.isActive ? "border-gray-100" : "border-gray-100 opacity-60")}>
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-medium",
                  CATEGORY_TAGS.find(t => t.value === item.categoryTag)?.color || "bg-gray-100 text-gray-600")}>
                  {TAG_LABELS[item.categoryTag] || item.categoryTag}
                </span>
                <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium",
                  item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                  {item.isActive ? "نشط" : "مخفي"}
                </span>
              </div>
              <div className="px-4 pb-4">
                <h3 className="font-bold text-gray-900 text-sm mb-1">{item.name}</h3>
                {item.description && <p className="text-xs text-gray-400 line-clamp-2 mb-3">{item.description}</p>}
                {item.components?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(item.components as string[]).slice(0, 4).map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-600 text-xs">{c}</span>
                    ))}
                    {item.components.length > 4 && <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-xs">+{item.components.length - 4}</span>}
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-brand-600">{Number(item.basePrice).toFixed(0)} ر.س</span>
                  {item.totalOrders > 0 && <span className="text-xs text-gray-400 flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{item.totalOrders}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(item)}
                    className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                      item.isActive ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100")}>
                    {item.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    {item.isActive ? "إخفاء" : "تفعيل"}
                  </button>
                  <button onClick={() => setModal({ open: true, item })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors">
                    <Pencil className="w-3 h-3" /> تعديل
                  </button>
                  <button onClick={() => handleDuplicate(item)}
                    title="تكرار الباقة"
                    className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-colors">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(item)}
                    className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors mr-auto">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal.open && <PackageModal item={modal.item} onClose={() => setModal({ open: false })} onSave={handleSave} />}    </div>
  );
}

// ─── Flower Inventory Item Modal ───────────────────────────────────────────────

function FlowerInventoryModal({ item, onClose, onSave }: { item?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name:      item?.name       || "",
    color:     item?.color      || "",
    type:      item?.type       || "",
    stock:     String(item?.stock      ?? ""),
    sellPrice: String(item?.sell_price ?? item?.sellPrice ?? ""),
    isHidden:  item?.is_hidden  ?? item?.isHidden  ?? false,
    imageUrl:  item?.image_url  ?? item?.imageUrl  ?? "",
  });
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Modal open title={item ? "تعديل الوردة" : "إضافة وردة جديدة"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="الاسم *" name="name" value={form.name} onChange={e => f("name", e.target.value)} placeholder="مثال: ورد أحمر" required />
          <Input label="اللون" name="color" value={form.color} onChange={e => f("color", e.target.value)} placeholder="أحمر، وردي..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="النوع / الصنف" name="type" value={form.type} onChange={e => f("type", e.target.value)} placeholder="روز، ليلى، نرجس..." />
          <Input label="السعر للسيقة (ر.س) *" name="sellPrice" type="number" value={form.sellPrice}
            onChange={e => f("sellPrice", e.target.value)} placeholder="0.00" dir="ltr" />
        </div>
        <Input label="الكمية المتاحة (سيقان)" name="stock" type="number" value={form.stock}
          onChange={e => f("stock", e.target.value)} placeholder="0" dir="ltr" />
        <ImageUpload label="صورة الوردة" value={form.imageUrl} onChange={v => f("imageUrl", v || "")} aspectRatio="square" />
        <div className="flex items-center gap-3">
          <Toggle checked={!form.isHidden} onChange={v => f("isHidden", !v)} />
          <span className="text-sm text-gray-700">ظاهرة في صفحة العملاء</span>
        </div>
        <div className="flex gap-3 pt-1">
          <Button className="flex-1" onClick={() => onSave(form)}>حفظ</Button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Tab: Builder Config ───────────────────────────────────────────────────────

function BuilderConfigTab() {
  const { data: res, loading, refetch }       = useApi(() => flowerBuilderApi.catalog(), []);
  const { data: invRes, refetch: refetchInv } = useApi(() => flowerBuilderApi.inventoryAll(), []);
  const { mutate: createItem }    = useMutation((d: any) => flowerBuilderApi.createItem(d));
  const { mutate: updateItem }    = useMutation((d: any) => flowerBuilderApi.updateItem(d.id, d));
  const { mutate: deleteItem }    = useMutation((id: string) => flowerBuilderApi.deleteItem(id));
  const { mutate: createFlower }  = useMutation((d: any) => flowerBuilderApi.createInventoryItem(d));
  const { mutate: updateFlower }  = useMutation((d: any) => flowerBuilderApi.updateInventoryItem(d.id, d));
  const { mutate: deleteFlower }  = useMutation((id: string) => flowerBuilderApi.deleteInventoryItem(id));

  const [modal, setModal]         = useState<{ open: boolean; item?: any }>({ open: false });
  const [invModal, setInvModal]   = useState<{ open: boolean; item?: any }>({ open: false });
  const [activeType, setActiveType] = useState("packaging");

  const rawCatalog = res?.data || { packaging: [], gift: [], card: [], delivery: [] };
  const normItems = (arr: any[]) => arr.map((item: any) => ({
    ...item,
    isActive:    item.isActive    ?? item.is_active    ?? false,
    isDefault:   item.isDefault   ?? item.is_default   ?? false,
    nameEn:      item.nameEn      ?? item.name_en      ?? "",
    maxQuantity: item.maxQuantity ?? item.max_quantity ?? 1,
    price:       item.price       ?? 0,
  }));
  const catalog: any = {
    packaging: normItems(rawCatalog.packaging ?? []),
    gift:      normItems(rawCatalog.gift      ?? []),
    card:      normItems(rawCatalog.card      ?? []),
    delivery:  normItems(rawCatalog.delivery  ?? []),
  };
  const inventory: any[] = invRes?.data || [];
  const curItems: any[] = catalog[activeType] || [];

  const handleSave = async (form: any) => {
    try {
      modal.item ? await updateItem({ ...form, id: modal.item.id }) : await createItem(form);
      toast.success("تم الحفظ");
      setModal({ open: false });
      refetch();
    } catch { toast.error("فشل الحفظ"); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا العنصر؟")) return;
    try { await deleteItem(id); toast.success("تم الحذف"); refetch(); }
    catch { toast.error("فشل الحذف"); }
  };

  const handleFlowerSave = async (form: any) => {
    try {
      invModal.item
        ? await updateFlower({ ...form, id: invModal.item.id })
        : await createFlower(form);
      toast.success("تم الحفظ");
      setInvModal({ open: false });
      refetchInv();
    } catch { toast.error("فشل الحفظ"); }
  };
  const handleFlowerDelete = async (id: string) => {
    if (!confirm("حذف هذه الوردة من القائمة؟")) return;
    try { await deleteFlower(id); toast.success("تم الحذف"); refetchInv(); }
    catch { toast.error("فشل الحذف"); }
  };

  const curType = CATALOG_TYPES.find(t => t.value === activeType)!;

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-brand-50 border border-brand-100 rounded-xl text-sm text-brand-700">
        <Settings className="w-4 h-4 mt-0.5 shrink-0" />
        <p>هذه الخيارات تظهر للعملاء في صفحة بناء الباقة. أضف خيارات التغليف والهدايا والكروت والتوصيل التي تريد تقديمها.</p>
      </div>

      {/* Type tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATALOG_TYPES.map(t => {
          const count = ((catalog as any)[t.value] || []).length;
          return (
            <button key={t.value} onClick={() => setActiveType(t.value)}
              className={clsx("flex items-center gap-3 p-4 rounded-2xl border text-right transition-all",
                activeType === t.value ? "bg-brand-500 border-brand-500 text-white shadow-sm" : "bg-white border-gray-100 hover:border-gray-200 text-gray-700")}>
              <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                activeType === t.value ? "bg-white/20" : t.color)}>
                <t.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">{t.label}</p>
                <p className={clsx("text-xs mt-0.5", activeType === t.value ? "text-white/70" : "text-gray-400")}>{count} خيار</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Items list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <curType.icon className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900 text-sm">خيارات {curType.label}</h3>
            <span className="text-xs text-gray-400">({curItems.length})</span>
          </div>
          <button onClick={() => setModal({ open: true, item: undefined })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors">
            <Plus className="w-3.5 h-3.5" /> إضافة
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center animate-pulse text-gray-300">...</div>
        ) : curItems.length === 0 ? (
          <div className="py-12 text-center">
            <curType.icon className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">لا توجد خيارات — أضف أول عنصر</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {curItems.map((item: any) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/40 transition-colors">
                <span className="w-8 flex items-center justify-center">
                  <CatalogIcon name={item.icon} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                    {item.nameEn && <span className="text-xs text-gray-400" dir="ltr">{item.nameEn}</span>}
                    {item.isDefault && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-xs">افتراضي</span>}
                    {!item.isActive && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">معطل</span>}
                  </div>
                  {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                </div>
                <div className="text-sm font-bold text-brand-600 shrink-0">
                  {Number(item.price) === 0 ? <span className="text-emerald-600 font-medium text-xs">مجاني</span> : `${Number(item.price).toFixed(0)} ر.س`}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setModal({ open: true, item })}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(item.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flower Inventory Management */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <Flower2 className="w-4 h-4 text-pink-500" /> الورود المعروضة في صفحة العملاء
          </h3>
          <button onClick={() => setInvModal({ open: true, item: undefined })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500 text-white text-xs font-medium hover:bg-pink-600 transition-colors">
            <Plus className="w-3.5 h-3.5" /> إضافة وردة
          </button>
        </div>
        {inventory.length === 0 ? (
          <div className="py-12 text-center">
            <Flower2 className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">لا توجد ورود — أضف الورود التي تريد عرضها للعملاء</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {inventory.map((fl: any) => {
              const imgUrl = fl.image_url || fl.imageUrl;
              const sellP  = fl.sell_price ?? fl.sellPrice ?? 0;
              const hidden = fl.is_hidden  ?? fl.isHidden  ?? false;
              return (
                <div key={fl.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/40 transition-colors">
                  {imgUrl ? (
                    <img src={imgUrl} alt={fl.name}
                      className="w-10 h-10 rounded-xl object-cover border border-gray-100 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
                      <Flower2 className="w-5 h-5 text-pink-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm">{fl.name}</p>
                      {fl.color && <span className="text-xs text-gray-400">{fl.color}</span>}
                      {fl.type && <span className="text-xs text-gray-400">{fl.type}</span>}
                      {hidden && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">مخفي</span>}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-brand-600 shrink-0">{Number(sellP).toFixed(2)} ر.س</div>
                  <div className={clsx("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0",
                    fl.stock <= 10 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
                    {fl.stock <= 10 && <AlertCircle className="w-3 h-3" />}
                    {fl.stock}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setInvModal({ open: true, item: fl })}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleFlowerDelete(fl.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal.open && (
        <CatalogItemModal
          item={modal.item ? { ...modal.item, type: modal.item.type || activeType } : { type: activeType }}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
        />
      )}
      {invModal.open && (
        <FlowerInventoryModal
          item={invModal.item}
          onClose={() => setInvModal({ open: false })}
          onSave={handleFlowerSave}
        />
      )}
    </div>
  );
}

// ─── Tab: Page Settings ────────────────────────────────────────────────────────

const ACCENT_PRESETS = [
  "#e11d48","#db2777","#9333ea","#7c3aed","#2563eb","#0891b2",
  "#059669","#d97706","#ea580c","#dc2626","#374151","#1e293b",
];

function PageSettingsTab({ orgSlug }: { orgSlug: string }) {
  const { data: res, loading } = useApi(() => flowerBuilderApi.pageConfig(), []);
  const { mutate: save }       = useMutation((d: any) => flowerBuilderApi.updatePageConfig(d));

  const [cfg, setCfg]   = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTemplate, setNewTemplate] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!orgSlug) return;
    const url = `${window.location.origin}/flowers/${orgSlug}`;
    import("qrcode").then(QRCode => {
      QRCode.default.toDataURL(url, {
        width: 300, margin: 2,
        color: { dark: "#5b9bd5", light: "#ffffff" },
        errorCorrectionLevel: "H",
      }).then(setQrDataUrl);
    });
  }, [orgSlug]);

  useEffect(() => {
    if (res?.data) { setCfg(res.data); setDirty(false); }
  }, [res]);

  if (loading || !cfg) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
      ))}
    </div>
  );

  const set = (k: string, v: any) => { setCfg((p: any) => ({ ...p, [k]: v })); setDirty(true); };
  const setFeature = (k: string, v: boolean) => {
    setCfg((p: any) => ({ ...p, features: { ...p.features, [k]: v } }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(cfg);
      toast.success("تم حفظ إعدادات الصفحة");
      setDirty(false);
    } catch { toast.error("فشل الحفظ"); }
    finally { setSaving(false); }
  };

  const addTemplate = () => {
    if (!newTemplate.trim()) return;
    set("cardTemplates", [...(cfg.cardTemplates || []), newTemplate.trim()]);
    setNewTemplate("");
  };
  const removeTemplate = (i: number) => {
    set("cardTemplates", cfg.cardTemplates.filter((_: any, idx: number) => idx !== i));
  };

  const publicUrl = `/flowers/${orgSlug}`;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-500" /> إعدادات صفحة العملاء
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">تحكم في مظهر وخيارات صفحة بناء الباقة</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
            <Eye className="w-3.5 h-3.5" /> معاينة
          </a>
          <Button icon={Save} onClick={handleSave} loading={saving} disabled={!dirty}>
            حفظ
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>لديك تغييرات غير محفوظة</span>
        </div>
      )}

      {/* Hero section */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-gray-900 text-sm">قسم الترحيب</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">العنوان الرئيسي</label>
            <input value={cfg.heroTitle} onChange={e => set("heroTitle", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">العنوان الفرعي</label>
            <input value={cfg.heroSubtitle} onChange={e => set("heroSubtitle", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">رسالة الشكر (بعد تأكيد الطلب)</label>
            <textarea value={cfg.thankYouMessage} onChange={e => set("thankYouMessage", e.target.value)}
              rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 resize-none" />
          </div>
          <ImageUpload label="صورة الغلاف (Hero)" value={cfg.heroImage || ""} onChange={v => set("heroImage", v || null)} aspectRatio="wide" />
        </div>
      </div>

      {/* Color */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Palette className="w-4 h-4 text-violet-500" />
          <h3 className="font-semibold text-gray-900 text-sm">اللون الرئيسي</h3>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-3">
            {ACCENT_PRESETS.map(color => (
              <button key={color} onClick={() => set("accentColor", color)}
                className={clsx("w-8 h-8 rounded-full border-2 transition-all",
                  cfg.accentColor === color ? "border-gray-800 scale-110 shadow" : "border-transparent hover:scale-105")}
                style={{ background: color }} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="color" value={cfg.accentColor} onChange={e => set("accentColor", e.target.value)}
              className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200" />
            <input value={cfg.accentColor} onChange={e => set("accentColor", e.target.value)}
              className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 font-mono" dir="ltr" />
            <div className="flex-1 h-10 rounded-xl shadow-sm"
              style={{ background: `linear-gradient(135deg, ${cfg.accentColor}, ${cfg.accentColor}99)` }} />
          </div>
        </div>
      </div>

      {/* Page Visibility */}
      <div className={clsx("rounded-2xl border overflow-hidden", cfg.isPublic ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-100")}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className={clsx("w-4 h-4", cfg.isPublic ? "text-emerald-600" : "text-gray-400")} />
            <div>
              <p className={clsx("text-sm font-semibold", cfg.isPublic ? "text-emerald-800" : "text-gray-700")}>
                {cfg.isPublic ? "الصفحة مفعّلة وظاهرة للعملاء" : "الصفحة مخفية — غير متاحة للعملاء"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">تحكم في ظهور صفحة بناء الباقة للعملاء</p>
            </div>
          </div>
          <Toggle checked={cfg.isPublic ?? false} onChange={v => set("isPublic", v)} />
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-gray-900 text-sm">الميزات المفعّلة</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { key: "showPackages",    label: "عرض الباقات الجاهزة",    desc: "يظهر قسم الباقات المسبقة في أعلى الصفحة" },
            { key: "showGifts",       label: "إضافة الهدايا",           desc: "يسمح للعميل باختيار هدايا مرافقة للورود" },
            { key: "showCard",        label: "بطاقة التهنئة",           desc: "يسمح للعميل بإضافة كرت ورسالة مخصصة" },
            { key: "deliveryEnabled", label: "خدمة التوصيل",            desc: "يعرض خيار توصيل الطلب للمنزل" },
            { key: "pickupEnabled",   label: "الاستلام من المتجر",       desc: "يعرض خيار الاستلام الذاتي" },
            { key: "surpriseEnabled", label: "خيار الإهداء المفاجئ",    desc: "يسمح للعميل بإخفاء بيانات المستلم (هدية مفاجأة)" },
          ].map(f => (
            <div key={f.key} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{f.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
              </div>
              <Toggle checked={cfg.features?.[f.key] ?? true} onChange={v => setFeature(f.key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Flower limits */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Flower2 className="w-4 h-4 text-pink-500" />
          <h3 className="font-semibold text-gray-900 text-sm">قيود الورود</h3>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">الحد الأدنى للورود</label>
            <input type="number" min={1} max={50} value={cfg.minFlowers}
              onChange={e => set("minFlowers", parseInt(e.target.value) || 1)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 text-center tabular-nums" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">الحد الأقصى للورود</label>
            <input type="number" min={5} max={200} value={cfg.maxFlowers}
              onChange={e => set("maxFlowers", parseInt(e.target.value) || 50)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 text-center tabular-nums" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">عتبة اقتراح الباقة (عدد الورود)</label>
            <input type="number" min={1} max={20} value={cfg.upsellThreshold}
              onChange={e => set("upsellThreshold", parseInt(e.target.value) || 5)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 text-center tabular-nums" dir="ltr" />
            <p className="text-xs text-gray-400 mt-1">عند تجاوزه يُقترح للعميل الترقية لباقة جاهزة</p>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-medium text-gray-900">شارة "آخر قطع"</p>
              <p className="text-xs text-gray-400">تظهر عند المخزون المنخفض</p>
            </div>
            <Toggle checked={cfg.showUrgencyBadge ?? true} onChange={v => set("showUrgencyBadge", v)} />
          </div>
        </div>
      </div>

      {/* Card templates */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-sky-500" />
          <h3 className="font-semibold text-gray-900 text-sm">قوالب رسائل الكرت</h3>
          <span className="text-xs text-gray-400">(يختار منها العميل)</span>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(cfg.cardTemplates || []).map((t: string, i: number) => (
              <div key={i} className="flex items-center gap-1.5 bg-sky-50 border border-sky-100 rounded-xl px-3 py-1.5 text-sm text-sky-800">
                <span>{t}</span>
                <button onClick={() => removeTemplate(i)} className="text-sky-400 hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newTemplate} onChange={e => setNewTemplate(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTemplate()}
              placeholder="أضف قالب رسالة جديد..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-sky-300" />
            <button onClick={addTemplate}
              className="px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delivery note */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-gray-900 text-sm">ملاحظة التوصيل</h3>
        </div>
        <div className="p-5">
          <textarea value={cfg.deliveryNote} onChange={e => set("deliveryNote", e.target.value)}
            rows={3} placeholder="مثال: التوصيل داخل المدينة خلال 3-5 ساعات. يُرجى التواصل للتنسيق مع الفريق..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-300 resize-none" />
        </div>
      </div>

      {/* Delivery Zones */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500" />
            <h3 className="font-semibold text-gray-900 text-sm">مناطق التوصيل وأسعارها</h3>
          </div>
          <button onClick={() => set("deliveryZones", [...(cfg.deliveryZones || []), { name: "", fee: 0 }])}
            className="flex items-center gap-1.5 text-xs text-brand-600 font-medium hover:text-brand-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> إضافة منطقة
          </button>
        </div>
        <div className="p-5 space-y-2">
          {!(cfg.deliveryZones?.length > 0) && (
            <p className="text-xs text-gray-400 text-center py-3">
              لا توجد مناطق — رسوم التوصيل مجانية. أضف مناطق لتحديد أسعار مختلفة.
            </p>
          )}
          {(cfg.deliveryZones || []).map((z: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input value={z.name} onChange={e => {
                const zones = [...(cfg.deliveryZones || [])];
                zones[i] = { ...zones[i], name: e.target.value };
                set("deliveryZones", zones);
              }} placeholder="اسم المنطقة (حي / مدينة)"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300" />
              <input type="number" min={0} value={z.fee} onChange={e => {
                const zones = [...(cfg.deliveryZones || [])];
                zones[i] = { ...zones[i], fee: parseFloat(e.target.value) || 0 };
                set("deliveryZones", zones);
              }} placeholder="0"
                className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 text-center" dir="ltr" />
              <span className="text-xs text-gray-400 shrink-0">ر.س</span>
              <button onClick={() => set("deliveryZones", (cfg.deliveryZones || []).filter((_: any, idx: number) => idx !== i))}
                className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand-500" />
          <h3 className="font-semibold text-gray-900 text-sm">رمز QR — صفحة العملاء</h3>
        </div>
        <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-32 h-32 rounded-xl border border-gray-100" />
          ) : (
            <div className="w-32 h-32 rounded-xl bg-gray-50 border border-gray-100 animate-pulse" />
          )}
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">رابط الصفحة</p>
              <p className="text-xs font-mono text-brand-600 bg-brand-50 px-3 py-2 rounded-lg break-all">
                {window.location.origin}{publicUrl}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> فتح الصفحة
              </a>
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`qr-flowers-${orgSlug}.png`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-500 text-white text-xs hover:bg-brand-600 transition-colors"
                >
                  تحميل QR
                </a>
              )}
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`); toast.success("تم نسخ الرابط"); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 transition-colors"
              >
                نسخ الرابط
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live preview hint */}
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
        <Globe className="w-4 h-4 shrink-0" />
        <span>شارك رمز QR مع عملائك أو ضعه على بطاقات العمل والمتجر</span>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "packages", label: "الباقات",   icon: Flower2 },
  { id: "builder",  label: "المُخصِّص", icon: Settings },
  { id: "page",     label: "الصفحة",    icon: Globe },
];

export function ArrangementsPage() {
  const [tab, setTab] = useState("packages");
  const [orgSlug, setOrgSlug] = useState<string>("");

  useEffect(() => {
    settingsApi.profile().then((res: any) => {
      if (res?.data?.org?.slug) setOrgSlug(res.data.org.slug);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Flower2 className="w-5 h-5 text-pink-500" /> الباقات والتنسيقات
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">إدارة الباقات الجاهزة، خيارات المُخصِّص، وإعدادات صفحة العملاء</p>
        </div>
        {orgSlug && (
          <a href={`/flowers/${orgSlug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
            <ExternalLink className="w-4 h-4" /> عرض صفحة العميل
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "packages" && <PackagesTab />}
      {tab === "builder"  && <BuilderConfigTab />}
      {tab === "page"     && <PageSettingsTab orgSlug={orgSlug} />}
    </div>
  );
}
