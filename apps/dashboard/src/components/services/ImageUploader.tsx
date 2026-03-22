import { useState, useRef, useCallback } from "react";
import { Upload, X, Star, GripVertical, Image, Loader2 } from "lucide-react";
import { clsx } from "clsx";

type MediaItem = {
  id: string;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  isCover: boolean;
  sortOrder: number;
};

type Props = {
  serviceId: string;
  media: MediaItem[];
  onUpload?: (files: File[]) => void;
  onReorder?: (items: { id: string; sortOrder: number }[]) => void;
  onSetCover?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAltText?: (id: string, text: string) => void;
};

export function ImageUploader({ serviceId, media, onUpload, onReorder, onSetCover, onDelete, onAltText }: Props) {
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // File selection
  const handleFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter(f =>
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type) && f.size <= 10 * 1024 * 1024
    );
    if (valid.length === 0) return;
    setUploading(true);
    onUpload?.(valid);
    setTimeout(() => setUploading(false), 1500); // Simulated
  }, [onUpload]);

  // Drop zone
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Drag reorder
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setOverIndex(index); };
  const handleDragEnd = () => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const reordered = [...media];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(overIndex, 0, moved);
      onReorder?.(reordered.map((m, i) => ({ id: m.id, sortOrder: i })));
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={clsx(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
          dragging ? "border-brand-400 bg-brand-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        )}
      >
        <input
          ref={fileRef} type="file" multiple accept="image/*" className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2" />
        ) : (
          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        )}
        <p className="text-sm text-gray-500">
          {uploading ? "جاري الرفع..." : "اسحب الصور هنا أو اضغط للاختيار"}
        </p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — حتى 10MB لكل صورة</p>
      </div>

      {/* Media grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {media.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={clsx(
                "relative group rounded-xl overflow-hidden border-2 aspect-square bg-gray-100 transition-all",
                dragIndex === index ? "opacity-50 scale-95" : "",
                overIndex === index && dragIndex !== null ? "border-brand-400" : "border-transparent",
                item.isCover ? "ring-2 ring-amber-400" : ""
              )}
            >
              {/* Image */}
              {item.url ? (
                <img src={item.thumbnailUrl || item.url} alt={item.altText || ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Image className="w-8 h-8 text-gray-300" /></div>
              )}

              {/* Cover badge */}
              {item.isCover && (
                <div className="absolute top-2 right-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" fill="white" /> غلاف
                </div>
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {/* Drag handle */}
                <div className="absolute top-2 left-2 p-1 bg-white/80 rounded cursor-grab">
                  <GripVertical className="w-4 h-4 text-gray-600" />
                </div>

                {/* Set as cover */}
                {!item.isCover && (
                  <button onClick={() => onSetCover?.(item.id)} className="p-2 bg-white rounded-lg shadow hover:bg-gray-50" title="تعيين كغلاف">
                    <Star className="w-4 h-4 text-amber-500" />
                  </button>
                )}

                {/* Delete */}
                <button onClick={() => onDelete?.(item.id)} className="p-2 bg-white rounded-lg shadow hover:bg-red-50" title="حذف">
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>

              {/* Sort order */}
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {media.length === 0 && !uploading && (
        <p className="text-center text-sm text-gray-400 py-4">لا توجد صور — ارفع أول صورة</p>
      )}

      <p className="text-xs text-gray-400">اسحب الصور لإعادة ترتيبها — الصورة الأولى ذات النجمة هي صورة الغلاف</p>
    </div>
  );
}
