// Dates are handled as "YYYY-MM-DD" text in the phone's local time.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

// "YYYY-MM-DD" strings compare correctly as plain text, which is why we
// store them that way.
export function isFutureDate(value: string, today: string = todayISO()): boolean {
  return value > today
}

export function formatDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
