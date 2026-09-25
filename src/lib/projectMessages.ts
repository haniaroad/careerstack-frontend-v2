import { apiFetch } from '@/lib/api'

export type ProjectMessage = {
  id: string
  project_id: string
  author_id: string
  author_display_name: string
  body: string
  created_at: string
}

export type ProjectMessageThread = {
  messages: ProjectMessage[]
  unread: boolean
  messages_last_read_at: string | null
}

export const MESSAGE_REPORT_TYPES = ['inappropriate', 'harassment', 'spam', 'other'] as const
export type MessageReportType = (typeof MESSAGE_REPORT_TYPES)[number]

export const MESSAGE_REASON_CATEGORIES = [
  'harassment',
  'unsafe_or_biased',
  'spam',
  'off_topic',
  'other',
] as const
export type MessageReasonCategory = (typeof MESSAGE_REASON_CATEGORIES)[number]

export async function fetchProjectMessages(projectId: string) {
  return apiFetch<ProjectMessageThread>(`/api/v1/projects/${projectId}/messages`)
}

export async function postProjectMessage(projectId: string, body: string) {
  return apiFetch<{ message: ProjectMessage }>(`/api/v1/projects/${projectId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
}

export async function markProjectMessagesRead(projectId: string) {
  return apiFetch<{ unread: boolean; messages_last_read_at: string | null }>(
    `/api/v1/projects/${projectId}/messages/read`,
    { method: 'POST' },
  )
}

export async function reportProjectMessage(
  messageId: string,
  payload: {
    report_type: MessageReportType
    reason_category: MessageReasonCategory
    details?: string
  },
) {
  return apiFetch<{ report: { id: string } }>(`/api/v1/project_messages/${messageId}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
