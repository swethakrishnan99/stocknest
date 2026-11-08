// Starting sample data for Maple Street Bakery. Changes are kept in the browser (localStorage);
// Settings → Reset demo data puts this back.

export const CATEGORIES = ["All", "Ingredients", "Packaging", "Baked goods", "Supplies"];
// Used as the "no filter" option in location dropdowns. The locations themselves are in LOCATION_INFO
// (and saved with the rest of the data, so new ones can be added on the Locations screen).
export const ALL_LOCATIONS = "All locations";

// Stock status filter on Products; "reorder" means low or out
export const STATUS_FILTERS = [
  ["all", "All statuses"],
  ["reorder", "Needs reorder"],
  ["low", "Low (below reorder point)"],
  ["out", "Out of stock"],
  ["ok", "In stock"],
];

export function matchesStatus(status, filter) {
  if (filter === "all") return true;
  if (filter === "reorder") return status === "low" || status === "out";
  return status === filter;
}

export const PRODUCTS = [
  { id: "ING-0012", name: "All-purpose flour, 10 kg", initial: "F", tint: "#F3E9D7", cat: "Ingredients", loc: "Pantry", qty: 6, unit: "bags", reorder: 10, unitCost: 18.5, supplier: "Prairie Mills", barcode: "0 62000 41237 5" },
  { id: "ING-0031", name: "Unsalted butter, 454 g", initial: "B", tint: "#FBF1C9", cat: "Ingredients", loc: "Fridge", qty: 4, unit: "blocks", reorder: 12, unitCost: 6.99, supplier: "Dairyland Foods" },
  { id: "ING-0007", name: "Granulated sugar, 2 kg", initial: "S", tint: "#EEF0F5", cat: "Ingredients", loc: "Pantry", qty: 38, unit: "bags", reorder: 15, unitCost: 4.5, supplier: "Prairie Mills" },
  { id: "ING-0044", name: "Vanilla extract, 500 ml", initial: "V", tint: "#EADBCB", cat: "Ingredients", loc: "Pantry", qty: 0, unit: "bottles", reorder: 3, unitCost: 24, supplier: "Bakers Pantry Supply" },
  { id: "PKG-0102", name: "Cake boxes, 10 in", initial: "C", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 0, unit: "boxes", reorder: 50, unitCost: 1.2, supplier: "PackRight" },
  { id: "PKG-0110", name: "Paper bags, medium", initial: "P", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 640, unit: "bags", reorder: 200, unitCost: 0.15, supplier: "PackRight" },
  { id: "BKD-0003", name: "Sourdough loaf", initial: "S", tint: "#E6DCF5", cat: "Baked goods", loc: "Front counter", qty: 22, unit: "loaves", reorder: 10, unitCost: 3, supplier: "Made in-house" },
  { id: "BKD-0009", name: "Croissant", initial: "C", tint: "#E6DCF5", cat: "Baked goods", loc: "Front counter", qty: 36, unit: "pcs", reorder: 24, unitCost: 1.2, supplier: "Made in-house" },
  { id: "ING-0052", name: "Free-range eggs, 30 pack", initial: "E", tint: "#F3E9D7", cat: "Ingredients", loc: "Fridge", qty: 3, unit: "packs", reorder: 8, unitCost: 9.5, supplier: "Green Acres Farm" },
  { id: "PKG-0118", name: "Parchment paper, 100 sheets", initial: "P", tint: "#FDE3DF", cat: "Packaging", loc: "Storage room", qty: 0, unit: "packs", reorder: 6, unitCost: 8.5, supplier: "PackRight" },
  { id: "SUP-0021", name: "Nitrile gloves, box of 100", initial: "G", tint: "#DCEAF7", cat: "Supplies", loc: "Storage room", qty: 5, unit: "boxes", reorder: 4, unitCost: 12.5, supplier: "Bakers Pantry Supply" },
];

// Lead time = days from ordering to delivery
export const SUPPLIERS = [
  { name: "Prairie Mills", leadDays: 3 },
  { name: "Dairyland Foods", leadDays: 2 },
  { name: "Green Acres Farm", leadDays: 1 },
  { name: "PackRight", leadDays: 5 },
  { name: "Bakers Pantry Supply", leadDays: 4 },
];

export const SAMPLE_TODAY = "2026-11-06"; // the dashboard's "Friday, Nov 6"
export const FIRST_PO_NUMBER = 1046;

// A suggested order brings stock back up to twice the reorder point
export const suggestedOrder = (item) => Math.max(1, item.reorder * 2 - item.left);

// Batches tracked per product (only flour has batch data in the sample)
export const BATCHES = {
  "ING-0012": [
    { batch: "PM-2610", loc: "Pantry", bestBefore: "Dec 2, 2026 · 26 days", soon: true, qty: 2 },
    { batch: "PM-2622", loc: "Pantry", bestBefore: "Mar 14, 2027", qty: 3 },
    { batch: "PM-2622", loc: "Storage room", bestBefore: "Mar 14, 2027", qty: 1 },
  ],
};

// The product the scanner "finds" when it is opened without one
export const DEFAULT_SCAN_ID = "ING-0012";

export const REASONS = ["Supplier delivery", "Used in production", "Sold", "Damaged or expired", "Stock count correction"];

export function stockStatus(qty, reorder) {
  if (qty === 0) return "out";
  return qty <= reorder ? "low" : "ok";
}

export function newOnHand(onHand, mode, qty) {
  if (mode === "in") return onHand + qty;
  if (mode === "out") return Math.max(0, onHand - qty);
  return qty;
}

export const money = (n) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD", currencyDisplay: "narrowSymbol" });

// Every recorded movement, newest first. `day` groups the list on the Stock movements screen.
export const MOVEMENTS = [
  { id: "m14", kind: "in", qty: 24, unit: "bags", productId: "ING-0007", product: "Granulated sugar, 2 kg", reason: "Supplier delivery", note: "PO #1041 · Prairie Mills", loc: "Pantry", who: "Alex", day: "Today", time: "9:42 am" },
  { id: "m13", kind: "out", qty: 18, unit: "pcs", productId: "BKD-0009", product: "Croissant", reason: "Sold", note: "Morning counter sales", loc: "Front counter", who: "Priya", day: "Today", time: "9:10 am" },
  { id: "m12", kind: "out", qty: 4, unit: "bags", productId: "ING-0012", product: "All-purpose flour, 10 kg", reason: "Used in production", note: "Sourdough and croissant batch", loc: "Pantry", who: "Priya", day: "Today", time: "7:15 am" },
  { id: "m11", kind: "out", qty: 2, unit: "jugs", productId: null, product: "Whole milk, 4 L", reason: "Damaged or expired", note: "Past best before", loc: "Fridge", who: "Alex", day: "Yesterday", time: "4:30 pm" },
  { id: "m10", kind: "in", qty: 40, unit: "bags", productId: "PKG-0110", product: "Paper bags, medium", reason: "Supplier delivery", note: "PO #1040 · PackRight", loc: "Storage room", who: "Alex", day: "Yesterday", time: "11:05 am" },
  { id: "m9", kind: "out", qty: 8, unit: "blocks", productId: "ING-0031", product: "Unsalted butter, 454 g", reason: "Used in production", note: "Croissant lamination", loc: "Fridge", who: "Priya", day: "Yesterday", time: "6:40 am" },
  { id: "m8", kind: "out", qty: 6, unit: "loaves", productId: "BKD-0003", product: "Sourdough loaf", reason: "Sold", note: "Wholesale order · Lakeside Café", loc: "Front counter", who: "Alex", day: "Nov 4", time: "2:15 pm" },
  { id: "m7", kind: "out", qty: 2, unit: "bags", productId: "ING-0012", product: "All-purpose flour, 10 kg", reason: "Used in production", note: "Cookie order for Lakeside Café", loc: "Pantry", who: "Alex", day: "Nov 4", time: "8:00 am" },
  { id: "m6", kind: "count", qty: 5, unit: "boxes", productId: "SUP-0021", product: "Nitrile gloves, box of 100", reason: "Stock count correction", note: "Weekly count", loc: "Storage room", who: "Priya", day: "Nov 4", time: "7:30 am" },
  { id: "m5", kind: "out", qty: 50, unit: "boxes", productId: "PKG-0102", product: "Cake boxes, 10 in", reason: "Used in production", note: "Holiday cake orders", loc: "Storage room", who: "Priya", day: "Nov 3", time: "3:20 pm" },
  { id: "m4", kind: "in", qty: 30, unit: "packs", productId: "ING-0052", product: "Free-range eggs, 30 pack", reason: "Supplier delivery", note: "Green Acres Farm", loc: "Fridge", who: "Alex", day: "Nov 3", time: "7:05 am" },
  { id: "m3", kind: "out", qty: 1, unit: "bottles", productId: "ING-0044", product: "Vanilla extract, 500 ml", reason: "Used in production", note: "Last bottle", loc: "Pantry", who: "Priya", day: "Nov 2", time: "10:45 am" },
  { id: "m2b", kind: "out", qty: 1, unit: "bags", productId: "ING-0012", product: "All-purpose flour, 10 kg", reason: "Damaged or expired", note: "Torn bag", loc: "Pantry", who: "Priya", day: "Oct 27", time: "3:40 pm" },
  { id: "m2", kind: "in", qty: 12, unit: "bags", productId: "ING-0012", product: "All-purpose flour, 10 kg", reason: "Supplier delivery", note: "PO #1038 · Prairie Mills", loc: "Pantry", who: "Alex", day: "Oct 29", time: "9:00 am" },
  { id: "m1", kind: "count", qty: 8, unit: "bags", productId: "ING-0012", product: "All-purpose flour, 10 kg", reason: "Stock count correction", note: "Monthly count", loc: "Pantry", who: "Alex", day: "Oct 1", time: "8:00 am" },
];

export const MOVEMENT_TYPES = [
  ["all", "All"],
  ["in", "Stock in"],
  ["out", "Stock out"],
  ["count", "Adjustments"],
];

// Fixed details about each location; counts and values are worked out from the products
export const LOCATION_INFO = [
  { name: "Pantry", kind: "Dry goods shelves", lastCount: "Oct 31" },
  { name: "Fridge", kind: "Walk-in cooler · 2–4 °C", lastCount: "Nov 4" },
  { name: "Storage room", kind: "Packaging and supplies", lastCount: "Nov 4" },
  { name: "Front counter", kind: "Display case and shelves", lastCount: "Today" },
];

// Units moved per week (last 6 weeks), for Reports. Historical sample figures, not worked out from MOVEMENTS.
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

export const DEFAULT_BUSINESS = {
  name: "Maple Street Bakery",
  currency: "CAD · Canadian dollar",
  timeZone: "Eastern Time (Toronto)",
  defaultReorder: "10",
};

export const TEAM = [
  { name: "Alex Moreau", email: "alex@maplestreetbakery.ca", role: "Owner" },
  { name: "Priya Shah", email: "priya@maplestreetbakery.ca", role: "Staff" },
];

export const PLAN = { name: "Free plan", limit: 500 };
