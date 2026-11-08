import { useCallback, useMemo } from "react";
import { InventoryContext } from "./inventoryContext";
import usePersistentState from "./usePersistentState";
import { PRODUCTS, MOVEMENTS, LOCATION_INFO, DEFAULT_BUSINESS, TEAM, FIRST_PO_NUMBER, newOnHand } from "../lib/sampleData";
import { withDerived, summarize, needsReorder, recentActivity, valueByCategory, locationSummary } from "../lib/inventory";

// The single source of truth for the app. Every screen reads from here, so a change
// made on one screen (a stock movement, a new product, an order) shows up everywhere.
export default function InventoryProvider({ children }) {
  const [rawProducts, setProducts] = usePersistentState("products", PRODUCTS);
  const [movements, setMovements] = usePersistentState("movements", MOVEMENTS);
  const [orders, setOrders] = usePersistentState("orders", {}); // purchase orders by product id
  const [business, setBusiness] = usePersistentState("business", DEFAULT_BUSINESS);
  const [locationInfo, setLocationInfo] = usePersistentState("locations", LOCATION_INFO);
  const [team, setTeam] = usePersistentState("team", TEAM);

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

  /** Changes a product's details. Quantity is not edited here; it only changes through movements. */
  const updateProduct = useCallback(
    (productId, changes) => {
      setProducts((list) => list.map((p) => (p.id === productId ? { ...p, ...changes, qty: p.qty } : p)));
      if (changes.name) {
        setMovements((list) => list.map((m) => (m.productId === productId ? { ...m, product: changes.name } : m)));
      }
    },
    [setProducts, setMovements]
  );

  /**
   * Adds or updates products from a spreadsheet (rows come from readProductRows).
   * A changed quantity is recorded as a count, so stock history stays complete.
   */
  const importProducts = useCallback(
    (rows) => {
      const byId = new Map(rawProducts.map((p) => [p.id, p]));
      const counts = rows
        .filter((r) => !r.isNew && byId.get(r.product.id).qty !== r.product.qty)
        .map((r, i) => ({
          id: `m${Date.now()}-${i}`,
          kind: "count",
          qty: r.product.qty,
          unit: r.product.unit,
          productId: r.product.id,
          product: r.product.name,
          reason: "Stock count correction",
          note: "Imported from CSV",
          loc: r.product.loc,
          who: "You",
          day: "Today",
          time: "Just now",
        }));
      const updates = new Map(rows.filter((r) => !r.isNew).map((r) => [r.product.id, r.product]));
      const added = rows.filter((r) => r.isNew).map((r) => r.product);
      setProducts((list) => [...added, ...list.map((p) => updates.get(p.id) ?? p)]);
      if (counts.length) setMovements((list) => [...counts, ...list]);
      const newLocations = [...new Set(rows.filter((r) => r.newLocation).map((r) => r.product.loc))];
      if (newLocations.length) {
        setLocationInfo((list) => [
          ...list,
          ...newLocations
            .filter((n) => !list.some((l) => l.name.toLowerCase() === n.toLowerCase()))
            .map((name) => ({ name, kind: "Added by import", lastCount: null })),
        ]);
      }
    },
    [rawProducts, setProducts, setMovements, setLocationInfo]
  );

  const inviteMember = useCallback((member) => setTeam((list) => [...list, member]), [setTeam]);
  const setMemberRole = useCallback(
    (email, role) => setTeam((list) => list.map((m) => (m.email === email ? { ...m, role } : m))),
    [setTeam]
  );

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
    setTeam(TEAM);
  }, [setProducts, setMovements, setOrders, setBusiness, setLocationInfo, setTeam]);

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
      updateProduct,
      importProducts,
      team,
      inviteMember,
      setMemberRole,
      setBusiness,
      resetDemo,
    }),
    [products, movements, orders, business, locationInfo, team, recordMovement, addProduct, updateProduct, importProducts, addLocation, placeOrder, inviteMember, setMemberRole, setBusiness, resetDemo]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
