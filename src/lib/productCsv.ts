// The product spreadsheet format: Products → Export writes it and Products → Import CSV reads it,
// so an exported file can be edited and imported again.
import { skuPrefix, tintFor } from "./templates";
import type { ImportError, ImportRow, Product } from "../types";

export const PRODUCT_CSV_HEADER = ["SKU", "Name", "Category", "Location", "On hand", "Unit", "Reorder at", "Unit cost", "Supplier", "Barcode"];

export const productToRow = (p: Product): (string | number)[] => [p.id, p.name, p.cat, p.loc, p.qty, p.unit, p.reorder, p.unitCost, p.supplier ?? "", p.barcode ?? ""];


/** Next free SKU for a category, e.g. ING-0045 */
export function nextSku(products: Pick<Product, "id">[], cat: string): string {
  const prefix = skuPrefix(cat);
  const used = products.filter((p) => p.id.startsWith(`${prefix}-`)).map((p) => Number(p.id.slice(4)) || 0);
  return `${prefix}-${String(Math.max(0, ...used) + 1).padStart(4, "0")}`;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z]/g, "");
type Column = "sku" | "name" | "cat" | "loc" | "qty" | "unit" | "reorder" | "cost" | "supplier" | "barcode";
const COLUMN_KEYS: Record<string, Column> = { sku: "sku", name: "name", product: "name", category: "cat", location: "loc", onhand: "qty", quantity: "qty", qty: "qty", unit: "unit", reorderat: "reorder", reorderpoint: "reorder", unitcost: "cost", cost: "cost", supplier: "supplier", barcode: "barcode" };

/**
 * Checks spreadsheet rows against the current products.
 * Returns { rows: [{ line, product, isNew, newLocation }], errors: [{ line, message }] }.
 * Rows with the SKU of an existing product update it; other rows add a product.
 */
export function readProductRows(
  table: string[][],
  products: Product[],
  locationNames: string[],
  categories: string[]
): { rows: ImportRow[]; errors: ImportError[] } {
  if (table.length === 0) return { rows: [], errors: [{ line: 1, message: "The file is empty." }] };
  const keys = table[0].map((h) => COLUMN_KEYS[norm(h)]);
  const missing = (["name", "cat", "loc", "qty", "unit"] as const).filter((k) => !keys.includes(k));
  if (missing.length) {
    const names: Record<string, string> = { name: "Name", cat: "Category", loc: "Location", qty: "On hand", unit: "Unit" };
    return { rows: [], errors: [{ line: 1, message: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.map((k) => names[k]).join(", ")}.` }] };
  }

  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  const seen = new Set<string>();
  const known = new Map(products.map((p) => [p.id, p]));
  const working = [...products]; // so generated SKUs in this file don't clash with each other

  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (k: Column) => (cells[keys.indexOf(k)] ?? "").trim();
    const problems: string[] = [];
    const name = get("name");
    // A category the business doesn't have yet is added when the file is imported
    const cat = categories.find((c) => c.toLowerCase() === get("cat").toLowerCase()) ?? get("cat");
    const loc = get("loc");
    const qty = Number(get("qty"));
    const reorderText = get("reorder");
    const costText = get("cost").replace(/[$,]/g, "");
    const reorder = reorderText === "" ? 0 : Number(reorderText);
    const cost = costText === "" ? 0 : Number(costText);
    const unit = get("unit");

    if (!name) problems.push("name is missing");
    if (!cat) problems.push("category is missing");
    if (!loc) problems.push("location is missing");
    if (get("qty") === "" || !Number.isInteger(qty) || qty < 0) problems.push("on hand must be a whole number, 0 or more");
    if (!unit) problems.push("unit is missing");
    if (!Number.isInteger(reorder) || reorder < 0) problems.push("reorder at must be a whole number, 0 or more");
    if (!Number.isFinite(cost) || cost < 0) problems.push("unit cost must be a number, 0 or more");

    let sku = get("sku").toUpperCase();
    if (sku && seen.has(sku)) problems.push(`SKU ${sku} appears twice in the file`);
    if (problems.length) {
      errors.push({ line, message: `${name || "Row"}: ${problems.join("; ")}.` });
      return;
    }
    if (!sku) sku = nextSku(working, cat);
    seen.add(sku);

    const existing = known.get(sku);
    const product: Product = {
      ...(existing ?? { initial: name[0].toUpperCase(), tint: tintFor(categories, cat) }),
      id: sku,
      name,
      cat,
      loc: locationNames.find((l) => l.toLowerCase() === loc.toLowerCase()) ?? loc,
      qty,
      unit,
      reorder,
      unitCost: cost,
      supplier: get("supplier") || existing?.supplier || "",
      barcode: get("barcode") || existing?.barcode || "",
    };
    if (!existing) product.initial = name[0].toUpperCase();
    working.push(product);
    rows.push({
      line,
      product,
      isNew: !existing,
      newLocation: !locationNames.some((l) => l.toLowerCase() === loc.toLowerCase()),
    });
  });
  return { rows, errors };
}
