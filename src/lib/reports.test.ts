import { buildReport, chartTop } from "./reports";
import type { Movement } from "../types";

let n = 0;
const m = (over: Partial<Movement>): Movement => ({
  id: String(n++),
  kind: "out",
  qty: 1,
  unit: "pcs",
  productId: "A",
  product: "Croissant",
  reason: "Sold",
  note: "",
  loc: "Front counter",
  who: "Alex",
  at: "2026-11-06T09:00",
  ...over,
});

const products = [
  { id: "A", unitCost: 2 },
  { id: "B", unitCost: 10 },
];

describe("buildReport", () => {
  const movements = [
    m({ kind: "in", qty: 10, reason: "Made in-house" }), // +$20
    m({ qty: 4 }), // sold, $8
    m({ qty: 2, reason: "Damaged or expired" }), // waste, $4
    m({ productId: "B", product: "Butter", qty: 1, reason: "Used in production", unitCost: 7 }), // saved cost wins: $7
    m({ kind: "count", qty: 99, reason: "Stock count correction" }), // counts are not flow
    m({ qty: 100, at: "2026-10-01T09:00" }), // outside the period
  ];
  const report = buildReport(movements, products, { days: 7, bucket: "day" }, "2026-11-06");

  it("totals stock in, stock out and waste at cost", () => {
    expect(report).toMatchObject({
      from: "2026-10-31",
      to: "2026-11-06",
      unitsIn: 10,
      valueIn: 20,
      unitsOut: 7,
      valueOut: 19,
      wasteUnits: 2,
      wasteValue: 4,
      movementCount: 5,
    });
  });

  it("has one bucket per day, including empty ones", () => {
    expect(report.buckets.map((b) => b.key)).toEqual(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]);
    expect(report.buckets.at(-1)).toMatchObject({ label: "Fri", in: 20, out: 19 });
    expect(report.buckets[0]).toMatchObject({ in: 0, out: 0 });
  });

  it("ranks used and wasted products by value", () => {
    expect(report.topUsed.map((r) => [r.name, r.qty, r.value])).toEqual([
      ["Croissant", 4, 8],
      ["Butter", 1, 7],
    ]);
    expect(report.topWaste.map((r) => [r.name, r.qty, r.value])).toEqual([["Croissant", 2, 4]]);
  });

  it("groups by week starting Monday", () => {
    const weekly = buildReport(movements, products, { days: 28, bucket: "week" }, "2026-11-06");
    expect(weekly.buckets.map((b) => b.label)).toEqual(["Oct 5", "Oct 12", "Oct 19", "Oct 26", "Nov 2"]);
    expect(weekly.buckets.at(-1)).toMatchObject({ in: 20, out: 19 });
  });
});

describe("chartTop", () => {
  it("rounds up to a tidy number", () => {
    expect(chartTop([{ in: 3620, out: 3480 }])).toBe(4000);
    expect(chartTop([{ in: 87, out: 12 }])).toBe(90);
    expect(chartTop([{ in: 0, out: 0 }])).toBe(1);
  });
});
