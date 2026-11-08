// Dates are ISO strings (YYYY-MM-DD) handled in UTC so the day never shifts with the time zone.
// A movement's time is a local timestamp "YYYY-MM-DDTHH:MM" (`at`).

const pad = (n: number) => String(n).padStart(2, "0");
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function addDays(iso: string, days: number): string {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when b is later). */
export const daysBetween = (a: string, b: string) => Math.round((utc(b).getTime() - utc(a).getTime()) / 86400000);

/** 0 = Sunday … 6 = Saturday */
export const weekday = (iso: string) => utc(iso).getUTCDay();

/** The Monday on or before the date */
export const weekStart = (iso: string) => addDays(iso, -((weekday(iso) + 6) % 7));

export function shortDate(iso: string): string {
  return utc(iso).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/** "Nov 4", or "Nov 4, 2025" when it is not the given year */
export function monthDay(iso: string, thisYear = todayISO().slice(0, 4)): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  if (iso.slice(0, 4) !== thisYear) opts.year = "numeric";
  return utc(iso).toLocaleDateString("en-CA", opts);
}

/** "Friday, Nov 6" */
export const longDate = (iso: string) =>
  utc(iso).toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

/** Today's date in the browser's time zone */
export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The current local time as a movement timestamp */
export function nowStamp(now = new Date()) {
  return `${todayISO(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** "Today", "Yesterday" or "Wed, Nov 4" */
export function dayLabel(iso: string, today = todayISO()): string {
  const diff = daysBetween(iso, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return iso.slice(0, 4) === today.slice(0, 4) ? shortDate(iso) : monthDay(iso, today.slice(0, 4));
}

/** "9:42 am" from "2026-11-06T09:42" */
export function clockTime(stamp: string): string {
  const [h, m] = stamp.slice(11, 16).split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "am" : "pm"}`;
}
