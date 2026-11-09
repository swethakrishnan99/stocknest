// Everything shown on screen is worked out from two lists: products and movements.
// Nothing here is stored, so the dashboard, tables and reports always agree.
import { money, stockStatus } from "./sampleData";
import { clockTime, dayLabel } from "./dates";

/** Same text as TRANSFER in alerts.ts (kept here to avoid a circular import) */
const TRANSFER_REASON = "Moved between locations";
import type { ActivityRow, CategoryValue, DerivedProduct, LocationInfo, LocationSummary, Movement, MovementKind, Product, ReorderItem, StockStatus, Summary } from "../types";

const STATUS_ORDER: Record<StockStatus, number> = { out: 0, low: 1, ok: 2 };

/** Adds the fields that depend on quantity: status and stock value. */
export function withDerived(p: Product): DerivedProduct {
  const valueNum = p.qty * p.unitCost;
  return { ...p, status: stockStatus(p.qty, p.reorder), valueNum, value: money(valueNum) };
}

export function summarize(products: DerivedProduct[]): Summary {
  return {
    products: products.length,
    categories: new Set(products.map((p) => p.cat)).size,
    stockValue: money(products.reduce((n, p) => n + p.valueNum, 0)),
    low: products.filter((p) => p.status === "low").length,
    out: products.filter((p) => p.status === "out").length,
  };
}

/** Low and out-of-stock products, out of stock first. Shape used by the Reorder pop-up. */
export function needsReorder(products: DerivedProduct[]): ReorderItem[] {
  return products
    .filter((p) => p.status !== "ok")
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    .map(reorderItem);
}

/** One product in the shape the Reorder pop-up uses (works for any product, not only low ones). */
export function reorderItem(p: DerivedProduct): ReorderItem {
  return {
    id: p.id,
    name: p.name,
    left: p.qty,
    reorder: p.reorder,
    loc: p.loc,
    status: p.status,
    unit: p.unit,
    unitCost: p.unitCost,
    supplier: p.supplier,
  };
}

const KIND_LABEL: Record<MovementKind, string> = { in: "Stock in", out: "Stock out", count: "Count" };
const SIGN: Record<MovementKind, string> = { in: "+", out: "−", count: "=" };
export const KIND_TONE: Record<MovementKind, string> = { in: "text-success", out: "text-danger", count: "text-navy-700" };

/** "Today, 9:42 am" (or just "9:42 am" for today when `short`), "Yesterday, 4:30 pm", "Wed, Nov 4, 2:15 pm" */
export function movementWhen(m: Pick<Movement, "at">, short = false): string {
  const day = dayLabel(m.at.slice(0, 10));
  if (short) return day === "Today" ? clockTime(m.at) : day;
  return `${day}, ${clockTime(m.at)}`;
}

/**
 * Finds the product for a scanned or typed code: an exact SKU or barcode first, then a
 * name or partial match if it only fits one product.
 */
export function findByCode<T extends Pick<Product, "id" | "name" | "barcode">>(products: T[], code: string): { product: T | null; matches: number } {
  const q = code.trim();
  if (!q) return { product: null, matches: 0 };
  const d = digits(q);
  const exact = products.find((x) => x.id.toLowerCase() === q.toLowerCase() || (d.length >= 6 && !!x.barcode && digits(x.barcode) === d));
  if (exact) return { product: exact, matches: 1 };
  const partial = products.filter((x) => matchesProduct(x, q));
  return { product: partial.length === 1 ? partial[0] : null, matches: partial.length };
}

/**
 * Ids of the movements that can be undone: each product's latest one, if it was recorded in the
 * app (so the quantity before it is known) and isn't half of a move between locations.
 */
export function undoableMovements(movements: Movement[]): Set<string> {
  const seen = new Set<string>();
  const ids = new Set<string>();
  for (const m of movements) {
    if (!m.productId || seen.has(m.productId)) continue;
    seen.add(m.productId);
    if (m.before !== undefined && m.reason !== TRANSFER_REASON) ids.add(m.id);
  }
  return ids;
}

export const signedMovement = (m: Pick<Movement, "kind" | "qty">) => `${SIGN[m.kind]}${m.qty}`;

/** Latest movements, in the shape the Dashboard and phone Home lists use. */
export function recentActivity(movements: Movement[], count = 5): ActivityRow[] {
  return movements.slice(0, count).map((m) => ({
    id: m.id,
    kind: m.kind,
    signed: signedMovement(m),
    tone: KIND_TONE[m.kind],
    name: m.product,
    short: m.product.split(",")[0],
    detail: `${KIND_LABEL[m.kind]} · ${m.reason}`,
    when: movementWhen(m, true),
  }));
}

export function valueByCategory(products: DerivedProduct[], categories: string[]): CategoryValue[] {
  const names = [...new Set([...categories, ...products.map((p) => p.cat)])];
  const rows = names.map((name) => ({
    name,
    valueNum: products.filter((p) => p.cat === name).reduce((n, p) => n + p.valueNum, 0),
  }));
  const max = Math.max(1, ...rows.map((r) => r.valueNum));
  return rows
    .filter((r) => r.valueNum > 0)
    .sort((a, b) => b.valueNum - a.valueNum)
    .map((r) => ({ ...r, value: money(r.valueNum), pct: Math.round((r.valueNum / max) * 100) }));
}

export function locationSummary(products: DerivedProduct[], locationInfo: LocationInfo[]): LocationSummary[] {
  return locationInfo.map((l) => {
    const here = products.filter((p) => p.loc === l.name);
    return {
      ...l,
      products: here.length,
      value: money(here.reduce((n, p) => n + p.valueNum, 0)),
      low: here.filter((p) => p.status === "low").length,
      out: here.filter((p) => p.status === "out").length,
    };
  });
}

/** One product's movements, newest first, for its Stock history panel. */
export function historyFor(movements: Movement[], productId: string): (Movement & { when: string })[] {
  return movements
    .filter((m) => m.productId === productId)
    .map((m) => ({ ...m, when: movementWhen(m) }));
}

const digits = (s: string) => s.replace(/\D/g, "");

/** True when a search matches the product's name, SKU or barcode (barcode ignores spaces). */
export function matchesProduct(p: Pick<Product, "name" | "id" | "barcode">, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) return true;
  const qDigits = digits(q);
  return qDigits.length >= 3 && !!p.barcode && digits(p.barcode).includes(qDigits);
}
