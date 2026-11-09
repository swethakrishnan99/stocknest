import type { CloudSync } from "../../state/useCloudSync";

/** "Synced 2 minutes ago", "Syncing…", "Offline" */
export function syncLabel(cloud: CloudSync): string {
  switch (cloud.status) {
    case "syncing":
      return "Syncing…";
    case "offline":
      return "Offline. Changes are saved here and sync when you're back online.";
    case "error":
      return `Not synced: ${cloud.error}`;
    case "synced": {
      if (!cloud.lastSyncedAt) return "Synced";
      const mins = Math.round((Date.now() - cloud.lastSyncedAt.getTime()) / 60000);
      return mins < 1 ? "Synced just now" : `Synced ${mins} min ago`;
    }
    default:
      return "";
  }
}

