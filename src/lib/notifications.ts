import { apiFetch } from '@/lib/api'

export const NOTIFICATIONS_REFRESH_EVENT = 'careerstack:notifications-refresh'

export type NotificationItem = {
  id: string
  event_key: string
  title: string
  body: string
  path: string
  read: boolean
  created_at: string
  project_id: string | null
}

export type NotificationPreference = {
  id: string
  label: string
  description: string
  tier: 'mandatory' | 'realtime_config' | 'digest_config'
  can_disable: boolean
  email_enabled: boolean
  digest_cadence: string | null
}

export async function fetchNotifications(limit = 30) {
  const data = await apiFetch<{ notifications: NotificationItem[] }>(
    `/api/v1/notifications?limit=${limit}`,
  )
  return data.notifications ?? []
}

export async function fetchUnreadCount() {
  const data = await apiFetch<{ unread_count: number }>('/api/v1/notifications/unread_count')
  return data.unread_count
}

export async function markNotificationRead(id: string) {
  const data = await apiFetch<{ notification: NotificationItem }>(`/api/v1/notifications/${id}/read`, {
    method: 'POST',
  })
  return data.notification
}

export async function fetchNotificationPreferences() {
  const data = await apiFetch<{ preferences: NotificationPreference[] }>(
    '/api/v1/notification_preferences',
  )
  return data.preferences ?? []
}

export async function updateNotificationPreferences(
  preferences: { id: string; email_enabled?: boolean; digest_cadence?: string }[],
) {
  const data = await apiFetch<{ preferences: NotificationPreference[] }>(
    '/api/v1/notification_preferences',
    {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    },
  )
  return data.preferences ?? []
}

export function dispatchNotificationsRefresh() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT))
}
