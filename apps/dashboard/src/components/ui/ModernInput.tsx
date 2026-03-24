import { useState, ReactNode } from "react";
import { COLORS, TYPOGRAPHY, RADIUS } from "@/lib/design-tokens";

interface ModernInputProps {
  label?: string;
  placeholder?: string;
  icon?: ReactNode;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  dir?: string;
  min?: string | number;
  max?: string | number;
  suffix?: string;
}

const FONT = TYPOGRAPHY.family;

export function ModernInput({
  label, placeholder, icon, type = "text", value, onChange,
  name, required, disabled, error, hint, dir, min, max, suffix,
}: ModernInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ fontFamily: FONT, direction: "rtl" }}>
      {label && (
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
          {label}{required && <span style={{ color: COLORS.danger, marginRight: 2 }}>*</span>}
        </label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {icon && (
          <span style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            color: focused ? COLORS.primary : COLORS.muted,
            transition: "color 0.15s", display: "flex", pointerEvents: "none",
          }}>
            {icon}
          </span>
        )}
        <input
          name={name}
          type={type}
          value={value}
          dir={dir}
          min={min as any}
          max={max as any}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            padding: `10px 14px`,
            paddingRight: icon ? 40 : 14,
            paddingLeft: suffix ? 40 : 14,
            borderRadius: RADIUS.lg,
            border: `1px solid ${error ? COLORS.danger : focused ? COLORS.primary : COLORS.border}`,
            boxShadow: focused ? `0 0 0 3px ${error ? COLORS.danger : COLORS.primary}15` : "none",
            background: disabled ? "#f8fafc" : COLORS.surface,
            fontFamily: FONT, fontSize: 14, color: COLORS.dark,
            outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
            cursor: disabled ? "not-allowed" : "text",
          }}
        />
        {suffix && (
          <span style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            fontSize: 12, color: COLORS.muted, pointerEvents: "none",
          }}>
            {suffix}
          </span>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: COLORS.danger, marginTop: 4, fontFamily: FONT }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, fontFamily: FONT }}>{hint}</p>}
    </div>
  );
}
