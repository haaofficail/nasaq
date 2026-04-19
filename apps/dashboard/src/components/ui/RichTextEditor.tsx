// ============================================================
// Rich Text Editor — محرر نصوص بسيط بدون مكتبات خارجية
// ============================================================

import { useRef, useEffect, useCallback, useState } from "react";
import { clsx } from "clsx";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  label?: string;
}

type FormatAction =
  | "bold" | "italic" | "underline" | "strikeThrough"
  | "insertUnorderedList" | "insertOrderedList"
  | "justifyRight" | "justifyCenter" | "justifyLeft"
  | "removeFormat";

// ── Toolbar Button ─────────────────────────────────────────
function ToolBtn({
  onClick, title, active, children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={clsx(
        "w-7 h-7 flex items-center justify-center rounded text-sm transition-colors select-none",
        active
          ? "bg-[#5b9bd5] text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      {children}
    </button>
  );
}

// ── Separator ──────────────────────────────────────────────
function Sep() {
  return <span className="w-px h-5 bg-gray-200 mx-0.5 shrink-0" />;
}

// ── Main Component ─────────────────────────────────────────
export function RichTextEditor({
  value,
  onChange,
  placeholder = "اكتب هنا...",
  minHeight = 140,
  className,
  label,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const isInternalChange = useRef(false);

  // Sync value → DOM (only when value changes from outside)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      isInternalChange.current = true;
      el.innerHTML = value || "";
      isInternalChange.current = false;
    }
  }, [value]);

  // Track active formats
  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    try {
      if (document.queryCommandState("bold"))          formats.add("bold");
      if (document.queryCommandState("italic"))        formats.add("italic");
      if (document.queryCommandState("underline"))     formats.add("underline");
      if (document.queryCommandState("strikeThrough")) formats.add("strikeThrough");
      if (document.queryCommandState("insertUnorderedList")) formats.add("insertUnorderedList");
      if (document.queryCommandState("insertOrderedList"))   formats.add("insertOrderedList");
    } catch (_) { /* silent */ }
    setActiveFormats(formats);
  }, []);

  const exec = useCallback((command: FormatAction, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateActiveFormats();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange, updateActiveFormats]);

  const insertHeading = useCallback((tag: string) => {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const insertLink = useCallback(() => {
    const url = window.prompt("أدخل رابط URL:", "https://");
    if (url) exec("insertUnorderedList" as FormatAction);
    if (url) {
      editorRef.current?.focus();
      document.execCommand("createLink", false, url);
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (isInternalChange.current) return;
    if (editorRef.current) onChange(editorRef.current.innerHTML);
    updateActiveFormats();
  }, [onChange, updateActiveFormats]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;&nbsp;");
    }
    updateActiveFormats();
  }, [updateActiveFormats]);

  const isEmpty = !value || value === "<br>" || value === "<p><br></p>";

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      {label && (
        <label className="block text-xs font-medium text-gray-600">{label}</label>
      )}

      <div className="border border-[#eef2f6] rounded-xl overflow-hidden focus-within:border-[#5b9bd5] focus-within:ring-2 focus-within:ring-[#5b9bd5]/10 transition-all">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-[#f8fafc] border-b border-[#eef2f6] flex-wrap">
          {/* Headings */}
          <ToolBtn onClick={() => insertHeading("h2")} title="عنوان كبير">
            <span className="font-bold text-[11px]">H1</span>
          </ToolBtn>
          <ToolBtn onClick={() => insertHeading("h3")} title="عنوان متوسط">
            <span className="font-bold text-[10px]">H2</span>
          </ToolBtn>
          <ToolBtn onClick={() => insertHeading("p")} title="نص عادي">
            <span className="text-[10px]">¶</span>
          </ToolBtn>

          <Sep />

          {/* Formatting */}
          <ToolBtn onClick={() => exec("bold")} title="عريض (Ctrl+B)" active={activeFormats.has("bold")}>
            <span className="font-black text-[13px]">B</span>
          </ToolBtn>
          <ToolBtn onClick={() => exec("italic")} title="مائل (Ctrl+I)" active={activeFormats.has("italic")}>
            <span className="italic font-serif text-[13px]">I</span>
          </ToolBtn>
          <ToolBtn onClick={() => exec("underline")} title="تحته خط (Ctrl+U)" active={activeFormats.has("underline")}>
            <span className="underline text-[12px]">U</span>
          </ToolBtn>
          <ToolBtn onClick={() => exec("strikeThrough")} title="يتوسطه خط" active={activeFormats.has("strikeThrough")}>
            <span className="line-through text-[12px]">S</span>
          </ToolBtn>

          <Sep />

          {/* Lists */}
          <ToolBtn onClick={() => exec("insertUnorderedList")} title="قائمة نقطية" active={activeFormats.has("insertUnorderedList")}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="2" cy="4" r="1.5"/>
              <rect x="5" y="3" width="10" height="2" rx="1"/>
              <circle cx="2" cy="8" r="1.5"/>
              <rect x="5" y="7" width="10" height="2" rx="1"/>
              <circle cx="2" cy="12" r="1.5"/>
              <rect x="5" y="11" width="10" height="2" rx="1"/>
            </svg>
          </ToolBtn>
          <ToolBtn onClick={() => exec("insertOrderedList")} title="قائمة مرقمة" active={activeFormats.has("insertOrderedList")}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <text x="0" y="5.5" fontSize="5" fontWeight="bold">1.</text>
              <rect x="5" y="3" width="10" height="2" rx="1"/>
              <text x="0" y="9.5" fontSize="5" fontWeight="bold">2.</text>
              <rect x="5" y="7" width="10" height="2" rx="1"/>
              <text x="0" y="13.5" fontSize="5" fontWeight="bold">3.</text>
              <rect x="5" y="11" width="10" height="2" rx="1"/>
            </svg>
          </ToolBtn>

          <Sep />

          {/* Alignment */}
          <ToolBtn onClick={() => exec("justifyRight")} title="محاذاة يمين">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <rect x="0" y="2" width="16" height="2" rx="1"/>
              <rect x="4" y="7" width="12" height="2" rx="1"/>
              <rect x="2" y="12" width="14" height="2" rx="1"/>
            </svg>
          </ToolBtn>
          <ToolBtn onClick={() => exec("justifyCenter")} title="محاذاة وسط">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <rect x="0" y="2" width="16" height="2" rx="1"/>
              <rect x="2" y="7" width="12" height="2" rx="1"/>
              <rect x="1" y="12" width="14" height="2" rx="1"/>
            </svg>
          </ToolBtn>
          <ToolBtn onClick={() => exec("justifyLeft")} title="محاذاة يسار">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <rect x="0" y="2" width="16" height="2" rx="1"/>
              <rect x="0" y="7" width="12" height="2" rx="1"/>
              <rect x="0" y="12" width="14" height="2" rx="1"/>
            </svg>
          </ToolBtn>

          <Sep />

          {/* Link */}
          <ToolBtn onClick={insertLink} title="رابط">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6.5 9.5a4 4 0 005.657 0l2-2a4 4 0 00-5.657-5.657l-1 1"/>
              <path d="M9.5 6.5a4 4 0 00-5.657 0l-2 2a4 4 0 005.657 5.657l1-1"/>
            </svg>
          </ToolBtn>

          {/* Clear */}
          <ToolBtn onClick={() => exec("removeFormat")} title="مسح التنسيق">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12L13 2M10 2l3 3-7 7H3V9l7-7"/>
            </svg>
          </ToolBtn>
        </div>

        {/* Editable area */}
        <div className="relative">
          {isEmpty && (
            <span
              className="absolute top-3 right-3 text-sm text-gray-400 pointer-events-none select-none"
              aria-hidden
            >
              {placeholder}
            </span>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onFocus={updateActiveFormats}
            dir="rtl"
            className="outline-none px-3 py-3 text-sm text-gray-800 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:mr-5 [&_ol]:list-decimal [&_ol]:mr-5 [&_li]:mb-1 [&_a]:text-[#5b9bd5] [&_a]:underline [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_s]:line-through"
            style={{ minHeight }}
          />
        </div>
      </div>
    </div>
  );
}
