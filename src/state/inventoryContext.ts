import { createContext, useContext } from "react";
import type { Permission } from "../lib/permissions";
import type { NewBusiness } from "./InventoryProvider";
import type {
  ActivityRow,
  Alerts,
  BackupData,
  Batch,
  Mode,
  Role,
  Supplier,
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
  mode: Mode;
  products: DerivedProduct[];
  movements: Movement[];
  orders: Record<string, PurchaseOrder>; // open purchase order lines by product id
  business: Business;
  summary: Summary;
  reorderList: ReorderItem[];
  recent: ActivityRow[];
  categoryValues: CategoryValue[];
  locations: LocationSummary[];
  locationNames: string[];
  nextPo: number;
  team: TeamMember[];
  currentUser: TeamMember | undefined; // who is using this device
  can: (permission: Permission) => boolean;
  suppliers: Supplier[];
  batches: Batch[];
  alerts: Alerts;

  recordMovement: (productId: string, input: MovementInput) => void;
  undoMovement: (movementId: string) => boolean;
  transferStock: (productId: string, toLocation: string, qty: number) => string | null; // id of the entry the stock went to
  addProduct: (product: Product) => void;
  updateProduct: (productId: string, changes: Partial<Product>) => void;
  importProducts: (rows: ImportRow[]) => void;
  deleteProduct: (productId: string) => void;
  restoreProduct: (product: Product) => void;
  rawProduct: (productId: string) => Product | undefined;
  placeOrder: (order: PurchaseOrder) => void;
  placeOrders: (lines: PurchaseOrder[]) => void;
  receiveOrder: (productId: string, received: { qty: number; note: string; batch?: { code: string; bestBefore: string } }) => void;
  cancelOrder: (productId: string) => void;
  addLocation: (location: { name: string; kind: string }) => void;
  inviteMember: (member: TeamMember) => void;
  setMemberRole: (email: string, role: Role) => void;
  removeMember: (email: string) => void;
  switchUser: (email: string) => void;
  setBusiness: (business: Business) => void;
  saveSupplier: (supplier: Supplier, previousName?: string) => void;
  removeSupplier: (name: string) => void;
  addBatch: (batch: Omit<Batch, "id">) => void;
  removeBatch: (id: string) => void;
  setAlerts: (alerts: Alerts) => void;
  loadDemo: () => void;
  startOver: () => void;
  startOwnBusiness: (business: NewBusiness) => void;
  exportBackup: () => BackupData;
  restoreBackup: (data: BackupData) => void;
}

export const InventoryContext = createContext<Inventory | null>(null);

/** Products, movements and orders, plus the actions that change them. */
export function useInventory(): Inventory {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used inside <InventoryProvider>");
  return ctx;
}
