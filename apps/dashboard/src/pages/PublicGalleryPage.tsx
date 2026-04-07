import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { mediaApi } from "@/lib/api";
import { Image, Download, ChevronLeft, ChevronRight, X, Loader2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";

export function PublicGalleryPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    mediaApi.shareGallery(token)
      .then((res: any) => {
        if (res?.data) setData(res.data);
        else setError(res?.error || "المعرض غير موجود");
      })
      .catch(() => setError("فشل تحميل المعرض"))
      .finally(() => setLoading(false));
  }, [token]);

  const assets: any[] = data?.assets ?? [];
  const gallery = data?.gallery;

  const prev = () => setLightbox(i => i !== null && i > 0 ? i - 1 : i);
  const next = () => setLightbox(i => i !== null && i < assets.length - 1 ? i + 1 : i);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white" dir="rtl">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">ترميز OS — معرض صور</p>
            {gallery && (
              <>
                <h1 className="text-lg font-bold">{gallery.name}</h1>
                {gallery.clientName && <p className="text-sm text-gray-400">{gallery.clientName}</p>}
                {gallery.description && <p className="text-sm text-gray-500 mt-1">{gallery.description}</p>}
              </>
            )}
          </div>
          {assets.length > 0 && (
            <p className="text-sm text-gray-400">{assets.length} صورة</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
            <span className="text-gray-500">جاري التحميل...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-10 h-10 text-gray-600" />
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Image className="w-10 h-10 text-gray-700" />
            <p className="text-gray-500 text-sm">لا توجد صور في هذا المعرض</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {assets.map((a: any, i: number) => (
              <button
                key={a.id}
                onClick={() => setLightbox(i)}
                className="group relative aspect-square overflow-hidden rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all"
              >
                <img
                  src={a.fileUrl}
                  alt={a.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && assets[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            disabled={lightbox === 0}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white disabled:opacity-20 transition-colors z-10"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          <img
            src={assets[lightbox].fileUrl}
            alt={assets[lightbox].name}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />

          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            disabled={lightbox === assets.length - 1}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white disabled:opacity-20 transition-colors z-10"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 left-4 p-2 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <a
            href={assets[lightbox].fileUrl}
            download
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors"
          >
            <Download className="w-6 h-6" />
          </a>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/40">
            {lightbox + 1} / {assets.length}
          </div>
        </div>
      )}
    </div>
  );
}
