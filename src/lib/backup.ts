// A backup file holds everything StockNest saves, so data can move to another device or browser.
import type { BackupData } from "../types";

export function backupFileName(business: string, date: string) {
  const slug = business.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "stocknest";
  return `${slug}-backup-${date}.json`;
}

export function downloadBackup(data: BackupData, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Reads a backup file's text. Throws an Error with a message for the person when it isn't a backup. */
export function parseBackup(text: string): BackupData {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a StockNest backup (it couldn't be read).");
  }
  const d = data as Partial<BackupData>;
  if (!d || d.app !== "StockNest") throw new Error("That file isn't a StockNest backup.");
  if (d.version !== 2) throw new Error("This backup is from a different version of StockNest.");
  const lists: (keyof BackupData)[] = ["products", "movements", "locations", "team", "suppliers", "batches"];
  for (const key of lists) {
    if (!Array.isArray(d[key])) throw new Error(`The backup is missing its ${key}.`);
  }
  if (!d.business || !Array.isArray(d.business.categories)) throw new Error("The backup is missing the business details.");
  return d as BackupData;
}
