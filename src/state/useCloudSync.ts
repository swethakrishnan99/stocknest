import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import usePersistentState from "./usePersistentState";
import type { SyncedPrints, SyncedState } from "../lib/cloud/records";
import { syncRound } from "../lib/cloud/syncRound";
import type { CloudBusiness, CloudInvite, CloudMember } from "../lib/cloud/backend";
import type { Auth } from "./authContext";
import type { Role } from "../types";

/** Which cloud business this device's data belongs to, and what it last agreed with the cloud */
export interface CloudLink {
  businessId: string;
  userId: string;
  synced: SyncedPrints;
  lastPull: string | null;
  /** set when joining an existing business: this device's data is replaced by the cloud's on the next sync */
  replaceLocal?: boolean;
}

export type SyncStatus = "off" | "signedOut" | "notLinked" | "syncing" | "synced" | "offline" | "error";

export interface CloudSync {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  error: string;
  linked: boolean;
  businesses: CloudBusiness[] | null; // businesses the signed-in person belongs to (null while loading)
  members: CloudMember[];
  invites: CloudInvite[];
  syncNow: () => Promise<void>;
  uploadThisDevice: () => Promise<void>;
  /** Uploads as soon as the person's own business is set up (used right after setting one up while signed in) */
  uploadWhenReady: () => void;
  joinBusiness: (businessId: string) => void;
  disconnect: () => void;
  refreshTeam: () => Promise<void>;
  invite: (invite: CloudInvite) => Promise<void>;
  cancelInvite: (email: string) => Promise<void>;
  setRole: (userId: string, role: Role) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
}

const POLL_MS = 30_000;
const DEBOUNCE_MS = 1_500;

interface Options {
  auth: Auth;
  snapshot: SyncedState;
  empty: SyncedState; // what an empty business looks like (used before downloading one)
  apply: (state: SyncedState) => void;
  businessName: string;
  canUpload: boolean; // only a business of the person's own (not the demo) can be uploaded
  autoOpen: boolean; // this device only has the demo (or nothing yet), so a cloud business can replace it without asking
  onLinked: () => void;
}

/** Keeps this device's data and the cloud in step while someone is signed in. */
export default function useCloudSync({ auth, snapshot, empty, apply, businessName, canUpload, autoOpen, onLinked }: Options): CloudSync {
  const { backend, user, status: authStatus } = auth;
  const [link, setLink] = usePersistentState<CloudLink | null>("cloud", null);
  const [status, setStatus] = useState<SyncStatus>("off");
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [businesses, setBusinesses] = useState<CloudBusiness[] | null>(null);
  const [members, setMembers] = useState<CloudMember[]>([]);
  const [invites, setInvites] = useState<CloudInvite[]>([]);

  const ready = authStatus === "signedIn" && !!backend && !!user;
  const active = ready && !!link && link.userId === user!.id;

  // The latest values, for the sync loop (which outlives renders)
  const snap = useRef(snapshot);
  const linkRef = useRef(link);
  useEffect(() => {
    snap.current = snapshot;
    linkRef.current = link;
  });
  const running = useRef(false);
  const again = useRef(false);
  const syncAgain = useRef<() => void>(() => {});

  const refreshTeam = useCallback(async () => {
    const l = linkRef.current;
    if (!backend || !l) return;
    const [m, i] = await Promise.all([backend.members(l.businessId), backend.invites(l.businessId).catch(() => [])]);
    setMembers(m);
    setInvites(i);
  }, [backend]);

  const syncNow = useCallback(async () => {
    const l = linkRef.current;
    if (!backend || !l) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setStatus("syncing");
    try {
      const round = await syncRound(backend, l, () => snap.current, empty);
      if (round.state) {
        apply(round.state);
        snap.current = round.state;
      }
      const next: CloudLink = { ...l, ...round.link };
      linkRef.current = next;
      setLink(next);
      setLastSyncedAt(new Date());
      setError("");
      setStatus("synced");
    } catch (err) {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      setStatus(offline ? "offline" : "error");
      setError(offline ? "" : err instanceof Error ? err.message : "Sync failed.");
    } finally {
      running.current = false;
      if (again.current) {
        again.current = false;
        setTimeout(() => syncAgain.current(), 0);
      }
    }
  }, [backend, apply, empty, setLink]);
  useEffect(() => {
    syncAgain.current = () => void syncNow();
  }, [syncNow]);

  // Signed in: join any invites, then load the businesses this person belongs to
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        await backend!.acceptInvites();
        const list = await backend!.myBusinesses();
        if (!cancelled) setBusinesses(list);
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Couldn't load your businesses.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, backend, auth.enabled, user?.id]);

  // Linked: sync now, then every 30 seconds, when the connection comes back and when the app is reopened
  useEffect(() => {
    if (!active) return;
    const first = setTimeout(() => {
      void syncNow();
      void refreshTeam();
    }, 0);
    const timer = setInterval(() => void syncNow(), POLL_MS);
    const onBack = () => void syncNow();
    const onVisible = () => document.visibilityState === "visible" && void syncNow();
    window.addEventListener("online", onBack);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener("online", onBack);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, link?.businessId, syncNow, refreshTeam]);

  // A change on this device: send it shortly after (several quick changes go together)
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [snapshot, active, syncNow]);

  const [uploadPending, setUploadPending] = useState(false);
  const uploadThisDevice = useCallback(async () => {
    if (!backend || !user) return;
    if (!canUpload) throw new Error("Set up your own business first; the demo bakery can't be uploaded.");
    const businessId = await backend.createBusiness(businessName, user.name);
    const next: CloudLink = { businessId, userId: user.id, synced: {}, lastPull: null };
    linkRef.current = next;
    setLink(next);
    setBusinesses((list) => [...(list ?? []), { id: businessId, name: businessName, role: "Owner" }]);
    onLinked();
  }, [backend, user, canUpload, businessName, setLink, onLinked]);

  // Set up while signed in: upload once the new business exists on this device
  useEffect(() => {
    if (!uploadPending || !ready || !canUpload || link) return;
    const t = setTimeout(() => {
      setUploadPending(false);
      uploadThisDevice().catch((err: Error) => setError(err.message));
    }, 0);
    return () => clearTimeout(t);
  }, [uploadPending, ready, canUpload, link, uploadThisDevice]);

  const joinBusiness = useCallback(
    (businessId: string) => {
      if (!user) return;
      const next: CloudLink = { businessId, userId: user.id, synced: {}, lastPull: null, replaceLocal: true };
      linkRef.current = next;
      setLink(next);
      onLinked();
    },
    [user, setLink, onLinked]
  );

  // Signed in on a device that only has the demo: open the person's business straight away
  const onlyBusiness = ready && !link && autoOpen && businesses?.length === 1 ? businesses[0].id : null;
  useEffect(() => {
    if (!onlyBusiness) return;
    const t = setTimeout(() => joinBusiness(onlyBusiness), 0);
    return () => clearTimeout(t);
  }, [onlyBusiness, joinBusiness]);

  const disconnect = useCallback(() => {
    linkRef.current = null;
    setLink(null);
    setMembers([]);
    setInvites([]);
  }, [setLink]);

  const teamAction = useCallback(
    <A extends unknown[]>(fn: (businessId: string, ...args: A) => Promise<void>) =>
      async (...args: A) => {
        const l = linkRef.current;
        if (!l) return;
        await fn(l.businessId, ...args);
        await refreshTeam();
      },
    [refreshTeam]
  );

  return useMemo(
    (): CloudSync => ({
      status: active ? status : ready ? "notLinked" : auth.enabled ? "signedOut" : "off",
      lastSyncedAt,
      error,
      linked: active,
      businesses: ready ? businesses : null,
      members,
      invites,
      syncNow,
      uploadThisDevice,
      uploadWhenReady: () => setUploadPending(true),
      joinBusiness,
      disconnect,
      refreshTeam,
      invite: teamAction((b, i: CloudInvite) => backend!.invite(b, i)),
      cancelInvite: teamAction((b, email: string) => backend!.cancelInvite(b, email)),
      setRole: teamAction((b, userId: string, role: Role) => backend!.setRole(b, userId, role)),
      removeMember: teamAction((b, userId: string) => backend!.removeMember(b, userId)),
    }),
    [active, status, ready, auth.enabled, lastSyncedAt, error, businesses, members, invites, syncNow, uploadThisDevice, joinBusiness, disconnect, refreshTeam, teamAction, backend]
  );
}
