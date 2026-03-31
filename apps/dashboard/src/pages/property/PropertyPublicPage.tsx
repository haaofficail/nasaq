import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

export function PropertyPublicPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");

  useEffect(() => {
    if (!orgSlug) return;
    setLoading(true);
    fetch(`/api/v1/property/listings/available/${orgSlug}`)
      .then((r) => {
        if (!r.ok) throw new Error("لم يتم العثور على الوحدات");
        return r.json();
      })
      .then((data) => {
        setListings(data?.data ?? data?.listings ?? []);
        setOrgName(data?.orgName ?? "");
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message ?? "حدث خطأ");
        setLoading(false);
      });
  }, [orgSlug]);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{orgName || "الوحدات المتاحة"}</h1>
            <p className="text-gray-500 text-sm">وحدات للتأجير</p>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: "#5b9bd5" }}
          >
            {orgName?.charAt(0) ?? "ن"}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-8 bg-gray-100 rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">لا توجد وحدات متاحة حالياً</p>
            <p className="text-gray-300 text-sm mt-2">يرجى التحقق لاحقاً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing: any) => (
              <div key={listing.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                {listing.imageUrl ? (
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
                    <span className="text-gray-300 text-sm">لا توجد صورة</span>
                  </div>
                )}

                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-gray-900 text-base leading-tight">{listing.title}</h3>

                  {listing.location && (
                    <p className="text-gray-500 text-sm">{listing.location}</p>
                  )}

                  {/* Specs */}
                  {(listing.bedrooms || listing.bathrooms || listing.area) && (
                    <div className="flex gap-3 text-xs text-gray-600">
                      {listing.bedrooms && <span>{listing.bedrooms} غرف</span>}
                      {listing.bathrooms && <span>{listing.bathrooms} حمام</span>}
                      {listing.area && <span>{listing.area} م²</span>}
                    </div>
                  )}

                  {listing.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">{listing.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-lg font-bold" style={{ color: "#5b9bd5" }}>
                      {Number(listing.price).toLocaleString("en-US")} ر.س
                      <span className="text-xs text-gray-400 font-normal">/شهر</span>
                    </span>
                  </div>

                  <a
                    href={`tel:${listing.contactPhone ?? ""}`}
                    className="block w-full py-2.5 text-center text-white rounded-xl text-sm font-medium transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#5b9bd5" }}
                  >
                    تواصل معنا
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-gray-400 text-xs border-t border-gray-100">
        مدعوم بواسطة نسق
      </footer>
    </div>
  );
}
