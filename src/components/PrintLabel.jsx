import { useState } from "react";
import { Printer } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { StepButton } from "./MovementControls";
import { code128 } from "../lib/code128";

function Barcode({ value, height = 44 }) {
  const { bars, width } = code128(value);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={`Barcode for ${value}`} preserveAspectRatio="none">
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y="0" width={b.w} height={height} fill="#000" />
      ))}
    </svg>
  );
}

// One 2.25 × 1.25 inch label, a common size for desktop label printers
function Label({ product }) {
  return (
    <div className="w-[2.25in] h-[1.25in] box-border border border-black/80 rounded-[4px] bg-white text-black px-[0.1in] py-[0.07in] flex flex-col justify-between overflow-hidden break-inside-avoid">
      <div className="text-[10pt] font-bold leading-tight line-clamp-2">{product.name}</div>
      <Barcode value={product.id} />
      <div className="flex justify-between text-[8pt] font-mono">
        <span>{product.id}</span>
        <span>{product.loc}</span>
      </div>
    </div>
  );
}

/** Preview and print shelf labels for a product. The barcode encodes the SKU (Code 128). */
export default function PrintLabel({ product, onClose }) {
  const [copies, setCopies] = useState(1);

  return (
    <Modal title="Print label" subtitle={`${product.name} · SKU ${product.id}`} onClose={onClose} maxWidth="sm:max-w-md">
      <div className="overflow-y-auto px-5 py-5 flex flex-col gap-5">
        <div className="flex justify-center py-4 rounded-xl bg-table-head">
          <Label product={product} />
        </div>
        <p className="text-[13px] text-muted">
          The barcode holds the SKU, so scanning the label finds this product. Sized for 2.25 × 1.25 in labels; on plain paper they print in a grid you can cut out.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Copies</span>
          <div className="flex items-center gap-3">
            <StepButton dir="down" onClick={() => setCopies((n) => Math.max(1, n - 1))} />
            <span className="min-w-8 text-center font-display text-2xl font-bold" aria-live="polite">{copies}</span>
            <StepButton dir="up" onClick={() => setCopies((n) => Math.min(30, n + 1))} />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-line-soft pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" className="px-[18px]" onClick={() => window.print()}>
          <Printer className="w-[18px] h-[18px]" />
          Print {copies === 1 ? "label" : `${copies} labels`}
        </Button>
      </div>

      {/* What actually prints (hidden on screen) */}
      <div className="print-area hidden print:flex flex-wrap gap-[0.12in]" aria-hidden="true">
        {Array.from({ length: copies }, (_, i) => (
          <Label key={i} product={product} />
        ))}
      </div>
    </Modal>
  );
}
