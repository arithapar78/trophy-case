// The age question asked before someone makes an account.
//
// Why: an account stores an email address, and collecting that from a child
// under 13 is what COPPA (the US children's privacy law) is about. Nothing
// else in the app leaves the device, so only signing in needs the check.
//
// The birth month and year are used once, right here, and thrown away. The
// device keeps only the answer: "passed" or "under13". Keeping the answer is
// deliberate: if a kid picks a young year and then goes back and picks an
// older one, the first answer stands on this device.

export type AgeCheckResult = 'passed' | 'under13'

export const MINIMUM_AGE = 13
const STORAGE_KEY = 'trophy-case.age-check'

// Returns "invalid" for a month and year that cannot be a real birth date
// (the future, or more than 120 years ago), so the form can ask again.
//
// We only know the month, not the day, so someone counts as 13 from the
// start of the month of their 13th birthday. That can be up to a month
// early, which is the price of not asking for the exact day.
export function checkAge(birthYear: number, birthMonth: number, now: Date): AgeCheckResult | 'invalid' {
  if (!Number.isInteger(birthYear) || !Number.isInteger(birthMonth)) return 'invalid'
  if (birthMonth < 1 || birthMonth > 12) return 'invalid'

  // Months since year 0 is an easy way to compare two month-and-year pairs.
  const nowInMonths = now.getFullYear() * 12 + now.getMonth() // getMonth is 0-11
  const birthInMonths = birthYear * 12 + (birthMonth - 1)
  const ageInMonths = nowInMonths - birthInMonths

  if (ageInMonths < 0) return 'invalid'
  if (ageInMonths > 120 * 12) return 'invalid'
  return ageInMonths >= MINIMUM_AGE * 12 ? 'passed' : 'under13'
}

// The years offered in the picker, newest first. Starting from this year
// (not from 13 years ago) is what keeps the question neutral: the list does
// not hint at which answer gets you in.
export function birthYearOptions(now: Date): number[] {
  const thisYear = now.getFullYear()
  return Array.from({ length: 100 }, (_, i) => thisYear - i)
}

// Reading and writing the answer. localStorage can throw in a private
// window, so a failure means "not answered yet" rather than a crash.
export function readAgeCheck(): AgeCheckResult | undefined {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'passed' || value === 'under13' ? value : undefined
  } catch {
    return undefined
  }
}

export function rememberAgeCheck(result: AgeCheckResult): void {
  try {
    localStorage.setItem(STORAGE_KEY, result)
  } catch {
    // Nothing to do: the question will be asked again next time.
  }
}
