// Everything StockNest asks of the cloud, behind one interface: the real one talks to Supabase,
// tests use an in-memory one.
import type { Role } from "../../types";
import type { CloudRecord } from "./records";

export interface CloudBusiness {
  id: string;
  name: string;
  role: Role;
}

export interface CloudMember {
  userId: string;
  name: string;
  email: string;
  role: Role;
}

export interface CloudInvite {
  email: string;
  name: string;
  role: Role;
}

export interface CloudBackend {
  myBusinesses(): Promise<CloudBusiness[]>;
  createBusiness(name: string, memberName: string): Promise<string>;
  acceptInvites(): Promise<string[]>;
  /** Sends records in order; they are saved in the same order */
  push(businessId: string, records: CloudRecord[]): Promise<void>;
  /** Records changed after `since` (all of them when since is null), oldest first, and the newest change time */
  pull(businessId: string, since: string | null): Promise<{ records: CloudRecord[]; latest: string | null }>;
  members(businessId: string): Promise<CloudMember[]>;
  invites(businessId: string): Promise<CloudInvite[]>;
  invite(businessId: string, invite: CloudInvite): Promise<void>;
  cancelInvite(businessId: string, email: string): Promise<void>;
  setRole(businessId: string, userId: string, role: Role): Promise<void>;
  removeMember(businessId: string, userId: string): Promise<void>;
}

/** Errors from the cloud, worded for the person using the app */
export class CloudError extends Error {}
