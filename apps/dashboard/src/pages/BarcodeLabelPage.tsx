import { useState, useMemo, useRef } from "react";
import { Search, Printer, Download, Tag, RefreshCw, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { servicesApi } from "@/lib/api";
import { generateCode128Svg, svgToDataUrl } from "@/lib/barcode";

// ── Label sizes ────────────────────────────────────────────────────
const LABEL_SIZES = [
  { id: "small",  label: "صغير",  width: 38, height: 25, desc: "38×25 ملم" },
  { id: "medium", label: "متوسط", width: 57, height: 40, desc: "57×40 ملم" },
  { id: "large",  label: "كبير",  width: 100, height: 70, desc: "100×70 ملم" },
] as const;

type LabelSizeId = (typeof LABEL_SIZES)[number]["id"];

// ── Barcode height mapping per size ──────────────────────────────
const BARCODE_HEIGHT: Record<LabelSizeId, number> = {
  small: 28,
  medium: 40,
  large: 60,
};

// ── Helper: format price ──────────────────────────────────────────
function fmt(price: number | string | null | undefined): string {
  if (price == null || price === "") return "";
  const n = Number(price);
  return isNaN(n) ? "" : n.toLocaleString("ar-SA", { minimumFractionDigits: 2 }) + " ر.س";
}

// ── Label preview card ────────────────────────────────────────────
interface LabelCardProps {
  service: any;
  size: LabelSizeId;
  quantity: number;
}

function LabelCard({ service, size }: LabelCardProps) {
  const sizeConfig = LABEL_SIZES.find((s) => s.id === size)!;
  const barcodeHeight = BARCODE_HEIGHT[size];
  const svgString = generateCode128Svg(service.barcode, { height: barcodeHeight, showText: false, moduleWidth: size === "large" ? 2 : 1 });

  const isSmall = size === "small";
  const isMedium = size === "medium";

  return (
    <div
      className={clsx(
        "bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col items-center justify-between print:rounded-none print:border-gray-400 shrink-0",
        isSmall  && "w-28 h-20 p-1 gap-0.5",
        isMedium && "w-44 h-32 p-2 gap-1",
        !isSmall && !isMedium && "w-72 h-48 p-3 gap-2"
      )}
      style={{ width: `${sizeConfig.width * 3.78}px`, height: `${sizeConfig.height * 3.78}px` }}
    >
      {/* Business name / SKU */}
      <p className={clsx("text-gray-500 font-medium w-full truncate text-center", isSmall ? "text-[8px]" : isMedium ? "text-[9px]" : "text-xs")}>
        {service.sku || ""}
      </p>

      {/* Service name */}
      <p className={clsx("font-bold text-gray-900 w-full truncate text-center", isSmall ? "text-[9px]" : isMedium ? "text-xs" : "text-sm")}>
        {service.name}
      </p>

      {/* Barcode SVG */}
      <div
        className="flex-1 flex items-center justify-center w-full"
        dangerouslySetInnerHTML={{ __html: svgString }}
      />

      {/* Barcode text + price */}
      <div className="flex items-center justify-between w-full">
        <span className={clsx("text-gray-400 font-mono tracking-tight", isSmall ? "text-[7px]" : "text-[9px]")} dir="ltr">
          {service.barcode}
        </span>
        {service.price && (
          <span className={clsx("font-bold text-[#5b9bd5]", isSmall ? "text-[8px]" : "text-[10px]")}>
            {fmt(service.price)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function BarcodeLabelPage() {
  const [search, setSearch] = useState("");
  const [selectedSize, setSelectedSize] = useState<LabelSizeId>("medium");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: servicesRes, loading, error, refetch } = useApi(
    () => servicesApi.list({ limit: "200" }),
    []
  );

  const allServices: any[] = servicesRes?.data ?? [];
  const withBarcode = allServices.filter((s) => s.barcode);
  const withoutBarcode = allServices.filter((s) => !s.barcode);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return withBarcode;
    return withBarcode.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.barcode?.toLowerCase().includes(q) ||
        s.sku?.toLowerCase().includes(q)
    );
  }, [withBarcode, search]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((s) => s.id)));
  const clearAll  = () => setSelected(new Set());

  const getQty = (id: string) => quantities[id] ?? 1;
  const setQty = (id: string, v: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, Math.min(10, v)) }));

  const selectedServices = filtered.filter((s) => selected.has(s.id));

  // ── Generate barcode for a service ──────────────────────────────
  const handleGenerateBarcode = async (id: string) => {
    setGeneratingId(id);
    try {
      await servicesApi.generateBarcode(id);
      await refetch();
    } catch (err) {
      // silent — the API hook shows errors via toast
    } finally {
      setGeneratingId(null);
    }
  };

  // ── Print ────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ── Download single SVG ──────────────────────────────────────────
  const handleDownloadSvg = (service: any) => {
    const barcodeH = BARCODE_HEIGHT[selectedSize];
    const svg = generateCode128Svg(service.barcode, { height: barcodeH, showText: true, moduleWidth: 2 });
    const url = svgToDataUrl(svg);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barcode-${service.barcode}.svg`;
    a.click();
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #barcode-print-area { display: block !important; }
          #barcode-print-area .print-label {
            display: inline-flex;
            margin: 2mm;
            page-break-inside: avoid;
          }
        }
        @media screen {
          #barcode-print-area { display: none; }
        }
      `}</style>

      {/* ── Hidden print area ── */}
      <div id="barcode-print-area" ref={printRef}>
        <div style={{ display: "flex", flexWrap: "wrap", padding: "4mm" }}>
          {selectedServices.flatMap((s) =>
            Array.from({ length: getQty(s.id) }).map((_, i) => (
              <div key={`${s.id}-${i}`} className="print-label">
                <LabelCard service={s} size={selectedSize} quantity={1} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Screen UI ── */}
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">طباعة بطاقات الباركود</h1>
            <p className="text-sm text-gray-400 mt-0.5">اختر الخدمات وطباعة بطاقات السعر والباركود</p>
          </div>
          <button
            onClick={handlePrint}
            disabled={selectedServices.length === 0}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-colors",
              selectedServices.length > 0
                ? "bg-[#5b9bd5] text-white hover:bg-[#4a8ac4]"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            )}
          >
            <Printer className="w-4 h-4" />
            طباعة ({selectedServices.reduce((acc, s) => acc + getQty(s.id), 0)} بطاقة)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ── Left: Service list ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search + controls */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث بالاسم أو الباركود أو SKU..."
                  className="w-full border border-gray-200 rounded-xl py-2 pr-9 pl-3 text-sm focus:outline-none focus:border-[#5b9bd5] transition-colors"
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <button onClick={selectAll} className="text-[#5b9bd5] hover:underline font-medium">تحديد الكل</button>
                <span>|</span>
                <button onClick={clearAll} className="hover:underline">إلغاء التحديد</button>
                <span className="mr-auto">{filtered.length} خدمة</span>
              </div>
            </div>

            {/* Skeleton */}
            {loading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 h-16 animate-pulse" />
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="bg-red-50 rounded-2xl border border-red-100 p-6 text-center">
                <p className="text-sm text-red-500">{error}</p>
                <button onClick={refetch} className="mt-2 text-xs text-[#5b9bd5] hover:underline">إعادة المحاولة</button>
              </div>
            )}

            {/* Services with barcode */}
            {!loading && !error && (
              <div className="space-y-2">
                {filtered.length === 0 && withBarcode.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                    <Tag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">لا توجد خدمات تطابق البحث</p>
                  </div>
                )}
                {filtered.length === 0 && withBarcode.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                    <Tag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-700">لا توجد خدمات بباركود</p>
                    <p className="text-xs text-gray-400 mt-1">أنشئ باركود للخدمات أدناه لتظهر هنا</p>
                  </div>
                )}
                {filtered.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => toggleSelect(service.id)}
                    className={clsx(
                      "bg-white rounded-2xl border p-4 flex items-center gap-4 cursor-pointer transition-colors",
                      selected.has(service.id)
                        ? "border-[#5b9bd5] bg-blue-50/30"
                        : "border-gray-100 hover:border-gray-200"
                    )}
                  >
                    {/* Checkbox */}
                    <div className={clsx(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                      selected.has(service.id) ? "bg-[#5b9bd5] border-[#5b9bd5]" : "border-gray-300"
                    )}>
                      {selected.has(service.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{service.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5" dir="ltr">{service.barcode}</p>
                    </div>

                    {/* Price */}
                    {service.price && (
                      <span className="text-sm font-bold text-[#5b9bd5] shrink-0">{fmt(service.price)}</span>
                    )}

                    {/* Quantity */}
                    {selected.has(service.id) && (
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setQty(service.id, getQty(service.id) - 1)}
                          className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">{getQty(service.id)}</span>
                        <button
                          onClick={() => setQty(service.id, getQty(service.id) + 1)}
                          className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Download SVG */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownloadSvg(service); }}
                      className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      title="تحميل SVG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Services WITHOUT barcode */}
            {!loading && !error && withoutBarcode.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 px-1">خدمات بدون باركود</p>
                {withoutBarcode.map((service) => (
                  <div
                    key={service.id}
                    className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 opacity-70"
                  >
                    <div className="w-5 h-5 rounded-md border-2 border-gray-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{service.name}</p>
                      <p className="text-xs text-gray-300 mt-0.5">لا يوجد باركود</p>
                    </div>
                    <button
                      onClick={() => handleGenerateBarcode(service.id)}
                      disabled={generatingId === service.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5b9bd5]/10 text-[#5b9bd5] text-xs font-semibold hover:bg-[#5b9bd5]/20 transition-colors disabled:opacity-50"
                    >
                      {generatingId === service.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      توليد باركود
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Options + Preview ── */}
          <div className="space-y-4">
            {/* Label size selector */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">حجم البطاقة</h3>
              <div className="space-y-2">
                {LABEL_SIZES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSize(s.id)}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors",
                      selectedSize === s.id
                        ? "border-[#5b9bd5] bg-[#5b9bd5]/5 text-[#5b9bd5] font-semibold"
                        : "border-gray-100 text-gray-600 hover:border-gray-200"
                    )}
                  >
                    <span>{s.label}</span>
                    <span className="text-xs text-gray-400 font-normal">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">معاينة</h3>
              {selectedServices.length === 0 ? (
                <div className="py-8 text-center">
                  <Tag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">اختر خدمات لمعاينة البطاقات</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto">
                  {selectedServices.map((service) => (
                    <div key={service.id} className="flex flex-col items-center gap-1">
                      <LabelCard service={service} size={selectedSize} quantity={getQty(service.id)} />
                      {getQty(service.id) > 1 && (
                        <p className="text-[10px] text-gray-400">× {getQty(service.id)} نسخة</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
