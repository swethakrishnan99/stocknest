import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import InventoryProvider from "./InventoryProvider";
import { useInventory } from "./inventoryContext";
import type { PurchaseOrder } from "../types";

const wrapper = ({ children }: { children: ReactNode }) => <InventoryProvider>{children}</InventoryProvider>;
const setup = () => renderHook(() => useInventory(), { wrapper }).result;

const order = (over: Partial<PurchaseOrder> = {}): PurchaseOrder => ({
  po: 1046,
  productId: "ING-0031",
  item: "Unsalted butter, 454 g",
  supplier: "Dairyland Foods",
  qty: 20,
  unit: "blocks",
  due: "2026-11-08",
  total: 139.8,
  note: "",
  ...over,
});

const qtyOf = (inv: ReturnType<typeof setup>, id: string) => inv.current.products.find((p) => p.id === id)?.qty;

describe("InventoryProvider", () => {
  it("starts with the sample bakery", () => {
    const inv = setup();
    expect(inv.current.products).toHaveLength(51);
    expect(inv.current.summary).toMatchObject({ products: 51, low: 3, out: 3 });
    expect(inv.current.reorderList.map((i) => i.id)).toEqual(["ING-0044", "PKG-0102", "PKG-0118", "ING-0012", "ING-0031", "ING-0052"]);
  });

  it("records a movement: quantity, history, status and location count date all update", () => {
    const inv = setup();
    act(() => inv.current.recordMovement("ING-0012", { mode: "in", qty: 10, reason: "Supplier delivery", note: "Test" }));
    expect(qtyOf(inv, "ING-0012")).toBe(16);
    expect(inv.current.movements[0]).toMatchObject({ kind: "in", qty: 10, productId: "ING-0012", at: "2026-11-06T10:00", unitCost: 18.5, who: "Alex", before: 6 });
    expect(inv.current.reorderList.some((i) => i.id === "ING-0012")).toBe(false);

    act(() => inv.current.recordMovement("ING-0012", { mode: "out", qty: 100, reason: "Sold", note: "" }));
    expect(qtyOf(inv, "ING-0012")).toBe(0); // never below zero

    act(() => inv.current.recordMovement("ING-0012", { mode: "count", qty: 7, reason: "Stock count correction", note: "" }));
    expect(qtyOf(inv, "ING-0012")).toBe(7);
    expect(inv.current.locations.find((l) => l.name === "Pantry")?.lastCount).toBe("2026-11-06");
  });

  it("receives a short delivery and closes the order", () => {
    const inv = setup();
    act(() => inv.current.placeOrder(order()));
    expect(inv.current.nextPo).toBe(1047);
    act(() => inv.current.receiveOrder("ING-0031", { qty: 18, note: "" }));
    expect(qtyOf(inv, "ING-0031")).toBe(22);
    expect(inv.current.orders).toEqual({});
    expect(inv.current.movements[0]).toMatchObject({ reason: "Supplier delivery", note: "PO #1046 · Dairyland Foods · 18 of 20 received" });
  });

  it("never reuses a PO number after an order is cancelled", () => {
    const inv = setup();
    act(() => inv.current.placeOrder(order()));
    act(() => inv.current.cancelOrder("ING-0031"));
    expect(inv.current.orders).toEqual({});
    expect(inv.current.nextPo).toBe(1047);
  });

  it("deletes a product (and its open order) and can put it back", () => {
    const inv = setup();
    act(() => inv.current.placeOrder(order()));
    const butter = inv.current.rawProduct("ING-0031")!;
    act(() => inv.current.deleteProduct("ING-0031"));
    expect(inv.current.products.some((p) => p.id === "ING-0031")).toBe(false);
    expect(inv.current.orders["ING-0031"]).toBeUndefined();
    expect(inv.current.movements.some((m) => m.productId === "ING-0031")).toBe(true); // history stays
    act(() => inv.current.restoreProduct(butter));
    expect(inv.current.rawProduct("ING-0031")).toEqual(butter);
  });

  it("renames a product's past movements and keeps its quantity when edited", () => {
    const inv = setup();
    act(() => inv.current.updateProduct("ING-0012", { name: "Flour", qty: 999 }));
    expect(inv.current.rawProduct("ING-0012")).toMatchObject({ name: "Flour", qty: 6 });
    expect(inv.current.movements.filter((m) => m.productId === "ING-0012").every((m) => m.product === "Flour")).toBe(true);
  });

  it("saves to localStorage, so a reload keeps the changes, and resets to the sample", () => {
    const first = setup();
    act(() => first.current.recordMovement("ING-0012", { mode: "count", qty: 42, reason: "Stock count correction", note: "" }));
    const second = setup();
    expect(qtyOf(second, "ING-0012")).toBe(42);
    act(() => second.current.loadDemo());
    expect(qtyOf(second, "ING-0012")).toBe(6);
  });

  it("starts an empty business of your own from a template", () => {
    const inv = setup();
    act(() =>
      inv.current.startOwnBusiness({ businessName: "Rosie's Gifts", ownerName: "Rosie Lee", ownerEmail: "rosie@example.com", templateId: "retail", locations: ["Shop floor", "Garage"] })
    );
    expect(inv.current.mode).toBe("own");
    expect(inv.current.products).toEqual([]);
    expect(inv.current.movements).toEqual([]);
    expect(inv.current.business).toMatchObject({ name: "Rosie's Gifts", categories: ["Products for sale", "Packaging", "Shop supplies"] });
    expect(inv.current.locationNames).toEqual(["Shop floor", "Garage"]);
    expect(inv.current.currentUser).toMatchObject({ name: "Rosie Lee", role: "Owner" });
    expect(inv.current.nextPo).toBe(1001);
  });

  it("checks what the person using the device may do, and records movements under their name", () => {
    const inv = setup();
    expect(inv.current.can("manageData")).toBe(true); // Alex, the owner
    act(() => inv.current.switchUser("priya@maplestreetbakery.ca"));
    expect(inv.current.currentUser?.name).toBe("Priya Shah");
    expect(inv.current.can("editProducts")).toBe(false);
    expect(inv.current.can("viewReports")).toBe(false);
    act(() => inv.current.recordMovement("ING-0012", { mode: "out", qty: 1, reason: "Used in production", note: "" }));
    expect(inv.current.movements[0].who).toBe("Priya");
  });

  it("moves all or part of a product's stock to another location", () => {
    const inv = setup();
    // Part of it: a second entry appears at the new location
    let twin: string | null = null;
    act(() => {
      twin = inv.current.transferStock("ING-0007", "Storage room", 10);
    });
    expect(twin).toBe("ING-0075");
    expect(inv.current.rawProduct("ING-0007")).toMatchObject({ qty: 28, loc: "Pantry" });
    expect(inv.current.rawProduct("ING-0075")).toMatchObject({ qty: 10, loc: "Storage room", name: "Granulated sugar, 2 kg" });
    // More of it goes onto the same entry
    act(() => {
      inv.current.transferStock("ING-0007", "Storage room", 5);
    });
    expect(inv.current.rawProduct("ING-0075")?.qty).toBe(15);
    expect(inv.current.movements.slice(0, 2).map((m) => [m.kind, m.qty, m.reason])).toEqual([
      ["in", 5, "Moved between locations"],
      ["out", 5, "Moved between locations"],
    ]);
    // All of it, with nothing there yet: the product just changes location
    act(() => {
      inv.current.transferStock("ING-0008", "Fridge", 999);
    });
    expect(inv.current.rawProduct("ING-0008")).toMatchObject({ qty: 14, loc: "Fridge" });
    expect(inv.current.summary.products).toBe(52);
  });

  it("undoes the latest movement of a product, but not older ones", () => {
    const inv = setup();
    act(() => inv.current.recordMovement("ING-0012", { mode: "out", qty: 100, reason: "Sold", note: "" }));
    act(() => inv.current.recordMovement("ING-0012", { mode: "in", qty: 4, reason: "Supplier delivery", note: "" }));
    const [latest, older] = inv.current.movements;
    let ok = true;
    act(() => {
      ok = inv.current.undoMovement(older.id);
    });
    expect(ok).toBe(false);
    act(() => {
      ok = inv.current.undoMovement(latest.id);
    });
    expect(ok).toBe(true);
    expect(qtyOf(inv, "ING-0012")).toBe(0);
    act(() => {
      inv.current.undoMovement(inv.current.movements[0].id);
    });
    expect(qtyOf(inv, "ING-0012")).toBe(6); // back where it started, even though only 6 could go out
  });

  it("places one purchase order for several products, and adds a batch when received with a date", () => {
    const inv = setup();
    act(() =>
      inv.current.placeOrders([order(), order({ productId: "ING-0052", item: "Free-range eggs, 30 pack", qty: 10, unit: "packs", supplier: "Dairyland Foods" })])
    );
    expect(Object.values(inv.current.orders).map((o) => o.po)).toEqual([1046, 1046]);
    expect(inv.current.nextPo).toBe(1047);
    act(() => inv.current.receiveOrder("ING-0052", { qty: 10, note: "", batch: { code: "GA-7", bestBefore: "2026-11-20" } }));
    expect(inv.current.batches.find((b) => b.code === "GA-7")).toMatchObject({ productId: "ING-0052", qty: 10, bestBefore: "2026-11-20", loc: "Fridge" });
    expect(Object.keys(inv.current.orders)).toEqual(["ING-0031"]);
  });

  it("backs up everything and restores it", () => {
    const inv = setup();
    act(() => inv.current.recordMovement("ING-0012", { mode: "count", qty: 42, reason: "Stock count correction", note: "" }));
    const backup = JSON.parse(JSON.stringify(inv.current.exportBackup()));
    act(() => inv.current.startOwnBusiness({ businessName: "Other", ownerName: "", ownerEmail: "", templateId: "other", locations: ["A"] }));
    expect(inv.current.products).toHaveLength(0);
    act(() => inv.current.restoreBackup(backup));
    expect(inv.current.mode).toBe(backup.mode);
    expect(qtyOf(inv, "ING-0012")).toBe(42);
    expect(inv.current.business.name).toBe("Maple Street Bakery");
  });

  it("goes back to the welcome screen on start over", () => {
    const inv = setup();
    act(() => inv.current.startOver());
    expect(inv.current.mode).toBeNull();
  });
});
