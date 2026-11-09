// One round of syncing, without React: send this device's changes, then fetch everyone else's.
import { applyRemote, changesToPush, itemsOf, markSynced, type CloudRecord, type SyncedPrints, type SyncedState } from "./records";
import type { CloudBackend } from "./backend";

export interface LinkState {
  businessId: string;
  synced: SyncedPrints;
  lastPull: string | null;
  replaceLocal?: boolean;
}

export interface RoundResult {
  link: LinkState;
  /** the new state, or null when nothing came from the cloud */
  state: SyncedState | null;
  pushed: number;
  pulled: number;
}

/**
 * `current` is read twice: before sending, and again before applying what came back, so changes
 * made on the device while the round was running aren't lost.
 */
export async function syncRound(backend: CloudBackend, link: LinkState, current: () => SyncedState, empty: SyncedState): Promise<RoundResult> {
  let synced = link.synced;
  let pushed = 0;
  if (!link.replaceLocal) {
    const state = current();
    const changes = changesToPush(state, synced);
    if (changes.length) {
      await backend.push(link.businessId, changes);
      pushed = changes.length;
      // remember what this device had (not the adjusted copy that was sent)
      const items = itemsOf(state);
      synced = markSynced(synced, changes.map((r): CloudRecord => (r.deleted ? r : { ...r, data: items[r.collection].get(r.id) })));
    }
  }
  const { records, latest } = await backend.pull(link.businessId, link.replaceLocal ? null : link.lastPull);
  let state: SyncedState | null = null;
  if (records.length || link.replaceLocal) {
    const result = applyRemote(link.replaceLocal ? empty : current(), records, link.replaceLocal ? {} : synced);
    synced = result.synced;
    state = result.state;
  }
  return { link: { ...link, synced, lastPull: latest, replaceLocal: false }, state, pushed, pulled: records.length };
}
