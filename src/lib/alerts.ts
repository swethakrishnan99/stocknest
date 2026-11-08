// What needs attention right now, worked out from the data (shown in the Alerts panel).
import { addDays, daysBetween } from "./dates";
import type { Alerts, Batch, DerivedProduct, Movement, PurchaseOrder } from "../types";

export type AlertKind = "out" | "low" | "overdue" | "expiring" | "expired";

export interface AlertItem {
  key: string;
  kind: AlertKind;
  productId: string;
  title: string;
  detail: string;
}

export function currentAlerts(
  products: DerivedProduct[],
  orders: Record<string, PurchaseOrder>,
  batches: Batch[],
  settings: Alerts,
  today: string
): AlertItem[] {
  const list: AlertItem[] = [];
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const p of products) {
    if (p.status === "ok" || orders[p.id]) continue;
    list.push({
      key: `stock-${p.id}`,
      kind: p.status,
      productId: p.id,
      title: p.status === "out" ? `${p.name} is out of stock` : `${p.name} is running low`,
      detail: `${p.qty} ${p.unit} left · reorder at ${p.reorder} · ${p.loc}`,
    });
  }

  for (const o of Object.values(orders)) {
    const late = daysBetween(o.due, today);
    if (late > 0) {
      list.push({
        key: `po-${o.productId}`,
        kind: "overdue",
        productId: o.productId,
        title: `PO #${o.po} is ${late} day${late === 1 ? "" : "s"} late`,
        detail: `${o.qty} ${o.unit} of ${o.item} from ${o.supplier}`,
      });
    }
  }

  if (settings.expiry) {
    const limit = addDays(today, settings.expiryDays);
    for (const b of batches) {
      const p = byId.get(b.productId);
      if (!p || b.qty <= 0 || b.bestBefore > limit) continue;
      const left = daysBetween(today, b.bestBefore);
      list.push({
        key: `batch-${b.id}`,
        kind: left < 0 ? "expired" : "expiring",
        productId: p.id,
        title: left < 0 ? `${p.name} batch ${b.code} has expired` : `${p.name} batch ${b.code} expires ${left === 0 ? "today" : `in ${left} day${left === 1 ? "" : "s"}`}`,
        detail: `${b.qty} ${p.unit} · ${b.loc}`,
      });
    }
  }

  const order: Record<AlertKind, number> = { expired: 0, out: 1, overdue: 2, expiring: 3, low: 4 };
  return list.sort((a, b) => order[a.kind] - order[b.kind]);
}

export interface DaySummary {
  date: string;
  movements: number;
  unitsIn: number;
  unitsOut: number;
  wasted: number;
  counts: number;
}

/** What happened on one day (the Dashboard shows yesterday's) */
export function daySummary(movements: Movement[], date: string): DaySummary {
  const day = movements.filter((m) => m.at.startsWith(date) && m.reason !== TRANSFER);
  return {
    date,
    movements: day.length,
    unitsIn: day.filter((m) => m.kind === "in").reduce((n, m) => n + m.qty, 0),
    unitsOut: day.filter((m) => m.kind === "out").reduce((n, m) => n + m.qty, 0),
    wasted: day.filter((m) => m.reason === "Damaged or expired").reduce((n, m) => n + m.qty, 0),
    counts: day.filter((m) => m.kind === "count").length,
  };
}

/** Reason used for both halves of a move between locations; reports leave these out */
export const TRANSFER = "Moved between locations";

/** Did this change take the product to (or below) its reorder point? Used for device notifications. */
export const crossedReorder = (before: number, after: number, reorder: number) => before > reorder && after <= reorder;
