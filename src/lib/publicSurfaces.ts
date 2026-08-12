import { apiFetch } from '@/lib/api'
import type { ProfilePayload } from '@/lib/profiles'
import type { JoiningMode, ProjectMode, ProjectPhase, ProjectStatus, RecruitmentState } from '@/lib/projects'

export type PublicProjectCreator = {
  display_name: string
  profile_slug: string | null
}

export type PublicProjectTask = {
  title: string
  acceptance_criteria: string | null
}

export type PublicProjectPayload = {
  id: string
  slug: string
  title: string
  summary: string | null
  definition_of_done: string | null
  skills: string[]
  roles_needed: string[]
  project_type: string | null
  mode: ProjectMode
  status: ProjectStatus
  phase: ProjectPhase
  joining_mode: JoiningMode | null
  capacity: number | null
  seats_remaining: number | null
  recruitment_state: RecruitmentState | null
  ends_on: string | null
  tasks: PublicProjectTask[]
  creator: PublicProjectCreator
  canonical_path: string
  indexable: boolean
}

export type PublicProfileResponse = {
  profile: ProfilePayload
  canonical_path: string
  indexable: boolean
}

export async function fetchPublicProject(slug: string) {
  const data = await apiFetch<{ project: PublicProjectPayload }>(
    `/api/v1/public/projects/${encodeURIComponent(slug)}`,
  )
  return data.project
}

export async function fetchPublicProfile(slug: string) {
  return apiFetch<PublicProfileResponse>(
    `/api/v1/public/profiles/${encodeURIComponent(slug)}`,
  )
}

export function projectPublicPath(slug: string) {
  return `/projects/${slug}`
}

export function projectAbsoluteUrl(slug: string) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://app.careerstack.co'
  return `${origin}${projectPublicPath(slug)}`
}

const RETURN_TO_KEY = 'careerstack.returnTo'

export function storeReturnTo(path: string) {
  try {
    if (!isSafeReturnTo(path)) return
    window.sessionStorage.setItem(RETURN_TO_KEY, path)
  } catch {
    // ignore storage failures
  }
}

export function consumeReturnTo(fallback = '/onboarding') {
  try {
    const value = window.sessionStorage.getItem(RETURN_TO_KEY)
    window.sessionStorage.removeItem(RETURN_TO_KEY)
    if (value && isSafeReturnTo(value)) return value
  } catch {
    // ignore
  }
  return fallback
}

export function peekReturnTo() {
  try {
    const value = window.sessionStorage.getItem(RETURN_TO_KEY)
    if (value && isSafeReturnTo(value)) return value
  } catch {
    // ignore
  }
  return null
}

/** Same-origin relative paths only; public surfaces + shell destinations. */
export function isSafeReturnTo(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return false
  if (path.includes('://')) return false
  return (
    path.startsWith('/projects/') ||
    path.startsWith('/profile/') ||
    path === '/home' ||
    path === '/my-work' ||
    path === '/explore' ||
    path === '/inbox' ||
    path === '/billing' ||
    path === '/onboarding' ||
    path === '/welcome'
  )
}

export function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}
