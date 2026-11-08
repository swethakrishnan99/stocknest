import { useCallback, useMemo } from "react";
import { InventoryContext } from "./inventoryContext";
import usePersistentState from "./usePersistentState";
import { PRODUCTS, MOVEMENTS, DEFAULT_BUSINESS, FIRST_PO_NUMBER, newOnHand } from "../lib/sampleData";
import { withDerived, summarize, needsReorder, recentActivity, valueByCategory, locationSummary } from "../lib/inventory";

// The single source of truth for the app. Every screen reads from here, so a change
// made on one screen (a stock movement, a new product, an order) shows up everywhere.
export default function InventoryProvider({ children }) {
  const [rawProducts, setProducts] = usePersistentState("products", PRODUCTS);
  const [movements, setMovements] = usePersistentState("movements", MOVEMENTS);
  const [orders, setOrders] = usePersistentState("orders", {}); // purchase orders by product id
  const [business, setBusiness] = usePersistentState("business", DEFAULT_BUSINESS);

  const products = useMemo(() => rawProducts.map(withDerived), [rawProducts]);

  /** Records a stock in, stock out or count for one product and updates its quantity. */
  const recordMovement = useCallback(
    (productId, { mode, qty, reason, note }) => {
      const product = rawProducts.find((p) => p.id === productId);
      if (!product) return;
      setProducts((list) => list.map((p) => (p.id === productId ? { ...p, qty: newOnHand(p.qty, mode, qty) } : p)));
      setMovements((list) => [
        {
          id: `m${Date.now()}`,
          kind: mode,
          qty,
          unit: product.unit,
          productId,
          product: product.name,
          reason,
          note,
          loc: product.loc,
          who: "You",
          day: "Today",
          time: "Just now",
        },
        ...list,
      ]);
    },
    [rawProducts, setProducts, setMovements]
  );

  const addProduct = useCallback((product) => setProducts((list) => [product, ...list]), [setProducts]);

  const placeOrder = useCallback((order) => setOrders((o) => ({ ...o, [order.productId]: order })), [setOrders]);

  const resetDemo = useCallback(() => {
    setProducts(PRODUCTS);
    setMovements(MOVEMENTS);
    setOrders({});
    setBusiness(DEFAULT_BUSINESS);
  }, [setProducts, setMovements, setOrders, setBusiness]);

  const value = useMemo(
    () => ({
      products,
      movements,
      orders,
      business,
      summary: summarize(products),
      reorderList: needsReorder(products),
      recent: recentActivity(movements),
      categoryValues: valueByCategory(products),
      locations: locationSummary(products),
      nextPo: FIRST_PO_NUMBER + Object.keys(orders).length,
      recordMovement,
      addProduct,
      placeOrder,
      setBusiness,
      resetDemo,
    }),
    [products, movements, orders, business, recordMovement, addProduct, placeOrder, setBusiness, resetDemo]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
