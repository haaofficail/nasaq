import { useState } from "react";
import { Search, MapPin, Filter, Star, Users, Package, Layers, ChevronDown } from "lucide-react";
import { clsx } from "clsx";

const mockListings = [
  { id: "1", service: "خيمة مغربية فاخرة 12×12", vendor: "محفل", vendorLogo: null, city: "الرياض", price: 16000, rating: 4.8, reviews: 12, bookings: 45, category: "خيام", image: null },
  { id: "2", service: "خيمة مغربية 8×8", vendor: "محفل", vendorLogo: null, city: "الرياض", price: 12000, rating: 4.6, reviews: 8, bookings: 32, category: "خيام", image: null },
  { id: "3", service: "تجهيز كوشة عرس كاملة", vendor: "أزهار لافندر", vendorLogo: null, city: "الرياض", price: 8500, rating: 4.9, reviews: 25, bookings: 67, category: "ديكور", image: null },
  { id: "4", service: "ضيافة قهوة عربية — 100 ضيف", vendor: "ضيافة الديرة", vendorLogo: null, city: "الرياض", price: 3500, rating: 4.7, reviews: 18, bookings: 55, category: "ضيافة", image: null },
  { id: "5", service: "تصوير فوتوغرافي احترافي", vendor: "لنس كريتف", vendorLogo: null, city: "الرياض", price: 5000, rating: 4.5, reviews: 15, bookings: 38, category: "تصوير", image: null },
  { id: "6", service: "بيت شعر فاخر 10×6", vendor: "خيام الصقر", vendorLogo: null, city: "الرياض", price: 9000, rating: 4.4, reviews: 6, bookings: 18, category: "خيام", image: null },
  { id: "7", service: "إضاءة LED مع تحكم ألوان", vendor: "نور الحفلات", vendorLogo: null, city: "جدة", price: 2000, rating: 4.3, reviews: 9, bookings: 22, category: "إضاءة", image: null },
  { id: "8", service: "جلسة كنب مودرن — 40 ضيف", vendor: "محفل", vendorLogo: null, city: "الرياض", price: 6000, rating: 4.4, reviews: 4, bookings: 12, category: "جلسات", image: null },
];

const categories = ["الكل", "خيام", "جلسات", "ديكور", "ضيافة", "تصوير", "إضاءة"];
const cities = ["كل المدن", "الرياض", "جدة", "مكة", "الدمام"];
const sortOptions = [
  { value: "popular", label: "الأكثر شعبية" },
  { value: "rating", label: "الأعلى تقييماً" },
  { value: "price_low", label: "السعر: الأقل" },
  { value: "price_high", label: "السعر: الأعلى" },
];

export function MarketplaceBrowsePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("الكل");
  const [city, setCity] = useState("كل المدن");
  const [sort, setSort] = useState("popular");

  let filtered = mockListings.filter(l => {
    if (search && !l.service.includes(search) && !l.vendor.includes(search)) return false;
    if (category !== "الكل" && l.category !== category) return false;
    if (city !== "كل المدن" && l.city !== city) return false;
    return true;
  });

  if (sort === "rating") filtered.sort((a, b) => b.rating - a.rating);
  if (sort === "price_low") filtered.sort((a, b) => a.price - b.price);
  if (sort === "price_high") filtered.sort((a, b) => b.price - a.price);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center"><Layers className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-brand-500 text-lg">سوق نسق</span>
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
            <select value={city} onChange={e => setCity(e.target.value)} className="bg-gray-50 text-gray-700 text-sm rounded-lg px-3 py-2 border-none outline-none">
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2 overflow-x-auto flex-1">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={clsx("px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  category === cat ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>{cat}</button>
            ))}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
            {sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Results */}
        <p className="text-sm text-gray-500 mb-4">{filtered.length} نتيجة</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(listing => (
            <a key={listing.id} href={`/book/${listing.id}`} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                <Package className="w-12 h-12 text-gray-300 group-hover:scale-110 transition-transform" />
                <span className="absolute top-3 right-3 bg-white/90 backdrop-blur text-xs font-medium text-gray-700 px-2 py-1 rounded-lg">{listing.category}</span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-[10px] font-bold">{listing.vendor.charAt(0)}</div>
                  <span className="text-xs text-gray-500">{listing.vendor}</span>
                  <span className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{listing.city}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 leading-relaxed line-clamp-2 group-hover:text-brand-600 transition-colors">{listing.service}</h3>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-lg font-bold text-brand-600">{listing.price.toLocaleString()} <span className="text-xs text-gray-400 font-normal">ر.س</span></span>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" fill="currentColor" />{listing.rating}</span>
                    <span>{listing.bookings} حجز</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-brand-500" />
            <span className="font-bold text-brand-500">سوق نسق</span>
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
