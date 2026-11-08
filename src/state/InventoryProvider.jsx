import { useCallback, useMemo } from "react";
import { InventoryContext } from "./inventoryContext";
import usePersistentState from "./usePersistentState";
import { PRODUCTS, MOVEMENTS, LOCATION_INFO, DEFAULT_BUSINESS, FIRST_PO_NUMBER, newOnHand } from "../lib/sampleData";
import { withDerived, summarize, needsReorder, recentActivity, valueByCategory, locationSummary } from "../lib/inventory";

// The single source of truth for the app. Every screen reads from here, so a change
// made on one screen (a stock movement, a new product, an order) shows up everywhere.
export default function InventoryProvider({ children }) {
  const [rawProducts, setProducts] = usePersistentState("products", PRODUCTS);
  const [movements, setMovements] = usePersistentState("movements", MOVEMENTS);
  const [orders, setOrders] = usePersistentState("orders", {}); // purchase orders by product id
  const [business, setBusiness] = usePersistentState("business", DEFAULT_BUSINESS);
  const [locationInfo, setLocationInfo] = usePersistentState("locations", LOCATION_INFO);

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

  /** Adds a storage location; it appears in every location list straight away. */
  const addLocation = useCallback(
    ({ name, kind }) => setLocationInfo((list) => [...list, { name, kind, lastCount: null }]),
    [setLocationInfo]
  );

  const placeOrder = useCallback((order) => setOrders((o) => ({ ...o, [order.productId]: order })), [setOrders]);

  const resetDemo = useCallback(() => {
    setProducts(PRODUCTS);
    setMovements(MOVEMENTS);
    setOrders({});
    setBusiness(DEFAULT_BUSINESS);
    setLocationInfo(LOCATION_INFO);
  }, [setProducts, setMovements, setOrders, setBusiness, setLocationInfo]);

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
      locations: locationSummary(products, locationInfo),
      locationNames: locationInfo.map((l) => l.name),
      nextPo: FIRST_PO_NUMBER + Object.keys(orders).length,
      recordMovement,
      addProduct,
      placeOrder,
      addLocation,
      setBusiness,
      resetDemo,
    }),
    [products, movements, orders, business, locationInfo, recordMovement, addProduct, addLocation, placeOrder, setBusiness, resetDemo]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
