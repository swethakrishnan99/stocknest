import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import StatusChip from "./StatusChip";
import { StepButton } from "./MovementControls";
import { SUPPLIERS, SAMPLE_TODAY, money, suggestedOrder } from "../lib/sampleData";
import { addDays, shortDate } from "../lib/dates";

const inputClass =
  "h-11 w-full px-3 rounded-[10px] border border-input bg-white text-[15px] font-normal text-ink placeholder:text-muted outline-none focus:border-ink";

const leadDays = (supplier) => SUPPLIERS.find((s) => s.name === supplier)?.leadDays ?? 3;

export default function ReorderDialog({ item, poNumber, onOrder, onClose }) {
  // A product added without a supplier starts on the first one in the list
  const startSupplier = SUPPLIERS.some((s) => s.name === item.supplier) ? item.supplier : SUPPLIERS[0].name;
  const [supplier, setSupplier] = useState(startSupplier);
  const [qty, setQty] = useState(suggestedOrder(item));
  const [due, setDue] = useState(addDays(SAMPLE_TODAY, leadDays(startSupplier)));
  const [note, setNote] = useState("");

  const after = item.left + qty;
  const total = qty * item.unitCost;

  function changeSupplier(e) {
    setSupplier(e.target.value);
    setDue(addDays(SAMPLE_TODAY, leadDays(e.target.value))); // follow the new supplier's lead time
  }

  function submit(e) {
    e.preventDefault();
    if (qty < 1) return;
    onOrder({ po: poNumber, productId: item.id, item: item.name, supplier, qty, unit: item.unit, due, total, note: note.trim() });
  }

  return (
    <Modal title={`Reorder ${item.name}`} subtitle={`Purchase order #${poNumber}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col min-h-0">
        <div className="overflow-y-auto px-5 py-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-table-head border border-line-soft text-sm">
            <StatusChip status={item.status} label={item.status === "out" ? "Out of stock" : "Low"} />
            <span>
              <strong>{item.left}</strong> {item.unit} on hand · reorder at <strong>{item.reorder}</strong> · {item.loc}
            </span>
          </div>

          <label className="flex flex-col gap-2 text-sm font-semibold">
            Supplier
            <select value={supplier} onChange={changeSupplier} className={inputClass}>
              {SUPPLIERS.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} · usually {s.leadDays} {s.leadDays === 1 ? "day" : "days"}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="text-sm font-semibold mb-2">Quantity</div>
            <div className="flex flex-wrap items-center gap-3">
              <StepButton dir="down" onClick={() => setQty((n) => Math.max(1, n - 1))} />
              <div className="min-w-16 text-center font-display text-[28px] font-bold" aria-live="polite">
                {qty}
              </div>
              <StepButton dir="up" onClick={() => setQty((n) => n + 1)} />
              <span className="text-sm text-muted">{item.unit}</span>
              {qty !== suggestedOrder(item) && (
                <button
                  type="button"
                  onClick={() => setQty(suggestedOrder(item))}
                  className="min-h-11 text-sm font-semibold text-accent hover:text-accent-800 cursor-pointer"
                >
                  Use suggested ({suggestedOrder(item)})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Expected delivery
              <input
                type="date"
                value={due}
                min={addDays(SAMPLE_TODAY, 1)}
                onChange={(e) => e.target.value && setDue(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Note (optional)
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Deliver to back door"
                className={inputClass}
              />
            </label>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-4 rounded-xl border border-line text-sm">
            <dt className="text-muted">Estimated cost</dt>
            <dd className="text-right font-semibold">
              {money(total)} <span className="font-normal text-muted">({money(item.unitCost)} each)</span>
            </dd>
            <dt className="text-muted">Arrives</dt>
            <dd className="text-right font-semibold">{shortDate(due)}</dd>
            <dt className="text-muted">On hand after delivery</dt>
            <dd className={`text-right font-semibold ${after > item.reorder ? "text-success" : "text-warning"}`}>
              {after} {item.unit}
              {after <= item.reorder && " · still at or below reorder point"}
            </dd>
          </dl>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-line-soft pb-[max(16px,env(safe-area-inset-bottom))]">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="px-[18px]">
            Place order
          </Button>
        </div>
      </form>
    </Modal>
  );
}
