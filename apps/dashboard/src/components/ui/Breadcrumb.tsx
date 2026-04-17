import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronLeft className="w-3 h-3 text-gray-300" />}
          {item.href && i < items.length - 1 ? (
            <Link to={item.href} className="hover:text-brand-500 transition-colors">{item.label}</Link>
          ) : (
            <span className={i === items.length - 1 ? "text-gray-700 font-medium" : ""}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
