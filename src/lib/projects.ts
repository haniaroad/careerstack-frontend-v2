export type ProjectStatus = 'draft' | 'active' | 'cancelled'
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
  title: string
  summary: string | null
  skills: string[]
  mode: ProjectMode
  status: ProjectStatus
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
  definition_of_done: string | null
  roles_needed: string[]
  proposed_tasks: ProposedTask[]
  submission_expectations: string | null
  ai_generation_succeeded_at: string | null
  workspace_id: string
  creator_id: string
  confirmed_at: string | null
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
