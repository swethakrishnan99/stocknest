import { matchesStatus } from "./sampleData";
import { historyFor, matchesProduct, movementWhen, needsReorder, recentActivity, summarize, valueByCategory, withDerived } from "./inventory";
import type { Movement, Product } from "../types";

const product = (over: Partial<Product>): Product => ({
  id: "ING-0001",
  name: "Flour, 10 kg",
  initial: "F",
  tint: "#fff",
  cat: "Ingredients",
  loc: "Pantry",
  qty: 10,
  unit: "bags",
  reorder: 5,
  unitCost: 2,
  ...over,
});

const movement = (over: Partial<Movement>): Movement => ({
  id: "m1",
  kind: "in",
  qty: 1,
  unit: "bags",
  productId: "ING-0001",
  product: "Flour, 10 kg",
  reason: "Supplier delivery",
  note: "",
  loc: "Pantry",
  who: "Alex",
  at: "2026-11-06T09:00",
  ...over,
});

describe("withDerived", () => {
  it("works out status and value from the quantity", () => {
    expect(withDerived(product({ qty: 10 }))).toMatchObject({ status: "ok", valueNum: 20, value: "$20.00" });
    expect(withDerived(product({ qty: 5 })).status).toBe("low"); // at the reorder point counts as low
    expect(withDerived(product({ qty: 0 })).status).toBe("out");
  });
});

describe("summaries", () => {
  const products = [
    product({ id: "A", qty: 0 }),
    product({ id: "B", qty: 3 }),
    product({ id: "C", qty: 50, cat: "Packaging", unitCost: 1 }),
  ].map(withDerived);

  it("counts products, categories, low and out", () => {
    expect(summarize(products)).toEqual({ products: 3, categories: 2, stockValue: "$56.00", low: 1, out: 1 });
  });

  it("lists out-of-stock first, then low, and skips what is fine", () => {
    expect(needsReorder(products).map((i) => [i.id, i.status, i.left])).toEqual([
      ["A", "out", 0],
      ["B", "low", 3],
    ]);
  });

  it("totals value by category, largest first, as a share of the largest", () => {
    expect(valueByCategory(products)).toEqual([
      { name: "Packaging", valueNum: 50, value: "$50.00", pct: 100 },
      { name: "Ingredients", valueNum: 6, value: "$6.00", pct: 12 },
    ]);
  });
});

describe("matchesProduct", () => {
  const p = product({ id: "ING-0012", name: "All-purpose flour", barcode: "0 62000 41237 5" });
  it("matches name, SKU and barcode digits", () => {
    expect(matchesProduct(p, "purpose")).toBe(true);
    expect(matchesProduct(p, "ing-00")).toBe(true);
    expect(matchesProduct(p, "6200041")).toBe(true);
    expect(matchesProduct(p, "  ")).toBe(true);
    expect(matchesProduct(p, "sugar")).toBe(false);
    expect(matchesProduct(p, "62")).toBe(false); // too few digits to search barcodes
  });
});

describe("movement labels", () => {
  it("shows the time for today and the day otherwise", () => {
    expect(movementWhen(movement({ at: "2026-11-06T09:42" }), true)).toBe("9:42 am");
    expect(movementWhen(movement({ at: "2026-11-05T16:30" }), true)).toBe("Yesterday");
    expect(movementWhen(movement({ at: "2026-11-04T14:15" }))).toBe("Wed, Nov 4, 2:15 pm");
  });

  it("builds recent activity and per-product history", () => {
    const list = [movement({ id: "1", kind: "out", qty: 4 }), movement({ id: "2", productId: "X" })];
    expect(recentActivity(list, 1)[0]).toMatchObject({ signed: "−4", short: "Flour", detail: "Stock out · Supplier delivery" });
    expect(historyFor(list, "ING-0001").map((m) => m.id)).toEqual(["1"]);
  });
});

describe("matchesStatus", () => {
  it("filters by stock status, needs reorder and on order", () => {
    expect(matchesStatus("low", "reorder")).toBe(true);
    expect(matchesStatus("ok", "reorder")).toBe(false);
    expect(matchesStatus("out", "ordered", true)).toBe(true);
    expect(matchesStatus("out", "ordered", false)).toBe(false);
    expect(matchesStatus("ok", "all")).toBe(true);
  });
});
