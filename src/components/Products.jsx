import { useState } from "react";
import { Search, Plus } from "lucide-react";
import Button from "./Button";
import StatusChip from "./StatusChip";
import ProductTile from "./ProductTile";
import { PRODUCTS, CATEGORIES, LOCATIONS, LOCATION_SUMMARY, SUMMARY } from "../lib/sampleData";

export default function Products({ onNavigate, initialQuery = "", initialLocation = LOCATIONS[0] }) {
  const [query, setQuery] = useState(initialQuery);
  const [cat, setCat] = useState("All");
  const [loc, setLoc] = useState(initialLocation);

  const q = query.trim().toLowerCase();
  const rows = PRODUCTS.filter(
    (p) =>
      (cat === "All" || p.cat === cat) &&
      (loc === LOCATIONS[0] || p.loc === loc) &&
      (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
  );

  return (
    <main className="flex-1 min-w-0 flex flex-col gap-5 px-5 pt-6 pb-28 md:px-10 md:pt-8 md:pb-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] font-bold leading-tight">Products</h1>
          <p className="mt-1 text-muted text-[15px]">{SUMMARY.products} products · {LOCATION_SUMMARY.length} locations</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button>Import CSV</Button>
          <Button>Export</Button>
          <Button variant="primary" className="px-[18px]">
            <Plus className="w-[18px] h-[18px]" strokeWidth={2.4} />
            Add product
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 h-11 px-3.5 bg-white border border-input rounded-[10px] flex-[1_1_280px] focus-within:border-ink">
          <Search className="w-[18px] h-[18px] text-muted" aria-hidden="true" />
          <span className="sr-only">Search products</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, SKU or barcode"
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-muted"
          />
        </label>
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`h-11 px-4 rounded-full border text-sm font-semibold cursor-pointer transition-colors ${
                cat === c ? "bg-navy border-navy text-white" : "bg-white border-input text-ink hover:bg-line-soft"
              }`}
            >
              {c}
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
            {LOCATIONS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-white border border-line rounded-[14px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="bg-table-head text-left text-muted">
                <th scope="col" className="py-3.5 px-5 font-semibold">Product</th>
                <th scope="col" className="py-3.5 px-3 font-semibold">SKU</th>
                <th scope="col" className="py-3.5 px-3 font-semibold">Category</th>
                <th scope="col" className="py-3.5 px-3 font-semibold">Location</th>
                <th scope="col" className="py-3.5 px-3 font-semibold text-right">On hand</th>
                <th scope="col" className="py-3.5 px-3 font-semibold text-right">Reorder at</th>
                <th scope="col" className="py-3.5 px-3 font-semibold">Status</th>
                <th scope="col" className="py-3.5 px-5 font-semibold text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line-soft">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <ProductTile initial={r.initial} tint={r.tint} />
                      {/* Only the flour detail page is designed; every row opens it for now */}
                      <button
                        type="button"
                        onClick={() => onNavigate("product")}
                        className="font-semibold text-left text-ink hover:text-accent cursor-pointer"
                      >
                        {r.name}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-muted font-mono text-[13px]">{r.id}</td>
                  <td className="py-3 px-3">{r.cat}</td>
                  <td className="py-3 px-3">{r.loc}</td>
                  <td className="py-3 px-3 text-right font-semibold">
                    {r.qty} {r.unit}
                  </td>
                  <td className="py-3 px-3 text-right text-muted">{r.reorder}</td>
                  <td className="py-3 px-3">
                    <StatusChip status={r.status} />
                  </td>
                  <td className="py-3 px-5 text-right">{r.value}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr className="border-t border-line-soft">
                  <td colSpan={8} className="py-10 px-5 text-center text-muted">
                    No products match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-3 justify-between items-center py-3.5 px-5 border-t border-line-soft text-sm text-muted">
          <span>
            Showing {rows.length ? `1–${rows.length}` : "0"} of {SUMMARY.products}
          </span>
          <div className="flex gap-2">
            <Button className="px-3.5 text-sm font-normal">Previous</Button>
            <Button className="px-3.5 text-sm font-normal">Next</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
