export type ProjectStatus = 'draft' | 'active' | 'cancelled'
export type ProjectSource = 'manual' | 'ai'

export type ProposedTask = {
  title: string
  summary: string
  recommended_due_date: string
  submission_expectations: string
}

export type Project = {
  id: string
  title: string
  summary: string | null
  skills: string[]
  mode: 'solo'
  status: ProjectStatus
  source: ProjectSource
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
