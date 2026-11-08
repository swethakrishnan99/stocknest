import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { StepButton } from "./MovementControls";
import { money } from "../lib/sampleData";
import { shortDate } from "../lib/dates";
import { useInventory } from "../state/inventoryContext";

/**
 * Mark a purchase order as delivered. The received amount defaults to what was ordered and can be
 * changed for a short or extra delivery. The order can also be cancelled from here.
 */
export default function ReceiveOrder({ productId, onDone, onClose }) {
  const { orders, products, receiveOrder, cancelOrder } = useInventory();
  const order = orders[productId];
  const product = products.find((p) => p.id === productId);
  const [qty, setQty] = useState(order?.qty ?? 0);
  const [note, setNote] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!order || !product) return null;
  const after = product.qty + qty;

  function receive(e) {
    e.preventDefault();
    receiveOrder(productId, { qty, note: note.trim() });
    onDone(`Received ${qty} ${product.unit} of ${product.name} (PO #${order.po}). On hand is now ${after}.`);
  }

  return (
    <Modal title={`Receive PO #${order.po}`} subtitle={`${product.name} · from ${order.supplier}`} onClose={onClose} maxWidth="sm:max-w-md">
      <form onSubmit={receive} className="flex flex-col min-h-0">
        <div className="overflow-y-auto px-5 py-5 flex flex-col gap-5 text-[15px]">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-3.5 rounded-xl bg-table-head text-sm">
            <dt className="text-muted">Ordered</dt>
            <dd className="text-right font-semibold">
              {order.qty} {order.unit}
            </dd>
            <dt className="text-muted">Due</dt>
            <dd className="text-right font-semibold">{shortDate(order.due)}</dd>
            <dt className="text-muted">Cost</dt>
            <dd className="text-right font-semibold">{money(order.total)}</dd>
          </dl>

          <div>
            <div className="text-sm font-semibold mb-2">Quantity received</div>
            <div className="flex items-center gap-3">
              <StepButton dir="down" onClick={() => setQty((n) => Math.max(0, n - 1))} />
              <div className="min-w-16 text-center font-display text-[28px] font-bold" aria-live="polite">
                {qty}
              </div>
              <StepButton dir="up" onClick={() => setQty((n) => n + 1)} />
              <span className="text-sm text-muted">{product.unit}</span>
            </div>
            {qty !== order.qty && (
              <p className="mt-2 text-[13px] font-semibold text-warning">
                {qty < order.qty ? `${order.qty - qty} short of the order.` : `${qty - order.qty} more than ordered.`}
              </p>
            )}
          </div>

          <label className="flex flex-col gap-2 text-sm font-semibold">
            <span>
              Note <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 2 bags damaged, refund requested"
              className="h-11 px-3 rounded-[10px] border border-input text-[15px] font-normal text-ink placeholder:text-muted outline-none focus:border-ink"
            />
          </label>

          <p className="text-sm text-muted">
            On hand goes from {product.qty} to{" "}
            <strong className="text-ink">
              {after} {product.unit}
            </strong>
            .
          </p>

          <div className="border-t border-line-soft pt-4">
            {confirmCancel ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold flex-1 min-w-[160px]">Cancel this order? Nothing is added to stock.</span>
                <Button className="text-sm px-3.5" onClick={() => setConfirmCancel(false)}>
                  Keep it
                </Button>
                <Button
                  className="text-sm px-3.5 text-danger border-danger-border hover:bg-danger-100"
                  onClick={() => {
                    cancelOrder(productId);
                    onDone(`Cancelled PO #${order.po} for ${product.name}.`);
                  }}
                >
                  Cancel order
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="min-h-11 text-sm font-semibold text-danger hover:underline cursor-pointer"
              >
                Cancel this order instead
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-line-soft pb-[max(16px,env(safe-area-inset-bottom))]">
          <Button onClick={onClose}>Close</Button>
          <Button type="submit" variant="primary" className="px-[18px]">
            Mark as received
          </Button>
        </div>
      </form>
    </Modal>
  );
}
