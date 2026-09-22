import { Link } from 'react-router-dom'
import { StatusBadge, type StatusTone } from '@/components/StatusBadge'
import { Button } from '@/components/Button'
import type { PeerReviewSlot } from '@/lib/peerReviews'
import { formatPeerReviewDate } from '@/lib/peerReviews'
import { cn } from '@/lib/utils'

const STATUS_TONE: Record<PeerReviewSlot['status'], StatusTone> = {
  available: 'info',
  pending: 'warning',
  completed: 'success',
}

export function PeerReviewCard({
  peerReview,
  onWrite,
}: {
  peerReview: PeerReviewSlot
  onWrite?: (review: PeerReviewSlot) => void
}) {
  const actionable = peerReview.status === 'available' || peerReview.status === 'pending'
  const completedLabel = formatPeerReviewDate(peerReview.completed_at)

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={STATUS_TONE[peerReview.status]}>
          {peerReview.status.replaceAll('_', ' ')}
        </StatusBadge>
        {peerReview.is_anonymized ? <StatusBadge tone="info">Anonymized</StatusBadge> : null}
        {peerReview.rating != null ? (
          <StatusBadge tone="info">{peerReview.rating} / 5</StatusBadge>
        ) : null}
      </div>

      <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-ink">
        {peerReview.from_user_name || 'Verified project teammate'}
        <span className="font-normal text-ink-muted"> → </span>
        {peerReview.to_user_name || 'Verified project teammate'}
      </h3>
      <Link
        to={`/projects/${peerReview.project_id}`}
        className={cn(
          'mt-0.5 inline-block rounded-sm text-left text-sm font-medium text-accent hover:underline',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        )}
      >
        {peerReview.project_title}
      </Link>

      {peerReview.summary ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{peerReview.summary}</p>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">
          {actionable
            ? 'Optional teammate confirmation after project completion.'
            : 'No summary yet.'}
        </p>
      )}

      {completedLabel ? (
        <p className="mt-2 text-xs text-ink-muted">Completed {completedLabel}</p>
      ) : null}

      {actionable ? (
        <div className="mt-4">
          <Button type="button" size="sm" onClick={() => onWrite?.(peerReview)}>
            {peerReview.status === 'pending' ? 'Continue review' : 'Write peer review'}
          </Button>
        </div>
      ) : null}
    </article>
  )
}
