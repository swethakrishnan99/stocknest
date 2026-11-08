import { Home, Package, ScanLine, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Navigate, Screen } from "../types";

// Phone tab bar (the installable web app). Movements, Locations and Settings are linked from Home.
const TABS: { key: Screen; label: string; icon: LucideIcon; also?: Screen[] }[] = [
  { key: "dashboard", label: "Home", icon: Home, also: ["movements", "locations", "settings"] },
  { key: "products", label: "Products", icon: Package, also: ["product"] },
  { key: "scan", label: "Scan", icon: ScanLine },
  { key: "reports", label: "Reports", icon: BarChart3 },
];

export default function BottomNav({ active, onNavigate }: { active: Screen; onNavigate: Navigate }) {
  return (
    <nav
      aria-label="App"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-line grid grid-cols-4 px-2 pt-1.5 pb-[max(22px,env(safe-area-inset-bottom))]"
    >
      {TABS.map(({ key, label, icon: Icon, also = [] }) => {
        const isActive = [key, ...also].includes(active);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 min-h-13 text-xs cursor-pointer ${
              isActive ? "text-accent font-bold" : "text-muted font-semibold"
            }`}
          >
            <Icon className="w-[22px] h-[22px]" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
