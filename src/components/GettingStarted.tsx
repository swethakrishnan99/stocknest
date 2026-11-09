import { Check, PackagePlus, FileSpreadsheet, Smartphone, Users } from "lucide-react";
import Button from "./Button";
import { useInventory } from "../state/inventoryContext";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import type { Navigate } from "../types";

/** What a new business sees on the Dashboard until it has products */
export default function GettingStarted({ onNavigate, onAddProduct }: { onNavigate: Navigate; onAddProduct: () => void }) {
  const { business, products, team, can } = useInventory();
  const { how, install } = useInstallPrompt();

  const steps = [
    {
      done: products.length > 0,
      icon: PackagePlus,
      title: "Add your products",
      text: "Name, how many you have and the unit is all you need. Add a reorder point to get low-stock warnings.",
      action: can("editProducts") && (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={onAddProduct}>
            Add a product
          </Button>
          <Button onClick={() => onNavigate("products")}>
            <FileSpreadsheet className="w-[18px] h-[18px]" />
            Import a spreadsheet
          </Button>
        </div>
      ),
    },
    {
      done: how === "installed",
      icon: Smartphone,
      title: "Put StockNest on your phone",
      text:
        how === "ios"
          ? "In Safari, tap Share, then Add to Home Screen. Then you can scan barcodes with the camera."
          : how === "menu"
            ? "In your browser's menu, choose Install app or Add to Home screen (on a computer, open this page on your phone first). Then you can scan barcodes with the camera."
            : "Install it like an app. It works offline and can scan barcodes with the camera.",
      action: how === "prompt" && <Button onClick={install}>Install app</Button>,
    },
    {
      done: team.length > 1,
      icon: Users,
      title: "Add your team",
      text: "Staff can record stock and count, without changing products or settings.",
      action: can("manageTeam") && <Button onClick={() => onNavigate("settings")}>Add someone</Button>,
    },
  ];

  return (
    <section aria-labelledby="start-h" className="bg-white border border-line rounded-[14px] p-5 md:p-6 flex flex-col gap-5">
      <div>
        <h2 id="start-h" className="font-display text-2xl font-bold">
          Welcome to {business.name}
        </h2>
        <p className="text-muted mt-1">Three steps to get going. You can come back to any of them later.</p>
      </div>
      <ol className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <div
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${s.done ? "bg-success text-white" : "bg-line-soft text-navy-700"}`}
              aria-hidden="true"
            >
              {s.done ? <Check className="w-5 h-5" strokeWidth={2.6} /> : i + 1}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div>
                <h3 className="font-semibold">
                  {s.title}
                  {s.done && <span className="sr-only"> (done)</span>}
                </h3>
                <p className="text-sm text-muted">{s.text}</p>
              </div>
              {!s.done && s.action}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
