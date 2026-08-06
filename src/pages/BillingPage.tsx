import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { apiFetch, ApiError } from '@/lib/api'
import { trackPurchaseCompleted, trackPurchaseStarted } from '@/lib/mixpanel'
import { InsufficientCreditsInterception } from '@/components/InsufficientCreditsInterception'

type CreditsSummary = {
  remaining: number
  trial_remaining: number
  purchased_remaining: number
  owner_type: string
}

type HistoryEntry = {
  id: string
  event: string
  reason: string
  amount: number
  created_at: string
  lot_source?: string | null
}

type Purchase = {
  id: string
  status: string
  credits: number
  amount_cents: number
  completed_at: string | null
  created_at: string
  refund_eligible?: boolean
  unused_credits?: number
  within_refund_window?: boolean
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  )
}

function eventLabel(entry: HistoryEntry) {
  if (entry.reason === 'personal_trial') return 'Personal trial grant'
  if (entry.reason === 'organization_trial') return 'Organization trial grant'
  if (entry.reason === 'personal_pack_purchase') return 'Personal pack purchase'
  if (entry.event === 'consume') return 'Credit used'
  if (entry.event === 'restore') return 'Credit restored'
  if (entry.event === 'refund_reversal') return 'Refund reversal'
  return entry.reason.replaceAll('_', ' ')
}

export function BillingPage() {
  const { session, refreshSession } = useAuth()
  const [searchParams] = useSearchParams()
  const demoBlocked = searchParams.get('demo') === 'blocked'

  const activeKind =
    session?.workspaces.find((w) => w.id === session.active_workspace_id)?.kind ?? 'personal'
  const isPersonal = activeKind === 'personal'

  const [credits, setCredits] = useState<CreditsSummary | null>(session?.credits ?? null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [refundMessage, setRefundMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [creditPayload, historyPayload, purchasePayload] = await Promise.all([
          apiFetch<{ credits: CreditsSummary }>('/api/v1/credits'),
          apiFetch<{ entries: HistoryEntry[] }>('/api/v1/credits/history'),
          isPersonal
            ? apiFetch<{ purchases: Purchase[] }>('/api/v1/billing/purchases')
            : Promise.resolve({ purchases: [] as Purchase[] }),
        ])
        if (cancelled) return
        setCredits(creditPayload.credits)
        setHistory(historyPayload.entries)
        setPurchases(purchasePayload.purchases)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load billing')
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isPersonal])

  async function startCheckout() {
    setBusy(true)
    setError(null)
    trackPurchaseStarted()
    try {
      const result = await apiFetch<{ checkout_url: string }>('/api/v1/billing/checkout_sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      window.location.assign(result.checkout_url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to start checkout')
      setBusy(false)
    }
  }

  async function requestRefund(purchaseId: string) {
    setBusy(true)
    setRefundMessage(null)
    setError(null)
    try {
      await apiFetch('/api/v1/billing/refund_requests', {
        method: 'POST',
        body: JSON.stringify({ purchase_id: purchaseId }),
      })
      setRefundMessage('Refund request submitted. Staff will review unused credits.')
      await refreshSession?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit refund request')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-ink-muted">Billing & Credits</p>
        <h1 className="font-display text-3xl text-ink">Your credits</h1>
        <p className="text-ink-muted">
          One credit creates one project or joins one project. Trial and purchased credits
          stay on this workspace owner.
        </p>
      </header>

      {error ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}
      {refundMessage ? (
        <Alert tone="success" title="Request received">
          {refundMessage}
        </Alert>
      ) : null}

      <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">Balance</h2>
        <p className="font-display text-4xl text-ink">{credits?.remaining ?? '—'}</p>
        <p className="text-sm text-ink-muted">
          {isPersonal
            ? `${credits?.trial_remaining ?? 0} trial · ${credits?.purchased_remaining ?? 0} purchased`
            : 'Organization pooled credits'}
        </p>
      </section>

      {isPersonal ? (
        <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">Personal pack</h2>
          <p className="text-ink-muted">
            3 credits for {formatMoney(2000)}. Checkout happens on Stripe — CareerStack never
            collects card details.
          </p>
          <Button onClick={() => void startCheckout()} disabled={busy}>
            {busy ? 'Starting checkout…' : 'Buy personal pack'}
          </Button>
        </section>
      ) : (
        <Alert tone="info" title="No in-app purchase for organizations">
          Organization credits come from trial grants or off-platform contracts. Admins request
          upgrades from Organization administration when that flow ships.
        </Alert>
      )}

      {demoBlocked ? (
        <InsufficientCreditsInterception
          blockedAction="create a project"
          remaining={credits?.remaining ?? 0}
          variant={isPersonal ? 'personal' : 'organization'}
          role={isPersonal ? undefined : 'participant'}
        />
      ) : null}

      {isPersonal && purchases.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Purchases</h2>
          <ul className="space-y-3">
            {purchases.map((purchase) => (
              <li
                key={purchase.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">
                    {purchase.credits} credits · {formatMoney(purchase.amount_cents)}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {purchase.status}
                    {purchase.completed_at
                      ? ` · ${new Date(purchase.completed_at).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                {purchase.status === 'completed' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy || purchase.refund_eligible === false}
                    onClick={() => void requestRefund(purchase.id)}
                  >
                    {purchase.refund_eligible === false
                      ? 'Not refundable'
                      : 'Request refund'}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-muted">
            Refunds cover unused credits within seven days of purchase. Used credits are not
            refunded.
          </p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted">No credit activity yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{eventLabel(entry)}</p>
                  <p className="text-sm text-ink-muted">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="font-medium tabular-nums text-ink">
                  {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button asChild variant="outline" size="sm">
        <Link to="/profile">Back to Profile</Link>
      </Button>
    </div>
  )
}

export function BillingReturnPage() {
  const [searchParams] = useSearchParams()
  const { refreshSession } = useAuth()
  const status = searchParams.get('status')
  const cancelled = status === 'cancelled'

  useEffect(() => {
    void refreshSession?.().then(() => {
      if (!cancelled) trackPurchaseCompleted()
    })
  }, [cancelled, refreshSession])

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {cancelled ? (
        <Alert tone="info" title="Checkout cancelled">
          Nothing was charged. Your credit balance is unchanged.
        </Alert>
      ) : (
        <Alert tone="success" title="Purchase complete">
          Your personal pack credits will appear once Stripe confirms payment. Refresh if the
          balance takes a moment to update.
        </Alert>
      )}
      <Button asChild>
        <Link to="/billing">Return to Billing & Credits</Link>
      </Button>
    </div>
  )
}
