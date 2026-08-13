export type ProjectStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'expired'
  | 'cancelled'
  | 'archived'
export type ProjectPhase = 'normal' | 'ending_soon' | 'grace_period' | 'read_only'
export type ProjectSource = 'manual' | 'ai'
export type ProjectMode = 'solo' | 'team'
export type JoiningMode = 'application' | 'instant' | 'invite_only'
export type RecruitmentState = 'open' | 'full' | 'closed'

export type ProposedTask = {
  title: string
  summary: string
  recommended_due_date: string
  submission_expectations: string
}

export type ProjectMembership = {
  id: string
  user_id: string
  role: 'creator' | 'participant'
  participant_role: string | null
  status: string
  join_source: string | null
  display_name: string
}

export type ProjectApplication = {
  id: string
  applicant_id: string
  requested_role: string
  motivation: string
  availability_confirmed: boolean
  skills: string[]
  portfolio_url: string | null
  github_url: string | null
  resume_url: string | null
  status: string
  created_at: string
}

export type ProjectInvitation = {
  id: string
  invitee_id: string
  requested_role: string
  status: string
  created_at: string
}

export type ProjectTask = {
  id: string
  title: string
  status: string
  due_on: string | null
  assignee_id: string | null
}

export type Project = {
  id: string
  slug: string
  title: string
  summary: string | null
  skills: string[]
  mode: ProjectMode
  status: ProjectStatus
  phase: ProjectPhase
  visibility: 'public' | 'private'
  source: ProjectSource
  joining_mode: JoiningMode | null
  capacity: number | null
  participant_count: number | null
  seats_remaining: number | null
  recruitment_state: RecruitmentState | null
  objective: string | null
  project_type: string | null
  expected_duration: string | null
  ends_on: string | null
  final_expires_at: string | null
  definition_of_done: string | null
  roles_needed: string[]
  proposed_tasks: ProposedTask[]
  submission_expectations: string | null
  ai_generation_succeeded_at: string | null
  workspace_id: string
  creator_id: string
  confirmed_at: string | null
  completed_at: string | null
  expired_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  memberships?: ProjectMembership[]
  pending_applications?: ProjectApplication[]
  pending_invitations?: ProjectInvitation[]
  viewer_can_join?: boolean
  tasks?: ProjectTask[]
}

export type AiGenerationStatus = 'pending' | 'running' | 'succeeded' | 'failed'

export type AiGeneration = {
  id: string
  use_case: string
  status: AiGenerationStatus
  client_draft_key: string | null
  constraints: Record<string, string>
  result: Record<string, unknown>
  project_id: string | null
  error_code: string | null
  error_message: string | null
  retryable: boolean
}

export const PROJECT_SKILLS = [
  'React',
  'Accessibility',
  'Technical writing',
  'Product thinking',
  'Frontend',
  'QA testing',
  'Data analysis',
  'Other',
] as const

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export const TIME_AVAILABLE = ['1 week', '2 weeks', '1 month', '6 weeks'] as const

export const JOINING_MODES = ['application', 'instant', 'invite_only'] as const

export const REASON_CATEGORIES = [
  'schedule_conflict',
  'project_mismatch',
  'creator_unresponsive',
  'participant_unresponsive',
  'conduct_issue',
  'removed_by_creator',
  'removed_by_organization',
  'personal_reason',
  'other',
] as const

export type ReasonCategory = (typeof REASON_CATEGORIES)[number]

export function formatReasonCategory(category: string): string {
  return category.replaceAll('_', ' ')
}

export function formatProjectPhase(phase: ProjectPhase | string): string {
  switch (phase) {
    case 'ending_soon':
      return 'Ending soon'
    case 'grace_period':
      return 'Grace period'
    case 'read_only':
      return 'Read only'
    case 'normal':
      return 'Normal'
    default:
      return phase.replaceAll('_', ' ')
  }
}

export function formatProjectStatus(status: ProjectStatus | string): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'active':
      return 'Active'
    case 'completed':
      return 'Completed'
    case 'expired':
      return 'Expired'
    case 'cancelled':
      return 'Cancelled'
    case 'archived':
      return 'Archived'
    default:
      return status.replaceAll('_', ' ')
  }
}

const READ_ONLY_STATUSES: ProjectStatus[] = ['completed', 'expired', 'cancelled', 'archived']

export function projectIsReadOnly(
  project: Pick<Project, 'status' | 'phase'>,
): boolean {
  return READ_ONLY_STATUSES.includes(project.status) || project.phase === 'read_only'
}

export function projectAllowsMutations(
  project: Pick<Project, 'status' | 'phase'>,
): boolean {
  return !projectIsReadOnly(project)
}

export function projectAllowsSubmit(
  project: Pick<Project, 'status' | 'phase'>,
): boolean {
  if (project.status !== 'active') return false
  return (
    project.phase === 'normal' ||
    project.phase === 'ending_soon' ||
    project.phase === 'grace_period'
  )
}

export function projectAllowsJoin(
  project: Pick<Project, 'mode' | 'status' | 'phase' | 'recruitment_state'>,
): boolean {
  if (project.mode !== 'team' || project.status !== 'active') return false
  if (project.recruitment_state !== 'open') return false
  if (project.phase === 'grace_period' || project.phase === 'read_only') return false
  return true
}

/** True when creator may still change ends_on (before final expiration, not terminal). */
export function projectAllowsEndDateEdit(
  project: Pick<Project, 'status' | 'phase' | 'final_expires_at'>,
): boolean {
  if (projectIsReadOnly(project)) return false
  if (project.status !== 'active' && project.status !== 'draft') return false
  if (!project.final_expires_at) return project.status === 'active' || project.status === 'draft'
  return new Date(project.final_expires_at).getTime() > Date.now()
}
