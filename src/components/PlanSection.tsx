import { useState } from 'react'
import {
  AccountError,
  openSubscriptionPage,
  startUpgrade,
  useAccount,
  type BillingConfig,
} from '../lib/account'
import { FREE_USES_PER_WINDOW, PRO_USES_PER_WINDOW } from '../lib/aiUsage'

// The Pro block inside Settings, shown only when signed in. On Free it
// offers the upgrade; on Pro it points at Stripe's own page for changing the
// card or cancelling. Nothing here can change the plan by itself: paying
// does, and Stripe tells the server.
export default function PlanSection({ billing }: { billing: BillingConfig | undefined }) {
  const { user, billingReturn, confirmingUpgrade } = useAccount()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  if (!user) return null

  async function run(work: () => Promise<void>) {
    setBusy(true)
    setError(undefined)
    try {
      await work()
    } catch (err) {
      setError(err instanceof AccountError ? err.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const isPro = user.plan === 'pro'
  const button =
    'min-h-12 w-full rounded-2xl px-4 py-3 text-left ring-1 ring-ink/10 transition-colors active:bg-ink/5 disabled:opacity-40'

  return (
    <section className="mt-5" data-testid="plan-section">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Plan</h3>

      {/* Just back from Stripe, before its message has reached our server. */}
      {confirmingUpgrade && !isPro && (
        <p className="mt-2 rounded-2xl bg-ink/[0.03] p-3 text-sm" data-testid="plan-confirming">
          Confirming your payment with Stripe. This usually takes a few seconds.
        </p>
      )}

      {billingReturn === 'cancelled' && !isPro && (
        <p className="mt-2 rounded-2xl bg-ink/[0.03] p-3 text-sm" data-testid="plan-cancelled">
          No payment was made, so you are still on Free.
        </p>
      )}

      <p className="mt-2 text-sm" data-testid="plan-name">
        You are on {isPro ? 'Pro' : 'Free'}: {isPro ? PRO_USES_PER_WINDOW : FREE_USES_PER_WINDOW} AI uses every 5 hours.
      </p>

      {billing?.available === false && (
        <p className="mt-2 text-sm opacity-70" data-testid="plan-unavailable">
          Upgrading is not switched on yet.
        </p>
      )}

      {billing?.available && !isPro && (
        <div className="mt-3 rounded-2xl bg-ink/[0.03] p-4 ring-1 ring-ink/10">
          <p className="text-sm font-medium">Trophy Case Pro, {billing.priceText}</p>
          <p className="mt-1 text-sm opacity-70">
            {PRO_USES_PER_WINDOW} AI uses every 5 hours instead of {FREE_USES_PER_WINDOW}. Cancel any time. Your achievements
            still stay on this device.
          </p>
          {billing.mock && (
            <p className="mt-2 text-sm opacity-70" data-testid="plan-mock-note">
              Test mode: no payment is taken and no card is asked for. This is off on the live site.
            </p>
          )}
          <button
            type="button"
            data-testid="upgrade"
            disabled={busy}
            onClick={() => void run(startUpgrade)}
            className="mt-3 min-h-11 w-full rounded-2xl bg-accent text-sm font-semibold text-white shadow-card transition-transform active:scale-[0.98] disabled:bg-ink/10 disabled:text-ink/40 disabled:shadow-none"
          >
            {busy ? 'One moment…' : 'Upgrade to Pro'}
          </button>
          {!billing.mock && (
            <p className="mt-2 text-xs opacity-60">
              Payment happens on Stripe's own page. This app never sees your card.
            </p>
          )}
        </div>
      )}

      {isPro && user.canManage && (
        <button
          type="button"
          className={`${button} mt-3`}
          data-testid="manage-subscription"
          disabled={busy}
          onClick={() => void run(openSubscriptionPage)}
        >
          <span className="font-medium">Manage subscription</span>
          <span className="block text-sm opacity-70">
            {billing?.mock ? 'Test mode: cancels straight away' : "Change your card or cancel, on Stripe's own page"}
          </span>
        </button>
      )}

      {error && (
        <p className="mt-3 rounded-2xl bg-red-600/10 p-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
