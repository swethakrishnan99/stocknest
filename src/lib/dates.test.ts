import { addDays, clockTime, dayLabel, daysBetween, longDate, monthDay, nowStamp, todayISO, weekStart } from "./dates";

describe("dates", () => {
  it("adds days across months and years", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts whole days between dates", () => {
    expect(daysBetween("2026-11-01", "2026-11-06")).toBe(5);
    expect(daysBetween("2026-11-06", "2026-11-01")).toBe(-5);
  });

  it("finds the Monday a week starts on", () => {
    expect(weekStart("2026-11-06")).toBe("2026-11-02"); // Friday
    expect(weekStart("2026-11-02")).toBe("2026-11-02"); // Monday
    expect(weekStart("2026-11-08")).toBe("2026-11-02"); // Sunday
  });

  it("labels days relative to today", () => {
    expect(dayLabel("2026-11-06", "2026-11-06")).toBe("Today");
    expect(dayLabel("2026-11-05", "2026-11-06")).toBe("Yesterday");
    expect(dayLabel("2026-11-04", "2026-11-06")).toBe("Wed, Nov 4");
    expect(dayLabel("2025-12-30", "2026-01-02")).toBe("Dec 30, 2025");
  });

  it("formats clock times and dates", () => {
    expect(clockTime("2026-11-06T09:05")).toBe("9:05 am");
    expect(clockTime("2026-11-06T00:30")).toBe("12:30 am");
    expect(clockTime("2026-11-06T12:00")).toBe("12:00 pm");
    expect(clockTime("2026-11-06T17:45")).toBe("5:45 pm");
    expect(longDate("2026-11-06")).toBe("Friday, Nov 6");
    expect(monthDay("2026-11-06", "2026")).toBe("Nov 6");
    expect(monthDay("2026-11-06", "2027")).toBe("Nov 6, 2026");
  });

  it("reads today's date and time from the clock", () => {
    expect(todayISO()).toBe("2026-11-06");
    expect(nowStamp()).toBe("2026-11-06T10:00");
  });
});
