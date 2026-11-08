// Dates are ISO strings (YYYY-MM-DD) handled in UTC so the day never shifts with the time zone

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function shortDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}
