import { useState, type FormEvent } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { StepButton } from "./MovementControls";
import { useInventory } from "../state/inventoryContext";
import type { Product } from "../types";

const inputClass = "h-11 w-full px-3 rounded-[10px] border border-input bg-white text-[15px] font-normal text-ink outline-none focus:border-ink";

/** Moves some or all of a product's stock to another location. */
export default function MoveStock({ product, onDone, onClose }: { product: Product; onDone: (message: string, id: string) => void; onClose: () => void }) {
  const { locationNames, transferStock, products } = useInventory();
  const others = locationNames.filter((l) => l !== product.loc);
  const [to, setTo] = useState(others[0] ?? "");
  const [qty, setQty] = useState(product.qty);
  const all = qty >= product.qty;
  const twin = products.find((p) => p.id !== product.id && p.name === product.name && p.unit === product.unit && p.loc === to);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!to || qty < 1) return;
    const id = transferStock(product.id, to, qty);
    if (id) onDone(`Moved ${Math.min(qty, product.qty)} ${product.unit} to ${to}.`, id);
  }

  return (
    <Modal title={`Move ${product.name}`} subtitle={`${product.qty} ${product.unit} in ${product.loc}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col min-h-0">
        <div className="overflow-y-auto px-5 py-5 flex flex-col gap-4">
          {others.length === 0 ? (
            <p className="text-sm text-muted">There's only one location. Add another on the Locations screen first.</p>
          ) : product.qty === 0 ? (
            <p className="text-sm text-muted">There's nothing on hand to move.</p>
          ) : (
            <>
              <label className="flex flex-col gap-2 text-sm font-semibold">
                Move to
                <select value={to} onChange={(e) => setTo(e.target.value)} className={inputClass}>
                  {others.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <div>
                <div className="text-sm font-semibold mb-2">How many</div>
                <div className="flex flex-wrap items-center gap-3">
                  <StepButton dir="down" onClick={() => setQty((n) => Math.max(1, n - 1))} />
                  <div className="min-w-16 text-center font-display text-[28px] font-bold" aria-live="polite">
                    {qty}
                  </div>
                  <StepButton dir="up" onClick={() => setQty((n) => Math.min(product.qty, n + 1))} />
                  <span className="text-sm text-muted">of {product.qty} {product.unit}</span>
                  {!all && (
                    <button type="button" onClick={() => setQty(product.qty)} className="min-h-11 text-sm font-semibold text-accent cursor-pointer">
                      All of it
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted">
                {all && !twin
                  ? `The product moves to ${to}.`
                  : twin
                    ? `It's added to the ${product.name} already in ${to} (${twin.id}).`
                    : `${product.name} will be listed in both places, each with its own count.`}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-line-soft pb-[max(16px,env(safe-area-inset-bottom))]">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!to || product.qty === 0}>
            Move stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
