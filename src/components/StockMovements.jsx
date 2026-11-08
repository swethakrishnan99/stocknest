import { useState } from "react";
import { Search, ScanBarcode, Download } from "lucide-react";
import Button from "./Button";
import PageHeader from "./PageHeader";
import { MOVEMENT_TYPES, ALL_LOCATIONS } from "../lib/sampleData";
import { downloadCsv } from "../lib/csv";
import { useInventory } from "../state/inventoryContext";

const TONE = { in: "text-success", out: "text-danger", count: "text-navy-700" };
const SIGN = { in: "+", out: "−", count: "=" };
const KIND_LABEL = { in: "Stock in", out: "Stock out", count: "Adjustment" };

function Stat({ label, value, tone }) {
  return (
    <div className="bg-white border border-line rounded-[14px] p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className={`font-display text-[32px] font-bold mt-1.5 leading-tight ${tone}`}>{value}</div>
    </div>
  );
}

export default function StockMovements({ onNavigate }) {
  const { movements, locationNames } = useInventory();
  const [type, setType] = useState("all");
  const [loc, setLoc] = useState(ALL_LOCATIONS);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = movements.filter(
    (m) =>
      (type === "all" || m.kind === type) &&
      (loc === ALL_LOCATIONS || m.loc === loc) &&
      (!q || m.product.toLowerCase().includes(q) || m.reason.toLowerCase().includes(q) || m.note.toLowerCase().includes(q))
  );
  const days = [...new Set(rows.map((m) => m.day))];
  const count = (kind) => movements.filter((m) => m.kind === kind).length;

  function exportCsv() {
    downloadCsv(
      "stocknest-movements.csv",
      ["Date", "Time", "Type", "Quantity", "Unit", "Product", "Reason", "Note", "Location", "By"],
      rows.map((m) => [m.day, m.time, KIND_LABEL[m.kind], m.kind === "out" ? -m.qty : m.qty, m.unit, m.product, m.reason, m.note, m.loc, m.who])
    );
  }

  return (
    <main className="flex-1 min-w-0 flex flex-col gap-5 px-5 pt-6 pb-28 md:px-10 md:pt-8 md:pb-12">
      <PageHeader title="Stock movements" subtitle="Every stock in, stock out and count, newest first">
        <Button onClick={exportCsv}>
          <Download className="w-[18px] h-[18px]" />
          Export
        </Button>
        <Button variant="primary" className="px-[18px]" onClick={() => onNavigate("scan")}>
          <ScanBarcode className="w-[18px] h-[18px]" />
          Record movement
        </Button>
      </PageHeader>

      <section aria-label="Summary" className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <Stat label="Stock in" value={count("in")} tone="text-success" />
        <Stat label="Stock out" value={count("out")} tone="text-danger" />
        <Stat label="Adjustments" value={count("count")} tone="text-navy-700" />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 h-11 px-3.5 bg-white border border-input rounded-[10px] flex-[1_1_280px] focus-within:border-ink">
          <Search className="w-[18px] h-[18px] text-muted" aria-hidden="true" />
          <span className="sr-only">Search movements</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product, reason or note"
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-muted"
          />
        </label>
        <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
          {MOVEMENT_TYPES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setType(key)}
              aria-pressed={type === key}
              className={`h-11 px-4 rounded-full border text-sm font-semibold cursor-pointer transition-colors ${
                type === key ? "bg-navy border-navy text-white" : "bg-white border-input text-ink hover:bg-line-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Location
          <select
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            className="h-11 px-3 rounded-[10px] border border-input bg-white text-sm text-ink"
          >
            {[ALL_LOCATIONS, ...locationNames].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-white border border-line rounded-[14px] overflow-hidden">
        {days.map((day) => (
          <section key={day} aria-label={day} className="border-t border-line-soft first:border-t-0">
            <h2 className="bg-table-head px-5 py-2.5 text-[13px] font-semibold text-muted">
              {day}
            </h2>
            {rows
              .filter((m) => m.day === day)
              .map((m) => (
                <div
                  key={m.id}
                  className="grid grid-cols-[64px_minmax(0,1fr)_auto] md:grid-cols-[72px_minmax(0,1.4fr)_minmax(0,1fr)_130px_70px_80px] gap-3 items-center px-5 py-3 border-t border-line-soft text-sm"
                >
                  <div className={`font-display text-[17px] font-bold ${TONE[m.kind]}`}>
                    {SIGN[m.kind]}
                    {m.qty}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[15px]">{m.product}</div>
                    <div className="text-[13px] text-muted">
                      {m.reason}
                      <span className="md:hidden"> · {m.loc}</span>
                    </div>
                  </div>
                  <div className="hidden md:block text-muted min-w-0">{m.note}</div>
                  <div className="hidden md:block">{m.loc}</div>
                  <div className="hidden md:block text-muted">{m.who}</div>
                  <div className="text-muted text-right text-[13px]">{m.time}</div>
                </div>
              ))}
          </section>
        ))}
        {rows.length === 0 && <p className="py-10 px-5 text-center text-muted">No movements match these filters.</p>}
      </div>
    </main>
  );
}
