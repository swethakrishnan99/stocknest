// Shared lists and helpers. The sample products and their six weeks of movements are built in
// sampleHistory.ts. Changes are kept in the browser (localStorage); Settings → Reset demo data puts the sample back.

import type { Business, Category, MovementKind, ReorderItem, StockStatus, TeamMember } from "../types";

export const CATEGORIES: ["All", ...Category[]] = ["All", "Ingredients", "Packaging", "Baked goods", "Supplies"];
/** The real categories (without "All") */
export const PRODUCT_CATEGORIES = CATEGORIES.slice(1) as Category[];
// Used as the "no filter" option in location dropdowns. The sample locations are in sampleHistory.ts
// (saved with the rest of the data, so new ones can be added on the Locations screen).
export const ALL_LOCATIONS = "All locations";

// Stock status filter on Products; "reorder" means low or out, "ordered" means a purchase order
// has been placed and not received yet
export const STATUS_FILTERS: [string, string][] = [
  ["all", "All statuses"],
  ["reorder", "Needs reorder"],
  ["ordered", "On order (not received)"],
  ["low", "Low (below reorder point)"],
  ["out", "Out of stock"],
  ["ok", "In stock"],
];

export function matchesStatus(status: StockStatus, filter: string, onOrder = false): boolean {
  if (filter === "all") return true;
  if (filter === "ordered") return onOrder;
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
export const suggestedOrder = (item: Pick<ReorderItem, "reorder" | "left">) => Math.max(1, item.reorder * 2 - item.left);

// The product the scanner "finds" when it is opened without one
export const DEFAULT_SCAN_ID = "ING-0012";

export const REASONS = ["Supplier delivery", "Made in-house", "Used in production", "Sold", "Damaged or expired", "Stock count correction"];

export function stockStatus(qty: number, reorder: number): StockStatus {
  if (qty === 0) return "out";
  return qty <= reorder ? "low" : "ok";
}

export function newOnHand(onHand: number, mode: MovementKind, qty: number): number {
  if (mode === "in") return onHand + qty;
  if (mode === "out") return Math.max(0, onHand - qty);
  return qty;
}

export const money = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD", currencyDisplay: "narrowSymbol" });

export const MOVEMENT_TYPES: ["all" | MovementKind, string][] = [
  ["all", "All"],
  ["in", "Stock in"],
  ["out", "Stock out"],
  ["count", "Adjustments"],
];

export const DEFAULT_BUSINESS: Business = {
  name: "Maple Street Bakery",
  currency: "CAD · Canadian dollar",
  timeZone: "Eastern Time (Toronto)",
  defaultReorder: "10",
};

export const TEAM: TeamMember[] = [
  { name: "Alex Moreau", email: "alex@maplestreetbakery.ca", role: "Owner" },
  { name: "Priya Shah", email: "priya@maplestreetbakery.ca", role: "Staff" },
];

export const PLAN = { name: "Free plan", limit: 500 };

export { FIRST_PO_NUMBER } from "./sampleHistory";
