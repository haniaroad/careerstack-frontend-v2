import { apiFetch } from '@/lib/api'

export type ExploreProject = {
  id: string
  slug: string
  title: string
  skills: string[]
  roles_needed: string[]
  joining_mode: string | null
  recruitment_state: string | null
  status: string
  phase: string
  visibility: string
  mode: string
}

export type ExplorePerson = {
  user_id: string
  slug: string
  display_name: string
  image_url: string | null
  location: string
  timezone: string
  role: string | null
  experience_level: string
  skills: string[]
  organizations: string[]
}

export type InviteProject = {
  id: string
  title: string
  roles_needed: string[]
}

export type DirectoryPage<T> = {
  page: number
  per_page: number
  total_count: number
} & T

export type InviteOptions = {
  eligible_projects: InviteProject[]
  unavailable: boolean
}

export function fetchExploreProjects(params: { q?: string; skill?: string; role?: string }) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.skill) search.set('skill', params.skill)
  if (params.role) search.set('role', params.role)
  const query = search.toString()
  return apiFetch<DirectoryPage<{ projects: ExploreProject[] }>>(
    `/api/v1/explore/projects${query ? `?${query}` : ''}`,
  )
}

export function fetchExplorePeople(params: {
  name?: string
  skill?: string
  role?: string
  experience?: string
  location?: string
  organization?: string
}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return apiFetch<DirectoryPage<{ people: ExplorePerson[] }>>(
    `/api/v1/explore/people${query ? `?${query}` : ''}`,
  )
}

export function fetchInviteOptions(userId: string) {
  return apiFetch<InviteOptions>(`/api/v1/explore/invite_options?user_id=${encodeURIComponent(userId)}`)
}

export function createProjectInvitation(projectId: string, inviteeId: string, requestedRole: string) {
  return apiFetch<{ invitation: { id: string; status: string } }>(
    `/api/v1/projects/${projectId}/invitations`,
    {
      method: 'POST',
      body: JSON.stringify({ invitee_id: inviteeId, requested_role: requestedRole }),
    },
  )
}
