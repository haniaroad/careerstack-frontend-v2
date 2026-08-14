import { useState } from 'react'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { ApiError } from '@/lib/api'
import { trackUpgradeRequestSubmitted } from '@/lib/mixpanel'
import {
  creditHistoryLabel,
  type CreditHistoryEntry,
  type CreditsSummary,
  type OrgAdminCapabilities,
  type UpgradeRequest,
} from '@/lib/organizationAdmin'

export function CreditsPanel({
  credits,
  history,
  historyForbidden,
  capabilities,
  upgradeRequest,
  readOnlyOrg,
  onSubmitUpgrade,
}: {
  credits: CreditsSummary
  history: CreditHistoryEntry[]
  historyForbidden: boolean
  capabilities: OrgAdminCapabilities
  upgradeRequest: UpgradeRequest | null
  readOnlyOrg: boolean
  onSubmitUpgrade: (params: {
    expected_participants: string
    expected_projects_or_cohorts: string
    timeline: string
    notes?: string
  }) => Promise<void>
}) {
  const zero = credits.remaining <= 0
  const trialOnly = credits.trial_remaining > 0 && credits.purchased_remaining === 0

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface px-5 py-5">
        <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
          Organization credit pool
        </p>
        <p className="mt-2 font-mono text-4xl font-semibold tracking-tight text-ink tabular-nums">
          {credits.remaining}
        </p>
        {trialOnly ? (
          <p className="mt-2 text-sm text-ink-muted">
            Trial credits — one creates a project, one adds a project participant. Inviting members
            is always free.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">Pooled organization credits.</p>
        )}
        {zero ? (
          <Alert tone="warning" title="Zero credits" className="mt-4">
            New projects and new project memberships are blocked. Programs, invitations, and work
            already underway still work.
          </Alert>
        ) : null}
      </section>

      {capabilities.can_view_credit_history && !historyForbidden ? (
        <section aria-labelledby="credit-history">
          <h3
            id="credit-history"
            className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase"
          >
            Transaction history
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Append-only ledger for administrators. Managers see balance only.
          </p>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{creditHistoryLabel(entry)}</p>
                  <p className="mt-1 text-xs text-ink-muted capitalize">
                    {entry.event} · {entry.reason.replaceAll('_', ' ')}
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold tabular-nums">
                  {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                </p>
              </li>
            ))}
          </ul>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">No credit transactions yet.</p>
          ) : null}
        </section>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-5 text-sm text-ink-muted">
          As a manager you can see the available organization balance. Transaction history is visible
          to organization administrators only.
        </p>
      )}

      {capabilities.can_submit_upgrade_request ? (
        <UpgradeRequestForm
          existing={upgradeRequest}
          readOnlyOrg={readOnlyOrg}
          onSubmit={onSubmitUpgrade}
        />
      ) : (
        <p className="text-sm text-ink-muted">
          Ask an organization administrator if this organization needs more credits. There is no
          in-app checkout for organizations.
        </p>
      )}
    </div>
  )
}

function UpgradeRequestForm({
  existing,
  readOnlyOrg,
  onSubmit,
}: {
  existing: UpgradeRequest | null
  readOnlyOrg: boolean
  onSubmit: (params: {
    expected_participants: string
    expected_projects_or_cohorts: string
    timeline: string
    notes?: string
  }) => Promise<void>
}) {
  const [participants, setParticipants] = useState(existing?.expected_participants ?? '')
  const [projects, setProjects] = useState(existing?.expected_projects_or_cohorts ?? '')
  const [timeline, setTimeline] = useState(existing?.timeline ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function submit() {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await onSubmit({
        expected_participants: participants.trim(),
        expected_projects_or_cohorts: projects.trim(),
        timeline: timeline.trim(),
        notes: notes.trim() || undefined,
      })
      trackUpgradeRequestSubmitted()
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit upgrade request')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5" aria-labelledby="upgrade-heading">
      <h3 id="upgrade-heading" className="text-base font-semibold text-ink">
        Request a credit grant
      </h3>
      <p className="mt-1 text-sm text-ink-muted">
        This is not checkout. CareerStack staff review the request off-platform. Submitting again
        updates the open request rather than creating a duplicate.
      </p>
      {existing ? (
        <p className="mt-2 text-sm">
          Current request status: <span className="font-medium capitalize">{existing.status}</span>
        </p>
      ) : null}
      {saved ? (
        <Alert tone="success" title="Request received" className="mt-3">
          Staff will follow up. Email delivery is not sent from this screen yet.
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="danger" title="Could not submit" className="mt-3">
          {error}
        </Alert>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expected-participants">Expected participants</Label>
          <Input
            id="expected-participants"
            value={participants}
            onChange={(event) => setParticipants(event.target.value)}
            disabled={readOnlyOrg}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expected-projects">Expected projects or cohorts</Label>
          <Input
            id="expected-projects"
            value={projects}
            onChange={(event) => setProjects(event.target.value)}
            disabled={readOnlyOrg}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="timeline">Timeline</Label>
          <Input
            id="timeline"
            value={timeline}
            onChange={(event) => setTimeline(event.target.value)}
            disabled={readOnlyOrg}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="upgrade-notes">Notes</Label>
          <textarea
            id="upgrade-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={readOnlyOrg}
            className="min-h-20 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm"
          />
        </div>
      </div>
      <Button
        type="button"
        className="mt-4"
        disabled={
          readOnlyOrg ||
          busy ||
          !participants.trim() ||
          !projects.trim() ||
          !timeline.trim()
        }
        onClick={() => void submit()}
      >
        {existing ? 'Update request' : 'Submit request'}
      </Button>
    </section>
  )
}
