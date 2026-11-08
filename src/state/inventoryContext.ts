import { createContext, useContext } from "react";
import type {
  ActivityRow,
  Business,
  CategoryValue,
  DerivedProduct,
  ImportRow,
  LocationSummary,
  Movement,
  MovementInput,
  Product,
  PurchaseOrder,
  ReorderItem,
  Summary,
  TeamMember,
} from "../types";

export interface Inventory {
  products: DerivedProduct[];
  movements: Movement[];
  orders: Record<string, PurchaseOrder>; // open purchase orders by product id
  business: Business;
  summary: Summary;
  reorderList: ReorderItem[];
  recent: ActivityRow[];
  categoryValues: CategoryValue[];
  locations: LocationSummary[];
  locationNames: string[];
  nextPo: number;
  team: TeamMember[];
  recordMovement: (productId: string, input: MovementInput) => void;
  addProduct: (product: Product) => void;
  updateProduct: (productId: string, changes: Partial<Product>) => void;
  importProducts: (rows: ImportRow[]) => void;
  deleteProduct: (productId: string) => void;
  restoreProduct: (product: Product) => void;
  rawProduct: (productId: string) => Product | undefined;
  placeOrder: (order: PurchaseOrder) => void;
  receiveOrder: (productId: string, received: { qty: number; note: string }) => void;
  cancelOrder: (productId: string) => void;
  addLocation: (location: { name: string; kind: string }) => void;
  inviteMember: (member: TeamMember) => void;
  setMemberRole: (email: string, role: string) => void;
  setBusiness: (business: Business) => void;
  resetDemo: () => void;
}

export const InventoryContext = createContext<Inventory | null>(null);

/** Products, movements and orders, plus the actions that change them. */
export function useInventory(): Inventory {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used inside <InventoryProvider>");
  return ctx;
}
