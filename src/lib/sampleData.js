// Sample data for Maple Street Bakery. Nothing is saved; state resets on reload.

export const CATEGORIES = ["All", "Ingredients", "Packaging", "Baked goods", "Supplies"];
export const LOCATIONS = ["All locations", "Pantry", "Fridge", "Storage room", "Front counter"];

export const SUMMARY = { products: 248, categories: 4, stockValue: "$18,420", low: 12, out: 3 };

export const PRODUCTS = [
  { id: "ING-0012", name: "All-purpose flour, 10 kg", initial: "F", tint: "#F3E9D7", cat: "Ingredients", loc: "Pantry", qty: 6, unit: "bags", reorder: 10, value: "$111.00", status: "low" },
  { id: "ING-0031", name: "Unsalted butter, 454 g", initial: "B", tint: "#FBF1C9", cat: "Ingredients", loc: "Fridge", qty: 4, unit: "blocks", reorder: 12, value: "$27.96", status: "low" },
  { id: "ING-0007", name: "Granulated sugar, 2 kg", initial: "S", tint: "#EEF0F5", cat: "Ingredients", loc: "Pantry", qty: 38, unit: "bags", reorder: 15, value: "$171.00", status: "ok" },
  { id: "ING-0044", name: "Vanilla extract, 500 ml", initial: "V", tint: "#EADBCB", cat: "Ingredients", loc: "Pantry", qty: 0, unit: "bottles", reorder: 3, value: "$0.00", status: "out" },
  { id: "PKG-0102", name: "Cake boxes, 10 in", initial: "C", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 0, unit: "boxes", reorder: 50, value: "$0.00", status: "out" },
  { id: "PKG-0110", name: "Paper bags, medium", initial: "P", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 640, unit: "bags", reorder: 200, value: "$96.00", status: "ok" },
  { id: "BKD-0003", name: "Sourdough loaf", initial: "S", tint: "#E6DCF5", cat: "Baked goods", loc: "Front counter", qty: 22, unit: "loaves", reorder: 10, value: "$66.00", status: "ok" },
  { id: "BKD-0009", name: "Croissant", initial: "C", tint: "#E6DCF5", cat: "Baked goods", loc: "Front counter", qty: 36, unit: "pcs", reorder: 24, value: "$43.20", status: "ok" },
  { id: "SUP-0021", name: "Nitrile gloves, box of 100", initial: "G", tint: "#DCEAF7", cat: "Supplies", loc: "Storage room", qty: 5, unit: "boxes", reorder: 4, value: "$62.50", status: "ok" },
];

export const NEEDS_REORDER = [
  { name: "Unsalted butter, 454 g", left: 4, reorder: 12, loc: "Fridge", status: "low" },
  { name: "Cake boxes, 10 in", left: 0, reorder: 50, loc: "Storage room", status: "out" },
  { name: "All-purpose flour, 10 kg", left: 6, reorder: 10, loc: "Pantry", status: "low" },
  { name: "Vanilla extract, 500 ml", left: 0, reorder: 3, loc: "Pantry", status: "out" },
  { name: "Free-range eggs, 30 pack", left: 3, reorder: 8, loc: "Fridge", status: "low" },
];

export const RECENT_ACTIVITY = [
  { qty: 24, name: "Granulated sugar, 2 kg", short: "Granulated sugar", detail: "Stock in · Supplier delivery", when: "9:42 am" },
  { qty: -18, name: "Croissants", short: "Croissants", detail: "Stock out · Sold", when: "9:10 am" },
  { qty: -2, name: "Whole milk, 4 L", short: "Whole milk", detail: "Adjusted · Expired", when: "Yesterday" },
  { qty: 40, name: "Paper bags, medium", short: "Paper bags", detail: "Stock in · Purchase order", when: "Yesterday" },
  { qty: -6, name: "Sourdough loaves", short: "Sourdough loaves", detail: "Stock out · Wholesale order", when: "Nov 4" },
];

export const VALUE_BY_CATEGORY = [
  { name: "Ingredients", pct: 82, value: "$9,860" },
  { name: "Packaging", pct: 38, value: "$4,520" },
  { name: "Baked goods", pct: 19, value: "$2,310" },
  { name: "Supplies", pct: 15, value: "$1,730" },
];

// The product shown on the detail and scan screens
export const FLOUR = {
  name: "All-purpose flour, 10 kg",
  initial: "F",
  tint: "#F3E9D7",
  sku: "ING-0012",
  barcode: "0 62000 41237 5",
  cat: "Ingredients",
  loc: "Pantry",
  unit: "bags",
  onHand: 6,
  reorder: 10,
  unitCost: 18.5,
  batches: [
    { batch: "PM-2610", loc: "Pantry", bestBefore: "Dec 2, 2026 · 26 days", soon: true, qty: 2 },
    { batch: "PM-2622", loc: "Pantry", bestBefore: "Mar 14, 2027", qty: 3 },
    { batch: "PM-2622", loc: "Storage room", bestBefore: "Mar 14, 2027", qty: 1 },
  ],
  history: [
    { kind: "out", qty: 4, reason: "Used in production", note: "Sourdough and croissant batch", who: "Priya", when: "Today, 7:15 am" },
    { kind: "out", qty: 2, reason: "Used in production", note: "Cookie order for Lakeside Café", who: "Alex", when: "Nov 5" },
    { kind: "in", qty: 12, reason: "Supplier delivery", note: "PO #1038 · Prairie Mills", who: "Alex", when: "Oct 29" },
    { kind: "out", qty: 1, reason: "Damaged or expired", note: "Torn bag", who: "Priya", when: "Oct 27" },
    { kind: "count", qty: 8, reason: "Stock count correction", note: "Monthly count", who: "Alex", when: "Oct 1" },
  ],
};

export const REASONS = ["Supplier delivery", "Used in production", "Sold", "Damaged or expired", "Stock count correction"];

export function newOnHand(onHand, mode, qty) {
  if (mode === "in") return onHand + qty;
  if (mode === "out") return Math.max(0, onHand - qty);
  return qty;
}

export const money = (n) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD", currencyDisplay: "narrowSymbol" });

// Every recorded movement, newest first. `day` groups the list on the Stock movements screen.
export const MOVEMENTS = [
  { id: "m14", kind: "in", qty: 24, unit: "bags", product: "Granulated sugar, 2 kg", reason: "Supplier delivery", note: "PO #1041 · Prairie Mills", loc: "Pantry", who: "Alex", day: "Today", time: "9:42 am" },
  { id: "m13", kind: "out", qty: 18, unit: "pcs", product: "Croissant", reason: "Sold", note: "Morning counter sales", loc: "Front counter", who: "Priya", day: "Today", time: "9:10 am" },
  { id: "m12", kind: "out", qty: 4, unit: "bags", product: "All-purpose flour, 10 kg", reason: "Used in production", note: "Sourdough and croissant batch", loc: "Pantry", who: "Priya", day: "Today", time: "7:15 am" },
  { id: "m11", kind: "out", qty: 2, unit: "jugs", product: "Whole milk, 4 L", reason: "Damaged or expired", note: "Past best before", loc: "Fridge", who: "Alex", day: "Yesterday", time: "4:30 pm" },
  { id: "m10", kind: "in", qty: 40, unit: "bags", product: "Paper bags, medium", reason: "Supplier delivery", note: "PO #1040 · PackRight", loc: "Storage room", who: "Alex", day: "Yesterday", time: "11:05 am" },
  { id: "m9", kind: "out", qty: 8, unit: "blocks", product: "Unsalted butter, 454 g", reason: "Used in production", note: "Croissant lamination", loc: "Fridge", who: "Priya", day: "Yesterday", time: "6:40 am" },
  { id: "m8", kind: "out", qty: 6, unit: "loaves", product: "Sourdough loaf", reason: "Sold", note: "Wholesale order · Lakeside Café", loc: "Front counter", who: "Alex", day: "Nov 4", time: "2:15 pm" },
  { id: "m7", kind: "out", qty: 2, unit: "bags", product: "All-purpose flour, 10 kg", reason: "Used in production", note: "Cookie order for Lakeside Café", loc: "Pantry", who: "Alex", day: "Nov 4", time: "8:00 am" },
  { id: "m6", kind: "count", qty: 5, unit: "boxes", product: "Nitrile gloves, box of 100", reason: "Stock count correction", note: "Weekly count", loc: "Storage room", who: "Priya", day: "Nov 4", time: "7:30 am" },
  { id: "m5", kind: "out", qty: 50, unit: "boxes", product: "Cake boxes, 10 in", reason: "Used in production", note: "Holiday cake orders", loc: "Storage room", who: "Priya", day: "Nov 3", time: "3:20 pm" },
  { id: "m4", kind: "in", qty: 30, unit: "packs", product: "Free-range eggs, 30 pack", reason: "Supplier delivery", note: "Green Acres Farm", loc: "Fridge", who: "Alex", day: "Nov 3", time: "7:05 am" },
  { id: "m3", kind: "out", qty: 1, unit: "bottles", product: "Vanilla extract, 500 ml", reason: "Used in production", note: "Last bottle", loc: "Pantry", who: "Priya", day: "Nov 2", time: "10:45 am" },
  { id: "m2", kind: "in", qty: 12, unit: "bags", product: "All-purpose flour, 10 kg", reason: "Supplier delivery", note: "PO #1038 · Prairie Mills", loc: "Pantry", who: "Alex", day: "Oct 29", time: "9:00 am" },
  { id: "m1", kind: "count", qty: 8, unit: "bags", product: "All-purpose flour, 10 kg", reason: "Stock count correction", note: "Monthly count", loc: "Pantry", who: "Alex", day: "Oct 1", time: "8:00 am" },
];

export const MOVEMENT_TYPES = [
  ["all", "All"],
  ["in", "Stock in"],
  ["out", "Stock out"],
  ["count", "Adjustments"],
];

// Totals add up to the dashboard summary (248 products, $18,420, 12 low, 3 out)
export const LOCATION_SUMMARY = [
  { name: "Pantry", kind: "Dry goods shelves", products: 96, value: "$8,940", low: 5, out: 1, lastCount: "Oct 31" },
  { name: "Fridge", kind: "Walk-in cooler · 2–4 °C", products: 38, value: "$2,180", low: 4, out: 1, lastCount: "Nov 4" },
  { name: "Storage room", kind: "Packaging and supplies", products: 74, value: "$5,210", low: 2, out: 1, lastCount: "Nov 4" },
  { name: "Front counter", kind: "Display case and shelves", products: 40, value: "$2,090", low: 1, out: 0, lastCount: "Today" },
];

// Units moved per week (last 6 weeks), for Reports
export const WEEKLY_FLOW = [
  { week: "Sep 29", in: 180, out: 205 },
  { week: "Oct 6", in: 240, out: 226 },
  { week: "Oct 13", in: 150, out: 198 },
  { week: "Oct 20", in: 260, out: 231 },
  { week: "Oct 27", in: 210, out: 244 },
  { week: "Nov 3", in: 200, out: 211 },
];

export const TOP_USED = [
  { name: "Croissant", used: 412, unit: "pcs" },
  { name: "Sourdough loaf", used: 268, unit: "loaves" },
  { name: "Paper bags, medium", used: 240, unit: "bags" },
  { name: "Cake boxes, 10 in", used: 150, unit: "boxes" },
  { name: "Unsalted butter, 454 g", used: 64, unit: "blocks" },
];

export const WASTE = { units: 38, value: "$142.60", topReason: "Expired dairy" };

export const TEAM = [
  { name: "Alex Moreau", email: "alex@maplestreetbakery.ca", role: "Owner" },
  { name: "Priya Shah", email: "priya@maplestreetbakery.ca", role: "Staff" },
];

export const PLAN = { name: "Free plan", used: 248, limit: 500 };
