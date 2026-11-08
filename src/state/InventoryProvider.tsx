import { useCallback, useMemo, type ReactNode } from "react";
import { InventoryContext, type Inventory } from "./inventoryContext";
import usePersistentState from "./usePersistentState";
import { DEFAULT_BUSINESS, TEAM, FIRST_PO_NUMBER, newOnHand } from "../lib/sampleData";
import { buildSampleData } from "../lib/sampleHistory";
import { nowStamp, todayISO } from "../lib/dates";
import type { Business, ImportRow, LocationInfo, Movement, MovementInput, Product, PurchaseOrder, TeamMember } from "../types";
import { withDerived, summarize, needsReorder, recentActivity, valueByCategory, locationSummary } from "../lib/inventory";

// The single source of truth for the app. Every screen reads from here, so a change
// made on one screen (a stock movement, a new product, an order) shows up everywhere.
// The sample is built for today's date the first time it is needed
let sample: ReturnType<typeof buildSampleData> | null = null;
const minutesNow = () => new Date().getHours() * 60 + new Date().getMinutes();
const getSample = () => (sample ??= buildSampleData(todayISO(), minutesNow()));

export default function InventoryProvider({ children }: { children: ReactNode }) {
  const [rawProducts, setProducts] = usePersistentState<Product[]>("products", () => getSample().products);
  const [movements, setMovements] = usePersistentState<Movement[]>("movements", () => getSample().movements);
  const [orders, setOrders] = usePersistentState<Record<string, PurchaseOrder>>("orders", {}); // purchase orders by product id
  const [business, setBusiness] = usePersistentState<Business>("business", DEFAULT_BUSINESS);
  const [locationInfo, setLocationInfo] = usePersistentState<LocationInfo[]>("locations", () => getSample().locations);
  const [team, setTeam] = usePersistentState<TeamMember[]>("team", TEAM);
  const [nextPo, setNextPo] = usePersistentState<number>("nextPo", FIRST_PO_NUMBER); // PO numbers never repeat

  const products = useMemo(() => rawProducts.map(withDerived), [rawProducts]);

  /** Records a stock in, stock out or count for one product and updates its quantity. */
  const recordMovement = useCallback(
    (productId: string, { mode, qty, reason, note }: MovementInput) => {
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
          at: nowStamp(),
          unitCost: product.unitCost,
        },
        ...list,
      ]);
      if (mode === "count") {
        setLocationInfo((list) => list.map((l) => (l.name === product.loc ? { ...l, lastCount: todayISO() } : l)));
      }
    },
    [rawProducts, setProducts, setMovements, setLocationInfo]
  );

  const addProduct = useCallback((product: Product) => setProducts((list) => [product, ...list]), [setProducts]);

  /** Changes a product's details. Quantity is not edited here; it only changes through movements. */
  const updateProduct = useCallback(
    (productId: string, changes: Partial<Product>) => {
      setProducts((list) => list.map((p) => (p.id === productId ? { ...p, ...changes, qty: p.qty } : p)));
      const { name } = changes;
      if (name) {
        setMovements((list) => list.map((m) => (m.productId === productId ? { ...m, product: name } : m)));
      }
    },
    [setProducts, setMovements]
  );

  /**
   * Adds or updates products from a spreadsheet (rows come from readProductRows).
   * A changed quantity is recorded as a count, so stock history stays complete.
   */
  const importProducts = useCallback(
    (rows: ImportRow[]) => {
      const byId = new Map(rawProducts.map((p) => [p.id, p]));
      const counts = rows
        .filter((r) => !r.isNew && byId.get(r.product.id)?.qty !== r.product.qty)
        .map((r, i): Movement => ({
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
          at: nowStamp(),
          unitCost: r.product.unitCost,
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

  const inviteMember = useCallback((member: TeamMember) => setTeam((list) => [...list, member]), [setTeam]);
  const setMemberRole = useCallback(
    (email: string, role: string) => setTeam((list) => list.map((m) => (m.email === email ? { ...m, role } : m))),
    [setTeam]
  );

  /** Adds a storage location; it appears in every location list straight away. */
  const addLocation = useCallback(
    ({ name, kind }: { name: string; kind: string }) => setLocationInfo((list) => [...list, { name, kind, lastCount: null }]),
    [setLocationInfo]
  );

  const placeOrder = useCallback(
    (order: PurchaseOrder) => {
      setOrders((o) => ({ ...o, [order.productId]: order }));
      setNextPo((n) => Math.max(n, order.po + 1));
    },
    [setOrders, setNextPo]
  );

  const removeOrder = useCallback(
    (productId: string) =>
      setOrders((o) => {
        const rest = { ...o };
        delete rest[productId];
        return rest;
      }),
    [setOrders]
  );

  /** Marks a purchase order as delivered: adds the stock as a "Supplier delivery" and closes the order. */
  const receiveOrder = useCallback(
    (productId: string, { qty, note }: { qty: number; note: string }) => {
      const order = orders[productId];
      if (!order) return;
      if (qty > 0) {
        recordMovement(productId, {
          mode: "in",
          qty,
          reason: "Supplier delivery",
          note: [`PO #${order.po} · ${order.supplier}`, qty < order.qty && `${qty} of ${order.qty} received`, note].filter(Boolean).join(" · "),
        });
      }
      removeOrder(productId);
    },
    [orders, recordMovement, removeOrder]
  );

  /** Removes a product. Its past movements stay in Stock movements; an open order for it is cancelled. */
  const deleteProduct = useCallback(
    (productId: string) => {
      setProducts((list) => list.filter((p) => p.id !== productId));
      removeOrder(productId);
    },
    [setProducts, removeOrder]
  );

  /** Puts a deleted product back (used by Undo). */
  const restoreProduct = useCallback(
    (product: Product) => setProducts((list) => (list.some((p) => p.id === product.id) ? list : [product, ...list])),
    [setProducts]
  );


  const resetDemo = useCallback(() => {
    const fresh = (sample = buildSampleData(todayISO(), minutesNow()));
    setProducts(fresh.products);
    setMovements(fresh.movements);
    setOrders({});
    setNextPo(FIRST_PO_NUMBER);
    setBusiness(DEFAULT_BUSINESS);
    setLocationInfo(fresh.locations);
    setTeam(TEAM);
  }, [setProducts, setMovements, setOrders, setNextPo, setBusiness, setLocationInfo, setTeam]);

  const value = useMemo(
    (): Inventory => ({
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
      nextPo,
      recordMovement,
      addProduct,
      placeOrder,
      receiveOrder,
      cancelOrder: removeOrder,
      deleteProduct,
      restoreProduct,
      rawProduct: (id: string) => rawProducts.find((p) => p.id === id),
      addLocation,
      updateProduct,
      importProducts,
      team,
      inviteMember,
      setMemberRole,
      setBusiness,
      resetDemo,
    }),
    [products, rawProducts, movements, orders, nextPo, business, locationInfo, team, recordMovement, addProduct, updateProduct, importProducts, addLocation, placeOrder, receiveOrder, removeOrder, deleteProduct, restoreProduct, inviteMember, setMemberRole, setBusiness, resetDemo]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
