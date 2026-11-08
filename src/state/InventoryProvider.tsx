import { useCallback, useMemo, type ReactNode } from "react";
import { InventoryContext, type Inventory } from "./inventoryContext";
import usePersistentState, { hasSavedData } from "./usePersistentState";
import { DEFAULT_ALERTS, DEFAULT_BUSINESS, TEAM, FIRST_PO_NUMBER, SAMPLE_SUPPLIERS, newOnHand } from "../lib/sampleData";
import { buildSampleData, sampleBatches } from "../lib/sampleHistory";
import { nowStamp, todayISO } from "../lib/dates";
import { withDerived, summarize, needsReorder, recentActivity, valueByCategory, locationSummary } from "../lib/inventory";
import { can as roleCan, type Permission } from "../lib/permissions";
import { crossedReorder, TRANSFER } from "../lib/alerts";
import { notifyDevice } from "../lib/deviceNotify";
import { nextSku } from "../lib/productCsv";
import { templateFor } from "../lib/templates";
import type {
  Alerts,
  BackupData,
  Batch,
  Business,
  ImportRow,
  LocationInfo,
  Mode,
  Movement,
  MovementInput,
  Product,
  PurchaseOrder,
  Role,
  Supplier,
  TeamMember,
} from "../types";

// The single source of truth for the app. Every screen reads from here, so a change
// made on one screen (a stock movement, a new product, an order) shows up everywhere.

// The sample is built for today's date the first time it is needed
let sample: ReturnType<typeof buildSampleData> | null = null;
const minutesNow = () => new Date().getHours() * 60 + new Date().getMinutes();
const getSample = () => (sample ??= buildSampleData(todayISO(), minutesNow()));

/** Owners start numbering their own purchase orders here */
export const OWN_FIRST_PO = 1001;

export interface NewBusiness {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  templateId: string;
  locations: string[];
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "Someone";
let idCounter = 0;
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export default function InventoryProvider({ children }: { children: ReactNode }) {
  // Anyone who already has saved data has been using the demo
  const [mode, setMode] = usePersistentState<Mode>("mode", () => (hasSavedData("products") ? "demo" : null));
  const [rawProducts, setProducts] = usePersistentState<Product[]>("products", () => getSample().products);
  const [movements, setMovements] = usePersistentState<Movement[]>("movements", () => getSample().movements);
  const [orders, setOrders] = usePersistentState<Record<string, PurchaseOrder>>("orders", {}); // open purchase order lines by product id
  const [business, setBusiness] = usePersistentState<Business>("business", DEFAULT_BUSINESS);
  const [locationInfo, setLocationInfo] = usePersistentState<LocationInfo[]>("locations", () => getSample().locations);
  const [team, setTeam] = usePersistentState<TeamMember[]>("team", TEAM);
  const [me, setMe] = usePersistentState<string>("me", TEAM[0].email); // who is using this device
  const [suppliers, setSuppliers] = usePersistentState<Supplier[]>("suppliers", SAMPLE_SUPPLIERS);
  const [batches, setBatches] = usePersistentState<Batch[]>("batches", () => sampleBatches(todayISO()));
  const [alerts, setAlerts] = usePersistentState<Alerts>("alerts", DEFAULT_ALERTS);
  const [nextPo, setNextPo] = usePersistentState<number>("nextPo", FIRST_PO_NUMBER); // PO numbers never repeat

  const products = useMemo(() => rawProducts.map(withDerived), [rawProducts]);
  const currentUser = team.find((m) => m.email === me) ?? team.find((m) => m.role === "Owner") ?? team[0];
  const who = firstName(currentUser?.name ?? "");
  const can = useCallback((permission: Permission) => roleCan(currentUser?.role, permission), [currentUser?.role]);

  /** A movement with the usual fields filled in */
  const makeMovement = useCallback(
    (p: Product, fields: Pick<Movement, "kind" | "qty" | "reason" | "note"> & { loc?: string; before?: number }): Movement => ({
      id: newId("m"),
      unit: p.unit,
      productId: p.id,
      product: p.name,
      loc: p.loc,
      who,
      at: nowStamp(),
      unitCost: p.unitCost,
      ...fields,
    }),
    [who]
  );

  /** Records a stock in, stock out or count for one product and updates its quantity. */
  const recordMovement = useCallback(
    (productId: string, { mode: kind, qty, reason, note }: MovementInput) => {
      const product = rawProducts.find((p) => p.id === productId);
      if (!product) return;
      const after = newOnHand(product.qty, kind, qty);
      setProducts((list) => list.map((p) => (p.id === productId ? { ...p, qty: after } : p)));
      setMovements((list) => [makeMovement(product, { kind, qty, reason, note, before: product.qty }), ...list]);
      if (kind === "count") {
        setLocationInfo((list) => list.map((l) => (l.name === product.loc ? { ...l, lastCount: todayISO() } : l)));
      }
      if (alerts.lowStock && crossedReorder(product.qty, after, product.reorder)) {
        notifyDevice(after === 0 ? `${product.name} is out of stock` : `${product.name} is running low`, `${after} ${product.unit} left · reorder at ${product.reorder}`);
      }
    },
    [rawProducts, setProducts, setMovements, setLocationInfo, makeMovement, alerts.lowStock]
  );

  /**
   * Takes back a movement. Only the latest movement of a product can be undone, so the quantity is
   * exactly what it was before. Returns false when it can't be undone.
   */
  const undoMovement = useCallback(
    (movementId: string) => {
      const m = movements.find((x) => x.id === movementId);
      if (!m || !m.productId) return false;
      const latest = movements.find((x) => x.productId === m.productId);
      const product = rawProducts.find((p) => p.id === m.productId);
      if (latest?.id !== m.id || !product || m.reason === TRANSFER) return false;
      let before = m.before;
      if (before === undefined) {
        if (m.kind === "count") return false; // older counts don't record what was there before
        before = m.kind === "in" ? Math.max(0, product.qty - m.qty) : product.qty + m.qty;
      }
      const restored = before;
      setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, qty: restored } : p)));
      setMovements((list) => list.filter((x) => x.id !== m.id));
      return true;
    },
    [movements, rawProducts, setProducts, setMovements]
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
   * Moves stock to another location. Moving everything simply changes the product's location;
   * moving part of it puts that part on a second entry for the same product at the new location
   * (created if needed), the way a shelf label would.
   */
  const transferStock = useCallback(
    (productId: string, toLoc: string, qty: number) => {
      const from = rawProducts.find((p) => p.id === productId);
      if (!from || from.loc === toLoc || qty <= 0) return null;
      const moved = Math.min(qty, from.qty);
      let twin = rawProducts.find((p) => p.id !== from.id && p.name === from.name && p.unit === from.unit && p.loc === toLoc);
      const note = `${from.loc} → ${toLoc}`;

      if (!twin && moved === from.qty) {
        const after = { ...from, loc: toLoc };
        setProducts((list) => list.map((p) => (p.id === from.id ? after : p)));
        setMovements((list) => [
          makeMovement(after, { kind: "in", qty: moved, reason: TRANSFER, note, before: 0 }),
          makeMovement(from, { kind: "out", qty: moved, reason: TRANSFER, note, before: from.qty }),
          ...list,
        ]);
        return from.id;
      }

      const isNew = !twin;
      twin ??= { ...from, id: nextSku(rawProducts, from.cat), loc: toLoc, qty: 0, barcode: from.barcode };
      const target = twin;
      setProducts((list) => {
        const updated = list.map((p) => (p.id === from.id ? { ...p, qty: p.qty - moved } : p.id === target.id ? { ...p, qty: p.qty + moved } : p));
        return isNew ? [{ ...target, qty: moved }, ...updated] : updated;
      });
      setMovements((list) => [
        makeMovement(target, { kind: "in", qty: moved, reason: TRANSFER, note, before: target.qty }),
        makeMovement(from, { kind: "out", qty: moved, reason: TRANSFER, note, before: from.qty }),
        ...list,
      ]);
      return target.id;
    },
    [rawProducts, setProducts, setMovements, makeMovement]
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
        .map((r) =>
          makeMovement(r.product, {
            kind: "count",
            qty: r.product.qty,
            reason: "Stock count correction",
            note: "Imported from a spreadsheet",
            before: byId.get(r.product.id)?.qty,
          })
        );
      const updates = new Map(rows.filter((r) => !r.isNew).map((r) => [r.product.id, r.product]));
      const added = rows.filter((r) => r.isNew).map((r) => r.product);
      setProducts((list) => [...added, ...list.map((p) => updates.get(p.id) ?? p)]);
      if (counts.length) setMovements((list) => [...counts, ...list]);
      const newCategories = [...new Set(rows.map((r) => r.product.cat))].filter((c) => !business.categories.includes(c));
      if (newCategories.length) setBusiness((b) => ({ ...b, categories: [...b.categories, ...newCategories] }));
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
    [rawProducts, setProducts, setMovements, setLocationInfo, makeMovement, business.categories, setBusiness]
  );

  const inviteMember = useCallback((member: TeamMember) => setTeam((list) => [...list, member]), [setTeam]);
  const setMemberRole = useCallback(
    (email: string, role: Role) => setTeam((list) => list.map((m) => (m.email === email ? { ...m, role } : m))),
    [setTeam]
  );
  const removeMember = useCallback((email: string) => setTeam((list) => list.filter((m) => m.email !== email || m.role === "Owner")), [setTeam]);

  /** Adds a storage location; it appears in every location list straight away. */
  const addLocation = useCallback(
    ({ name, kind }: { name: string; kind: string }) => setLocationInfo((list) => [...list, { name, kind, lastCount: null }]),
    [setLocationInfo]
  );

  /** Places a purchase order: one line per product, all with the same PO number. */
  const placeOrders = useCallback(
    (lines: PurchaseOrder[]) => {
      if (!lines.length) return;
      setOrders((o) => ({ ...o, ...Object.fromEntries(lines.map((l) => [l.productId, l])) }));
      setNextPo((n) => Math.max(n, ...lines.map((l) => l.po + 1)));
    },
    [setOrders, setNextPo]
  );
  const placeOrder = useCallback((order: PurchaseOrder) => placeOrders([order]), [placeOrders]);

  const removeOrder = useCallback(
    (productId: string) =>
      setOrders((o) => {
        const rest = { ...o };
        delete rest[productId];
        return rest;
      }),
    [setOrders]
  );

  const addBatch = useCallback((batch: Omit<Batch, "id">) => setBatches((list) => [...list, { ...batch, id: newId("b") }]), [setBatches]);
  const removeBatch = useCallback((id: string) => setBatches((list) => list.filter((b) => b.id !== id)), [setBatches]);

  /** Marks a purchase order line as delivered: adds the stock as a "Supplier delivery" and closes the line. */
  const receiveOrder = useCallback(
    (productId: string, { qty, note, batch }: { qty: number; note: string; batch?: { code: string; bestBefore: string } }) => {
      const order = orders[productId];
      const product = rawProducts.find((p) => p.id === productId);
      if (!order) return;
      if (qty > 0) {
        recordMovement(productId, {
          mode: "in",
          qty,
          reason: "Supplier delivery",
          note: [`PO #${order.po} · ${order.supplier}`, qty < order.qty && `${qty} of ${order.qty} received`, note].filter(Boolean).join(" · "),
        });
        if (batch?.bestBefore && product) {
          addBatch({ productId, code: batch.code || `PO${order.po}`, bestBefore: batch.bestBefore, qty, loc: product.loc });
        }
      }
      removeOrder(productId);
    },
    [orders, rawProducts, recordMovement, removeOrder, addBatch]
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

  const saveSupplier = useCallback(
    (supplier: Supplier, previousName?: string) => {
      setSuppliers((list) => {
        const i = list.findIndex((s) => s.name === (previousName ?? supplier.name));
        return i === -1 ? [...list, supplier] : list.map((s, j) => (j === i ? supplier : s));
      });
      if (previousName && previousName !== supplier.name) {
        setProducts((list) => list.map((p) => (p.supplier === previousName ? { ...p, supplier: supplier.name } : p)));
      }
    },
    [setSuppliers, setProducts]
  );
  const removeSupplier = useCallback((name: string) => setSuppliers((list) => list.filter((s) => s.name !== name)), [setSuppliers]);

  /** Everything at once (used by the demo, a new business and restoring a backup) */
  const loadAll = useCallback(
    (d: Omit<BackupData, "app" | "version" | "savedAt">, user: string) => {
      setMode(d.mode);
      setBusiness(d.business);
      setProducts(d.products);
      setMovements(d.movements);
      setOrders(d.orders);
      setLocationInfo(d.locations);
      setTeam(d.team);
      setSuppliers(d.suppliers);
      setBatches(d.batches);
      setAlerts(d.alerts);
      setNextPo(d.nextPo);
      setMe(user);
    },
    [setMode, setBusiness, setProducts, setMovements, setOrders, setLocationInfo, setTeam, setSuppliers, setBatches, setAlerts, setNextPo, setMe]
  );

  /** Switches to the sample bakery (also used to reset it) */
  const loadDemo = useCallback(() => {
    const fresh = (sample = buildSampleData(todayISO(), minutesNow()));
    loadAll(
      {
        mode: "demo",
        business: DEFAULT_BUSINESS,
        products: fresh.products,
        movements: fresh.movements,
        orders: {},
        locations: fresh.locations,
        team: TEAM,
        suppliers: SAMPLE_SUPPLIERS,
        batches: sampleBatches(todayISO()),
        alerts: DEFAULT_ALERTS,
        nextPo: FIRST_PO_NUMBER,
      },
      TEAM[0].email
    );
  }, [loadAll]);

  /** Back to the Welcome screen (the data is replaced by whatever is chosen there) */
  const startOver = useCallback(() => {
    loadDemo();
    setMode(null);
  }, [loadDemo, setMode]);

  /** Starts an empty business of the person's own */
  const startOwnBusiness = useCallback(
    (b: NewBusiness) => {
      const template = templateFor(b.templateId);
      const owner: TeamMember = { name: b.ownerName.trim() || "Owner", email: b.ownerEmail.trim() || "owner@example.com", role: "Owner" };
      loadAll(
        {
          mode: "own",
          business: { ...DEFAULT_BUSINESS, name: b.businessName.trim() || "My business", type: template.id, categories: template.categories },
          products: [],
          movements: [],
          orders: {},
          locations: b.locations.map((name) => ({ name, kind: template.locations.find((l) => l.name === name)?.kind ?? "", lastCount: null })),
          team: [owner],
          suppliers: [],
          batches: [],
          alerts: DEFAULT_ALERTS,
          nextPo: OWN_FIRST_PO,
        },
        owner.email
      );
    },
    [loadAll]
  );

  const exportBackup = useCallback(
    (): BackupData => ({
      app: "StockNest",
      version: 2,
      savedAt: nowStamp(),
      mode,
      business,
      products: rawProducts,
      movements,
      orders,
      locations: locationInfo,
      team,
      suppliers,
      batches,
      alerts,
      nextPo,
    }),
    [mode, business, rawProducts, movements, orders, locationInfo, team, suppliers, batches, alerts, nextPo]
  );

  const restoreBackup = useCallback(
    (data: BackupData) => loadAll(data, data.team.some((m) => m.email === me) ? me : (data.team.find((m) => m.role === "Owner") ?? data.team[0])?.email ?? ""),
    [loadAll, me]
  );

  const value = useMemo(
    (): Inventory => ({
      mode,
      products,
      movements,
      orders,
      business,
      summary: summarize(products),
      reorderList: needsReorder(products),
      recent: recentActivity(movements),
      categoryValues: valueByCategory(products, business.categories),
      locations: locationSummary(products, locationInfo),
      locationNames: locationInfo.map((l) => l.name),
      nextPo,
      team,
      currentUser,
      can,
      suppliers,
      batches,
      alerts,
      recordMovement,
      undoMovement,
      transferStock,
      addProduct,
      updateProduct,
      importProducts,
      deleteProduct,
      restoreProduct,
      rawProduct: (id: string) => rawProducts.find((p) => p.id === id),
      placeOrder,
      placeOrders,
      receiveOrder,
      cancelOrder: removeOrder,
      addLocation,
      inviteMember,
      setMemberRole,
      removeMember,
      switchUser: setMe,
      setBusiness,
      saveSupplier,
      removeSupplier,
      addBatch,
      removeBatch,
      setAlerts,
      loadDemo,
      startOver,
      startOwnBusiness,
      exportBackup,
      restoreBackup,
    }),
    [mode, products, rawProducts, movements, orders, nextPo, business, locationInfo, team, currentUser, can, suppliers, batches, alerts, recordMovement, undoMovement, transferStock, addProduct, updateProduct, importProducts, deleteProduct, restoreProduct, placeOrder, placeOrders, receiveOrder, removeOrder, addLocation, inviteMember, setMemberRole, removeMember, setMe, setBusiness, saveSupplier, removeSupplier, addBatch, removeBatch, setAlerts, loadDemo, startOver, startOwnBusiness, exportBackup, restoreBackup]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
