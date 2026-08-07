export type ProjectStatus = 'draft' | 'active' | 'cancelled'

export type Project = {
  id: string
  title: string
  summary: string | null
  skills: string[]
  mode: 'solo'
  status: ProjectStatus
  workspace_id: string
  creator_id: string
  confirmed_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
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
