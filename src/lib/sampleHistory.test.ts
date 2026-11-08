import { buildSampleData, FIRST_PO_NUMBER, HISTORY_DAYS } from "./sampleHistory";
import { addDays, weekday } from "./dates";
import { stockStatus } from "./sampleData";

const TODAY = "2026-11-06";
const sample = buildSampleData(TODAY, 10 * 60);

describe("sample data", () => {
  it("has 51 products, six needing reorder", () => {
    expect(sample.products).toHaveLength(51);
    const reorder = sample.products.filter((p) => stockStatus(p.qty, p.reorder) !== "ok").map((p) => p.id);
    expect(reorder.sort()).toEqual(["ING-0012", "ING-0031", "ING-0044", "ING-0052", "PKG-0102", "PKG-0118"]);
  });

  it("is the same every time for the same day", () => {
    expect(buildSampleData(TODAY, 10 * 60)).toEqual(sample);
  });

  it("covers six weeks, newest first, with nothing in the future or on Mondays", () => {
    const dates = sample.movements.map((m) => m.at);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(dates[0] <= `${TODAY}T10:00`).toBe(true);
    expect(dates.at(-1)! >= addDays(TODAY, -HISTORY_DAYS)).toBe(true);
    expect(sample.movements.some((m) => weekday(m.at.slice(0, 10)) === 1)).toBe(false);
    expect(new Set(sample.movements.map((m) => m.id)).size).toBe(sample.movements.length);
  });

  it("adds up: walking back from today's quantity never goes below zero and matches every count", () => {
    for (const p of sample.products) {
      let qty: number | null = p.qty;
      for (const m of sample.movements.filter((x) => x.productId === p.id)) {
        if (m.kind === "count") {
          if (qty !== null) expect(m.qty, `${p.id} count on ${m.at}`).toBe(qty);
          qty = null; // what it was before the count isn't recorded
          continue;
        }
        if (qty === null) continue;
        qty += m.kind === "in" ? -m.qty : m.qty;
        expect(qty, `${p.id} before ${m.at}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("numbers supplier deliveries up to the first PO the app will use", () => {
    const pos = sample.movements.filter((m) => m.reason === "Supplier delivery").map((m) => Number(/PO #(\d+)/.exec(m.note)?.[1]));
    expect(pos.every(Number.isInteger)).toBe(true);
    expect(Math.max(...pos)).toBe(FIRST_PO_NUMBER - 1);
  });

  it("records when each location was last counted", () => {
    for (const l of sample.locations) {
      const last = sample.movements.find((m) => m.kind === "count" && m.loc === l.name);
      expect(l.lastCount).toBe(last?.at.slice(0, 10) ?? null);
    }
  });
});
