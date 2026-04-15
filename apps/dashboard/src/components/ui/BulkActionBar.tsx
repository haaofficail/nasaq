import { ReactNode } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: ReactNode;
}

export function BulkActionBar({ selectedCount, onClear, actions }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gray-900 shadow-2xl rounded-2xl p-2 pl-4 pr-3 flex items-center gap-6 text-white border border-gray-800/50 backdrop-blur-md">
        
        {/* Count and clear */}
        <div className="flex items-center gap-3 border-l border-gray-700/50 pl-4">
          <button 
            onClick={onClear}
            className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="إلغاء التحديد"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex flex-col items-start leading-none">
            <span className="text-sm font-bold">{selectedCount}</span>
            <span className="text-[10px] text-gray-400 font-medium">تم تحديده</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
        
      </div>
    </div>
  );
}
