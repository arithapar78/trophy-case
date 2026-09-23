import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '../lib/account'
import { AiSignInRequiredError, AiUnavailableError } from '../lib/aiClient'
import { formatDate, todayISO } from '../lib/dates'
import {
  categoryBars,
  changesSince,
  describeChanges,
  getSavedSummary,
  groupByCategory,
  hasChanges,
  profileTotals,
  writeSummaryWithAi,
  yearSpan,
  type SavedSummary,
} from '../lib/profile'
import { drawProfileCard, profileCardFileName } from '../lib/profileCard'
import { shareOrDownload } from '../lib/share'
import type { AchievementWithPhotos } from '../lib/types'

interface Props {
  rows: AchievementWithPhotos[]
  categories: string[]
  goal: string
  onOpenSettings: () => void
  onOpen: (row: AchievementWithPhotos) => void
}

// The fourth tab: who you are, on one page. The profile card at the top
// (summary, strengths, totals, a chart of categories), then every
// achievement grouped by category. The summary is written only on a tap.
export default function MeView({ rows, categories, goal, onOpenSettings, onOpen }: Props) {
  const { user } = useAccount()
  const [saved, setSaved] = useState<SavedSummary>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [imageNote, setImageNote] = useState<string>()

  const achievements = rows.map((r) => r.achievement)
  const totals = profileTotals(achievements)
  const bars = categoryBars(achievements)
  const groups = groupByCategory(rows, categories)
  const changes = saved ? changesSince(saved, achievements, goal) : undefined
  const byId = new Map(achievements.map((a) => [a.id, a]))

  const load = useCallback(async () => setSaved(await getSavedSummary()), [])
  useEffect(() => {
    void load()
  }, [load])

  async function write() {
    setBusy(true)
    setError(undefined)
    try {
      setSaved(await writeSummaryWithAi(goal, achievements))
    } catch (err) {
      if (err instanceof AiSignInRequiredError) setError('Sign in to use AI. Open Settings to sign in.')
      else setError(err instanceof AiUnavailableError ? err.message : "The AI didn't work this time. Try again in a minute.")
    } finally {
      setBusy(false)
    }
  }

  async function saveImage() {
    setImageNote(undefined)
    try {
      const blob = await drawProfileCard({ summary: saved, totals, bars })
      const how = await shareOrDownload(blob, profileCardFileName())
      setImageNote(how === 'downloaded' ? 'Picture saved to your downloads.' : undefined)
    } catch {
      setImageNote("Couldn't make the picture on this device.")
    }
  }

  if (achievements.length === 0) {
    return (
      <div className="mt-12 text-center text-ink/70" data-testid="me-empty">
        <p className="text-lg font-semibold text-ink">Nothing here yet</p>
        <p className="mt-1 text-sm">Save a few achievements and this page becomes your profile: everything you've done, on one page.</p>
      </div>
    )
  }

  const aiButton = 'min-h-11 flex-1 rounded-2xl px-4 text-sm font-semibold transition-colors disabled:opacity-40'

  return (
    <div className="flex flex-col gap-5">
      {/* The profile card. The picture made by "Save as image" is drawn from
          the same numbers in src/lib/profileCard.ts. */}
      <section className="overflow-hidden rounded-[var(--radius-sheet)] bg-surface shadow-card ring-1 ring-ink/5" data-testid="profile-card">
        <div className="bg-accent px-5 pb-12 pt-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-90">Trophy Case</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight">Who you are</h2>
        </div>

        <dl className="-mt-8 mx-4 grid grid-cols-3 rounded-2xl bg-surface py-3 text-center shadow-card ring-1 ring-ink/5" data-testid="profile-totals">
          <div>
            <dt className="sr-only">Achievements</dt>
            <dd className="text-2xl font-extrabold">{totals.achievements}</dd>
            <dd className="text-xs text-ink/55">{totals.achievements === 1 ? 'achievement' : 'achievements'}</dd>
          </div>
          <div>
            <dt className="sr-only">Categories</dt>
            <dd className="text-2xl font-extrabold">{totals.categories}</dd>
            <dd className="text-xs text-ink/55">{totals.categories === 1 ? 'category' : 'categories'}</dd>
          </div>
          <div>
            <dt className="sr-only">Years</dt>
            <dd className={`${totals.firstYear === totals.lastYear ? 'text-2xl' : 'text-lg leading-8'} font-extrabold`}>
              {yearSpan(totals).replace(' to ', '–')}
            </dd>
            <dd className="text-xs text-ink/55">{totals.firstYear === totals.lastYear ? 'year' : 'years'}</dd>
          </div>
        </dl>

        <div className="px-5 pb-5 pt-4">
          {saved ? (
            <div data-testid="profile-summary">
              <p className="leading-relaxed">{saved.text}</p>
              {saved.strengths.length > 0 && (
                <ul className="mt-4 flex flex-col gap-3" data-testid="profile-strengths">
                  {saved.strengths.map((s) => (
                    <li key={s.name} className="flex gap-3">
                      <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                      <div>
                        <p className="font-semibold leading-tight">{s.name}</p>
                        {s.why && <p className="text-sm text-ink/65">{s.why}</p>}
                        {s.achievementIds.some((id) => byId.has(id)) && (
                          <p className="mt-0.5 text-xs text-ink/50">
                            Shown by:{' '}
                            {s.achievementIds
                              .map((id) => byId.get(id)?.title)
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-ink/50" data-testid="summary-written">
                Written {formatDate(todayISO(new Date(saved.writtenAt)))} from {saved.achievementIds.length}{' '}
                achievement{saved.achievementIds.length === 1 ? '' : 's'}.
                {changes && hasChanges(changes) && (
                  <span className="font-medium text-accent-ink" data-testid="summary-stale">
                    {' '}
                    {describeChanges(changes)}
                  </span>
                )}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink/65">
              A short, honest read on who you are, written by AI from your achievements{goal ? ' and your goal' : ''}. Only the words
              are sent, never photos.
            </p>
          )}

          {saved?.mock && (
            <p className="mt-3 rounded-2xl bg-accent/15 p-3 text-sm" role="status">
              <strong>MOCK summary.</strong> The AI function has no key yet, so this is a sample.
            </p>
          )}

          {/* A small chart: how many achievements in each category. */}
          <div className="mt-5 flex flex-col gap-2" data-testid="category-chart">
            {bars.map((bar) => (
              <div key={bar.category} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 truncate">{bar.category}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-accent/15">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(8, bar.fraction * 100)}%` }} />
                </span>
                <span className="w-6 text-right font-semibold text-accent-ink">{bar.count}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            {user === null ? (
              <button
                type="button"
                data-testid="me-signin"
                onClick={onOpenSettings}
                className={`${aiButton} text-accent-ink ring-1 ring-accent/50 active:bg-accent/15`}
              >
                Sign in to use AI
              </button>
            ) : (
              <button
                type="button"
                data-testid="write-summary"
                disabled={busy}
                onClick={() => void write()}
                className={`${aiButton} bg-accent text-white shadow-card active:scale-[0.98]`}
              >
                {busy ? 'Writing…' : saved ? 'Refresh' : 'Write my summary'}
              </button>
            )}
            <button
              type="button"
              data-testid="save-image"
              onClick={() => void saveImage()}
              className={`${aiButton} text-ink ring-1 ring-ink/15 active:bg-ink/5`}
            >
              Save as image
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {imageNote && <p className="mt-2 text-sm text-ink/60">{imageNote}</p>}
        </div>
      </section>

      {/* Everything, on one page. */}
      <section data-testid="me-list">
        <h2 className="font-semibold">Everything you've done</h2>
        {groups.map((group) => (
          <div key={group.category} className="mt-4" data-testid="me-group">
            <h3 className="flex items-baseline justify-between text-xs font-semibold uppercase tracking-wide text-ink/50">
              <span>{group.category}</span>
              <span>{group.items.length}</span>
            </h3>
            <ul className="mt-2 overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-ink/5">
              {group.items.map((row) => {
                const a = row.achievement
                const detail = a.result || a.role
                return (
                  <li key={a.id} className="border-b border-ink/5 last:border-0">
                    <button type="button" onClick={() => onOpen(row)} className="flex w-full items-baseline gap-3 px-4 py-3 text-left active:bg-ink/5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{a.title}</span>
                        {detail && <span className="block truncate text-sm text-ink/60">{detail}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-ink/50">{formatDate(a.date)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}
