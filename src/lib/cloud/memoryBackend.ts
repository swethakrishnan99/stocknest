// An in-memory stand-in for the cloud, for tests. It applies stock movements to quantities the way
// the real database does (supabase/setup.sql), so sync can be tested end to end.
import type { CloudBackend, CloudInvite, CloudMember } from "./backend";
import type { CloudRecord } from "./records";
import type { Role } from "../../types";

interface Row extends CloudRecord {
  updated_at: string;
}

export function memoryBackend(user: { id: string; email: string; name: string }) {
  const businesses = new Map<string, { name: string; members: CloudMember[]; invites: CloudInvite[]; rows: Map<string, Row> }>();
  let clock = 0;
  const stamp = () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, ++clock)).toISOString();
  const key = (r: CloudRecord) => `${r.collection}/${r.id}`;

  const backend: CloudBackend & { offline: boolean; businesses: typeof businesses } = {
    offline: false,
    businesses,
    async myBusinesses() {
      return [...businesses].filter(([, b]) => b.members.some((m) => m.userId === user.id)).map(([id, b]) => ({ id, name: b.name, role: b.members.find((m) => m.userId === user.id)!.role }));
    },
    async createBusiness(name, memberName) {
      const id = `biz-${businesses.size + 1}`;
      businesses.set(id, { name, members: [{ userId: user.id, name: memberName, email: user.email, role: "Owner" }], invites: [], rows: new Map() });
      return id;
    },
    async acceptInvites() {
      return [];
    },
    async push(businessId, records) {
      if (backend.offline) throw new Error("offline");
      const rows = businesses.get(businessId)!.rows;
      for (const r of records) {
        const old = rows.get(key(r));
        let data = r.data as Record<string, unknown> | null;
        if (r.collection === "products" && old?.data && data) data = { ...data, qty: (old.data as { qty: number }).qty };
        if (r.collection === "movements" && data) {
          const product = rows.get(`products/${data.productId}`);
          const p = product?.data as { qty: number } | undefined;
          if (product && p && !old) {
            const q = Number(data.qty);
            const next = data.kind === "in" ? p.qty + q : data.kind === "out" ? Math.max(0, p.qty - q) : data.kind === "count" ? q : p.qty;
            data = { ...data, applied: next - p.qty, serverBefore: p.qty };
            rows.set(key(product), { ...product, data: { ...p, qty: next }, updated_at: stamp() });
          }
        }
        if (r.collection === "movements" && r.deleted && old?.data && !old.deleted) {
          const m = old.data as { productId: string; kind: string; applied?: number; serverBefore?: number };
          const product = rows.get(`products/${m.productId}`);
          const p = product?.data as { qty: number } | undefined;
          if (product && p) {
            const next = m.kind === "count" ? (m.serverBefore ?? p.qty) : Math.max(0, p.qty - (m.applied ?? 0));
            rows.set(key(product), { ...product, data: { ...p, qty: next }, updated_at: stamp() });
          }
        }
        rows.set(key(r), { collection: r.collection, id: r.id, data, deleted: !!r.deleted, updated_at: stamp() });
      }
    },
    async pull(businessId, since) {
      if (backend.offline) throw new Error("offline");
      const records = [...businesses.get(businessId)!.rows.values()].filter((r) => !since || r.updated_at > since).sort((a, b) => (a.updated_at < b.updated_at ? -1 : 1));
      return { records: records.map((r) => ({ ...r })), latest: records.length ? records[records.length - 1].updated_at : since };
    },
    async members(businessId) {
      return businesses.get(businessId)!.members;
    },
    async invites(businessId) {
      return businesses.get(businessId)!.invites;
    },
    async invite(businessId, invite) {
      businesses.get(businessId)!.invites.push(invite);
    },
    async cancelInvite(businessId, email) {
      const b = businesses.get(businessId)!;
      b.invites = b.invites.filter((i) => i.email !== email);
    },
    async setRole(businessId, userId, role: Role) {
      const b = businesses.get(businessId)!;
      b.members = b.members.map((m) => (m.userId === userId ? { ...m, role } : m));
    },
    async removeMember(businessId, userId) {
      const b = businesses.get(businessId)!;
      b.members = b.members.filter((m) => m.userId !== userId);
    },
  };
  return backend;
}
