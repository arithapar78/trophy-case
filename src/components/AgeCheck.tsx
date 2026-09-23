import { useState } from 'react'
import { birthYearOptions, checkAge, rememberAgeCheck, type AgeCheckResult } from '../lib/ageGate'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Props {
  onAnswered: (result: AgeCheckResult) => void
}

// Asked once per device, before the sign-in button appears. The wording is
// neutral on purpose: it never says what answer lets you in.
export default function AgeCheck({ onAnswered }: Props) {
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [problem, setProblem] = useState<string>()

  function submit() {
    const result = checkAge(Number(year), Number(month), new Date())
    if (result === 'invalid') {
      setProblem("That date doesn't look right. Pick your birth month and year.")
      return
    }
    // Only the answer is kept. The month and year are dropped right here.
    rememberAgeCheck(result)
    onAnswered(result)
  }

  const select = 'min-h-12 flex-1 rounded-2xl bg-surface px-3 ring-1 ring-ink/10'

  return (
    <div className="mt-3 rounded-2xl bg-ink/[0.03] p-4 ring-1 ring-ink/10" data-testid="age-check">
      <p className="text-sm font-medium">When were you born?</p>
      <p className="text-sm opacity-70">Only used to check your age, then forgotten. It is never saved or sent anywhere.</p>
      <div className="mt-3 flex gap-2">
        <select aria-label="Birth month" data-testid="birth-month" value={month} onChange={(e) => setMonth(e.target.value)} className={select}>
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select aria-label="Birth year" data-testid="birth-year" value={year} onChange={(e) => setYear(e.target.value)} className={select}>
          <option value="">Year</option>
          {birthYearOptions(new Date()).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        data-testid="age-continue"
        disabled={!month || !year}
        onClick={submit}
        className="mt-3 min-h-11 w-full rounded-2xl bg-accent text-sm font-semibold text-white shadow-card transition-transform active:scale-[0.98] disabled:bg-ink/10 disabled:text-ink/40 disabled:shadow-none"
      >
        Continue
      </button>
      {problem && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {problem}
        </p>
      )}
    </div>
  )
}
