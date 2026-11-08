// Sample data for Maple Street Bakery: 51 products and six weeks of stock movements.
//
// The history is generated, not typed out: it walks backwards from today's quantities, so every
// product's movements add up to what is on hand now. A fixed seed means the same day always gives
// the same history. The bakery is closed on Mondays.

import { addDays, weekday, daysBetween } from "./dates";

export const HISTORY_DAYS = 42;
export const FIRST_PO_NUMBER = 1046; // the first purchase order placed in the app
const STAFF = { owner: "Alex", staff: "Priya" };
const IN_HOUSE = "Made in-house";

// sim: u = average used or sold per open day, pack = usual order size, out = days it has been out of stock,
// waste = chance per day that some is thrown away, wasteNote = why
const CATALOGUE = [
  // Ingredients · Pantry
  { id: "ING-0012", name: "All-purpose flour, 10 kg", initial: "F", tint: "#F3E9D7", cat: "Ingredients", loc: "Pantry", qty: 6, unit: "bags", reorder: 10, unitCost: 18.5, supplier: "Prairie Mills", barcode: "0 62000 41237 5", sim: { u: 2.2, pack: 12, waste: 0.02, wasteNote: "Torn bag" } },
  { id: "ING-0015", name: "Whole wheat flour, 10 kg", initial: "W", tint: "#F3E9D7", cat: "Ingredients", loc: "Pantry", qty: 9, unit: "bags", reorder: 4, unitCost: 21, supplier: "Prairie Mills", sim: { u: 0.7, pack: 8 } },
  { id: "ING-0018", name: "Bread flour, 20 kg", initial: "B", tint: "#F3E9D7", cat: "Ingredients", loc: "Pantry", qty: 7, unit: "bags", reorder: 3, unitCost: 34, supplier: "Prairie Mills", sim: { u: 0.8, pack: 8 } },
  { id: "ING-0007", name: "Granulated sugar, 2 kg", initial: "S", tint: "#EEF0F5", cat: "Ingredients", loc: "Pantry", qty: 38, unit: "bags", reorder: 15, unitCost: 4.5, supplier: "Prairie Mills", sim: { u: 1.8, pack: 24 } },
  { id: "ING-0008", name: "Brown sugar, 2 kg", initial: "B", tint: "#EEF0F5", cat: "Ingredients", loc: "Pantry", qty: 14, unit: "bags", reorder: 6, unitCost: 5.25, supplier: "Prairie Mills", sim: { u: 0.6, pack: 12 } },
  { id: "ING-0009", name: "Icing sugar, 1 kg", initial: "I", tint: "#EEF0F5", cat: "Ingredients", loc: "Pantry", qty: 18, unit: "bags", reorder: 8, unitCost: 3.4, supplier: "Prairie Mills", sim: { u: 0.9, pack: 20 } },
  { id: "ING-0021", name: "Instant yeast, 500 g", initial: "Y", tint: "#EADBCB", cat: "Ingredients", loc: "Pantry", qty: 11, unit: "packs", reorder: 4, unitCost: 7.8, supplier: "Bakers Pantry Supply", sim: { u: 0.5, pack: 12 } },
  { id: "ING-0024", name: "Sea salt, 1 kg", initial: "S", tint: "#EEF0F5", cat: "Ingredients", loc: "Pantry", qty: 9, unit: "bags", reorder: 3, unitCost: 3.1, supplier: "Bakers Pantry Supply", sim: { u: 0.3, pack: 10 } },
  { id: "ING-0026", name: "Baking powder, 1 kg", initial: "B", tint: "#EEF0F5", cat: "Ingredients", loc: "Pantry", qty: 6, unit: "tubs", reorder: 2, unitCost: 9.75, supplier: "Bakers Pantry Supply", sim: { u: 0.2, pack: 6 } },
  { id: "ING-0027", name: "Baking soda, 1 kg", initial: "B", tint: "#EEF0F5", cat: "Ingredients", loc: "Pantry", qty: 5, unit: "boxes", reorder: 2, unitCost: 4.2, supplier: "Bakers Pantry Supply", sim: { u: 0.15, pack: 6 } },
  { id: "ING-0044", name: "Vanilla extract, 500 ml", initial: "V", tint: "#EADBCB", cat: "Ingredients", loc: "Pantry", qty: 0, unit: "bottles", reorder: 3, unitCost: 24, supplier: "Bakers Pantry Supply", sim: { u: 0.3, pack: 6, out: 4 } },
  { id: "ING-0046", name: "Ground cinnamon, 500 g", initial: "C", tint: "#EADBCB", cat: "Ingredients", loc: "Pantry", qty: 4, unit: "jars", reorder: 2, unitCost: 13.5, supplier: "Bakers Pantry Supply", sim: { u: 0.15, pack: 4 } },
  { id: "ING-0048", name: "Cocoa powder, 1 kg", initial: "C", tint: "#EADBCB", cat: "Ingredients", loc: "Pantry", qty: 7, unit: "bags", reorder: 3, unitCost: 16.9, supplier: "Bakers Pantry Supply", sim: { u: 0.3, pack: 6 } },
  { id: "ING-0049", name: "Dark chocolate chips, 2 kg", initial: "C", tint: "#EADBCB", cat: "Ingredients", loc: "Pantry", qty: 9, unit: "bags", reorder: 4, unitCost: 28, supplier: "Bakers Pantry Supply", sim: { u: 0.5, pack: 8 } },
  { id: "ING-0055", name: "Rolled oats, 5 kg", initial: "O", tint: "#F3E9D7", cat: "Ingredients", loc: "Pantry", qty: 5, unit: "bags", reorder: 2, unitCost: 11.5, supplier: "Prairie Mills", sim: { u: 0.2, pack: 5 } },
  { id: "ING-0057", name: "Walnut halves, 1 kg", initial: "W", tint: "#EADBCB", cat: "Ingredients", loc: "Pantry", qty: 6, unit: "bags", reorder: 2, unitCost: 19.5, supplier: "Bakers Pantry Supply", sim: { u: 0.25, pack: 6 } },
  { id: "ING-0058", name: "Raisins, 2 kg", initial: "R", tint: "#EADBCB", cat: "Ingredients", loc: "Pantry", qty: 5, unit: "bags", reorder: 2, unitCost: 12.4, supplier: "Bakers Pantry Supply", sim: { u: 0.15, pack: 4 } },
  { id: "ING-0060", name: "Vegetable oil, 3 L", initial: "O", tint: "#FBF1C9", cat: "Ingredients", loc: "Pantry", qty: 7, unit: "jugs", reorder: 3, unitCost: 10.99, supplier: "Bakers Pantry Supply", sim: { u: 0.35, pack: 6 } },
  { id: "ING-0062", name: "Maple syrup, 1 L", initial: "M", tint: "#FBF1C9", cat: "Ingredients", loc: "Pantry", qty: 8, unit: "bottles", reorder: 3, unitCost: 17.5, supplier: "Green Acres Farm", sim: { u: 0.35, pack: 6 } },
  // Ingredients · Fridge
  { id: "ING-0031", name: "Unsalted butter, 454 g", initial: "B", tint: "#FBF1C9", cat: "Ingredients", loc: "Fridge", qty: 4, unit: "blocks", reorder: 12, unitCost: 6.99, supplier: "Dairyland Foods", sim: { u: 4.5, pack: 24 } },
  { id: "ING-0052", name: "Free-range eggs, 30 pack", initial: "E", tint: "#F3E9D7", cat: "Ingredients", loc: "Fridge", qty: 3, unit: "packs", reorder: 8, unitCost: 9.5, supplier: "Green Acres Farm", sim: { u: 1.6, pack: 10, waste: 0.03, wasteNote: "Cracked in delivery" } },
  { id: "ING-0033", name: "Whole milk, 4 L", initial: "M", tint: "#EEF0F5", cat: "Ingredients", loc: "Fridge", qty: 9, unit: "jugs", reorder: 4, unitCost: 6.29, supplier: "Dairyland Foods", sim: { u: 1.4, pack: 8, waste: 0.1, wasteNote: "Past best before" } },
  { id: "ING-0034", name: "Heavy cream, 1 L", initial: "C", tint: "#EEF0F5", cat: "Ingredients", loc: "Fridge", qty: 10, unit: "cartons", reorder: 4, unitCost: 5.49, supplier: "Dairyland Foods", sim: { u: 1.1, pack: 10, waste: 0.08, wasteNote: "Past best before" } },
  { id: "ING-0036", name: "Cream cheese, 1.36 kg", initial: "C", tint: "#EEF0F5", cat: "Ingredients", loc: "Fridge", qty: 6, unit: "tubs", reorder: 2, unitCost: 14.8, supplier: "Dairyland Foods", sim: { u: 0.4, pack: 4, waste: 0.03, wasteNote: "Past best before" } },
  { id: "ING-0038", name: "Plain yogurt, 750 g", initial: "Y", tint: "#EEF0F5", cat: "Ingredients", loc: "Fridge", qty: 7, unit: "tubs", reorder: 3, unitCost: 4.6, supplier: "Dairyland Foods", sim: { u: 0.5, pack: 6, waste: 0.06, wasteNote: "Past best before" } },
  // Ingredients · Freezer
  { id: "ING-0070", name: "Frozen blueberries, 2.5 kg", initial: "B", tint: "#DCEAF7", cat: "Ingredients", loc: "Freezer", qty: 8, unit: "bags", reorder: 3, unitCost: 15.9, supplier: "Green Acres Farm", sim: { u: 0.5, pack: 6 } },
  { id: "ING-0072", name: "Frozen raspberries, 2.5 kg", initial: "R", tint: "#DCEAF7", cat: "Ingredients", loc: "Freezer", qty: 6, unit: "bags", reorder: 2, unitCost: 18.5, supplier: "Green Acres Farm", sim: { u: 0.25, pack: 4 } },
  { id: "ING-0074", name: "Puff pastry sheets, 1 kg", initial: "P", tint: "#DCEAF7", cat: "Ingredients", loc: "Freezer", qty: 10, unit: "boxes", reorder: 4, unitCost: 9.9, supplier: "Bakers Pantry Supply", sim: { u: 0.6, pack: 10 } },
  // Packaging · Storage room
  { id: "PKG-0102", name: "Cake boxes, 10 in", initial: "C", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 0, unit: "boxes", reorder: 50, unitCost: 1.2, supplier: "PackRight", sim: { u: 5, pack: 100, out: 3 } },
  { id: "PKG-0104", name: "Cake boxes, 8 in", initial: "C", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 85, unit: "boxes", reorder: 40, unitCost: 0.95, supplier: "PackRight", sim: { u: 4, pack: 100 } },
  { id: "PKG-0106", name: "Cupcake boxes, 6 count", initial: "C", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 120, unit: "boxes", reorder: 50, unitCost: 0.85, supplier: "PackRight", sim: { u: 5, pack: 100 } },
  { id: "PKG-0110", name: "Paper bags, medium", initial: "P", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 640, unit: "bags", reorder: 200, unitCost: 0.15, supplier: "PackRight", sim: { u: 42, pack: 500 } },
  { id: "PKG-0112", name: "Paper bags, large", initial: "P", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 380, unit: "bags", reorder: 150, unitCost: 0.22, supplier: "PackRight", sim: { u: 18, pack: 400 } },
  { id: "PKG-0115", name: "Kraft bread bags", initial: "B", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 450, unit: "bags", reorder: 200, unitCost: 0.12, supplier: "PackRight", sim: { u: 30, pack: 500 } },
  { id: "PKG-0118", name: "Parchment paper, 100 sheets", initial: "P", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 0, unit: "packs", reorder: 6, unitCost: 8.5, supplier: "PackRight", sim: { u: 0.8, pack: 12, out: 2 } },
  { id: "PKG-0120", name: "Coffee cups, 12 oz", initial: "C", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 600, unit: "cups", reorder: 250, unitCost: 0.14, supplier: "PackRight", sim: { u: 55, pack: 1000 } },
  { id: "PKG-0122", name: "Cup lids, 12 oz", initial: "L", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 650, unit: "lids", reorder: 250, unitCost: 0.06, supplier: "PackRight", sim: { u: 55, pack: 1000 } },
  { id: "PKG-0125", name: "Pastry labels, roll of 500", initial: "L", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 6, unit: "rolls", reorder: 2, unitCost: 11, supplier: "PackRight", sim: { u: 0.15, pack: 6 } },
  // Supplies · Storage room
  { id: "SUP-0021", name: "Nitrile gloves, box of 100", initial: "G", tint: "#DCEAF7", cat: "Supplies", loc: "Storage room", qty: 5, unit: "boxes", reorder: 4, unitCost: 12.5, supplier: "Bakers Pantry Supply", sim: { u: 0.4, pack: 10 } },
  { id: "SUP-0023", name: "Hairnets, pack of 100", initial: "H", tint: "#DCEAF7", cat: "Supplies", loc: "Storage room", qty: 4, unit: "packs", reorder: 2, unitCost: 6.5, supplier: "Bakers Pantry Supply", sim: { u: 0.1, pack: 4 } },
  { id: "SUP-0025", name: "Dish soap, 3.8 L", initial: "D", tint: "#DCEAF7", cat: "Supplies", loc: "Storage room", qty: 3, unit: "jugs", reorder: 1, unitCost: 14.25, supplier: "Bakers Pantry Supply", sim: { u: 0.1, pack: 3 } },
  { id: "SUP-0027", name: "Food-safe sanitizer, 4 L", initial: "S", tint: "#DCEAF7", cat: "Supplies", loc: "Storage room", qty: 4, unit: "jugs", reorder: 2, unitCost: 18.9, supplier: "Bakers Pantry Supply", sim: { u: 0.12, pack: 4 } },
  { id: "SUP-0029", name: "Paper towels, case of 12", initial: "T", tint: "#DCEAF7", cat: "Supplies", loc: "Storage room", qty: 3, unit: "cases", reorder: 1, unitCost: 32, supplier: "PackRight", sim: { u: 0.08, pack: 3 } },
  // Baked goods · Front counter (baked every morning; what's left at closing is donated)
  { id: "BKD-0003", name: "Sourdough loaf", initial: "S", tint: "#E6DCF5", cat: "Baked goods", loc: "Front counter", qty: 22, unit: "loaves", reorder: 10, unitCost: 3, supplier: IN_HOUSE, sim: { u: 26, baked: true } },
  { id: "BKD-0004", name: "Baguette", initial: "B", tint: "#E6DCF5", cat: "Baked goods", loc: "Front counter", qty: 18, unit: "loaves", reorder: 8, unitCost: 0.9, supplier: IN_HOUSE, sim: { u: 22, baked: true } },
  { id: "BKD-0006", name: "Cinnamon roll", initial: "C", tint: "#E6DCF5", cat: "Baked goods", loc: "Front counter", qty: 20, unit: "pcs", reorder: 10, unitCost: 1.1, supplier: IN_HOUSE, sim: { u: 24, baked: true } },
  { id: "BKD-0009", name: "Croissant", initial: "C", tint: "#E6DCF5", cat: "Baked goods", loc: "Front counter", qty: 36, unit: "pcs", reorder: 24, unitCost: 1.2, supplier: IN_HOUSE, sim: { u: 48, baked: true } },
  { id: "BKD-0011", name: "Blueberry muffin", initial: "M", tint: "#E6DCF5", cat: "Baked goods", loc: "Front counter", qty: 24, unit: "pcs", reorder: 12, unitCost: 0.85, supplier: IN_HOUSE, sim: { u: 28, baked: true } },
  { id: "BKD-0012", name: "Chocolate chip cookie", initial: "C", tint: "#E6DCF5", cat: "Baked goods", loc: "Front counter", qty: 40, unit: "pcs", reorder: 20, unitCost: 0.45, supplier: IN_HOUSE, sim: { u: 45, baked: true } },
  { id: "BKD-0014", name: "Banana bread", initial: "B", tint: "#E6DCF5", cat: "Baked goods", loc: "Front counter", qty: 6, unit: "loaves", reorder: 3, unitCost: 3.6, supplier: IN_HOUSE, sim: { u: 6, baked: true } },
  { id: "BKD-0016", name: "Maple pecan tart", initial: "T", tint: "#E6DCF5", cat: "Baked goods", loc: "Front counter", qty: 12, unit: "pcs", reorder: 6, unitCost: 2.4, supplier: IN_HOUSE, sim: { u: 13, baked: true } },
];

export const SAMPLE_LOCATIONS = [
  { name: "Pantry", kind: "Dry goods shelves" },
  { name: "Fridge", kind: "Walk-in cooler · 2–4 °C" },
  { name: "Freezer", kind: "Chest freezer · −18 °C" },
  { name: "Storage room", kind: "Packaging and supplies" },
  { name: "Front counter", kind: "Display case and shelves" },
];

/** Small seeded random number generator (mulberry32), so the history is the same every time. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (text) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
const pad = (n) => String(n).padStart(2, "0");
const at = (date, minutes) => `${date}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Used per open day: whole numbers around the average; small averages become "sometimes one". */
function usage(rand, u) {
  if (u < 1) return rand() < u ? 1 : 0;
  return Math.max(0, Math.round(u * (0.55 + rand() * 0.9)));
}

const PRODUCTION_NOTES = ["Morning production", "Croissant lamination", "Cookie batch", "Wholesale order · Lakeside Café", "Weekend prep", ""];
const SALES_NOTES = ["Counter sales", "Counter sales", "Counter sales", "Wholesale · Lakeside Café", "Online pickup orders"];

/**
 * One product's events for one day, oldest first, before quantities are known.
 * A "delivery" event is only a slot: whether a delivery happened is decided when walking back.
 */
function dayEvents(p, date, daysAgo, rand, nowMinutes) {
  const { sim } = p;
  const events = [];
  const isToday = daysAgo === 0;
  const late = (from, to) => from + Math.floor(rand() * (to - from)); // minutes after midnight
  // Today only has the early morning so far, and nothing later than the time it is now
  const cap = Math.min(nowMinutes, 9 * 60 + 30);
  if (isToday && cap <= 6 * 60 + 20) return [];
  const when = (from, to) => (isToday ? late(Math.min(from, cap - 1), cap) : late(from, to));

  if (weekday(date) === 5 && countsThisWeek(p.loc, date) && (!isToday || cap > 7 * 60 + 30)) {
    events.push({ type: "count", time: 7 * 60 + 30 });
  }

  if (sim.baked) {
    events.push({ type: "bake", time: 6 * 60 + Math.floor(rand() * 20) });
    const sold = usage(rand, isToday ? sim.u * 0.3 : sim.u);
    const parts = sold > 10 && !isToday ? 2 : 1;
    for (let i = 0; i < parts; i++) {
      const qty = i === parts - 1 ? sold - Math.floor(sold / parts) * (parts - 1) : Math.floor(sold / parts);
      if (qty > 0) events.push({ type: "out", reason: "Sold", qty, time: when(8 * 60 + i * 300, 12 * 60 + i * 330), note: pick(rand, SALES_NOTES) });
    }
    if (!isToday) {
      const left = Math.floor(rand() * Math.max(2, sim.u * 0.12));
      if (left > 0) events.push({ type: "out", reason: "Damaged or expired", qty: left, time: 17 * 60 + 45, note: "Day-old · donated" });
    }
    return events.sort((a, b) => a.time - b.time);
  }

  if (!isToday) events.push({ type: "delivery", time: late(7 * 60, 10 * 60 + 30) });
  const outOfStock = daysAgo < (sim.out ?? 0);
  const used = outOfStock ? 0 : usage(rand, isToday ? sim.u * 0.4 : sim.u);
  if (used > 0) {
    const reason = "Used in production";
    events.push({ type: "out", reason, qty: used, time: when(6 * 60 + 30, 15 * 60), note: p.cat === "Ingredients" ? pick(rand, PRODUCTION_NOTES) : "" });
  }
  if (!isToday && !outOfStock && sim.waste && rand() < sim.waste) {
    events.push({ type: "out", reason: "Damaged or expired", qty: 1 + Math.floor(rand() * 2), time: late(15 * 60, 17 * 60), note: sim.wasteNote });
  }
  return events.sort((a, b) => a.time - b.time);
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

// One location is counted each Friday, in turn
const COUNT_ORDER = ["Pantry", "Fridge", "Storage room", "Front counter", "Freezer"];
function countsThisWeek(loc, friday) {
  const week = Math.floor(daysBetween("2026-01-02", friday) / 7);
  return COUNT_ORDER[((week % COUNT_ORDER.length) + COUNT_ORDER.length) % COUNT_ORDER.length] === loc;
}

/** Walks one product back from today's quantity, filling in quantities as it goes. */
function productHistory(p, today, nowMinutes) {
  const rand = seeded(hash(p.id));
  const { sim } = p;
  const top = p.reorder + (sim.pack ?? 0); // a delivery brings stock up to about here
  let running = p.qty;
  const moves = [];

  for (let ago = 0; ago < HISTORY_DAYS; ago++) {
    const date = addDays(today, -ago);
    if (weekday(date) === 1) continue; // closed Mondays
    const events = dayEvents(p, date, ago, rand, nowMinutes);
    const carried = sim.baked ? Math.floor(rand() * 4) : 0; // baked goods left from the day before

    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      const stamp = at(date, e.time);
      if (e.type === "out") {
        moves.push({ kind: "out", qty: e.qty, reason: e.reason, note: e.note, at: stamp, who: e.reason === "Sold" ? STAFF.owner : STAFF.staff });
        running += e.qty;
      } else if (e.type === "count") {
        const options = running > 5 ? [0, 0, 0, 1, -1, 2, -2] : [0, 0, 0, 1, -1];
        const before = Math.max(0, running + pick(rand, options));
        moves.push({ kind: "count", qty: running, reason: "Stock count correction", note: "Weekly count", at: stamp, who: STAFF.staff });
        running = before;
      } else if (e.type === "bake") {
        const baked = Math.max(0, running - carried);
        if (baked > 0) moves.push({ kind: "in", qty: baked, reason: IN_HOUSE, note: "Morning bake", at: stamp, who: STAFF.staff });
        running -= baked;
      } else if (e.type === "delivery" && running > top) {
        let packs = Math.ceil((running - p.reorder) / sim.pack);
        while (packs > 0 && running - packs * sim.pack < 0) packs--;
        if (packs > 0) {
          moves.push({ kind: "in", qty: packs * sim.pack, reason: "Supplier delivery", note: "", at: stamp, who: STAFF.owner, delivery: true });
          running -= packs * sim.pack;
        }
      }
    }
  }

  return moves.map((m) => ({ ...m, unit: p.unit, productId: p.id, product: p.name, loc: p.loc, unitCost: p.unitCost, supplier: p.supplier }));
}

/**
 * Products, six weeks of movements (newest first) and locations, as of `today` (YYYY-MM-DD).
 * `nowMinutes` (minutes after midnight) stops today's movements at the current time.
 */
export function buildSampleData(today, nowMinutes = 24 * 60) {
  const products = CATALOGUE.map(({ sim: _sim, ...p }) => p); // eslint-disable-line no-unused-vars
  const all = CATALOGUE.flatMap((p) => productHistory(p, today, nowMinutes)).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.productId.localeCompare(b.productId)));

  // One purchase order per supplier per delivery day, numbered up to the first PO the app will use
  const deliveries = [...new Set(all.filter((m) => m.delivery).map((m) => `${m.at.slice(0, 10)}|${m.supplier}`))].sort();
  const poFor = new Map(deliveries.map((key, i) => [key, FIRST_PO_NUMBER - deliveries.length + i]));

  const movements = all.map(({ delivery, supplier, ...m }, i) => ({
    id: `s${all.length - i}`,
    ...m,
    note: delivery ? `PO #${poFor.get(`${m.at.slice(0, 10)}|${supplier}`)} · ${supplier}` : m.note,
  }));

  const locations = SAMPLE_LOCATIONS.map((l) => {
    const last = movements.find((m) => m.kind === "count" && m.loc === l.name);
    return { ...l, lastCount: last ? last.at.slice(0, 10) : null };
  });

  return { products, movements, locations };
}

/** Flour's batches, with best-before dates counted from today */
export function sampleBatches(today) {
  const soon = addDays(today, 26);
  const later = addDays(today, 128);
  return {
    "ING-0012": [
      { batch: "PM-2610", loc: "Pantry", bestBefore: soon, qty: 2 },
      { batch: "PM-2622", loc: "Pantry", bestBefore: later, qty: 3 },
      { batch: "PM-2622", loc: "Storage room", bestBefore: later, qty: 1 },
    ],
  };
}
