import { useEffect, useState } from 'react'
import { setChildConsent, useAccount } from '../lib/account'
import { birthYearOptions } from '../lib/ageGate'
import { currentProfileId, isUnder13, listChildren, MAIN_PROFILE_ID, MAX_PROFILES, checkNewChild, type ChildProfile } from '../lib/family'
import { countAchievementsIn, createChildProfile, mainProfileName, removeChildProfile, switchToProfile } from '../lib/household'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Settings, Family (Phase 15): a trophy case per child on this phone, and a
// parent's permission before AI is used for a child under 13.
export default function FamilySection() {
  const { user, consents } = useAccount()
  const [children, setChildren] = useState<ChildProfile[]>(() => listChildren())
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<{ child: ChildProfile; count: number }>()
  const [consenting, setConsenting] = useState<{ child: ChildProfile; parent: boolean; agrees: boolean }>()
  const [mainName, setMainName] = useState('')
  const current = currentProfileId()

  useEffect(() => {
    void mainProfileName().then(setMainName, () => setMainName(''))
  }, [])

  async function run(work: () => Promise<void>) {
    setBusy(true)
    setError(undefined)
    try {
      await work()
    } catch {
      setError('That did not work. Check your signal and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function add() {
    const problem = checkNewChild(name, Number(year), Number(month))
    if (problem === 'name') return setError('Add a first name.')
    if (problem === 'date') return setError('Pick a birth month and year.')
    if (problem === 'full') return setError(`A phone can hold up to ${MAX_PROFILES} profiles.`)
    await run(async () => {
      await createChildProfile(name, Number(year), Number(month))
      setChildren(listChildren())
      setAdding(false)
      setName('')
      setMonth('')
      setYear('')
    })
  }

  const button = 'min-h-11 rounded-2xl px-3 text-sm font-medium ring-1 ring-ink/15 transition-colors active:bg-ink/5 disabled:opacity-40'
  const field = 'min-h-12 rounded-2xl bg-ink/[0.04] px-3 ring-1 ring-ink/10'

  function row(id: string, label: string, child?: ChildProfile) {
    const young = child ? isUnder13(child) : false
    const allowed = child ? consents?.includes(child.id) : false
    return (
      <li key={id} className="rounded-2xl p-3 ring-1 ring-ink/10" data-testid="family-profile">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate font-medium">{label}</span>
            <span className="block text-xs text-ink/55">
              {id === current ? 'Open now' : child ? (young ? 'Under 13' : '13 or older') : 'The original case on this phone'}
            </span>
          </span>
          {id !== current && (
            <button type="button" className={button} data-testid={`switch-${label}`} onClick={() => switchToProfile(id)}>
              Open
            </button>
          )}
        </div>

        {child && young && (
          <div className="mt-2 rounded-xl bg-accent/10 p-3 text-sm" data-testid="child-consent">
            {allowed ? (
              <div className="flex items-center justify-between gap-2">
                <span>AI allowed by you</span>
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  data-testid="withdraw-consent"
                  onClick={() => void run(() => setChildConsent(child.id, false))}
                >
                  Withdraw
                </button>
              </div>
            ) : !user ? (
              <span>AI is off for {child.name} until a parent signs in above and gives permission.</span>
            ) : consenting?.child.id === child.id ? (
              <div className="flex flex-col gap-2">
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    data-testid="consent-parent"
                    checked={consenting.parent}
                    onChange={(e) => setConsenting({ ...consenting, parent: e.target.checked })}
                  />
                  <span>I am {child.name}'s parent or legal guardian, and I am 18 or older.</span>
                </label>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    data-testid="consent-agree"
                    checked={consenting.agrees}
                    onChange={(e) => setConsenting({ ...consenting, agrees: e.target.checked })}
                  />
                  <span>
                    I agree that the words of {child.name}'s achievements, and any photo I choose to send, go to Anthropic's AI so
                    it can read, rank and chat about them. Nothing is kept there. {child.name}'s name and birth date are never
                    sent. I can withdraw this any time.
                  </span>
                </label>
                <button
                  type="button"
                  data-testid="give-consent"
                  disabled={busy || !consenting.parent || !consenting.agrees}
                  onClick={() => void run(async () => {
                    await setChildConsent(child.id, { isParentAndAdult: consenting.parent, agrees: consenting.agrees })
                    setConsenting(undefined)
                  })}
                  className="min-h-11 rounded-2xl bg-accent px-4 font-semibold text-white disabled:bg-ink/10 disabled:text-ink/40"
                >
                  Give permission
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span>AI is off until you give permission.</span>
                <button
                  type="button"
                  className={button}
                  data-testid="start-consent"
                  onClick={() => setConsenting({ child, parent: false, agrees: false })}
                >
                  Review
                </button>
              </div>
            )}
          </div>
        )}

        {child && id !== current && (
          removing?.child.id === child.id ? (
            <div className="mt-2 rounded-xl bg-red-600/10 p-3 text-sm" data-testid="confirm-remove-child">
              <p>
                Remove {child.name}'s case and its {removing.count} achievement{removing.count === 1 ? '' : 's'} from this phone? This
                can't be undone. Make a backup from their case first if you want to keep them.
              </p>
              <div className="mt-2 flex gap-2">
                <button type="button" className={button} onClick={() => setRemoving(undefined)}>
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="remove-child-yes"
                  disabled={busy}
                  className="min-h-11 rounded-2xl bg-red-600 px-3 text-sm font-semibold text-white"
                  onClick={() => void run(async () => {
                    await removeChildProfile(child.id)
                    setRemoving(undefined)
                    setChildren(listChildren())
                  })}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              data-testid={`remove-${child.name}`}
              className="mt-2 text-sm text-red-600"
              onClick={() => void countAchievementsIn(child.id).then((count) => setRemoving({ child, count }))}
            >
              Remove {child.name}'s case
            </button>
          )
        )}
      </li>
    )
  }

  return (
    <section className="mt-5" data-testid="family-section">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Family</h3>
      <p className="mt-1 text-sm opacity-70">
        A separate trophy case for each child, kept on this phone. For a child under 13, AI stays off until a parent gives
        permission.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {row(MAIN_PROFILE_ID, mainName || 'Me')}
        {children.map((c) => row(c.id, c.name, c))}
      </ul>

      {adding ? (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl p-3 ring-1 ring-ink/10" data-testid="add-child-form">
          <input aria-label="Child's first name" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" className={field} />
          <div className="flex gap-2">
            <select aria-label="Child's birth month" value={month} onChange={(e) => setMonth(e.target.value)} className={`${field} flex-1`}>
              <option value="">Birth month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select aria-label="Child's birth year" value={year} onChange={(e) => setYear(e.target.value)} className={`${field} flex-1`}>
              <option value="">Year</option>
              {birthYearOptions(new Date()).slice(0, 25).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-ink/55">Kept on this phone only. Used to know whether a parent's permission is needed for AI.</p>
          <div className="flex gap-2">
            <button type="button" className={button} onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="button" data-testid="add-child-save" disabled={busy} onClick={() => void add()} className="min-h-11 flex-1 rounded-2xl bg-accent px-4 font-semibold text-white">
              Add
            </button>
          </div>
        </div>
      ) : (
        children.length < MAX_PROFILES - 1 && (
          <button type="button" data-testid="add-child" className={`${button} mt-3 w-full`} onClick={() => setAdding(true)}>
            + Add a child
          </button>
        )
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
