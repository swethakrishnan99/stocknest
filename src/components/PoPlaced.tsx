import { useState } from "react";
import { FileDown, Mail, CircleCheck } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { money } from "../lib/sampleData";
import { shortDate } from "../lib/dates";
import { downloadPoPdf, poDocument, poEmailLink } from "../lib/purchaseOrder";
import { useInventory } from "../state/inventoryContext";

/** Shown after placing an order (and from the product page): send the PO to the supplier. */
export default function PoPlaced({ po, justPlaced = true, onClose }: { po: number; justPlaced?: boolean; onClose: () => void }) {
  const { orders, business, suppliers } = useInventory();
  const [pdfError, setPdfError] = useState("");
  const doc = poDocument(orders, po);
  if (!doc) return null;
  const supplier = suppliers.find((s) => s.name === doc.supplier);

  return (
    <Modal title={justPlaced ? `PO #${po} placed` : `Purchase order #${po}`} subtitle={`${doc.supplier} · needed by ${shortDate(doc.due)}`} onClose={onClose}>
      <div className="px-5 py-5 flex flex-col gap-4">
        {justPlaced && (
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <CircleCheck className="w-[18px] h-[18px]" aria-hidden="true" />
            Saved. It shows as "On order" until you receive it.
          </p>
        )}
        <ul className="rounded-xl border border-line divide-y divide-line-soft text-sm">
          {doc.lines.map((l) => (
            <li key={l.productId} className="flex justify-between gap-3 px-4 py-2.5">
              <span>
                {l.item}
                <span className="text-muted"> · {l.qty} {l.unit}</span>
              </span>
              <span className="font-semibold">{money(l.total)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-3 px-4 py-2.5 bg-table-head font-semibold">
            <span>Total</span>
            <span>{money(doc.total)}</span>
          </li>
        </ul>
        <p className="text-sm text-muted">
          {supplier?.email
            ? `Send it to ${supplier.email}, or save the PDF to print or attach.`
            : "Add the supplier's email in Settings → Suppliers to send it in one tap, or save the PDF."}
        </p>
        {pdfError && <p role="alert" className="text-sm text-danger">{pdfError}</p>}
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-line-soft pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button onClick={onClose}>Done</Button>
        <Button
          onClick={() =>
            downloadPoPdf(doc, business, supplier).catch(() => setPdfError("The PDF couldn't be made. Check your connection and try again."))
          }
        >
          <FileDown className="w-[18px] h-[18px]" />
          Save PDF
        </Button>
        <a
          href={poEmailLink(doc, business, supplier)}
          className="inline-flex items-center justify-center gap-2 h-11 px-[18px] rounded-[10px] bg-accent text-white font-semibold hover:brightness-110"
        >
          <Mail className="w-[18px] h-[18px]" aria-hidden="true" />
          Email supplier
        </a>
      </div>
    </Modal>
  );
}
