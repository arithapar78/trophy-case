import { useAccount } from '../lib/account'
import { formatResetDay, isLow } from '../lib/credits'

// Phase 14: a quiet line under an AI button, shown only when this month's
// credits are running low. With plenty left it renders nothing, so credits
// never feel like a paywall; the full count lives in Settings.
export default function CreditsNote() {
  const { user, credits } = useAccount()
  if (!user || !credits || !isLow(credits)) return null
  return (
    <p className="mt-2 text-xs text-accent-ink" data-testid="credits-low">
      {credits.remaining === 0
        ? `No AI credits left this month. They refill on ${formatResetDay(credits.resetsAt)}.`
        : `${credits.remaining} AI credit${credits.remaining === 1 ? '' : 's'} left this month. Refills ${formatResetDay(credits.resetsAt)}.`}
    </p>
  )
}
