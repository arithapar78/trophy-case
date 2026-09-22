import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '../lib/account'
import { AiSignInRequiredError, AiUnavailableError } from '../lib/aiClient'
import { formatWait } from '../lib/aiUsage'
import { formatDate } from '../lib/dates'
import { getRankings, getRecommendations, orderByRank, saveRankings, setRecommendations, type RankedRow } from '../lib/goal'
import { rankWithAi, recommendWithAi } from '../lib/goalClient'
import type { Achievement, RecommendationSet } from '../lib/types'

interface Props {
  achievements: Achievement[]
  goal: string
  onOpenSettings: () => void
}

type Busy = 'rank' | 'recommend' | undefined

// The second view of the timeline: the same achievements, ordered by how
// much they help the goal, with the AI's reason under each. Nothing here
// runs on its own; both buttons are one AI use each.
export default function RankedView({ achievements, goal, onOpenSettings }: Props) {
  const [rows, setRows] = useState<RankedRow[]>([])
  const [recs, setRecs] = useState<RecommendationSet>()
  const [busy, setBusy] = useState<Busy>()
  const [mock, setMock] = useState(false)
  const [error, setError] = useState<string>()
  const { user, usage } = useAccount()

  const load = useCallback(async () => {
    const [rankings, r] = await Promise.all([getRankings(), getRecommendations()])
    setRows(orderByRank(achievements, rankings))
    setRecs(r)
  }, [achievements])

  useEffect(() => {
    void load()
  }, [load])

  async function run(kind: Exclude<Busy, undefined>) {
    if (!goal) return
    setError(undefined)
    setBusy(kind)
    try {
      if (kind === 'rank') {
        const result = await rankWithAi(goal, achievements)
        await saveRankings(result.rankings)
        setMock(result.mock)
      } else {
        const result = await recommendWithAi(goal, achievements)
        await setRecommendations({ goal, items: result.items, createdAt: Date.now() })
        setMock(result.mock)
      }
      await load()
    } catch (err) {
      if (err instanceof AiSignInRequiredError) setError('Sign in to use AI. Open Settings to sign in.')
      else setError(err instanceof AiUnavailableError ? err.message : "The AI didn't work this time. Try again in a minute.")
    } finally {
      setBusy(undefined)
    }
  }

  if (!goal) {
    return (
      <div className="mt-10 text-center opacity-80">
        <p>Set a goal first, like "get into a top engineering school" or "summer job at a vet clinic".</p>
        <button type="button" onClick={onOpenSettings} className="mt-3 min-h-11 rounded-xl bg-accent px-4 font-semibold text-white">
          Set my goal
        </button>
      </div>
    )
  }

  const atLimit = usage?.remaining === 0
  const button = 'min-h-12 flex-1 rounded-xl border border-accent bg-accent/10 px-3 text-sm font-semibold disabled:opacity-50'
  const unranked = rows.filter((r) => !r.ranking).length

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm opacity-80" data-testid="goal-line">
        Goal: <strong>{goal}</strong>{' '}
        <button type="button" onClick={onOpenSettings} className="underline underline-offset-4">change</button>
      </p>

      {user === null ? (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-3" data-testid="ranked-signin">
          <p className="text-sm">Ranking and suggestions use AI, which needs a sign-in so your limit follows you.</p>
          <button type="button" onClick={onOpenSettings} className="mt-2 min-h-11 w-full rounded-xl border border-accent px-4 text-sm font-semibold">
            Sign in to use AI
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <button type="button" className={button} disabled={!!busy || atLimit || achievements.length === 0} onClick={() => void run('rank')}>
              {busy === 'rank' ? 'Ranking…' : 'Rank my achievements'}
            </button>
            <button type="button" className={button} disabled={!!busy || atLimit} onClick={() => void run('recommend')}>
              {busy === 'recommend' ? 'Thinking…' : 'What should I do next?'}
            </button>
          </div>
          <p className="-mt-2 text-xs opacity-60">
            {atLimit && usage?.nextFreeAt
              ? `All ${usage.limit} AI uses are used up for now. The next one frees up in ${formatWait(usage.nextFreeAt)}.`
              : `Each button is one AI use.${usage ? ` ${usage.remaining} of ${usage.limit} left for the next 5 hours.` : ''} Only the words are sent, never photos.`}
          </p>
        </>
      )}

      {achievements.length === 0 && <p className="opacity-70">Nothing to rank yet. Add an achievement first.</p>}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {mock && <p className="rounded-xl bg-accent/15 p-3 text-sm" role="status"><strong>MOCK results.</strong> The AI function has no key yet, so these are samples.</p>}

      {recs && (
        <section className="rounded-2xl border border-ink/10 p-4" data-testid="recommendations">
          <h2 className="font-semibold">What to do next</h2>
          <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5">
            {recs.items.map((item, i) => (
              <li key={i}>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm opacity-70">{item.why}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {rows.length > 0 && (
        <section data-testid="ranked-list">
          <h2 className="font-semibold">
            Your achievements, ranked
            {unranked > 0 && rows.length !== unranked && <span className="ml-2 text-sm font-normal opacity-60">({unranked} not ranked yet)</span>}
          </h2>
          <ol className="mt-2 flex flex-col gap-2">
            {rows.map(({ achievement, ranking }) => (
              <li key={achievement.id} className="flex gap-3 rounded-2xl border border-ink/10 p-3" data-testid="ranked-row">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold">
                  {ranking ? ranking.rank : '–'}
                </span>
                <div>
                  <p className="font-medium leading-tight">{achievement.title}</p>
                  <p className="text-xs opacity-60">{formatDate(achievement.date)} · {achievement.category}</p>
                  <p className="mt-1 text-sm opacity-80">{ranking ? ranking.reason : 'Not ranked yet. Tap "Rank my achievements" to include it.'}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
