import { apiFetch } from '@/lib/api'
import type { SessionPayload, WorkspaceStatus } from '@/auth/types'

export type OrgRole = 'admin' | 'manager' | 'participant'
export type ProgramStatus = 'draft' | 'active' | 'archived'
export type AgeStatus = 'adult' | 'minor' | 'unknown'
export type MembershipStatus = 'active' | 'removed'
export type UpgradeRequestStatus = 'open' | 'contacted' | 'closed'
export type OrgAdminTab = 'programs' | 'members' | 'reports' | 'credits'

export const REMOVE_REASONS = [
  { value: 'left_program', label: 'Left program' },
  { value: 'completed_program', label: 'Completed program' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'policy_violation', label: 'Policy violation' },
  { value: 'other', label: 'Other' },
] as const

export const ROLE_LABEL: Record<OrgRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  participant: 'Participant',
}

export type OrgAdminCapabilities = {
  can_archive_programs: boolean
  can_delete_empty_drafts: boolean
  can_remove_members: boolean
  can_view_credit_history: boolean
  can_submit_upgrade_request: boolean
}

export type OrganizationAdminOrg = {
  id: string
  name: string
  timezone: string
  logo_url: string | null
  workspace_id: string | null
  workspace_status: WorkspaceStatus
  offboarding_started_at: string | null
  offboarding_ends_on: string | null
}

export type OperationalPulse = {
  active_programs: number
  active_projects: number
  attention_count: number
  pending_invitations: number
  overdue_applications: number
  credit_remaining: number
  credit_label: string
}

export type CreditsSummary = {
  remaining: number
  trial_remaining: number
  purchased_remaining: number
  owner_type: string
}

export type UpgradeRequest = {
  id: string
  organization_id: string
  expected_participants: string
  expected_projects_or_cohorts: string
  timeline: string
  notes: string | null
  status: UpgradeRequestStatus
  updated_at: string
}

export type OrganizationAdminPayload = {
  organization: OrganizationAdminOrg
  capabilities: OrgAdminCapabilities
  operational_pulse: OperationalPulse
  credits: CreditsSummary
  upgrade_request: UpgradeRequest | null
}

export type Program = {
  id: string
  organization_id: string
  name: string
  description: string | null
  status: ProgramStatus
  member_count: number
  active_project_count: number
  completed_project_count: number
  pending_invitation_count: number
  can_delete: boolean
  can_archive: boolean
  read_only: boolean
  created_at: string
  updated_at: string
}

export type OrgMembership = {
  id: string
  organization_id: string
  user_id: string
  display_name: string | null
  email: string
  role: OrgRole
  status: MembershipStatus
  age_status: AgeStatus | null
  program_ids: string[]
  program_names: string[]
  is_last_administrator: boolean
  can_remove: boolean
  joined_at: string
  removed_at: string | null
  removed_reason: string | null
}

export type OrgInvitation = {
  id: string
  organization_id: string
  email: string | null
  role: OrgRole
  program_id: string | null
  program_name: string | null
  status: 'pending' | 'accepted' | 'expired'
  invited_by_name: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export type CreditHistoryEntry = {
  id: string
  event: string
  reason: string
  amount: number
  created_at: string
  lot_source?: string | null
}

export function fetchOrganizationAdmin(organizationId: string) {
  return apiFetch<OrganizationAdminPayload>(`/api/v1/organizations/${organizationId}/admin`)
}

export function fetchPrograms(organizationId: string) {
  return apiFetch<{ programs: Program[] }>(`/api/v1/organizations/${organizationId}/programs`)
}

export function createProgram(
  organizationId: string,
  params: { name: string; description?: string; status?: Exclude<ProgramStatus, 'archived'> },
) {
  return apiFetch<{ program: Program }>(`/api/v1/organizations/${organizationId}/programs`, {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export function updateProgram(
  programId: string,
  params: { name?: string; description?: string | null; status?: Exclude<ProgramStatus, 'archived'> },
) {
  return apiFetch<{ program: Program }>(`/api/v1/programs/${programId}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })
}

export function deleteEmptyDraft(programId: string) {
  return apiFetch<void>(`/api/v1/programs/${programId}`, { method: 'DELETE' })
}

export function archiveProgram(programId: string) {
  return apiFetch<{ program: Program }>(`/api/v1/programs/${programId}/archive`, { method: 'POST' })
}

export function fetchMemberships(
  organizationId: string,
  params: { q?: string; role?: OrgRole; program_id?: string } = {},
) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.role) search.set('role', params.role)
  if (params.program_id) search.set('program_id', params.program_id)
  const query = search.toString()
  return apiFetch<{ memberships: OrgMembership[] }>(
    `/api/v1/organizations/${organizationId}/memberships${query ? `?${query}` : ''}`,
  )
}

export function updateMembership(
  membershipId: string,
  params: { role?: OrgRole; program_ids?: string[] },
) {
  return apiFetch<{ membership: OrgMembership }>(`/api/v1/organization_memberships/${membershipId}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })
}

export function removeMembership(membershipId: string, reason: string) {
  return apiFetch<{ membership: OrgMembership }>(
    `/api/v1/organization_memberships/${membershipId}/remove`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  )
}

export function fetchInvitations(organizationId: string) {
  return apiFetch<{ invitations: OrgInvitation[] }>(
    `/api/v1/organizations/${organizationId}/invitations`,
  )
}

export function createInvitation(params: {
  organization_id: string
  email: string
  role: OrgRole
  program_id?: string | null
}) {
  return apiFetch<{
    invitation: {
      id: string
      organization_id: string
      program_id: string | null
      email: string | null
      role: OrgRole
      expires_at: string
      token: string
    }
  }>('/api/v1/invitations', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export function fetchCreditHistory() {
  return apiFetch<{ entries: CreditHistoryEntry[] }>('/api/v1/credits/history')
}

export function upsertUpgradeRequest(
  organizationId: string,
  params: {
    expected_participants: string
    expected_projects_or_cohorts: string
    timeline: string
    notes?: string
  },
) {
  return apiFetch<{ upgrade_request: UpgradeRequest }>(
    `/api/v1/organizations/${organizationId}/upgrade_request`,
    { method: 'PUT', body: JSON.stringify(params) },
  )
}

export function setProgramFilter(params: { mode: 'all' | 'program'; program_id?: string | null }) {
  return apiFetch<SessionPayload>('/api/v1/workspaces/program_filter', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export function attentionSummary(pulse: OperationalPulse) {
  const parts: string[] = []
  if (pulse.pending_invitations > 0) {
    parts.push(
      `${pulse.pending_invitations} pending invite${pulse.pending_invitations === 1 ? '' : 's'}`,
    )
  }
  if (pulse.overdue_applications > 0) {
    parts.push(
      `${pulse.overdue_applications} overdue application${pulse.overdue_applications === 1 ? '' : 's'}`,
    )
  }
  return parts.join(' · ') || 'Nothing waiting'
}

export function creditHistoryLabel(entry: CreditHistoryEntry) {
  if (entry.reason === 'personal_trial') return 'Personal trial grant'
  if (entry.reason === 'organization_trial') return 'Organization trial grant'
  if (entry.reason === 'personal_pack_purchase') return 'Personal pack purchase'
  if (entry.event === 'consume') return 'Credit used'
  if (entry.event === 'restore') return 'Credit restored'
  if (entry.event === 'refund_reversal') return 'Refund reversal'
  return entry.reason.replaceAll('_', ' ')
}
