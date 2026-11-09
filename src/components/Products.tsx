import { useState } from "react";
import { Search, Plus, Check, Upload, Download } from "lucide-react";
import Button from "./Button";
import StatusChip from "./StatusChip";
import ProductTile from "./ProductTile";
import { ALL_CATEGORIES, ALL_LOCATIONS, STATUS_FILTERS, matchesStatus } from "../lib/sampleData";
import { matchesProduct } from "../lib/inventory";
import ImportProducts from "./ImportProducts";
import Modal from "./Modal";
import { exportTable, EXPORT_FORMATS , type ExportFormat } from "../lib/exporters";
import { productHeader, productToRow } from "../lib/productCsv";
import { EMPTY_FILTER, fieldsMatch, matchesFieldFilter } from "../lib/customFields";
import { useInventory } from "../state/inventoryContext";
import { shortDate } from "../lib/dates";
import type { Navigate } from "../types";

const PAGE_SIZE = 10;

interface ProductsProps {
  newProductId: string | null; // highlighted after adding
  onAddProduct: () => void;
  onNavigate: Navigate;
  onReceive: (productId: string) => void;
  initialQuery?: string;
  initialLocation?: string;
  initialStatus?: string;
}

export default function Products({ newProductId, onAddProduct, onNavigate, onReceive, initialQuery = "", initialLocation = ALL_LOCATIONS, initialStatus = "all" }: ProductsProps) {
  const { products, locations, locationNames, orders, business, can } = useInventory();
  const categoryChips = [ALL_CATEGORIES, ...business.categories.filter((c) => products.some((p) => p.cat === c))];
  const total = products.length;
  const [query, setQuery] = useState(initialQuery);
  const [cat, setCat] = useState(ALL_CATEGORIES);
  const [loc, setLoc] = useState(initialLocation);
  const [status, setStatus] = useState(initialStatus);
  const customFields = business.customFields;
  const [fieldId, setFieldId] = useState(""); // custom field to filter by, "" for none
  const [fieldFilter, setFieldFilter] = useState(""); // see matchesFieldFilter
  const filterField = customFields.find((f) => f.id === fieldId);
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<string | null>(null); // summary shown after an import

  // Any filter change goes back to page 1
  const filterSetter = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };

  const rows = products.filter(
    (p) =>
      (cat === ALL_CATEGORIES || p.cat === cat) &&
      (loc === ALL_LOCATIONS || p.loc === loc) &&
      matchesStatus(p.status, status, !!orders[p.id]) &&
      (matchesProduct(p, query) || fieldsMatch(p, customFields, query)) &&
      (!filterField || matchesFieldFilter(p, filterField, fieldFilter))
  );
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageRows = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const filtered = rows.length !== total;

  const [confirmExport, setConfirmExport] = useState(false);

  // The filters that are on, in words, for the export pop-up
  const activeFilters = [
    status !== "all" && ["Status", STATUS_FILTERS.find(([k]) => k === status)?.[1] ?? status],
    cat !== ALL_CATEGORIES && ["Category", cat],
    loc !== ALL_LOCATIONS && ["Location", loc],
    query.trim() && ["Search", `“${query.trim()}”`],
    filterField && [
      filterField.name,
      fieldFilter === EMPTY_FILTER ? "no value" : fieldFilter.trim() ? (filterField.type === "choice" ? fieldFilter : `contains “${fieldFilter.trim()}”`) : "any value",
    ],
  ].filter((f): f is [string, string] => Array.isArray(f));

  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [scope, setScope] = useState("filtered"); // "filtered" | "all", only asked when a filter is on
  const [exporting, setExporting] = useState(false);

  async function runExport() {
    const all = !filtered || scope === "all";
    const list = all ? products : rows;
    const filterText = activeFilters.map(([label, value]) => `${label}: ${value}`).join(" · ");
    setExporting(true);
    try {
      await exportTable(format, all ? "stocknest-products" : "stocknest-products-filtered", {
        title: "Products",
        subtitle: `${business.name} · ${list.length} ${list.length === 1 ? "product" : "products"}${all ? "" : ` · ${filterText}`} · exported ${new Date().toLocaleDateString("en-CA", { dateStyle: "medium" })}`,
        header: productHeader(customFields),
        rows: list.map((p) => productToRow(p, customFields)),
        numeric: [4, 6, 7],
        widths: [12, 30, 14, 16, 10, 10, 11, 10, 22, 18, ...customFields.map(() => 16)],
      });
      setConfirmExport(false);
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="flex-1 min-w-0 flex flex-col gap-5 px-5 pt-6 pb-28 md:px-10 md:pt-8 md:pb-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] font-bold leading-tight">Products</h1>
          <p className="mt-1 text-muted text-[15px]">{total} products · {locations.length} locations</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {can("editProducts") && (
            <Button onClick={() => setImporting(true)}>
              <Upload className="w-[18px] h-[18px]" />
              Import
            </Button>
          )}
          <Button onClick={() => { setScope("filtered"); setConfirmExport(true); }} disabled={products.length === 0}>
            <Download className="w-[18px] h-[18px]" />
            Export
          </Button>
          {can("editProducts") && (
            <Button variant="primary" className="px-[18px]" onClick={onAddProduct}>
              <Plus className="w-[18px] h-[18px]" strokeWidth={2.4} />
              Add product
            </Button>
          )}
        </div>
      </header>

      {imported && (
        <p role="status" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success-100 text-success text-sm font-semibold">
          <Check className="w-4 h-4" strokeWidth={2.4} />
          {imported}
        </p>
      )}

      {newProductId && (
        <p role="status" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success-100 text-success text-sm font-semibold">
          <Check className="w-4 h-4" strokeWidth={2.4} />
          Added {products.find((p) => p.id === newProductId)?.name} ({newProductId})
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 h-11 px-3.5 bg-white border border-input rounded-[10px] flex-[1_1_280px] focus-within:border-ink">
          <Search className="w-[18px] h-[18px] text-muted" aria-hidden="true" />
          <span className="sr-only">Search products</span>
          <input
            type="search"
            value={query}
            onChange={(e) => filterSetter(setQuery)(e.target.value)}
            placeholder={customFields.length ? "Search name, SKU, barcode or fields" : "Search by name, SKU or barcode"}
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-muted"
          />
        </label>
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {categoryChips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => filterSetter(setCat)(c)}
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
            onChange={(e) => filterSetter(setLoc)(e.target.value)}
            className="h-11 px-3 rounded-[10px] border border-input bg-white text-sm text-ink"
          >
            {[ALL_LOCATIONS, ...locationNames].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          Status
          <select
            value={status}
            onChange={(e) => filterSetter(setStatus)(e.target.value)}
            className="h-11 px-3 rounded-[10px] border border-input bg-white text-sm text-ink"
          >
            {STATUS_FILTERS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {customFields.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <label className="flex items-center gap-2">
              Field
              <select
                value={fieldId}
                onChange={(e) => {
                  setFieldId(e.target.value);
                  filterSetter(setFieldFilter)("");
                }}
                className="h-11 px-3 rounded-[10px] border border-input bg-white text-sm text-ink"
              >
                <option value="">Any</option>
                {customFields.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </label>
            {filterField && (filterField.type === "choice" ? (
              <label className="flex items-center gap-2">
                <span className="sr-only">{filterField.name} is</span>
                <select
                  value={fieldFilter}
                  onChange={(e) => filterSetter(setFieldFilter)(e.target.value)}
                  className="h-11 px-3 rounded-[10px] border border-input bg-white text-sm text-ink"
                >
                  <option value="">Any value</option>
                  {(filterField.options ?? []).map((o) => <option key={o}>{o}</option>)}
                  <option value={EMPTY_FILTER}>No value</option>
                </select>
              </label>
            ) : (
              <label className="flex items-center gap-2">
                <span className="sr-only">{filterField.name} contains</span>
                <input
                  type="search"
                  value={fieldFilter === EMPTY_FILTER ? "" : fieldFilter}
                  onChange={(e) => filterSetter(setFieldFilter)(e.target.value)}
                  placeholder={`${filterField.name} contains…`}
                  className="h-11 w-44 px-3 rounded-[10px] border border-input bg-white text-sm text-ink placeholder:text-muted"
                />
              </label>
            ))}
          </div>
        )}
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
              {pageRows.map((r) => (
                <tr key={r.id} className={`border-t border-line-soft ${r.id === newProductId ? "bg-success-100" : ""}`}>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <ProductTile initial={r.initial} tint={r.tint} photo={r.photo} />
                      <button
                        type="button"
                        onClick={() => onNavigate("product", { id: r.id })}
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
                    {orders[r.id] && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted whitespace-nowrap">
                        <span>
                          On order · PO #{orders[r.id].po} · {orders[r.id].qty} {orders[r.id].unit} due {shortDate(orders[r.id].due)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onReceive(r.id)}
                          aria-label={`Receive PO #${orders[r.id].po} for ${r.name}`}
                          className="font-semibold text-navy-700 hover:underline cursor-pointer"
                        >
                          Receive
                        </button>
                      </div>
                    )}
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
          <span aria-live="polite">
            {rows.length
              ? `Showing ${(current - 1) * PAGE_SIZE + 1}–${(current - 1) * PAGE_SIZE + pageRows.length} of ${rows.length}`
              : "Showing 0"}
            {filtered && ` (${total} products in total)`}
          </span>
          <nav aria-label="Pages" className="flex items-center gap-2">
            <Button className="px-3.5 text-sm font-normal" disabled={current === 1} onClick={() => setPage(current - 1)}>
              Previous
            </Button>
            <span className="px-1 text-ink">
              Page {current} of {pages}
            </span>
            <Button className="px-3.5 text-sm font-normal" disabled={current === pages} onClick={() => setPage(current + 1)}>
              Next
            </Button>
          </nav>
        </div>
      </div>
      {importing && (
        <ImportProducts
          onClose={() => setImporting(false)}
          onDone={(message: string) => {
            setImporting(false);
            setImported(message);
            setPage(1);
          }}
        />
      )}
      {confirmExport && (
        <Modal title="Export products" subtitle="Choose a file type" onClose={() => setConfirmExport(false)} maxWidth="sm:max-w-md">
          <div className="overflow-y-auto px-5 py-5 flex flex-col gap-5 text-[15px]">
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-semibold mb-2">Format</legend>
              {EXPORT_FORMATS.map((f) => (
                <label key={f.key} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${format === f.key ? "border-ink bg-table-head" : "border-input"}`}>
                  <input type="radio" name="format" value={f.key} checked={format === f.key} onChange={() => setFormat(f.key)} className="mt-1 accent-[#0F1E3D]" />
                  <span>
                    <span className="block font-semibold">
                      {f.label} <span className="font-normal text-muted">({f.ext})</span>
                    </span>
                    <span className="block text-[13px] text-muted">{f.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {filtered && (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-semibold mb-2">Which products?</legend>
                <ul className="flex flex-wrap gap-2 mb-1">
                  {activeFilters.map(([label, value]) => (
                    <li key={label} className="px-3 py-1.5 rounded-full bg-line-soft text-sm">
                      <span className="text-muted">{label}:</span> <span className="font-semibold">{value}</span>
                    </li>
                  ))}
                </ul>
                {[
                  ["filtered", `Only the ${rows.length} that match these filters`],
                  ["all", `All ${total} products`],
                ].map(([key, label]) => (
                  <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${scope === key ? "border-ink bg-table-head" : "border-input"}`}>
                    <input type="radio" name="scope" value={key} checked={scope === key} onChange={() => setScope(key)} className="accent-[#0F1E3D]" />
                    <span className="font-semibold">{label}</span>
                  </label>
                ))}
              </fieldset>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-line-soft pb-[max(16px,env(safe-area-inset-bottom))]">
            <Button onClick={() => setConfirmExport(false)}>Cancel</Button>
            <Button
              variant="primary"
              className="px-[18px]"
              disabled={exporting || (filtered && scope === "filtered" && rows.length === 0)}
              onClick={runExport}
            >
              {exporting ? "Preparing…" : `Export ${(!filtered || scope === "all" ? total : rows.length)} as ${EXPORT_FORMATS.find((f) => f.key === format)?.label}`}
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}
