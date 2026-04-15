import { useState, useRef, useEffect } from "react";
import { Edit2, Check, X, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface EditableCellProps {
  value: string | number;
  type?: "text" | "number";
  onSave: (val: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
}

export function EditableCell({ value, type = "text", onSave, placeholder, className }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(String(value));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentValue(String(value));
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      // Select all text when entering edit mode
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (currentValue === String(value)) {
      setIsEditing(false);
      return;
    }
    
    try {
      setIsSaving(true);
      await onSave(currentValue);
      setIsEditing(false);
    } catch (error) {
      // Revert on failure
      setCurrentValue(String(value));
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setCurrentValue(String(value));
    }
  };

  if (isEditing) {
    return (
      <div className={clsx("flex items-center gap-1.5", className)}>
        <input
          ref={inputRef}
          type={type}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          placeholder={placeholder}
          className="w-full min-w-[80px] bg-white border border-brand-400 ring-[3px] ring-brand-400/10 rounded-lg px-2 py-1 text-[13px] text-gray-900 outline-none transition-all disabled:opacity-50"
        />
        {isSaving && <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin shrink-0" />}
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={clsx(
        "group flex items-center justify-between gap-3 px-2 py-1 -mx-2 rounded-lg hover:bg-gray-100/80 cursor-pointer transition-colors",
        className
      )}
    >
      <span className={clsx("truncate", !value && "text-gray-400 italic")}>
        {value || placeholder || "—"}
      </span>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
      </div>
    </div>
  );
}
