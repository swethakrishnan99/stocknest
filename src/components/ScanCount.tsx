import { useRef, useState } from "react";
import { X, Zap, Check, CameraOff } from "lucide-react";
import ProductTile from "./ProductTile";
import { ModeToggle, StepButton } from "./MovementControls";
import { newOnHand } from "../lib/sampleData";
import { findByCode } from "../lib/inventory";
import { useBarcodeCamera } from "../lib/useBarcodeCamera";
import { useInventory } from "../state/inventoryContext";
import type { FormEvent } from "react";
import type { MovementKind } from "../types";

const MODES: [MovementKind, string][] = [
  ["in", "Stock in"],
  ["out", "Stock out"],
  ["count", "Recount"],
];

const REASON_FOR: Record<MovementKind, string> = { in: "Supplier delivery", out: "Used in production", count: "Stock count correction" };

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const sides = {
    tl: "top-0 left-0 border-t-4 border-l-4 rounded-tl-[20px]",
    tr: "top-0 right-0 border-t-4 border-r-4 rounded-tr-[20px]",
    bl: "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[20px]",
    br: "bottom-0 right-0 border-b-4 border-r-4 rounded-br-[20px]",
  };
  return <div className={`absolute w-11 h-11 border-coral ${sides[pos]}`} />;
}

interface ScanCountProps {
  productId: string;
  onClose: () => void;
  onSwitchProduct: (productId: string) => void;
}

export default function ScanCount({ productId, onClose, onSwitchProduct }: ScanCountProps) {
  const { products, recordMovement } = useInventory();
  const [mode, setMode] = useState<MovementKind>("in");
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState<string | null>(null);
  const [typing, setTyping] = useState(false); // "Type a code instead" form is open
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  function lookUp(q: string): boolean {
    const { product, matches } = findByCode(products, q);
    if (!product) {
      setCodeError(matches > 1 ? `${matches} products match. Type more of the code.` : `No product has the code ${q}.`);
      return false;
    }
    setCodeError("");
    setSaved(null);
    onSwitchProduct(product.id);
    return true;
  }

  const camera = useBarcodeCamera(videoRef, (scanned) => {
    setLastScan(scanned);
    if (lookUp(scanned) && navigator.vibrate) navigator.vibrate(60);
  });

  const p = products.find((x) => x.id === productId) ?? products[0];
  if (!p) {
    return (
      <div className="fixed inset-0 z-50 bg-scan text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold">Add a product first</p>
        <p className="text-sm text-[#C5CEDF] max-w-[320px]">Scanning finds products by their barcode or SKU, so there needs to be at least one product.</p>
        <button type="button" onClick={onClose} className="h-11 px-5 rounded-[10px] bg-coral text-scan font-bold cursor-pointer">
          Close
        </button>
      </div>
    );
  }
  const preview = newOnHand(p.qty, mode, qty);

  function findCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim()) return setCodeError("Type a barcode or SKU.");
    lookUp(code);
  }

  function save() {
    recordMovement(p.id, { mode, qty, reason: REASON_FOR[mode], note: "Scanned on phone" });
    setSaved(`Saved · ${p.name}, new total ${preview} ${p.unit}`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-scan text-white">
      <div className="mx-auto max-w-[480px] h-full flex flex-col overflow-y-auto">
        <header className="flex items-center justify-between px-4 pt-6 pb-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="w-11 h-11 rounded-xl bg-scan-700 flex items-center justify-center cursor-pointer hover:bg-navy-700"
          >
            <X className="w-5 h-5" strokeWidth={2.2} />
          </button>
          <h1 className="text-base font-semibold">Scan barcode</h1>
          {camera.torch.supported ? (
            <button
              type="button"
              onClick={() => camera.setTorch(!camera.torch.on)}
              aria-label="Flashlight"
              aria-pressed={camera.torch.on}
              className={`w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer ${
                camera.torch.on ? "bg-white text-scan" : "bg-scan-700 hover:bg-navy-700"
              }`}
            >
              <Zap className="w-5 h-5" />
            </button>
          ) : (
            <span className="w-11" aria-hidden="true" />
          )}
        </header>

        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center gap-4 px-6 py-4">
          <div className="relative w-[280px] h-[200px] rounded-[20px] overflow-hidden bg-scan-frame flex items-center justify-center">
            <video ref={videoRef} muted playsInline aria-label="Camera view" className={`absolute inset-0 w-full h-full object-cover ${camera.state === "on" ? "" : "hidden"}`} />
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
            {camera.state === "on" && <div className="absolute left-6 right-6 top-[99px] h-0.5 bg-coral" aria-hidden="true" />}
            {camera.state === "starting" && <p className="text-sm text-[#C5CEDF]">Starting the camera…</p>}
            {camera.state === "error" && (
              <div className="flex flex-col items-center gap-2 px-6 text-center text-sm text-[#C5CEDF]">
                <CameraOff className="w-7 h-7" aria-hidden="true" />
                <p role="alert">{camera.error}</p>
              </div>
            )}
          </div>
          {codeError && !typing && (
            <p role="alert" className="text-sm font-semibold text-[#FFC2BC]">
              {codeError}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm font-semibold text-[#B9F0CF]" aria-live="polite">
            <Check className="w-[18px] h-[18px]" strokeWidth={2.4} />
            {saved ?? (lastScan ? `Found: ${p.name}` : `Ready: ${p.name}`)}
          </div>
          {typing ? (
            <form onSubmit={findCode} className="w-full max-w-[320px] flex flex-col gap-2">
              <label htmlFor="scan-code" className="text-sm font-semibold">
                Barcode or SKU
              </label>
              <div className="flex gap-2">
                <input
                  id="scan-code"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setCodeError("");
                  }}
                  placeholder="e.g. ING-0031"
                  aria-invalid={!!codeError}
                  aria-describedby={codeError ? "scan-code-error" : undefined}
                  className="flex-1 min-w-0 h-11 px-3 rounded-[10px] bg-white text-ink text-[15px] outline-none border-2 border-transparent focus:border-coral"
                />
                <button type="submit" className="h-11 px-4 rounded-[10px] bg-coral text-scan font-bold cursor-pointer hover:brightness-95">
                  Find
                </button>
              </div>
              {codeError && (
                <p id="scan-code-error" className="text-sm font-semibold text-[#FFC2BC]">
                  {codeError}
                </p>
              )}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setTyping(true)}
              className="h-11 px-4 rounded-[10px] border border-[#3A4A6B] text-sm font-semibold cursor-pointer hover:bg-scan-700"
            >
              Type a code instead
            </button>
          )}
        </div>

        <section
          aria-labelledby="scan-item"
          className="bg-white text-ink rounded-t-3xl px-5 pt-5 pb-7 flex flex-col gap-4"
        >
          <div className="flex items-center gap-3">
            <ProductTile initial={p.initial} tint={p.tint} photo={p.photo} className="w-[52px] h-[52px] rounded-xl text-[22px]" />
            <div className="flex-1 min-w-0">
              <h2 id="scan-item" className="text-[17px] font-bold">{p.name}</h2>
              <div className="text-[13px] text-muted">
                {p.loc} · on hand {p.qty} {p.unit}
              </div>
            </div>
          </div>
          <ModeToggle modes={MODES} value={mode} onChange={setMode} />
          <div className="flex items-center justify-between">
            <StepButton dir="down" large onClick={() => setQty((n) => Math.max(0, n - 1))} />
            <div className="text-center">
              <div className="font-display text-[40px] font-bold leading-none" aria-live="polite">{qty}</div>
              <div className="text-[13px] text-muted mt-1">
                New total: {preview} {p.unit}
              </div>
            </div>
            <StepButton dir="up" large onClick={() => setQty((n) => n + 1)} />
          </div>
          <button
            type="button"
            onClick={save}
            className="h-[52px] rounded-xl bg-accent hover:bg-accent-800 text-white text-base font-bold cursor-pointer"
          >
            Save and scan next
          </button>
          <div className="text-xs text-muted text-center">Works offline</div>
        </section>
      </div>
    </div>
  );
}
