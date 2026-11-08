// Everything shown on screen is worked out from two lists: products and movements.
// Nothing here is stored, so the dashboard, tables and reports always agree.
import { CATEGORIES, LOCATION_INFO, money, stockStatus } from "./sampleData";

const STATUS_ORDER = { out: 0, low: 1, ok: 2 };

/** Adds the fields that depend on quantity: status and stock value. */
export function withDerived(p) {
  const valueNum = p.qty * p.unitCost;
  return { ...p, status: stockStatus(p.qty, p.reorder), valueNum, value: money(valueNum) };
}

export function summarize(products) {
  return {
    products: products.length,
    categories: new Set(products.map((p) => p.cat)).size,
    stockValue: money(products.reduce((n, p) => n + p.valueNum, 0)),
    low: products.filter((p) => p.status === "low").length,
    out: products.filter((p) => p.status === "out").length,
  };
}

/** Low and out-of-stock products, out of stock first. Shape used by the Reorder pop-up. */
export function needsReorder(products) {
  return products
    .filter((p) => p.status !== "ok")
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    .map(reorderItem);
}

/** One product in the shape the Reorder pop-up uses (works for any product, not only low ones). */
export function reorderItem(p) {
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

const KIND_LABEL = { in: "Stock in", out: "Stock out", count: "Count" };
const SIGN = { in: "+", out: "−", count: "=" };
export const KIND_TONE = { in: "text-success", out: "text-danger", count: "text-navy-700" };

export const signedMovement = (m) => `${SIGN[m.kind]}${m.qty}`;

/** Latest movements, in the shape the Dashboard and phone Home lists use. */
export function recentActivity(movements, count = 5) {
  return movements.slice(0, count).map((m) => ({
    id: m.id,
    kind: m.kind,
    signed: signedMovement(m),
    tone: KIND_TONE[m.kind],
    name: m.product,
    short: m.product.split(",")[0],
    detail: `${KIND_LABEL[m.kind]} · ${m.reason}`,
    when: m.day === "Today" ? m.time : m.day,
  }));
}

export function valueByCategory(products) {
  const rows = CATEGORIES.slice(1).map((name) => ({
    name,
    valueNum: products.filter((p) => p.cat === name).reduce((n, p) => n + p.valueNum, 0),
  }));
  const max = Math.max(1, ...rows.map((r) => r.valueNum));
  return rows
    .filter((r) => r.valueNum > 0)
    .sort((a, b) => b.valueNum - a.valueNum)
    .map((r) => ({ ...r, value: money(r.valueNum), pct: Math.round((r.valueNum / max) * 100) }));
}

export function locationSummary(products, locationInfo = LOCATION_INFO) {
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
export function historyFor(movements, productId) {
  return movements
    .filter((m) => m.productId === productId)
    .map((m) => ({ ...m, when: `${m.day}, ${m.time}` }));
}

const digits = (s) => s.replace(/\D/g, "");

/** True when a search matches the product's name, SKU or barcode (barcode ignores spaces). */
export function matchesProduct(p, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) return true;
  const qDigits = digits(q);
  return qDigits.length >= 3 && !!p.barcode && digits(p.barcode).includes(qDigits);
}
