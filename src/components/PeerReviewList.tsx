import { useState } from 'react'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/Dialog'
import { Label } from '@/components/Label'
import { EmptyState } from '@/components/EmptyState'
import { ApiError } from '@/lib/api'
import {
  PEER_REVIEW_REASON_CATEGORIES,
  PEER_REVIEW_REPORT_TYPES,
  formatPeerReviewDate,
  reportPeerReview,
  type PeerReviewReasonCategory,
  type PeerReviewReportType,
  type ProfilePeerReview,
} from '@/lib/peerReviews'
import { trackPeerReviewReported } from '@/lib/mixpanel'
import { cn } from '@/lib/utils'

export function PeerReviewList({
  reviews,
  canReport = false,
  workspaceType = 'personal',
  className,
}: {
  reviews: ProfilePeerReview[]
  canReport?: boolean
  workspaceType?: 'personal' | 'organization'
  className?: string
}) {
  const visible = reviews.filter((review) => review.body.trim().length > 0)
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportType, setReportType] = useState<PeerReviewReportType>('inappropriate')
  const [reasonCategory, setReasonCategory] = useState<PeerReviewReasonCategory>('other')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onReport() {
    if (!reportingId) return
    setBusy(true)
    setError(null)
    try {
      await reportPeerReview(reportingId, {
        report_type: reportType,
        reason_category: reasonCategory,
        details: details.trim() || undefined,
      })
      trackPeerReviewReported({ workspace_type: workspaceType })
      setNotice('Report submitted. Hide remains a platform-admin action.')
      setReportingId(null)
      setDetails('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit report')
    } finally {
      setBusy(false)
    }
  }

  if (visible.length === 0) {
    return (
      <EmptyState
        className={className}
        title="No public peer reviews yet"
        description="Optional teammate confirmations appear here after team projects complete. Minors stay anonymized."
      />
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {error ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert tone="info" title="Notice">
          {notice}
        </Alert>
      ) : null}
      <ul className="flex flex-col gap-2.5">
        {visible.map((review) => (
          <li key={review.id} className="rounded-lg border border-border bg-surface px-4 py-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{review.reviewer_display_name}</p>
              <p className="font-mono text-[11px] text-ink-muted">
                {formatPeerReviewDate(review.created_at) ?? ''}
              </p>
            </div>
            {review.reviewer_is_anonymized ? (
              <p className="mt-1 text-xs font-medium text-ink-muted">Verified project teammate</p>
            ) : null}
            <p className="mt-1 text-xs text-ink-muted">{review.project_title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{review.body}</p>
            {canReport ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setError(null)
                  setReportingId(review.id)
                }}
              >
                Report review
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <Dialog open={reportingId != null} onOpenChange={(open) => !open && setReportingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this review</DialogTitle>
            <DialogDescription>
              Reports are reviewed by platform admins. This does not hide the review immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="peer-report-type">Report type</Label>
              <select
                id="peer-report-type"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={reportType}
                onChange={(event) => setReportType(event.target.value as PeerReviewReportType)}
              >
                {PEER_REVIEW_REPORT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="peer-report-reason">Reason</Label>
              <select
                id="peer-report-reason"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={reasonCategory}
                onChange={(event) =>
                  setReasonCategory(event.target.value as PeerReviewReasonCategory)
                }
              >
                {PEER_REVIEW_REASON_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="peer-report-details">Details (optional)</Label>
              <textarea
                id="peer-report-details"
                className="min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReportingId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onReport()} disabled={busy}>
              {busy ? 'Submitting…' : 'Submit report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
