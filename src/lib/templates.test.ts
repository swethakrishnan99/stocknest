import { skuPrefix, templateFor, tintFor } from "./templates";
import { findByCode, undoableMovements } from "./inventory";
import { can } from "./permissions";
import type { Movement } from "../types";

it("makes SKU prefixes from category names", () => {
  expect(skuPrefix("Ingredients")).toBe("ING");
  expect(skuPrefix("Products for sale")).toBe("PRO");
  expect(skuPrefix("3D prints")).toBe("DPR");
  expect(skuPrefix("Ab")).toBe("ABX");
});

it("falls back to the general template", () => {
  expect(templateFor("retail").categories).toContain("Products for sale");
  expect(templateFor("nope").id).toBe("other");
  expect(tintFor(["A", "B"], "B")).not.toBe(tintFor(["A", "B"], "A"));
});

it("gives each role the right permissions", () => {
  expect(can("Owner", "manageData")).toBe(true);
  expect(can("Manager", "editProducts")).toBe(true);
  expect(can("Manager", "manageTeam")).toBe(false);
  expect(can("Staff", "editProducts")).toBe(false);
  expect(can("Staff", "viewReports")).toBe(false);
  expect(can(undefined, "order")).toBe(false);
});

it("finds products by SKU, barcode or a unique part of the name", () => {
  const products = [
    { id: "ING-0012", name: "All-purpose flour", barcode: "0 62000 41237 5" },
    { id: "ING-0015", name: "Whole wheat flour", barcode: "" },
  ];
  expect(findByCode(products, "ing-0015").product?.id).toBe("ING-0015");
  expect(findByCode(products, "062000412375").product?.id).toBe("ING-0012");
  expect(findByCode(products, "wheat").product?.id).toBe("ING-0015");
  expect(findByCode(products, "flour")).toEqual({ product: null, matches: 2 });
  expect(findByCode(products, "sugar")).toEqual({ product: null, matches: 0 });
});

it("only lets each product's latest in-app movement be undone, and never half a move", () => {
  const m = (id: string, productId: string, over: Partial<Movement> = {}): Movement => ({
    id, kind: "in", qty: 1, unit: "u", productId, product: productId, reason: "Supplier delivery", note: "", loc: "", who: "", at: "2026-11-06T09:00", ...over,
  });
  const list = [m("1", "A", { before: 3 }), m("2", "A", { before: 2 }), m("3", "B"), m("4", "C", { before: 1, reason: "Moved between locations" })];
  expect([...undoableMovements(list)]).toEqual(["1"]);
});
