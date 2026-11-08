// The shapes of StockNest's data. Products, movements, orders and settings are saved in
// localStorage exactly as described here.

export type Category = "Ingredients" | "Packaging" | "Baked goods" | "Supplies";
export type StockStatus = "ok" | "low" | "out";
export type MovementKind = "in" | "out" | "count";

/** A product as it is saved */
export interface Product {
  id: string; // SKU, e.g. ING-0012
  name: string;
  initial: string; // letter on the product tile
  tint: string; // tile colour
  cat: Category;
  loc: string;
  qty: number;
  unit: string;
  reorder: number; // reorder when on hand is at or below this
  unitCost: number;
  supplier?: string;
  barcode?: string;
}

/** A product with the values worked out from its quantity */
export interface DerivedProduct extends Product {
  status: StockStatus;
  valueNum: number;
  value: string; // formatted money
}

export interface Movement {
  id: string;
  kind: MovementKind;
  qty: number; // for a count, the new quantity
  unit: string;
  productId: string | null;
  product: string; // product name when recorded
  reason: string;
  note: string;
  loc: string;
  who: string;
  at: string; // local timestamp, YYYY-MM-DDTHH:MM
  unitCost?: number; // cost when recorded
}

/** What the Update stock form and the scanner send */
export interface MovementInput {
  mode: MovementKind;
  qty: number;
  reason: string;
  note: string;
}

export interface PurchaseOrder {
  po: number;
  productId: string;
  item: string;
  supplier: string;
  qty: number;
  unit: string;
  due: string; // YYYY-MM-DD
  total: number;
  note: string;
}

export interface LocationInfo {
  name: string;
  kind: string;
  lastCount: string | null; // YYYY-MM-DD
}

export interface LocationSummary extends LocationInfo {
  products: number;
  value: string;
  low: number;
  out: number;
}

export interface Business {
  name: string;
  currency: string;
  timeZone: string;
  defaultReorder: string;
}

export type Role = string; // "Owner", "Admin" or "Staff"

export interface TeamMember {
  name: string;
  email: string;
  role: Role;
  pending?: boolean;
}

/** A product in the shape the Reorder pop-up and reorder lists use */
export interface ReorderItem {
  id: string;
  name: string;
  left: number;
  reorder: number;
  loc: string;
  status: StockStatus;
  unit: string;
  unitCost: number;
  supplier?: string;
}

export interface Summary {
  products: number;
  categories: number;
  stockValue: string;
  low: number;
  out: number;
}

export interface ActivityRow {
  id: string;
  kind: MovementKind;
  signed: string;
  tone: string;
  name: string;
  short: string;
  detail: string;
  when: string;
}

export interface CategoryValue {
  name: string;
  valueNum: number;
  value: string;
  pct: number;
}

/** A row read from an import file */
export interface ImportRow {
  line: number;
  product: Product;
  isNew: boolean;
  newLocation: boolean;
}

export interface ImportError {
  line: number;
  message: string;
}

/** Screens the app can open, with an optional filter */
export type Screen = "dashboard" | "products" | "product" | "movements" | "locations" | "reports" | "settings" | "scan";

export interface NavFilter {
  id?: string;
  status?: string;
  loc?: string;
  query?: string;
}

export type Navigate = (screen: Screen, filter?: NavFilter) => void;
