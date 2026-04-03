import { useRef, useState } from "react";
import { ImageOff, Upload, X, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/hooks/useToast";

interface Props {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
  label?: string;
  aspectRatio?: "square" | "video" | "wide";
}

async function compressImage(file: File, maxPx = 900, quality = 0.82): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(b => resolve(b!), "image/jpeg", quality);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

export function ImageUpload({ value, onChange, className, label = "صورة", aspectRatio = "video" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(value);
  const [imgError, setImgError] = useState(false);

  const aspectClass = {
    square: "aspect-square",
    video:  "aspect-video",
    wide:   "aspect-[3/1]",
  }[aspectRatio];

  const handleFile = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("يُسمح بصور JPG وPNG وWebP فقط");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("الصورة أكبر من 10MB");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setImgError(false);
    setUploading(true);

    try {
      const compressed = await compressImage(file);
      const form = new FormData();
      form.append("file", new File([compressed], file.name, { type: "image/jpeg" }));

      const token = localStorage.getItem("nasaq_token");
      const res = await fetch("/api/v1/file-upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "فشل رفع الصورة");
      }

      const { data } = await res.json();
      URL.revokeObjectURL(localUrl);
      setPreview(data.url);
      onChange(data.url);
    } catch (e: any) {
      toast.error(e.message || "فشل رفع الصورة");
      setPreview(value);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(undefined);
    setImgError(false);
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={className}>
      {label && <p className="text-xs font-semibold text-gray-500 mb-1.5">{label}</p>}
      <div
        className={clsx(
          "relative rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer group transition-colors",
          aspectClass,
          uploading ? "border-brand-300 bg-brand-50" : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
        )}
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        {/* Image or placeholder */}
        {preview && !imgError ? (
          <img
            src={preview}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300">
            {imgError ? <ImageOff className="w-8 h-8" /> : <Upload className="w-7 h-7 group-hover:text-brand-400 transition-colors" />}
            {!imgError && (
              <p className="text-xs text-gray-400 group-hover:text-brand-500 transition-colors text-center px-2">
                اسحب صورة هنا أو اضغط للاختيار
              </p>
            )}
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
          </div>
        )}

        {/* Clear button */}
        {preview && !uploading && (
          <button
            onClick={clear}
            className="absolute top-2 left-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Change overlay on hover */}
        {preview && !uploading && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
            <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">تغيير الصورة</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
