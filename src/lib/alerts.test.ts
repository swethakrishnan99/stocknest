import { crossedReorder, currentAlerts, daySummary, TRANSFER } from "./alerts";
import { withDerived } from "./inventory";
import type { Alerts, Batch, Movement, Product, PurchaseOrder } from "../types";

const product = (over: Partial<Product>): Product => ({
  id: "A",
  name: "Milk",
  initial: "M",
  tint: "#fff",
  cat: "Ingredients",
  loc: "Fridge",
  qty: 10,
  unit: "jugs",
  reorder: 4,
  unitCost: 5,
  ...over,
});
const settings: Alerts = { lowStock: true, dailySummary: true, expiry: true, expiryDays: 14 };
const batch = (over: Partial<Batch>): Batch => ({ id: "b", productId: "A", code: "L1", bestBefore: "2026-11-10", qty: 3, loc: "Fridge", ...over });
const order = (over: Partial<PurchaseOrder>): PurchaseOrder => ({
  po: 7,
  productId: "B",
  item: "Butter",
  supplier: "Dairy",
  qty: 5,
  unit: "blocks",
  due: "2026-11-08",
  total: 10,
  note: "",
  ...over,
});
const TODAY = "2026-11-06";

describe("currentAlerts", () => {
  it("lists out and low stock, but not items already on order", () => {
    const products = [product({ id: "A", qty: 0 }), product({ id: "B", name: "Butter", qty: 2 }), product({ id: "C", name: "Cream", qty: 3 })].map(withDerived);
    const list = currentAlerts(products, { B: order({}) }, [], settings, TODAY);
    expect(list.map((a) => [a.kind, a.productId])).toEqual([
      ["out", "A"],
      ["low", "C"],
    ]);
  });

  it("flags late purchase orders", () => {
    const list = currentAlerts([product({ id: "B" })].map(withDerived), { B: order({ due: "2026-11-04" }) }, [], settings, TODAY);
    expect(list[0]).toMatchObject({ kind: "overdue", title: "PO #7 is 2 days late" });
  });

  it("warns about batches near or past their best-before date, within the chosen days", () => {
    const products = [product({})].map(withDerived);
    const batches = [
      batch({ id: "1", code: "OLD", bestBefore: "2026-11-05" }),
      batch({ id: "2", code: "SOON", bestBefore: "2026-11-09" }),
      batch({ id: "3", code: "LATER", bestBefore: "2026-12-30" }),
      batch({ id: "4", code: "EMPTY", bestBefore: "2026-11-07", qty: 0 }),
    ];
    const list = currentAlerts(products, {}, batches, settings, TODAY);
    expect(list.map((a) => a.title)).toEqual(["Milk batch OLD has expired", "Milk batch SOON expires in 3 days"]);
    expect(currentAlerts(products, {}, batches, { ...settings, expiry: false }, TODAY)).toEqual([]);
  });
});

describe("daySummary", () => {
  it("adds up one day, leaving out moves between locations", () => {
    const m = (over: Partial<Movement>): Movement => ({ id: "x", kind: "in", qty: 1, unit: "u", productId: "A", product: "Milk", reason: "Supplier delivery", note: "", loc: "Fridge", who: "Alex", at: "2026-11-05T09:00", ...over });
    const summary = daySummary(
      [
        m({ qty: 10 }),
        m({ kind: "out", qty: 3, reason: "Sold" }),
        m({ kind: "out", qty: 2, reason: "Damaged or expired" }),
        m({ kind: "count", qty: 7, reason: "Stock count correction" }),
        m({ kind: "out", qty: 50, reason: TRANSFER }),
        m({ qty: 99, at: "2026-11-04T09:00" }),
      ],
      "2026-11-05"
    );
    expect(summary).toEqual({ date: "2026-11-05", movements: 4, unitsIn: 10, unitsOut: 5, wasted: 2, counts: 1 });
  });
});

it("spots the moment stock reaches its reorder point", () => {
  expect(crossedReorder(6, 4, 4)).toBe(true);
  expect(crossedReorder(4, 3, 4)).toBe(false); // was already low
  expect(crossedReorder(6, 5, 4)).toBe(false);
});
