// Reports worked out from the stock movements. All values are at cost.

import { addDays, monthDay, shortDate, weekStart } from "./dates";
import { TRANSFER } from "./alerts";
import type { Movement, Product } from "../types";

export interface Period {
  id: string;
  label: string;
  days: number;
  bucket: "day" | "week";
}

export interface Bucket {
  key: string; // first day of the bucket
  label: string;
  in: number; // value at cost
  out: number;
}

export interface ProductTotal {
  id: string | null;
  name: string;
  unit: string;
  qty: number;
  value: number;
}

export interface Report {
  from: string;
  to: string;
  unitsIn: number;
  unitsOut: number;
  valueIn: number;
  valueOut: number;
  wasteUnits: number;
  wasteValue: number;
  movementCount: number;
  buckets: Bucket[];
  topUsed: ProductTotal[];
  topWaste: ProductTotal[];
}

export const PERIODS: Period[] = [
  { id: "7d", label: "Last 7 days", days: 7, bucket: "day" },
  { id: "4w", label: "Last 4 weeks", days: 28, bucket: "week" },
  { id: "6w", label: "Last 6 weeks", days: 42, bucket: "week" },
];

export const WASTE_REASON = "Damaged or expired";

/** Unit cost saved with the movement, or the product's current cost for older movements */
const costOf = (m: Movement, costs: Map<string | null, number>) => m.unitCost ?? costs.get(m.productId) ?? 0;

/**
 * Totals, a per-day or per-week chart, the most used products and the most wasted ones
 * for the `days` up to and including `today`.
 */
export function buildReport(
  movements: Movement[],
  products: Pick<Product, "id" | "unitCost">[],
  { days, bucket }: Pick<Period, "days" | "bucket">,
  today: string
): Report {
  const from = addDays(today, -(days - 1));
  const costs = new Map<string | null, number>(products.map((p) => [p.id, p.unitCost]));
  const inRange = movements.filter((m) => {
    const d = m.at.slice(0, 10);
    return d >= from && d <= today;
  });

  // Chart buckets, oldest first, so empty days and weeks still show
  const keyOf = (date: string) => (bucket === "day" ? date : weekStart(date));
  const buckets: Bucket[] = [];
  for (let d = keyOf(from); d <= today; d = addDays(d, bucket === "day" ? 1 : 7)) {
    buckets.push({ key: d, label: bucket === "day" ? shortDate(d).split(",")[0] : monthDay(d), in: 0, out: 0 });
  }
  const bucketFor = new Map(buckets.map((b) => [b.key, b]));

  const totals = { unitsIn: 0, unitsOut: 0, valueIn: 0, valueOut: 0, wasteUnits: 0, wasteValue: 0 };
  const used = new Map<string, ProductTotal>();
  const wasted = new Map<string, ProductTotal>();
  const add = (map: Map<string, ProductTotal>, m: Movement, value: number) => {
    const row = map.get(m.productId ?? m.product) ?? { id: m.productId, name: m.product, unit: m.unit, qty: 0, value: 0 };
    row.qty += m.qty;
    row.value += value;
    map.set(m.productId ?? m.product, row);
  };

  for (const m of inRange) {
    if (m.kind === "count") continue; // counts set a quantity; they are not stock moving in or out
    if (m.reason === TRANSFER) continue; // moving between locations isn't stock in or out
    const value = m.qty * costOf(m, costs);
    const b = bucketFor.get(keyOf(m.at.slice(0, 10)));
    if (m.kind === "in") {
      totals.unitsIn += m.qty;
      totals.valueIn += value;
      if (b) b.in += value;
    } else {
      totals.unitsOut += m.qty;
      totals.valueOut += value;
      if (b) b.out += value;
      if (m.reason === WASTE_REASON) {
        totals.wasteUnits += m.qty;
        totals.wasteValue += value;
        add(wasted, m, value);
      } else {
        add(used, m, value);
      }
    }
  }

  const byValue = (a: ProductTotal, b: ProductTotal) => b.value - a.value || a.name.localeCompare(b.name);
  return {
    from,
    to: today,
    ...totals,
    movementCount: inRange.length,
    buckets,
    topUsed: [...used.values()].sort(byValue).slice(0, 5),
    topWaste: [...wasted.values()].sort(byValue).slice(0, 5),
  };
}

/** A round number just above the largest bar, so the chart has a tidy top */
export function chartTop(buckets: Pick<Bucket, "in" | "out">[]): number {
  const max = Math.max(1, ...buckets.flatMap((b) => [b.in, b.out]));
  const step = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / step) * step;
}
