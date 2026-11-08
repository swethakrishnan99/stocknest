import { useState } from "react";
import { FileSpreadsheet, AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { downloadCsv, parseCsv } from "../lib/csv";
import { PRODUCT_CSV_HEADER, readProductRows } from "../lib/productCsv";
import { useInventory } from "../state/inventoryContext";

const TEMPLATE_ROWS = [
  ["", "Rye flour, 5 kg", "Ingredients", "Pantry", "8", "bags", "4", "11.50", "Prairie Mills", ""],
  ["", "Cupcake liners, 500", "Packaging", "Storage room", "3", "packs", "2", "6.25", "PackRight", ""],
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Upload a spreadsheet of products, check it, then add or update them in one go. */
export default function ImportProducts({ onClose, onDone }) {
  const { products, locationNames, importProducts } = useInventory();
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null); // { rows, errors } from readProductRows

  async function chooseFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setResult({ rows: [], errors: [{ line: 0, message: "Choose a .csv file. In Excel or Google Sheets, use File → Download → CSV." }] });
      return;
    }
    const text = await file.text();
    setResult(readProductRows(parseCsv(text), products, locationNames));
  }

  const rows = result?.rows ?? [];
  const added = rows.filter((r) => r.isNew).length;
  const updated = rows.length - added;
  const newLocations = [...new Set(rows.filter((r) => r.newLocation).map((r) => r.product.loc))];

  function confirm() {
    importProducts(rows);
    const parts = [];
    if (added) parts.push(`added ${plural(added, "product")}`);
    if (updated) parts.push(`updated ${updated}`);
    onDone(`Imported ${fileName}: ${parts.join(" and ")}.`);
  }

  return (
    <Modal title="Import products" subtitle="Add or update many products from a spreadsheet" onClose={onClose}>
      <div className="overflow-y-auto px-5 py-5 flex flex-col gap-4 text-sm">
        <p className="text-muted leading-relaxed">
          Use a CSV file with the columns <strong className="text-ink">Name, Category, Location, On hand</strong> and{" "}
          <strong className="text-ink">Unit</strong>. SKU, Reorder at, Unit cost, Supplier and Barcode are optional. A row with an
          existing SKU updates that product; other rows add new products. Products → Export gives you a file in this format.
        </p>
        <button
          type="button"
          onClick={() => downloadCsv("stocknest-import-template.csv", PRODUCT_CSV_HEADER, TEMPLATE_ROWS)}
          className="self-start text-sm font-semibold text-accent hover:text-accent-800 cursor-pointer min-h-11"
        >
          Download a template
        </button>

        <label className="flex flex-col items-center justify-center gap-2 min-h-[120px] px-4 py-5 rounded-xl border-2 border-dashed border-input bg-table-head text-center cursor-pointer hover:border-ink focus-within:border-ink">
          <FileSpreadsheet className="w-7 h-7 text-navy-700" aria-hidden="true" />
          <span className="font-semibold text-[15px]">{fileName || "Choose a CSV file"}</span>
          <span className="text-[13px] text-muted">{fileName ? "Choose a different file" : "From your computer or phone"}</span>
          <input type="file" accept=".csv,text/csv" onChange={chooseFile} className="sr-only" />
        </label>

        {result && (
          <div aria-live="polite" className="flex flex-col gap-3">
            {rows.length > 0 && (
              <div className="p-3.5 rounded-xl bg-success-100 text-success font-semibold">
                Ready: {added > 0 && `${plural(added, "new product")}`}
                {added > 0 && updated > 0 && " and "}
                {updated > 0 && `${updated} to update`}
                {newLocations.length > 0 && (
                  <span className="block font-normal mt-1">
                    New {newLocations.length === 1 ? "location" : "locations"} will be added: {newLocations.join(", ")}
                  </span>
                )}
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="p-3.5 rounded-xl bg-warning-100 text-warning">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  {rows.length ? `${plural(result.errors.length, "row")} will be skipped` : "Nothing can be imported"}
                </div>
                <ul className="mt-2 flex flex-col gap-1 list-disc pl-5">
                  {result.errors.slice(0, 8).map((er) => (
                    <li key={er.line}>{er.line > 0 ? `Row ${er.line}: ${er.message}` : er.message}</li>
                  ))}
                  {result.errors.length > 8 && <li>…and {result.errors.length - 8} more</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-line-soft pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" className="px-[18px]" disabled={rows.length === 0} onClick={confirm}>
          {rows.length ? `Import ${plural(rows.length, "product")}` : "Import"}
        </Button>
      </div>
    </Modal>
  );
}
