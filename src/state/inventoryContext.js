import { createContext, useContext } from "react";

export const InventoryContext = createContext(null);

/** Products, movements and orders, plus the actions that change them. */
export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used inside <InventoryProvider>");
  return ctx;
}
