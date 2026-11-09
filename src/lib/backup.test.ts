import { backupFileName, parseBackup } from "./backup";

const valid = {
  app: "StockNest",
  version: 2,
  savedAt: "2026-11-06T10:00",
  mode: "own",
  business: { name: "Rosie's", currency: "", timeZone: "", defaultReorder: "5", type: "retail", categories: ["Products"] },
  products: [],
  movements: [],
  orders: {},
  locations: [],
  team: [],
  suppliers: [],
  batches: [],
  alerts: { lowStock: true, dailySummary: true, expiry: true, expiryDays: 14 },
  nextPo: 1001,
};

describe("backups", () => {
  it("names the file after the business and the date", () => {
    expect(backupFileName("Rosie's Cakes & Co.", "2026-11-06")).toBe("rosie-s-cakes-co-backup-2026-11-06.json");
  });

  it("reads a backup and explains what's wrong with anything else", () => {
    expect(parseBackup(JSON.stringify(valid)).business.name).toBe("Rosie's");
    expect(() => parseBackup("not json")).toThrow("isn't a StockNest backup (it couldn't be read)");
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow("isn't a StockNest backup");
    expect(() => parseBackup(JSON.stringify({ ...valid, version: 1 }))).toThrow("different version");
    expect(() => parseBackup(JSON.stringify({ ...valid, products: null }))).toThrow("missing its products");
  });
});
