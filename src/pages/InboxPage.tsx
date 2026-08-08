import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { StatusBadge } from '@/components/StatusBadge'
import { apiFetch, ApiError } from '@/lib/api'
import {
  INBOX_TABS,
  type InboxCategory,
  type InboxItem,
  type InboxTab,
  type InboxUrgency,
} from '@/lib/inbox'
import {
  trackApplicationDecidedFromInbox,
  trackCreatorReviewDecided,
  trackInboxOpened,
} from '@/lib/mixpanel'
import { useShell } from '@/shell/ShellContext'

const URGENCY_RANK: Record<InboxUrgency, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const EMPTY_COPY: Record<InboxTab, { title: string; description: string }> = {
  task_reviews: {
    title: 'No task reviews waiting',
    description:
      'Team submission reviews appear here. Solo AI review does not create a creator review queue.',
  },
  applications: {
    title: 'No applications to decide',
    description:
      'Join applications for your team projects land here. Items pending past 72 hours are marked overdue.',
  },
  invitations: {
    title: 'No invitations',
    description: 'Structured project invitations addressed to you show up here.',
  },
  alerts: {
    title: 'No alerts',
    description:
      'Creator reminders, escalations, and other material updates appear in Alerts.',
  },
}

function tabFromParam(raw: string | null): InboxTab {
  const match = INBOX_TABS.find((tab) => tab.id === raw)
  return match?.id ?? 'task_reviews'
}

function formatCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function InboxPage() {
  const { activeWorkspaceId, workspaces } = useShell()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = tabFromParam(searchParams.get('tab'))
  const category = INBOX_TABS.find((entry) => entry.id === tab)?.category ?? 'task_review'

  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null)
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [counts, setCounts] = useState<Record<InboxTab, number>>({
    task_reviews: 0,
    applications: 0,
    invitations: 0,
    alerts: 0,
  })

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId) ?? workspaces[0]

  const setTab = (next: InboxTab) => {
    setSearchParams(next === 'task_reviews' ? {} : { tab: next })
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [active, all] = await Promise.all([
        apiFetch<{ items: InboxItem[] }>(`/api/v1/inbox/items?category=${category}`),
        apiFetch<{ items: InboxItem[] }>('/api/v1/inbox/items'),
      ])
      const sorted = [...active.items].sort((a, b) => {
        if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1
        return URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]
      })
      setItems(sorted)
      const nextCounts: Record<InboxTab, number> = {
        task_reviews: 0,
        applications: 0,
        invitations: 0,
        alerts: 0,
      }
      for (const item of all.items) {
        const match = INBOX_TABS.find((entry) => entry.category === item.category)
        if (match) nextCounts[match.id] += 1
      }
      setCounts(nextCounts)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load Inbox')
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    trackInboxOpened({ tab })
    void load()
  }, [load, activeWorkspaceId, tab])

  const visibleEmpty = !loading && items.length === 0

  const workspaceLabel = useMemo(() => {
    if (!workspace) return 'Workspace'
    return workspace.type === 'organization' ? workspace.label : 'Personal workspace'
  }, [workspace])

  async function handleCreatorReview(decision: 'approved' | 'corrections_requested') {
    if (!reviewTaskId) return
    if (decision === 'corrections_requested' && !reviewFeedback.trim()) {
      setError('Feedback is required when requesting corrections')
      return
    }
    setBusyId(reviewTaskId)
    setError(null)
    setNotice(null)
    try {
      await apiFetch(`/api/v1/tasks/${reviewTaskId}/creator_review`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          feedback: reviewFeedback.trim() || undefined,
        }),
      })
      trackCreatorReviewDecided({ decision })
      setNotice(decision === 'approved' ? 'Submission approved.' : 'Corrections requested.')
      setReviewTaskId(null)
      setReviewFeedback('')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit review')
    } finally {
      setBusyId(null)
    }
  }

  async function handleApproveApplication(item: InboxItem) {
    const projectId = String(item.payload.project_id ?? item.project_id ?? '')
    const applicationId = String(item.payload.application_id ?? item.related_id)
    if (!projectId) return
    setBusyId(item.id)
    setError(null)
    setNotice(null)
    try {
      await apiFetch(`/api/v1/projects/${projectId}/applications/${applicationId}/approve`, {
        method: 'POST',
      })
      trackApplicationDecidedFromInbox({ decision: 'approved' })
      setNotice('Application approved.')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to approve application')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRejectApplication() {
    if (!rejectId) return
    const item = items.find((entry) => entry.id === rejectId)
    if (!item || !rejectReason.trim()) return
    const projectId = String(item.payload.project_id ?? item.project_id ?? '')
    const applicationId = String(item.payload.application_id ?? item.related_id)
    setBusyId(item.id)
    setError(null)
    setNotice(null)
    try {
      await apiFetch(`/api/v1/projects/${projectId}/applications/${applicationId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      })
      trackApplicationDecidedFromInbox({ decision: 'rejected' })
      setRejectId(null)
      setRejectReason('')
      setNotice('Application rejected.')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reject application')
    } finally {
      setBusyId(null)
    }
  }

  async function handleInvitation(item: InboxItem, action: 'accept' | 'decline') {
    const invitationId = String(item.payload.invitation_id ?? item.related_id)
    setBusyId(item.id)
    setError(null)
    setNotice(null)
    try {
      await apiFetch(`/api/v1/project_invitations/${invitationId}/${action}`, { method: 'POST' })
      setNotice(action === 'accept' ? 'Invitation accepted.' : 'Invitation declined.')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Unable to ${action} invitation`)
    } finally {
      setBusyId(null)
    }
  }

  function primaryAction(item: InboxItem) {
    if (item.category === 'task_review') {
      setReviewTaskId(item.related_id)
      setReviewFeedback('')
      return
    }
    if (item.project_id) {
      navigate(`/projects/${item.project_id}`)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2 border-b border-border pb-6">
        <p className="text-sm font-medium text-ink-muted">{workspaceLabel}</p>
        <h1 className="font-display text-3xl text-ink">Inbox</h1>
        <p className="max-w-xl text-ink-muted">
          Process approvals, invitations, and alerts that need a decision—task reviews and
          applications stay here, not as separate global destinations.
        </p>
      </header>

      {error ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert tone="success" title="Updated">
          {notice}
        </Alert>
      ) : null}

      <nav aria-label="Inbox sections" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex min-w-max gap-1 rounded-lg border border-border bg-surface/80 p-1">
          {INBOX_TABS.map((entry) => {
            const active = tab === entry.id
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setTab(entry.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? 'bg-canvas text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {entry.label}
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      active ? 'text-ink' : 'text-ink-muted'
                    }`}
                  >
                    {counts[entry.id]}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {loading ? <p className="text-ink-muted">Loading Inbox…</p> : null}

      {visibleEmpty ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
          <h2 className="font-display text-xl text-ink">{EMPTY_COPY[tab].title}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
            {EMPTY_COPY[tab].description}
          </p>
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const urgent = item.is_overdue || item.urgency === 'critical' || item.urgency === 'high'
            return (
              <li key={item.id}>
                <article
                  className={`relative overflow-hidden rounded-lg border bg-canvas ${
                    item.is_overdue ? 'border-status-warning/40' : 'border-border'
                  }`}
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-1 ${
                      urgent ? 'bg-status-warning' : 'bg-ink'
                    }`}
                    aria-hidden
                  />
                  <div className="flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between sm:pl-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={urgent ? 'warning' : 'info'}>
                          {categoryLabel(item.category)}
                        </StatusBadge>
                        <StatusBadge tone={urgencyTone(item.urgency)}>{item.status_label}</StatusBadge>
                        {item.is_overdue ? <StatusBadge tone="warning">Overdue</StatusBadge> : null}
                        <span className="text-xs text-ink-muted">{formatCreatedAt(item.created_at)}</span>
                      </div>
                      <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-ink">{item.title}</h3>
                      <p className="mt-0.5 text-sm font-medium text-ink">{item.project_title}</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
                      <Button
                        type="button"
                        variant={urgent ? 'default' : 'outline'}
                        className="w-full sm:w-auto"
                        onClick={() => primaryAction(item)}
                        disabled={busyId === item.id}
                      >
                        {item.cta_label}
                      </Button>
                      {item.category === 'application' ? (
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                          <Button
                            type="button"
                            className="w-full sm:w-auto"
                            disabled={busyId === item.id}
                            onClick={() => void handleApproveApplication(item)}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            disabled={busyId === item.id}
                            onClick={() => {
                              setRejectId(item.id)
                              setRejectReason('')
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : null}
                      {item.category === 'invitation' ? (
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                          <Button
                            type="button"
                            className="w-full sm:w-auto"
                            disabled={busyId === item.id}
                            onClick={() => void handleInvitation(item, 'accept')}
                          >
                            Accept
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            disabled={busyId === item.id}
                            onClick={() => void handleInvitation(item, 'decline')}
                          >
                            Decline
                          </Button>
                        </div>
                      ) : null}
                      {item.project_id ? (
                        <Link
                          to={`/projects/${item.project_id}`}
                          className="text-center text-sm text-ink underline-offset-2 hover:underline sm:text-right"
                        >
                          Open project
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      ) : null}

      {reviewTaskId ? (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="font-display text-xl text-ink">Creator review</h2>
          <p className="text-sm text-ink-muted">
            Approve the submission or request corrections with written feedback.
          </p>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Feedback</span>
            <textarea
              value={reviewFeedback}
              onChange={(event) => setReviewFeedback(event.target.value)}
              rows={4}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
              placeholder="Required when requesting corrections"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={busyId === reviewTaskId}
              onClick={() => void handleCreatorReview('approved')}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busyId === reviewTaskId}
              onClick={() => void handleCreatorReview('corrections_requested')}
            >
              Request corrections
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReviewTaskId(null)
                setReviewFeedback('')
              }}
            >
              Cancel
            </Button>
          </div>
          <Link
            to={`/tasks/${reviewTaskId}`}
            className="inline-block text-sm text-ink underline-offset-2 hover:underline"
          >
            Open task detail
          </Link>
        </div>
      ) : null}

      {rejectId ? (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="font-display text-xl text-ink">Reject application</h2>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Reason</span>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={!rejectReason.trim() || busyId === rejectId}
              onClick={() => void handleRejectApplication()}
            >
              Confirm reject
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectId(null)
                setRejectReason('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function categoryLabel(category: InboxCategory): string {
  switch (category) {
    case 'task_review':
      return 'Task review'
    case 'application':
      return 'Application'
    case 'invitation':
      return 'Invitation'
    case 'alert':
      return 'Alert'
  }
}

function urgencyTone(urgency: InboxUrgency): 'info' | 'success' | 'warning' {
  if (urgency === 'critical' || urgency === 'high') return 'warning'
  return 'info'
}
