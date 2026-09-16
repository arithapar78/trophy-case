// Small date helpers shared by the forms and the timeline.

/** Today as "YYYY-MM-DD" in local time, for a date input's default value. */
export function todayAsInputValue(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** A stored date as "YYYY-MM-DD", for filling in a date input. */
export function dateToInputValue(date: Date | string): string {
  return todayAsInputValue(new Date(date));
}

/** A date written out for people, e.g. "14 March 2025". */
export function formatDisplayDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
