import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { COLORS, TYPOGRAPHY, SHADOWS, RADIUS } from "@/lib/design-tokens";

interface ModernSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: string;
}

const FONT = TYPOGRAPHY.family;

export function ModernSelect({ options, value, onChange, placeholder = "اختر...", label, disabled, error }: ModernSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ fontFamily: FONT, direction: "rtl", position: "relative" }}>
      {label && (
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderRadius: RADIUS.xl,
          border: `1px solid ${error ? COLORS.danger : open ? COLORS.primary : COLORS.border}`,
          boxShadow: open ? SHADOWS.focus : "none",
          background: disabled ? "#f8fafc" : COLORS.surface,
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: FONT, fontSize: 14, color: selected ? COLORS.dark : COLORS.muted,
          transition: "border-color 0.15s, box-shadow 0.15s",
          textAlign: "right",
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={16}
          color={COLORS.muted}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
        />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, left: 0, zIndex: 50,
          background: COLORS.surface, borderRadius: RADIUS.xl,
          border: `1px solid ${COLORS.border}`,
          boxShadow: SHADOWS.dropdown,
          overflow: "hidden",
          animation: "dropdownIn 0.12s ease",
        }}>
          {options.map(opt => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 14px", background: active ? `${COLORS.primary}0a` : "transparent",
                  border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13,
                  color: active ? COLORS.primary : COLORS.dark, textAlign: "right",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span>{opt.label}</span>
                {active && <Check size={14} color={COLORS.primary} />}
              </button>
            );
          })}
        </div>
      )}

      {error && <p style={{ fontSize: 12, color: COLORS.danger, marginTop: 4, fontFamily: FONT }}>{error}</p>}
    </div>
  );
}
