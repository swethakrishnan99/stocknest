import { applyRemote, changesToPush, fingerprint, markSynced, printsOf, type SyncedState } from "./records";
import { syncRound, type LinkState } from "./syncRound";
import { memoryBackend } from "./memoryBackend";
import { newOnHand, DEFAULT_ALERTS, DEFAULT_BUSINESS } from "../sampleData";
import type { Movement, Product } from "../../types";

const empty: SyncedState = { products: [], movements: [], orders: {}, locations: [], suppliers: [], batches: [], business: { ...DEFAULT_BUSINESS, categories: [] }, alerts: DEFAULT_ALERTS, nextPo: 1001 };
const product = (id: string, qty: number, over: Partial<Product> = {}): Product => ({ id, name: id, initial: "P", tint: "#fff", cat: "Ingredients", loc: "Pantry", qty, unit: "bags", reorder: 2, unitCost: 1, ...over });
let n = 0;

/** A device: its data and its link to the cloud, with the same helpers the app uses */
function device(backend: ReturnType<typeof memoryBackend>, businessId: string, start: SyncedState = empty) {
  let state = start;
  let link: LinkState = { businessId, synced: {}, lastPull: null };
  return {
    get state() {
      return state;
    },
    edit(fn: (s: SyncedState) => SyncedState) {
      state = fn(state);
    },
    /** Records a movement the way the app does: quantity changes here at once, with `before` */
    move(productId: string, kind: Movement["kind"], qty: number, at = `2026-11-06T09:${String(++n).padStart(2, "0")}`) {
      state = {
        ...state,
        products: state.products.map((p) => (p.id === productId ? { ...p, qty: newOnHand(p.qty, kind, qty) } : p)),
        movements: [
          { id: `m${++n}`, kind, qty, unit: "bags", productId, product: productId, reason: "", note: "", loc: "Pantry", who: "x", at, before: state.products.find((p) => p.id === productId)!.qty },
          ...state.movements,
        ],
      };
    },
    join() {
      link = { ...link, replaceLocal: true };
    },
    async sync() {
      const r = await syncRound(backend, link, () => state, empty);
      link = r.link;
      if (r.state) state = r.state;
      return r;
    },
    qty: (id: string) => state.products.find((p) => p.id === id)?.qty,
  };
}

describe("cloud records", () => {
  it("sends only what changed, deletions included", () => {
    const s: SyncedState = { ...empty, products: [product("A", 1), product("B", 2)] };
    const all = changesToPush(s, {});
    expect(all.filter((r) => r.collection === "products").map((r) => r.id)).toEqual(["A", "B"]);
    const synced = markSynced({}, all);
    expect(changesToPush(s, synced)).toEqual([]);
    const later = { ...s, products: [product("A", 1, { name: "Flour" })] };
    expect(changesToPush(later, synced).map((r) => [r.collection, r.id, !!r.deleted])).toEqual([
      ["products", "A", false],
      ["products", "B", true],
    ]);
  });

  it("sends a new product with the quantity it had before its unsent movements, then the movements oldest first", () => {
    const s: SyncedState = {
      ...empty,
      products: [product("A", 13)],
      movements: [
        { id: "m2", kind: "out", qty: 2, unit: "", productId: "A", product: "A", reason: "", note: "", loc: "", who: "", at: "2026-11-06T10:00", before: 15 },
        { id: "m1", kind: "in", qty: 5, unit: "", productId: "A", product: "A", reason: "", note: "", loc: "", who: "", at: "2026-11-06T09:00", before: 10 },
      ],
    };
    const out = changesToPush(s, {});
    expect(out[0]).toMatchObject({ collection: "products", id: "A", data: { qty: 10 } });
    expect(out.slice(1, 3).map((r) => r.id)).toEqual(["m1", "m2"]);
  });

  it("keeps changes made on this device instead of the cloud's version", () => {
    const s: SyncedState = { ...empty, products: [product("A", 1, { name: "Mine" })] };
    const synced = printsOf({ ...s, products: [product("A", 1)] });
    const { state } = applyRemote(s, [{ collection: "products", id: "A", data: product("A", 1, { name: "Theirs" }) }], synced);
    expect(state.products[0].name).toBe("Mine");
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
  });
});

describe("syncing between devices", () => {
  async function setup() {
    const cloud = memoryBackend({ id: "u1", email: "alex@a.test", name: "Alex" });
    const id = await cloud.createBusiness("Bakery", "Alex");
    const a = device(cloud, id, { ...empty, business: { ...empty.business, name: "Bakery", categories: ["Ingredients"] }, products: [product("FLOUR", 10)], locations: [{ name: "Pantry", kind: "", lastCount: null }] });
    await a.sync();
    const b = device(cloud, id);
    b.join();
    await b.sync();
    return { cloud, a, b };
  }

  it("uploads one device and downloads it on another", async () => {
    const { b } = await setup();
    expect(b.qty("FLOUR")).toBe(10);
    expect(b.state.locations.map((l) => l.name)).toEqual(["Pantry"]);
    expect(b.state.business).toMatchObject({ name: "Bakery", categories: ["Ingredients"] }); // settings come too
  });

  it("counts stock recorded on two devices while both were offline", async () => {
    const { cloud, a, b } = await setup();
    cloud.offline = true;
    a.move("FLOUR", "out", 3); // A sells 3: shows 7
    b.move("FLOUR", "in", 5); // B receives 5: shows 15
    await expect(a.sync()).rejects.toThrow("offline");
    expect(a.qty("FLOUR")).toBe(7);
    cloud.offline = false;
    await a.sync();
    await b.sync();
    await a.sync();
    expect(a.qty("FLOUR")).toBe(12); // 10 - 3 + 5, not 7 or 15
    expect(b.qty("FLOUR")).toBe(12);
    expect(a.state.movements).toHaveLength(2);
    expect(b.state.movements.map((m) => m.kind).sort()).toEqual(["in", "out"]);
  });

  it("shares product edits, new products and deletions", async () => {
    const { a, b } = await setup();
    a.edit((s) => ({ ...s, products: [...s.products.map((p) => ({ ...p, name: "All-purpose flour" })), product("SUGAR", 4)] }));
    await a.sync();
    await b.sync();
    expect(b.state.products.map((p) => [p.id, p.name, p.qty])).toEqual([
      ["FLOUR", "All-purpose flour", 10],
      ["SUGAR", "SUGAR", 4],
    ]);
    b.edit((s) => ({ ...s, products: s.products.filter((p) => p.id !== "SUGAR") }));
    await b.sync();
    await a.sync();
    expect(a.state.products.map((p) => p.id)).toEqual(["FLOUR"]);
  });

  it("doesn't lose a change made on the device while a sync was running", async () => {
    const { cloud, a } = await setup();
    const realPull = cloud.pull;
    cloud.pull = async (...args) => {
      a.edit((s) => ({ ...s, nextPo: 1077 })); // the person keeps working mid-sync
      return realPull(...args);
    };
    a.move("FLOUR", "in", 1);
    await a.sync();
    cloud.pull = realPull;
    expect(a.state.nextPo).toBe(1077);
    await a.sync();
    expect(cloud.businesses.get("biz-1")!.rows.get("settings/nextPo")!.data).toEqual({ value: 1077 });
  });

  it("replaces this device's data when joining a business", async () => {
    const { cloud } = await setup();
    const c = device(cloud, "biz-1", { ...empty, products: [product("DEMO", 99)] });
    c.join();
    await c.sync();
    expect(c.state.products.map((p) => p.id)).toEqual(["FLOUR"]);
    expect(cloud.businesses.get("biz-1")!.rows.has("products/DEMO")).toBe(false);
  });
});
