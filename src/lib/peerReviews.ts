import { apiFetch } from '@/lib/api'

export type PeerReviewStatus = 'available' | 'pending' | 'completed'

export type PeerReviewSlot = {
  id: string
  project_id: string
  project_title: string
  from_user_id: string
  from_user_name: string | null
  to_user_id: string
  to_user_name: string | null
  status: PeerReviewStatus
  is_anonymized: boolean
  summary: string
  rating: number | null
  completed_at: string | null
}

export type ProfilePeerReview = {
  id: string
  reviewer_display_name: string
  reviewer_is_anonymized: boolean
  project_title: string
  body: string
  created_at: string | null
  rating?: number
}

export const PEER_REVIEW_REPORT_TYPES = ['inaccurate', 'inappropriate', 'harassment', 'other'] as const
export const PEER_REVIEW_REASON_CATEGORIES = [
  'wrong_decision',
  'missing_context',
  'unsafe_or_biased',
  'unclear_feedback',
  'harassment',
  'other',
] as const

export type PeerReviewReportType = (typeof PEER_REVIEW_REPORT_TYPES)[number]
export type PeerReviewReasonCategory = (typeof PEER_REVIEW_REASON_CATEGORIES)[number]

export async function fetchPeerReviews() {
  const data = await apiFetch<{ peer_reviews: PeerReviewSlot[] }>('/api/v1/peer_reviews')
  return data.peer_reviews
}

export async function submitPeerReview(id: string, body: { rating: number; comment: string }) {
  const data = await apiFetch<{ peer_review: PeerReviewSlot }>(`/api/v1/peer_reviews/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data.peer_review
}

export async function reportPeerReview(
  id: string,
  body: {
    report_type: PeerReviewReportType
    reason_category: PeerReviewReasonCategory
    details?: string
  },
) {
  await apiFetch(`/api/v1/peer_reviews/${id}/reports`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function formatPeerReviewDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}
