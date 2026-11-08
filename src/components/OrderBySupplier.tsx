import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { money, suggestedOrder } from "../lib/sampleData";
import { addDays, shortDate, todayISO } from "../lib/dates";
import { useInventory } from "../state/inventoryContext";
import { leadDays } from "../lib/purchaseOrder";
import type { PurchaseOrder } from "../types";

const NO_SUPPLIER = "No supplier set";

/**
 * Everything that needs reordering, grouped by supplier, so one purchase order per supplier
 * covers several products. Items already on order are left out.
 */
export default function OrderBySupplier({ onPlaced, onClose }: { onPlaced: (po: number) => void; onClose: () => void }) {
  const { reorderList, orders, nextPo, placeOrders, suppliers } = useInventory();
  const waiting = reorderList.filter((i) => !orders[i.id]);
  const groups = [...new Set(waiting.map((i) => i.supplier || NO_SUPPLIER))].sort((a, b) => (a === NO_SUPPLIER ? 1 : b === NO_SUPPLIER ? -1 : a.localeCompare(b)));
  const firstOrderable = groups.find((g) => g !== NO_SUPPLIER) ?? "";
  const [supplier, setSupplier] = useState(firstOrderable);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(waiting.map((i) => [i.id, suggestedOrder(i)])));
  const [picked, setPicked] = useState<Record<string, boolean>>(() => Object.fromEntries(waiting.map((i) => [i.id, true])));

  const items = waiting.filter((i) => (i.supplier || NO_SUPPLIER) === supplier);
  const lines = items.filter((i) => picked[i.id] && (qty[i.id] ?? 0) > 0);
  const total = lines.reduce((n, i) => n + qty[i.id] * i.unitCost, 0);
  const due = addDays(todayISO(), leadDays(suppliers, supplier));

  function place() {
    const order: PurchaseOrder[] = lines.map((i) => ({
      po: nextPo,
      productId: i.id,
      item: i.name,
      supplier,
      qty: qty[i.id],
      unit: i.unit,
      due,
      total: qty[i.id] * i.unitCost,
      note: "",
    }));
    placeOrders(order);
    onPlaced(nextPo);
  }

  return (
    <Modal title="Order by supplier" subtitle={`One purchase order for several items · PO #${nextPo}`} onClose={onClose}>
      <div className="overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {groups.length === 0 ? (
          <p className="text-sm text-muted">Nothing needs ordering right now. Items already on order aren't listed.</p>
        ) : (
          <>
            <div role="tablist" aria-label="Supplier" className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const count = waiting.filter((i) => (i.supplier || NO_SUPPLIER) === g).length;
                return (
                  <button
                    key={g}
                    type="button"
                    role="tab"
                    aria-selected={supplier === g}
                    onClick={() => setSupplier(g)}
                    className={`h-10 px-3.5 rounded-full border text-sm font-semibold cursor-pointer ${supplier === g ? "bg-navy border-navy text-white" : "bg-white border-input hover:bg-line-soft"}`}
                  >
                    {g} ({count})
                  </button>
                );
              })}
            </div>
            {supplier === NO_SUPPLIER ? (
              <p className="text-sm text-muted">
                These items have no supplier yet. Open a product and use Edit → More details to set one, or use its Reorder button to order it on its own.
              </p>
            ) : null}
            <ul className="rounded-xl border border-line divide-y divide-line-soft">
              {items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <label className="flex items-center gap-3 flex-1 min-w-[180px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!picked[i.id]}
                      disabled={supplier === NO_SUPPLIER}
                      onChange={(e) => setPicked((p) => ({ ...p, [i.id]: e.target.checked }))}
                      className="w-5 h-5 accent-navy"
                    />
                    <span>
                      <span className="block text-sm font-semibold">{i.name}</span>
                      <span className="block text-[13px] text-muted">
                        {i.left} {i.unit} left · reorder at {i.reorder}
                      </span>
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">Quantity of {i.name}</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={qty[i.id] ?? 0}
                      disabled={supplier === NO_SUPPLIER || !picked[i.id]}
                      onChange={(e) => setQty((q) => ({ ...q, [i.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
                      className="w-20 h-10 px-2 rounded-lg border border-input text-right"
                    />
                    <span className="text-muted w-14">{i.unit}</span>
                  </label>
                </li>
              ))}
            </ul>
            {supplier !== NO_SUPPLIER && (
              <p className="text-sm">
                <strong>{lines.length}</strong> {lines.length === 1 ? "item" : "items"} · about <strong>{money(total)}</strong> · expected {shortDate(due)}
              </p>
            )}
          </>
        )}
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-line-soft pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={place} disabled={!lines.length || supplier === NO_SUPPLIER}>
          Place order
        </Button>
      </div>
    </Modal>
  );
}
