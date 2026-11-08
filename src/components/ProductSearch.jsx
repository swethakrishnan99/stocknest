import { useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import ProductTile from "./ProductTile";
import StatusChip from "./StatusChip";
import { matchesProduct } from "../lib/inventory";
import { useInventory } from "../state/inventoryContext";

const MAX_RESULTS = 6;

// Shows the part of the text that matched in bold
function Highlight({ text, query }) {
  const q = query.trim();
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent text-ink font-bold">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Search box with a live list of matching products (by name, SKU or barcode).
 * Arrow keys move through the list, Enter opens the highlighted product (or all results), Esc closes it.
 */
export default function ProductSearch({ onOpenProduct, onSeeAll, placeholder = "Search products or SKU", className = "" }) {
  const { products } = useInventory();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // highlighted row, -1 = none
  const listId = useId();
  const blurTimer = useRef(null);

  const q = query.trim();
  const matches = q ? products.filter((p) => matchesProduct(p, q)) : [];
  const shown = matches.slice(0, MAX_RESULTS);
  const showList = open && q.length > 0;
  // The last row is "See all results", so it can be reached with the keyboard too
  const rowCount = shown.length + (matches.length ? 1 : 0);

  function choose(index) {
    setOpen(false);
    setActive(-1);
    if (index >= 0 && index < shown.length) onOpenProduct(shown[index].id);
    else if (q) onSeeAll(q);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown" && q) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (rowCount ? (i + 1) % rowCount : -1));
    } else if (e.key === "ArrowUp" && q) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (rowCount ? (i <= 0 ? rowCount - 1 : i - 1) : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(showList ? active : -1);
    } else if (e.key === "Escape") {
      if (showList) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      } else {
        setQuery("");
      }
    }
  }

  const optionId = (i) => `${listId}-opt-${i}`;

  return (
    <div role="search" className={`relative ${className}`}>
      <label className="flex items-center gap-2 h-11 px-3.5 bg-white border border-input rounded-[10px] focus-within:border-ink">
        <Search className="w-[18px] h-[18px] text-muted" aria-hidden="true" />
        <span className="sr-only">Search products</span>
        <input
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            clearTimeout(blurTimer.current);
            setOpen(true);
          }}
          onBlur={() => {
            // Wait a moment so a click on a result still lands before the list closes
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-muted"
        />
      </label>

      <p className="sr-only" aria-live="polite">
        {showList ? (matches.length === 0 ? "No matching products" : `${matches.length} matching ${matches.length === 1 ? "product" : "products"}`) : ""}
      </p>

      {showList && (
        <div className="absolute z-40 left-0 right-0 sm:right-auto sm:w-[420px] mt-2 bg-white border border-line rounded-[14px] shadow-xl overflow-hidden">
          <ul id={listId} role="listbox" aria-label="Matching products" className="max-h-[360px] overflow-y-auto py-1">
            {shown.map((p, i) => (
              <li
                key={p.id}
                id={optionId(i)}
                role="option"
                aria-selected={active === i}
                onMouseDown={(e) => e.preventDefault()} // keep focus in the input
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer ${active === i ? "bg-line-soft" : ""}`}
              >
                <ProductTile initial={p.initial} tint={p.tint} className="w-9 h-9 rounded-[9px] text-sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold truncate">
                    <Highlight text={p.name} query={q} />
                  </div>
                  <div className="text-[13px] text-muted truncate">
                    <span className="font-mono">
                      <Highlight text={p.id} query={q} />
                    </span>{" "}
                    · {p.qty} {p.unit} · {p.loc}
                  </div>
                </div>
                <StatusChip status={p.status} label={p.status === "out" ? "Out" : undefined} className="text-xs" />
              </li>
            ))}
            {matches.length > 0 && (
              <li
                id={optionId(shown.length)}
                role="option"
                aria-selected={active === shown.length}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(shown.length)}
                onClick={() => choose(shown.length)}
                className={`px-3.5 py-3 border-t border-line-soft text-sm font-semibold text-accent cursor-pointer ${
                  active === shown.length ? "bg-line-soft" : ""
                }`}
              >
                See all {matches.length} {matches.length === 1 ? "result" : "results"} in Products
              </li>
            )}
          </ul>
          {matches.length === 0 && (
            <p className="px-4 py-4 text-sm text-muted">
              No products match “{q}”. Try a name, a SKU like ING-0012, or a barcode.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
