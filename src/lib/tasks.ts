export type TaskStatus =
  | 'pending'
  | 'submitted'
  | 'corrections_requested'
  | 'approved'
  | 'incomplete'

export type TaskSummary = {
  id: string
  project_id: string
  project_title: string
  project_mode: 'solo' | 'team'
  assignee_id: string | null
  title: string
  acceptance_criteria: string | null
  submission_expectations: string | null
  due_on: string | null
  status: TaskStatus
  position: number
  first_submitted_at: string | null
  on_time: boolean | null
  created_at: string
  updated_at: string
}

export type TaskSubmissionLink = {
  id: string
  url: string
}

export type TaskSubmissionFile = {
  id: string
  filename: string
  content_type: string
  byte_size: number
  signed_id: string
}

export type TaskSubmission = {
  id: string
  task_id: string
  attempt_number: number
  body: string | null
  content_fingerprint: string
  submitted_at: string
  links: TaskSubmissionLink[]
  files: TaskSubmissionFile[]
}

export type AiReviewStatus = 'pending' | 'running' | 'succeeded' | 'failed'

export type AiReview = {
  id: string
  task_id: string
  task_submission_id: string
  status: AiReviewStatus
  decision: 'approved' | 'corrections_requested' | null
  feedback: {
    summary?: string
    unmet_requirements?: string[]
    next_action?: string
    decision?: string
  }
  analysis_incomplete: boolean
  unsupported_items: Array<Record<string, unknown>>
  model: string | null
  prompt_version: string | null
  error_code: string | null
  error_message: string | null
  retryable: boolean
  completed_at: string | null
  created_at: string
}

export type TaskDetail = TaskSummary & {
  submissions: TaskSubmission[]
  latest_review: AiReview | null
  review_overdue_at?: string | null
  creator_review_decision?: 'approved' | 'corrections_requested' | null
  creator_review_feedback?: string | null
  creator_reviewed_by_id?: string | null
  creator_reviewed_at?: string | null
}

export const MAX_FILES = 3
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_COMBINED_BYTES = 25 * 1024 * 1024
