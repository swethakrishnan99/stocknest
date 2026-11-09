import { leadDays, poDocument, poEmailLink } from "./purchaseOrder";
import { DEFAULT_BUSINESS, SAMPLE_SUPPLIERS } from "./sampleData";
import type { PurchaseOrder } from "../types";

const line = (productId: string, item: string, qty: number, total: number, po = 1050): PurchaseOrder => ({
  po,
  productId,
  item,
  supplier: "Dairyland Foods",
  qty,
  unit: "blocks",
  due: "2026-11-08",
  total,
  note: "",
});

describe("purchase orders", () => {
  const orders = { A: line("A", "Butter", 20, 139.8), B: line("B", "Cream", 10, 54.9), C: line("C", "Flour", 12, 222, 1051) };

  it("collects every line with the same PO number", () => {
    const doc = poDocument(orders, 1050)!;
    expect(doc.lines.map((l) => l.item)).toEqual(["Butter", "Cream"]);
    expect(doc.total).toBeCloseTo(194.7);
    expect(poDocument(orders, 999)).toBeNull();
  });

  it("writes the email to the supplier", () => {
    const link = poEmailLink(poDocument(orders, 1050)!, DEFAULT_BUSINESS, SAMPLE_SUPPLIERS[1]);
    expect(link.startsWith("mailto:orders%40dairyland.example?subject=")).toBe(true);
    const body = decodeURIComponent(link.split("&body=")[1]);
    expect(body).toContain("- 20 blocks · Butter");
    expect(body).toContain("- 10 blocks · Cream");
    expect(body).toContain("Maple Street Bakery");
  });

  it("uses the supplier's delivery time, or 3 days when it isn't known", () => {
    expect(leadDays(SAMPLE_SUPPLIERS, "Green Acres Farm")).toBe(1);
    expect(leadDays(SAMPLE_SUPPLIERS, "Someone new")).toBe(3);
  });
});
