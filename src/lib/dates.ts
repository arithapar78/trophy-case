// Small date helpers shared by the forms and the timeline.
//
// An achievement's date is a calendar day ("14 March 2025"), not a moment in
// time. SQLite stores it as a timestamp, so we read and write it in UTC and
// never let the local timezone shift which day it lands on.
//
// Getting this wrong makes dates display one day early for anyone west of
// UTC, which is exactly the bug these helpers exist to prevent.

/** Today as "YYYY-MM-DD" in local time, for a date input's default value. */
export function todayAsInputValue(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Turns "YYYY-MM-DD" from a date input into the value we store.
 *
 * Midday UTC. That leaves 12 hours of headroom in each direction, so the
 * stored instant still falls on the intended calendar day in every timezone
 * from UTC-11 through UTC+11.
 *
 * Past UTC+12 (Auckland, Kiritimati) the local clock has already rolled over
 * to the next day. That doesn't affect what you see: formatDisplayDate reads
 * the day back in UTC, so the displayed date always matches what was typed.
 */
export function inputValueToDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

/** A stored date as "YYYY-MM-DD", for filling in a date input. */
export function dateToInputValue(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

/** A date written out for people, e.g. "14 March 2025". */
export function formatDisplayDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    // Read the day back in UTC, matching how it was stored.
    timeZone: "UTC",
  });
}
