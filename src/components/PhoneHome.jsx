import { Bell, ScanBarcode, ChevronRight, ArrowLeftRight, MapPin, Settings } from "lucide-react";
import StatusChip from "./StatusChip";
import { SUMMARY, NEEDS_REORDER, RECENT_ACTIVITY } from "../lib/sampleData";
import { signedQty, qtyTone } from "../lib/format";

// Screens without a tab of their own
const SHORTCUTS = [
  { key: "movements", label: "Movements", icon: ArrowLeftRight },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "settings", label: "Settings", icon: Settings },
];

// Home screen of the installable phone app (shown below the md breakpoint)
export default function PhoneHome({ businessName, orders, onNavigate }) {
  return (
    <main className="md:hidden flex-1 min-w-0 flex flex-col pb-24">
      <header className="bg-navy text-white px-5 pt-7 pb-6 flex flex-col gap-[18px]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] text-navy-text">{businessName}</div>
            <h1 className="font-display text-2xl font-bold">Today</h1>
          </div>
          <button
            type="button"
            aria-label="Notifications, 3 new"
            className="relative w-11 h-11 rounded-xl bg-navy-700 flex items-center justify-center cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-[9px] right-2.5 w-[9px] h-[9px] rounded-full bg-coral" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-navy-700 rounded-xl p-3">
            <div className="text-xs text-navy-text">Products</div>
            <div className="font-display text-[22px] font-bold">{SUMMARY.products}</div>
          </div>
          <div className="bg-navy-700 rounded-xl p-3 text-[#FFD9A8]">
            <div className="text-xs">Low</div>
            <div className="font-display text-[22px] font-bold">{SUMMARY.low}</div>
          </div>
          <div className="bg-navy-700 rounded-xl p-3 text-[#FFC2BC]">
            <div className="text-xs">Out</div>
            <div className="font-display text-[22px] font-bold">{SUMMARY.out}</div>
          </div>
        </div>
      </header>

      <div className="p-5 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => onNavigate("scan")}
          className="flex items-center gap-3.5 p-[18px] rounded-2xl bg-accent hover:bg-accent-800 text-white text-left cursor-pointer"
        >
          <span className="w-12 h-12 rounded-xl bg-[#A9322A] flex items-center justify-center">
            <ScanBarcode className="w-6 h-6" />
          </span>
          <span className="flex-1">
            <span className="block text-[17px] font-bold">Scan to count</span>
            <span className="block text-[13px] text-[#FFE3E0]">Stock in, stock out or recount</span>
          </span>
          <ChevronRight className="w-5 h-5" />
        </button>

        <nav aria-label="More" className="grid grid-cols-3 gap-2.5">
          {SHORTCUTS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              className="flex flex-col items-center justify-center gap-1.5 min-h-[72px] rounded-2xl bg-white border border-line text-[13px] font-semibold hover:bg-line-soft cursor-pointer"
            >
              <Icon className="w-5 h-5 text-navy-700" />
              {label}
            </button>
          ))}
        </nav>

        <section aria-labelledby="m-low" className="bg-white border border-line rounded-2xl px-4 pt-4 pb-1">
          <div className="flex justify-between items-center">
            <h2 id="m-low" className="text-base font-bold">Needs reordering</h2>
            <button
              type="button"
              onClick={() => onNavigate("products", { status: "reorder" })}
              className="min-h-11 text-sm font-semibold text-accent cursor-pointer"
            >
              See all
            </button>
          </div>
          {NEEDS_REORDER.slice(0, 4).map((i) => (
            <div key={i.name} className="flex items-center gap-3 py-3 border-t border-line-soft">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px]">{i.name}</div>
                <div className="text-[13px] text-muted">
                  {i.left} left · reorder at {i.reorder}
                </div>
              </div>
              {orders[i.name] ? (
                <StatusChip status="ordered" className="text-xs font-bold" />
              ) : (
                <StatusChip status={i.status} label={i.status === "out" ? "Out" : "Low"} className="text-xs font-bold" />
              )}
            </div>
          ))}
        </section>

        <section aria-labelledby="m-act" className="bg-white border border-line rounded-2xl px-4 pt-4 pb-1">
          <div className="flex justify-between items-center">
            <h2 id="m-act" className="text-base font-bold">Latest movements</h2>
            <button
              type="button"
              onClick={() => onNavigate("movements")}
              className="min-h-11 text-sm font-semibold text-accent cursor-pointer"
            >
              See all
            </button>
          </div>
          {RECENT_ACTIVITY.slice(0, 2).map((a) => (
            <div key={a.name} className="flex items-center gap-3 py-3 border-t border-line-soft">
              <span className={`w-11 font-display font-bold ${qtyTone(a.qty)}`}>{signedQty(a.qty)}</span>
              <span className="flex-1 text-[15px] font-semibold">{a.short}</span>
              <span className="text-[13px] text-muted">{a.when}</span>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
