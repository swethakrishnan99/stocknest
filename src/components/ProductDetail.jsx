import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import Button from "./Button";
import StatusChip from "./StatusChip";
import ProductTile from "./ProductTile";
import { ModeToggle, StepButton } from "./MovementControls";
import AddProduct from "./AddProduct";
import PrintLabel from "./PrintLabel";
import { downloadCsv } from "../lib/csv";
import { clockTime, daysBetween, monthDay, shortDate, todayISO } from "../lib/dates";
import { Truck } from "lucide-react";
import { REASONS, newOnHand, money } from "../lib/sampleData";
import { sampleBatches } from "../lib/sampleHistory";
import { historyFor, KIND_TONE, signedMovement } from "../lib/inventory";
import { useInventory } from "../state/inventoryContext";

const MODES = [
  ["in", "Stock in"],
  ["out", "Stock out"],
  ["count", "Set count"],
];

function KeyNumber({ label, value }) {
  return (
    <div className="bg-white border border-line rounded-[14px] p-[18px]">
      <div className="text-sm text-muted">{label}</div>
      <div className="font-display text-[28px] font-bold mt-1 leading-tight">{value}</div>
    </div>
  );
}

const HISTORY_PAGE = 20;

/** "Dec 2, 2026 · 26 days" when it is within a month, otherwise just the date */
function bestBefore(iso) {
  const left = daysBetween(todayISO(), iso);
  const date = monthDay(iso, "");
  return { label: left <= 30 ? `${date} · ${left} days` : date, soon: left <= 30 };
}

export default function ProductDetail({ productId, onNavigate, onReorder, onReceive, onDelete }) {
  const { products, movements, orders, recordMovement, updateProduct } = useInventory();
  const [mode, setMode] = useState("in");
  const [qty, setQty] = useState(10);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [dialog, setDialog] = useState(null); // "edit" | "label"
  const [notice, setNotice] = useState("");
  const [shown, setShown] = useState(HISTORY_PAGE);

  const p = products.find((x) => x.id === productId);
  if (!p) {
    return (
      <main className="flex-1 min-w-0 flex flex-col items-start gap-4 px-5 pt-6 pb-28 md:px-10 md:pt-8 md:pb-12">
        <h1 className="font-display text-[30px] font-bold">Product not found</h1>
        <p className="text-muted">There is no product with SKU {productId}. It may have been removed or the link is wrong.</p>
        <Button onClick={() => onNavigate("products")}>Back to products</Button>
      </main>
    );
  }

  const preview = newOnHand(p.qty, mode, qty);
  const order = orders[p.id];
  const batches = (sampleBatches(todayISO())[p.id] ?? []).map((b) => ({ ...b, ...bestBefore(b.bestBefore) }));
  const history = historyFor(movements, p.id);

  function exportHistory() {
    downloadCsv(
      `stocknest-${p.id}-history.csv`,
      ["Date", "Time", "Type", "Quantity", "Unit", "Reason", "Note", "Location", "By"],
      history.map((h) => [h.at.slice(0, 10), clockTime(h.at), { in: "Stock in", out: "Stock out", count: "Count" }[h.kind], h.kind === "out" ? -h.qty : h.qty, h.unit, h.reason, h.note, h.loc, h.who])
    );
  }

  function save() {
    recordMovement(p.id, { mode, qty, reason, note: note.trim() || "No note" });
    setQty(mode === "count" ? preview : 10);
    setNote("");
  }

  return (
    <main className="flex-1 min-w-0 flex flex-col gap-5 px-5 pt-4 pb-28 md:px-10 md:pt-8 md:pb-12">
      <button
        type="button"
        onClick={() => onNavigate("products")}
        className="self-start inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-accent hover:text-accent-800 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
        Back to products
      </button>

      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <ProductTile initial={p.initial} tint={p.tint} className="w-[72px] h-[72px] rounded-2xl text-[30px]" />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[30px] font-bold leading-tight">{p.name}</h1>
              {p.status === "out" && <StatusChip status="out" />}
              {p.status === "low" && <StatusChip status="low" label="Low stock" />}
            </div>
            <p className="mt-1 text-muted text-[15px]">
              SKU {p.id}{p.barcode ? ` · Barcode ${p.barcode}` : ""} · {p.cat} · {p.loc}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {!order && (
            <Button variant={p.status === "ok" ? "secondary" : "primary"} onClick={() => onReorder(p.id)}>
              Reorder
            </Button>
          )}
          <Button onClick={() => onNavigate("scan", { id: p.id })}>Scan to count</Button>
          <Button onClick={() => setDialog("edit")}>Edit product</Button>
          <Button variant="outline" onClick={() => setDialog("label")}>Print label</Button>
        </div>
      </header>

      {order && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-line-soft">
          <Truck className="w-5 h-5 text-navy-700 shrink-0" aria-hidden="true" />
          <p className="flex-1 min-w-[200px] text-sm">
            <strong>On order:</strong> PO #{order.po} · {order.qty} {order.unit} from {order.supplier} · due {shortDate(order.due)}
          </p>
          <Button variant="primary" className="px-4 text-sm" onClick={() => onReceive(p.id)}>
            Receive
          </Button>
        </div>
      )}

      {notice && (
        <p role="status" className="px-4 py-3 rounded-xl bg-success-100 text-success text-sm font-semibold">
          {notice}
        </p>
      )}

      <section aria-label="Key numbers" className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
        <KeyNumber label="On hand" value={`${p.qty} ${p.unit}`} />
        <KeyNumber label="Reorder at" value={`${p.reorder} ${p.unit}`} />
        <KeyNumber label="Unit cost" value={money(p.unitCost)} />
        <KeyNumber label="Stock value" value={p.value} />
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <section
          aria-labelledby="adj-h"
          className="flex-[1_1_340px] bg-white border border-line rounded-[14px] p-5 flex flex-col gap-4"
        >
          <h2 id="adj-h" className="text-lg font-bold">Update stock</h2>
          <ModeToggle modes={MODES} value={mode} onChange={setMode} />
          <div>
            <div className="text-sm font-semibold mb-2">Quantity</div>
            <div className="flex items-center gap-3">
              <StepButton dir="down" onClick={() => setQty((n) => Math.max(0, n - 1))} />
              <div className="min-w-16 text-center font-display text-[28px] font-bold" aria-live="polite">
                {qty}
              </div>
              <StepButton dir="up" onClick={() => setQty((n) => n + 1)} />
              <span className="text-sm text-muted">{p.unit}</span>
            </div>
          </div>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Reason
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-11 px-3 rounded-[10px] border border-input bg-white text-[15px] font-normal text-ink"
            >
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Note (optional)
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. PO #1045 from Prairie Mills"
              className="h-11 px-3 rounded-[10px] border border-input text-[15px] font-normal text-ink placeholder:text-muted outline-none focus:border-ink"
            />
          </label>
          <div className="text-sm text-muted">
            New on-hand:{" "}
            <strong className="text-ink">
              {preview} {p.unit}
            </strong>
          </div>
          <button
            type="button"
            onClick={save}
            className="h-12 rounded-[10px] bg-accent hover:bg-accent-800 text-white text-base font-semibold cursor-pointer"
          >
            Save movement
          </button>
        </section>

        <div className="flex-[2_1_480px] min-w-0 flex flex-col gap-4">
          {batches.length > 0 && (
            <section aria-labelledby="bat-h" className="bg-white border border-line rounded-[14px] p-5">
            <h2 id="bat-h" className="text-lg font-bold mb-3">Batches and locations</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th scope="col" className="py-2 font-semibold">Batch</th>
                    <th scope="col" className="py-2 px-2 font-semibold">Location</th>
                    <th scope="col" className="py-2 px-2 font-semibold">Best before</th>
                    <th scope="col" className="py-2 font-semibold text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.batch + b.loc} className="border-t border-line-soft">
                      <td className="py-3 font-semibold">{b.batch}</td>
                      <td className="py-3 px-2">{b.loc}</td>
                      <td className={`py-3 px-2 ${b.soon ? "font-semibold text-warning" : ""}`}>{b.label}</td>
                      <td className="py-3 text-right">{b.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          )}

          <section aria-labelledby="his-h" className="bg-white border border-line rounded-[14px] p-5">
            <div className="flex justify-between items-center mb-1">
              <h2 id="his-h" className="text-lg font-bold">Stock history</h2>
              <Button className="px-3.5 text-sm" onClick={exportHistory} disabled={history.length === 0}>
                Export
              </Button>
            </div>
            {history.length === 0 && <p className="py-6 border-t border-line-soft text-sm text-muted">No movements recorded yet.</p>}
            {history.slice(0, shown).map((h) => (
              <div
                key={h.id}
                className="grid grid-cols-[56px_minmax(0,1fr)_auto] sm:grid-cols-[64px_minmax(0,1fr)_90px_110px] gap-3 items-center py-3 border-t border-line-soft text-sm"
              >
                <div className={`font-display text-[17px] font-bold ${KIND_TONE[h.kind]}`}>{signedMovement(h)}</div>
                <div className="min-w-0">
                  <div className="font-semibold">{h.reason}</div>
                  <div className="text-muted text-[13px]">{h.note}</div>
                </div>
                <div className="hidden sm:block text-muted">{h.who}</div>
                <div className="text-muted text-right">{h.when}</div>
              </div>
            ))}
            {history.length > shown && (
              <button
                type="button"
                onClick={() => setShown((n) => n + HISTORY_PAGE)}
                className="w-full pt-3 border-t border-line-soft text-sm font-semibold text-navy-700 hover:underline cursor-pointer"
              >
                Show older ({history.length - shown} more)
              </button>
            )}
          </section>
        </div>
      </div>
      {dialog === "edit" && (
        <AddProduct
          product={p}
          onClose={() => setDialog(null)}
          onDelete={(id) => {
            setDialog(null);
            onDelete(id);
          }}
          onSave={(id, changes) => {
            updateProduct(id, changes);
            setDialog(null);
            setNotice("Changes saved.");
          }}
        />
      )}
      {dialog === "label" && <PrintLabel product={p} onClose={() => setDialog(null)} />}
    </main>
  );
}
