import { apiFetch } from '@/lib/api'

export type ProfileVisibility = 'public_adult' | 'restricted'

export type ProfileDetails = {
  display_name: string
  country: string
  state_region: string
  career_goal: string
  experience_level: string
  bio: string | null
  image_url: string | null
  github_url: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  interests: string[]
  slug: string
  current_role_term_id?: string | null
  current_role_other?: string | null
  target_role_term_id?: string | null
  target_role_other?: string | null
}

export type ProfileStats = {
  projects_completed: number
  active_projects: number
  tasks_approved: number
  on_time_submission_rate: {
    numerator: number
    denominator: number
    rate: number
  } | null
  late_submissions: number | null
  unsubmitted_tasks: number | null
  ai_approved_tasks: number | null
  creator_reviewed_approved_tasks: number | null
  average_creator_review_hours: number | null
  activity: { week_start: string; count: number }[]
}

export type ProfilePayload = {
  user_id: string
  visibility: ProfileVisibility
  public_identity_visible: boolean
  age_visibility: {
    visibility_review_required: boolean
    public_identity_confirmed: boolean
    confirmed_at: string | null
  } | null
  details: ProfileDetails
  stats: ProfileStats
  evidence: {
    skills: { name: string; level: string; evidence_count: number }[]
    artifacts: {
      kind: string
      url: string | null
      label: string
      submitted_at?: string
    }[]
  }
  projects: Record<string, unknown>[]
  links: { provider: string; url: string }[]
}

export async function fetchOwnProfile() {
  const data = await apiFetch<{ profile: ProfilePayload }>('/api/v1/profiles/me')
  return data.profile
}

export async function updateOwnProfile(body: Record<string, unknown>) {
  const data = await apiFetch<{ profile: ProfilePayload }>('/api/v1/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return data.profile
}

export async function fetchProfileBySlug(slug: string) {
  const data = await apiFetch<{ profile: ProfilePayload }>(
    `/api/v1/profiles/${encodeURIComponent(slug)}`,
  )
  return data.profile
}

export async function updateProfileVisibility(decision: 'confirm' | 'reverse') {
  return apiFetch<{ profile: ProfilePayload; session: unknown }>(
    '/api/v1/profiles/me/visibility',
    {
      method: 'POST',
      body: JSON.stringify({ decision }),
    },
  )
}

export function profilePublicPath(slug: string) {
  return `/profile/${slug}`
}

export function profileAbsoluteUrl(slug: string) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://app.careerstack.co'
  return `${origin}${profilePublicPath(slug)}`
}
