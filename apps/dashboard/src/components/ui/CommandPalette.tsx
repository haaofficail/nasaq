import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Settings, Calendar, Users, Package, Home } from "lucide-react";
import { clsx } from "clsx";

interface CommandItem {
  id: string;
  name: string;
  icon: React.ElementType;
  shortcut?: string;
  perform: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Toggle overlay shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
    }
  }, [open]);

  if (!open) return null;

  const actions: CommandItem[] = [
    { id: "home", name: "الرئيسية", icon: Home, perform: () => navigate("/dashboard") },
    { id: "settings", name: "الإعدادات", icon: Settings, perform: () => navigate("/dashboard/settings") },
    { id: "bookings", name: "الحجوزات", icon: Calendar, perform: () => navigate("/dashboard/bookings") },
    { id: "customers", name: "العملاء", icon: Users, perform: () => navigate("/dashboard/customers") },
    { id: "catalog", name: "الخدمات والمنتجات", icon: Package, perform: () => navigate("/dashboard/catalog") },
  ];

  const filtered = query
    ? actions.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
    : actions;

  const handleSelect = (perform: () => void) => {
    perform();
    setOpen(false);
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200]" 
        onClick={() => setOpen(false)} 
      />
      
      <div 
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-[200] border border-gray-100 flex flex-col"
        dir="rtl"
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-100 gap-3">
          <Search className="w-5 h-5 text-brand-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 font-medium h-9"
            placeholder="اكتب أمراً للبحث..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter" && filtered.length > 0) handleSelect(filtered[0].perform);
            }}
          />
          <kbd className="hidden sm:inline-block text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded font-sans font-semibold shrink-0">
            Esc
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              لا توجد نتائج لـ "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                اختصارات سريعة
              </div>
              {filtered.map((action, i) => (
                <button
                  key={action.id}
                  onClick={() => handleSelect(action.perform)}
                  className={clsx(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-right",
                    i === 0 && query ? "bg-brand-50 text-brand-700" : "hover:bg-gray-50 text-gray-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <action.icon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">{action.name}</span>
                  </div>
                  {action.shortcut ? (
                    <kbd className="text-[10px] bg-white border border-gray-200 text-gray-400 px-1.5 py-0.5 rounded shadow-sm font-sans font-mono">
                      {action.shortcut}
                    </kbd>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <span>استخدم</span>
            <kbd className="font-sans px-1 rounded bg-gray-200">↑</kbd>
            <kbd className="font-sans px-1 rounded bg-gray-200">↓</kbd>
            <span>للتنقل</span>
          </div>
          <span>نسق الذكي</span>
        </div>
      </div>
    </>
  );
}
