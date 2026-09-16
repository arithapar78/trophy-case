import { describe, it, expect } from "vitest";
import {
  inputValueToDate,
  dateToInputValue,
  formatDisplayDate,
  todayAsInputValue,
} from "@/lib/dates";

// Guards against the timezone bug where a date saved as 14 March showed as
// 13 March for anyone west of UTC.

describe("dates survive timezone conversion", () => {
  it("stores a date input at midday UTC", () => {
    const stored = inputValueToDate("2025-03-14");
    expect(stored.toISOString()).toBe("2025-03-14T12:00:00.000Z");
  });

  it("displays the same day it was given", () => {
    expect(formatDisplayDate(inputValueToDate("2025-03-14"))).toContain("14");
    expect(formatDisplayDate(inputValueToDate("2025-01-01"))).toContain("1");
    expect(formatDisplayDate(inputValueToDate("2025-12-31"))).toContain("31");
  });

  it("round-trips a date input value unchanged", () => {
    for (const value of ["2025-03-14", "2024-01-01", "2025-12-31", "2024-02-29"]) {
      expect(dateToInputValue(inputValueToDate(value))).toBe(value);
    }
  });

  it("keeps the local calendar day correct from UTC-11 to UTC+11", () => {
    // Midday UTC leaves 12 hours of headroom each way.
    const stored = inputValueToDate("2025-03-14");
    for (const timeZone of [
      "Pacific/Midway", // UTC-11
      "America/Los_Angeles", // UTC-8
      "America/New_York", // UTC-5 (the bug this guards against)
      "UTC",
      "Europe/Berlin", // UTC+1
      "Asia/Tokyo", // UTC+9
      "Pacific/Noumea", // UTC+11
    ]) {
      const dayThere = stored.toLocaleDateString("en-CA", { timeZone });
      expect(dayThere, `wrong day in ${timeZone}`).toBe("2025-03-14");
    }
  });

  it("displays the typed day even past UTC+12, where the local clock rolls over", () => {
    // Auckland's local day has already advanced, but we read the date back
    // in UTC, so the app still shows what the user actually typed.
    const stored = inputValueToDate("2025-03-14");
    expect(stored.toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" })).toBe(
      "2025-03-15",
    );
    expect(formatDisplayDate(stored)).toMatch(/14/);
  });

  it("formats a display date without shifting the day", () => {
    const formatted = formatDisplayDate("2025-03-14T12:00:00.000Z");
    expect(formatted).toMatch(/14/);
    expect(formatted).toMatch(/March/);
  });

  it("gives today in YYYY-MM-DD form", () => {
    expect(todayAsInputValue(new Date(2025, 2, 14))).toBe("2025-03-14");
    expect(todayAsInputValue(new Date(2025, 0, 5))).toBe("2025-01-05");
  });
});
