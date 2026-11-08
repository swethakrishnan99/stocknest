import { useState } from "react";
import { Search, ScanBarcode, Plus } from "lucide-react";
import Button from "./Button";
import StatusChip from "./StatusChip";
import PhoneHome from "./PhoneHome";
import { SUMMARY, NEEDS_REORDER, RECENT_ACTIVITY, VALUE_BY_CATEGORY } from "../lib/sampleData";
import { signedQty, qtyTone } from "../lib/format";

function StatCard({ label, value, note, tone, onClick }) {
  const tones = {
    warning: "bg-warning-100 border-warning-border text-warning",
    danger: "bg-danger-100 border-danger-border text-danger",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`text-left rounded-[14px] border p-5 ${
        tone ? `${tones[tone]} cursor-pointer hover:brightness-[0.98]` : "bg-white border-line"
      }`}
    >
      <div className={`text-sm ${tone ? "font-semibold" : "text-muted"}`}>{label}</div>
      <div className="font-display text-[32px] font-bold mt-1.5 leading-tight">{value}</div>
      <div className={`text-[13px] mt-1 ${tone ? "" : "text-muted"}`}>{note}</div>
    </Tag>
  );
}

function Panel({ id, title, action, children, className = "" }) {
  return (
    <section aria-labelledby={id} className={`bg-white border border-line rounded-[14px] p-5 pb-2 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h2 id={id} className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TextLink({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-semibold text-accent hover:text-accent-800 cursor-pointer">
      {children}
    </button>
  );
}

export default function Dashboard({ businessName, onNavigate, onSearch }) {
  const [query, setQuery] = useState("");

  return (
    <>
      <PhoneHome businessName={businessName} onNavigate={onNavigate} />

      <main className="hidden md:flex flex-1 min-w-0 flex-col gap-6 px-10 pt-8 pb-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-[32px] font-bold leading-tight">Dashboard</h1>
            <p className="mt-1 text-muted text-[15px]">Sample data · Friday, Nov 6</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                onSearch(query);
              }}
            >
              <label className="flex items-center gap-2 h-11 px-3.5 bg-white border border-input rounded-[10px] min-w-[260px] focus-within:border-ink">
                <Search className="w-[18px] h-[18px] text-muted" aria-hidden="true" />
                <span className="sr-only">Search products</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products or SKU"
                  className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted"
                />
              </label>
            </form>
            <Button variant="outline" onClick={() => onNavigate("scan")}>
              <ScanBarcode className="w-[18px] h-[18px]" />
              Scan
            </Button>
            <Button variant="primary" className="px-[18px]">
              <Plus className="w-[18px] h-[18px]" strokeWidth={2.4} />
              Add product
            </Button>
          </div>
        </header>

        <section aria-label="Summary" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <StatCard label="Products" value={SUMMARY.products} note={`across ${SUMMARY.categories} categories`} />
          <StatCard label="Stock value" value={SUMMARY.stockValue} note="at cost, CAD" />
          <StatCard label="Low stock" value={SUMMARY.low} note="below reorder point →" tone="warning" onClick={() => onNavigate("products")} />
          <StatCard label="Out of stock" value={SUMMARY.out} note="needs reorder now →" tone="danger" onClick={() => onNavigate("products")} />
        </section>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-4">
          <Panel id="low-h" title="Needs reordering" action={<TextLink onClick={() => onNavigate("products")}>View all</TextLink>}>
            {NEEDS_REORDER.map((item) => (
              <div key={item.name} className="flex items-center gap-3 py-3 border-t border-line-soft">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px]">{item.name}</div>
                  <div className="text-[13px] text-muted">
                    {item.left} left · reorder at {item.reorder} · {item.loc}
                  </div>
                </div>
                <StatusChip status={item.status} label={item.status === "out" ? "Out" : "Low"} />
                <Button className="px-3.5 text-sm">Reorder</Button>
              </div>
            ))}
          </Panel>

          <Panel id="act-h" title="Recent activity" action={<TextLink onClick={() => onNavigate("movements")}>View history</TextLink>}>
            {RECENT_ACTIVITY.map((a) => (
              <div key={a.name + a.when} className="flex items-center gap-3 py-3 border-t border-line-soft">
                <div className={`w-16 font-display font-bold text-[17px] ${qtyTone(a.qty)}`}>{signedQty(a.qty)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px]">{a.name}</div>
                  <div className="text-[13px] text-muted">{a.detail}</div>
                </div>
                <div className="text-[13px] text-muted">{a.when}</div>
              </div>
            ))}
          </Panel>
        </div>

        <section aria-labelledby="val-h" className="bg-white border border-line rounded-[14px] p-5">
          <h2 id="val-h" className="text-lg font-bold mb-4">Stock value by category</h2>
          <div className="flex flex-col gap-3.5">
            {VALUE_BY_CATEGORY.map((c) => (
              <div key={c.name} className="grid grid-cols-[140px_minmax(0,1fr)_80px] gap-4 items-center">
                <div className="text-sm font-medium">{c.name}</div>
                <div className="h-3 bg-line-soft rounded-md overflow-hidden" role="img" aria-label={`${c.pct}% of the largest category`}>
                  <div className="h-3 bg-navy-700 rounded-md" style={{ width: `${c.pct}%` }} />
                </div>
                <div className="text-sm font-semibold text-right">{c.value}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
