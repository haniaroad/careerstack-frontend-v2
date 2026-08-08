import { apiFetch } from '@/lib/api'

export type InboxCategory = 'task_review' | 'application' | 'invitation' | 'alert'
export type InboxUrgency = 'critical' | 'high' | 'medium' | 'low'
export type InboxTab = 'task_reviews' | 'applications' | 'invitations' | 'alerts'

export type InboxItem = {
  id: string
  category: InboxCategory
  related_id: string
  project_id: string | null
  project_title: string
  title: string
  description: string
  status_label: string
  urgency: InboxUrgency
  is_overdue: boolean
  cta_label: string
  created_at: string
  payload: Record<string, unknown>
}

export const INBOX_TABS: { id: InboxTab; label: string; category: InboxCategory }[] = [
  { id: 'task_reviews', label: 'Task reviews', category: 'task_review' },
  { id: 'applications', label: 'Applications', category: 'application' },
  { id: 'invitations', label: 'Invitations', category: 'invitation' },
  { id: 'alerts', label: 'Alerts', category: 'alert' },
]

export async function fetchInboxItems(category?: InboxCategory): Promise<InboxItem[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  const data = await apiFetch<{ items: InboxItem[] }>(`/api/v1/inbox/items${query}`)
  return data.items
}
