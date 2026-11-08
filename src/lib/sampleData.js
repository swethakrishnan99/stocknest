// Shared lists and helpers. The sample products and their six weeks of movements are built in
// sampleHistory.js. Changes are kept in the browser (localStorage); Settings → Reset demo data puts the sample back.

export const CATEGORIES = ["All", "Ingredients", "Packaging", "Baked goods", "Supplies"];
// Used as the "no filter" option in location dropdowns. The sample locations are in sampleHistory.js
// (saved with the rest of the data, so new ones can be added on the Locations screen).
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

// Lead time = days from ordering to delivery
export const SUPPLIERS = [
  { name: "Prairie Mills", leadDays: 3 },
  { name: "Dairyland Foods", leadDays: 2 },
  { name: "Green Acres Farm", leadDays: 1 },
  { name: "PackRight", leadDays: 5 },
  { name: "Bakers Pantry Supply", leadDays: 4 },
];


// A suggested order brings stock back up to twice the reorder point
export const suggestedOrder = (item) => Math.max(1, item.reorder * 2 - item.left);

// The product the scanner "finds" when it is opened without one
export const DEFAULT_SCAN_ID = "ING-0012";

export const REASONS = ["Supplier delivery", "Made in-house", "Used in production", "Sold", "Damaged or expired", "Stock count correction"];

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

export const MOVEMENT_TYPES = [
  ["all", "All"],
  ["in", "Stock in"],
  ["out", "Stock out"],
  ["count", "Adjustments"],
];

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

export { FIRST_PO_NUMBER } from "./sampleHistory";
