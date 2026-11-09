// How the app's data maps onto cloud records, and what changed since the last sync.
// Pure functions, so they can be tested without a server.
import type { Alerts, Batch, Business, LocationInfo, Movement, Product, PurchaseOrder, Supplier } from "../../types";

export type Collection = "products" | "movements" | "orders" | "locations" | "suppliers" | "batches" | "settings";
export const COLLECTIONS: Collection[] = ["products", "movements", "orders", "locations", "suppliers", "batches", "settings"];

/** The parts of the app's data that are kept in the cloud (the team lives in its own table) */
export interface SyncedState {
  products: Product[];
  movements: Movement[];
  orders: Record<string, PurchaseOrder>;
  locations: LocationInfo[];
  suppliers: Supplier[];
  batches: Batch[];
  business: Business;
  alerts: Alerts;
  nextPo: number;
}

/** One item as it travels to and from the cloud; data null means it was deleted */
export interface CloudRecord {
  collection: Collection;
  id: string;
  data: unknown;
  deleted?: boolean;
  updated_at?: string;
}

type Items = Map<string, unknown>;

/** Every item in the state, by collection and id */
export function itemsOf(s: SyncedState): Record<Collection, Items> {
  return {
    products: new Map(s.products.map((p) => [p.id, p])),
    movements: new Map(s.movements.map((m) => [m.id, m])),
    orders: new Map(Object.entries(s.orders)),
    locations: new Map(s.locations.map((l) => [l.name, l])),
    suppliers: new Map(s.suppliers.map((x) => [x.name, x])),
    batches: new Map(s.batches.map((b) => [b.id, b])),
    settings: new Map<string, unknown>([
      ["business", s.business],
      ["alerts", s.alerts],
      ["nextPo", { value: s.nextPo }],
    ]),
  };
}

/** A short fingerprint of an item, to notice when it changes (FNV-1a) */
export function fingerprint(value: unknown): string {
  const text = JSON.stringify(value) ?? "";
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + text.length.toString(36);
}

/** What the device last agreed with the cloud: collection → id → fingerprint */
export type SyncedPrints = Partial<Record<Collection, Record<string, string>>>;

/**
 * The records to send: everything new or changed since the last sync, and deletions.
 * New products go first and carry the quantity they had before their unsent movements, because the
 * server adds each movement to the product's quantity when it arrives.
 */
export function changesToPush(s: SyncedState, synced: SyncedPrints): CloudRecord[] {
  const items = itemsOf(s);
  const first: CloudRecord[] = [];
  const movements: CloudRecord[] = [];
  const rest: CloudRecord[] = [];
  const unsentMovements = s.movements.filter((m) => synced.movements?.[m.id] === undefined);

  for (const collection of COLLECTIONS) {
    const known = synced[collection] ?? {};
    for (const [id, data] of items[collection]) {
      if (known[id] === fingerprint(data)) continue;
      if (collection === "products" && known[id] === undefined) {
        const p = data as Product;
        // the oldest unsent movement for it knows what it had before (movements are newest first)
        const oldest = [...unsentMovements].reverse().find((m) => m.productId === p.id && m.before !== undefined);
        first.push({ collection, id, data: { ...p, qty: oldest?.before ?? p.qty } });
      } else if (collection === "movements") {
        movements.push({ collection, id, data });
      } else {
        rest.push({ collection, id, data });
      }
    }
    for (const id of Object.keys(known)) {
      if (!items[collection].has(id)) rest.push({ collection, id, data: null, deleted: true });
    }
  }
  // oldest movements first, so the server applies them in the order they happened
  movements.sort((a, b) => ((a.data as Movement).at < (b.data as Movement).at ? -1 : 1));
  return [...first, ...movements, ...rest];
}

/** Fingerprints after the given records were sent (or received) successfully */
export function markSynced(synced: SyncedPrints, records: CloudRecord[]): SyncedPrints {
  const next: SyncedPrints = { ...synced };
  for (const r of records) {
    const known = { ...(next[r.collection] ?? {}) };
    if (r.deleted || r.data === null) delete known[r.id];
    else known[r.id] = fingerprint(r.data);
    next[r.collection] = known;
  }
  return next;
}

/** Fingerprints of everything in a state (after downloading it all) */
export function printsOf(s: SyncedState): SyncedPrints {
  const items = itemsOf(s);
  return Object.fromEntries(COLLECTIONS.map((c) => [c, Object.fromEntries([...items[c]].map(([id, v]) => [id, fingerprint(v)]))])) as SyncedPrints;
}

/** Strips server-only fields from a movement */
function cleanMovement(data: unknown): Movement {
  const { applied: _applied, serverBefore: _serverBefore, ...m } = data as Movement & { applied?: number; serverBefore?: number };
  return m;
}

/**
 * Applies records from the cloud. Items changed on this device since the last sync are left alone
 * (they'll be sent next), everything else takes the cloud's version. With `takeAll` (joining a
 * business) the cloud's version always wins.
 */
export function applyRemote(s: SyncedState, remote: CloudRecord[], synced: SyncedPrints, { takeAll = false } = {}): { state: SyncedState; synced: SyncedPrints } {
  const items = itemsOf(s);
  const accepted: CloudRecord[] = [];
  for (const r of remote) {
    const local = items[r.collection].get(r.id);
    const known = synced[r.collection]?.[r.id];
    const changedHere = local !== undefined && known !== fingerprint(local);
    const newHere = local !== undefined && known === undefined;
    if (!takeAll && (changedHere || newHere)) continue;
    const data = r.collection === "movements" && r.data ? cleanMovement(r.data) : r.data;
    if (r.deleted || data === null) items[r.collection].delete(r.id);
    else items[r.collection].set(r.id, data);
    accepted.push({ ...r, data });
  }

  const byNewest = (a: Movement, b: Movement) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0);
  const settings = items.settings;
  const state: SyncedState = {
    products: [...items.products.values()] as Product[],
    movements: ([...items.movements.values()] as Movement[]).sort(byNewest),
    orders: Object.fromEntries(items.orders) as Record<string, PurchaseOrder>,
    locations: [...items.locations.values()] as LocationInfo[],
    suppliers: [...items.suppliers.values()] as Supplier[],
    batches: [...items.batches.values()] as Batch[],
    business: (settings.get("business") as Business) ?? s.business,
    alerts: (settings.get("alerts") as Alerts) ?? s.alerts,
    nextPo: (settings.get("nextPo") as { value: number } | undefined)?.value ?? s.nextPo,
  };
  return { state, synced: markSynced(synced, accepted) };
}
