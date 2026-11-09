import type { SupabaseClient } from "@supabase/supabase-js";
import { CloudError, type CloudBackend, type CloudBusiness, type CloudInvite, type CloudMember } from "./backend";
import type { CloudRecord } from "./records";
import type { Role } from "../../types";

const PAGE = 1000; // Supabase returns at most 1000 rows per request
const BATCH = 200; // records per upload request

function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new CloudError(`${what} failed: ${result.error.message}`);
  return result.data;
}

export function supabaseBackend(client: SupabaseClient): CloudBackend {
  return {
    async myBusinesses() {
      const { data: auth } = await client.auth.getUser();
      if (!auth.user) return [];
      const rows = check(
        await client.from("members").select("role, businesses(id, name)").eq("user_id", auth.user.id),
        "Loading your businesses"
      ) as unknown as { role: Role; businesses: { id: string; name: string } | null }[];
      return rows.filter((r) => r.businesses).map((r): CloudBusiness => ({ id: r.businesses!.id, name: r.businesses!.name, role: r.role }));
    },

    async createBusiness(name, memberName) {
      return check(await client.rpc("create_business", { p_name: name, p_member_name: memberName }), "Creating the business") as string;
    },

    async acceptInvites() {
      return (check(await client.rpc("accept_invites"), "Joining invited businesses") as string[] | null) ?? [];
    },

    async push(businessId, records) {
      for (let i = 0; i < records.length; i += BATCH) {
        const rows = records.slice(i, i + BATCH).map((r) => ({ business_id: businessId, collection: r.collection, id: r.id, data: r.data, deleted: !!r.deleted }));
        check(await client.from("records").upsert(rows, { onConflict: "business_id,collection,id" }), "Saving to the cloud");
      }
    },

    async pull(businessId, since) {
      const records: CloudRecord[] = [];
      for (let from = 0; ; from += PAGE) {
        let query = client
          .from("records")
          .select("collection, id, data, deleted, updated_at")
          .eq("business_id", businessId)
          .order("updated_at", { ascending: true })
          .range(from, from + PAGE - 1);
        if (since) query = query.gt("updated_at", since);
        const rows = check(await query, "Loading from the cloud") as CloudRecord[];
        records.push(...rows);
        if (rows.length < PAGE) break;
      }
      return { records, latest: records.length ? records[records.length - 1].updated_at ?? since : since };
    },

    async members(businessId) {
      const rows = check(await client.from("members").select("user_id, name, email, role").eq("business_id", businessId), "Loading the team") as {
        user_id: string;
        name: string;
        email: string;
        role: Role;
      }[];
      return rows.map((r): CloudMember => ({ userId: r.user_id, name: r.name, email: r.email, role: r.role }));
    },

    async invites(businessId) {
      return check(await client.from("invites").select("email, name, role").eq("business_id", businessId), "Loading invites") as CloudInvite[];
    },

    async invite(businessId, invite) {
      check(await client.from("invites").upsert({ business_id: businessId, email: invite.email.toLowerCase(), name: invite.name, role: invite.role }), "Adding someone");
    },

    async cancelInvite(businessId, email) {
      check(await client.from("invites").delete().eq("business_id", businessId).eq("email", email), "Cancelling the invite");
    },

    async setRole(businessId, userId, role) {
      check(await client.from("members").update({ role }).eq("business_id", businessId).eq("user_id", userId), "Changing the role");
    },

    async removeMember(businessId, userId) {
      check(await client.from("members").delete().eq("business_id", businessId).eq("user_id", userId), "Removing them from the team");
    },
  };
}
