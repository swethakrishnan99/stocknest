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
    expect(inv.current.movements[0]).toMatchObject({ kind: "in", qty: 10, productId: "ING-0012", at: "2026-11-06T10:00", unitCost: 18.5, who: "You" });
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
    act(() => second.current.resetDemo());
    expect(qtyOf(second, "ING-0012")).toBe(6);
  });
});
