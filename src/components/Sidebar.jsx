import { LayoutGrid, Package, ArrowLeftRight, MapPin, BarChart3, Settings } from "lucide-react";
import NestMark, { Wordmark } from "./NestMark";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "products", label: "Products", icon: Package, also: ["product"] },
  { key: "movements", label: "Stock movements", icon: ArrowLeftRight },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ active, onNavigate, businessName }) {
  return (
    <aside className="hidden md:flex w-[220px] shrink-0 bg-navy text-white flex-col gap-1 px-4 py-6 sticky top-0 h-screen self-start">
      <div className="flex items-center gap-2.5 px-2 pb-6">
        <NestMark className="w-11 h-11" />
        <Wordmark />
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ key, label, icon: Icon, also = [] }) => {
          const isActive = [key, ...also].includes(active);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 min-h-11 px-3 rounded-[10px] text-[15px] text-left cursor-pointer transition-colors ${
                isActive ? "bg-navy-700 text-white font-semibold" : "text-navy-text hover:bg-navy-700/60 hover:text-white"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 px-3 border-t border-navy-line text-[13px] text-navy-text leading-normal">
        <div className="text-white font-semibold">{businessName}</div>
        <div>Free plan · 248 of 500 items</div>
      </div>
    </aside>
  );
}
