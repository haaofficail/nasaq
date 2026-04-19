import { useState, useEffect, useCallback } from "react";
import { Search, MapPin, Star, Package, Layers, Loader2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { marketplaceApi } from "@/lib/api";

const CITIES     = ["كل المدن", "الرياض", "جدة", "مكة", "المدينة", "الدمام", "الخبر", "أبها"];
const SORT_OPTS  = [
  { value: "popular",    label: "الأكثر شعبية" },
  { value: "rating",     label: "الأعلى تقييماً" },
  { value: "price_low",  label: "السعر: الأقل" },
  { value: "price_high", label: "السعر: الأعلى" },
];

export function MarketplaceBrowsePage() {
  const [search, setSearch]   = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity]       = useState("");
  const [sort, setSort]       = useState("popular");
  const [listings, setListings] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Load available categories once
  useEffect(() => {
    marketplaceApi.categories().then(res => {
      setCategories(res.data ?? []);
    }).catch(() => {});
  }, []);

  const fetchListings = useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = { sort };
    if (search)   params.search   = search;
    if (city)     params.city     = city;
    if (category) params.category = category;

    marketplaceApi.browse(params)
      .then(res => {
        setListings(res.data ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(() => setError("تعذّر تحميل البيانات، حاول مجدداً"))
      .finally(() => setLoading(false));
  }, [search, city, category, sort]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchListings(), 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = listings; // filtering done server-side

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-[#eef2f6]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center"><Layers className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-brand-500 text-lg">سوق ترميز OS</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm text-gray-500 hover:text-gray-700">دخول مقدمي الخدمة</a>
            <a href="/register" className="bg-brand-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-600">سجّل كمقدم خدمة</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-brand-500 to-brand-600 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-3">اعثر على أفضل تجهيزات الفعاليات</h1>
          <p className="text-brand-100 mb-6">قارن الأسعار والتقييمات واحجز مباشرة</p>
          <div className="flex items-center gap-2 bg-white rounded-xl p-2 max-w-xl mx-auto">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن خيمة، جلسة، ضيافة..."
              className="flex-1 text-gray-900 text-sm outline-none bg-transparent" />
            <select value={city} onChange={e => setCity(e.target.value === "كل المدن" ? "" : e.target.value)} className="bg-gray-50 text-gray-700 text-sm rounded-lg px-3 py-2 border-none outline-none">
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2 overflow-x-auto flex-1">
            <button onClick={() => setCategory("")}
              className={clsx("px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                !category ? "bg-brand-500 text-white" : "bg-white border border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc]")}>
              الكل
            </button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={clsx("px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  category === cat ? "bg-brand-500 text-white" : "bg-white border border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc]")}>{cat}</button>
            ))}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-white border border-[#eef2f6] rounded-lg px-3 py-2 text-sm">
            {SORT_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Results */}
        {error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <AlertCircle className="w-10 h-10" />
            <p className="text-sm">{error}</p>
            <button onClick={fetchListings} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <Package className="w-10 h-10" />
            <p className="text-sm">لا توجد نتائج — جرّب تغيير الفلاتر</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{total.toLocaleString()} نتيجة</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map(listing => (
                <a key={listing.id} href={`/s/${listing.vendorSlug}`} className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                    <Package className="w-12 h-12 text-gray-300 group-hover:scale-110 transition-transform" />
                    {listing.isFeatured && (
                      <span className="absolute top-3 left-3 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">مميّز</span>
                    )}
                    <span className="absolute top-3 right-3 bg-white/90 backdrop-blur text-xs font-medium text-gray-700 px-2 py-1 rounded-lg">{listing.category}</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-[10px] font-bold">
                        {listing.vendor?.charAt(0)}
                      </div>
                      <span className="text-xs text-gray-500">{listing.vendor}</span>
                      {listing.city && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{listing.city}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 leading-relaxed line-clamp-2 group-hover:text-brand-600 transition-colors">{listing.service}</h3>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#eef2f6]">
                      <span className="text-lg font-bold text-brand-600">
                        {Number(listing.price).toLocaleString("en-US")} <span className="text-xs text-gray-400 font-normal">ر.س</span>
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {listing.rating && (
                          <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" fill="currentColor" />{listing.rating}</span>
                        )}
                        <span>{listing.bookings} حجز</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#eef2f6] py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-brand-500" />
            <span className="font-bold text-brand-500">سوق ترميز OS</span>
          </div>
          <p className="text-sm text-gray-400">منصة الفعاليات الأذكى في السعودية</p>
          <div className="flex justify-center gap-6 mt-4 text-xs text-gray-400">
            <a href="#" className="hover:text-gray-600">سياسة الخصوصية</a>
            <a href="#" className="hover:text-gray-600">الشروط والأحكام</a>
            <a href="#" className="hover:text-gray-600">سجّل كمقدم خدمة</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
