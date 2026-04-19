import { clsx } from "clsx";
import { StatusBadge } from "./StatusBadge";

interface BookingCardProps {
  name: string;
  service: string;
  time: string;
  status: string;
  avatar?: string;
  onClick?: () => void;
}

export function BookingCard({ name, service, time, status, avatar, onClick }: BookingCardProps) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("");

  return (
    <div
      onClick={onClick}
      className={clsx(
        "flex items-center gap-3 px-3.5 py-3 bg-white rounded-xl border border-[#eef2f6] shadow-sm transition-all",
        onClick && "cursor-pointer hover:border-brand-300 hover:shadow-md",
      )}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-100 to-brand-200">
        {avatar
          ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
          : <span className="text-[15px] font-bold text-brand-600">{initials}</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{service}</p>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs text-gray-400 tabular-nums">{time}</span>
        <StatusBadge status={status} size="sm" />
      </div>
    </div>
  );
}
