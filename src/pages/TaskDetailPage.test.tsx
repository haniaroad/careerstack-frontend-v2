import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TaskDetail } from '@/lib/tasks'
import { TaskDetailPage } from './TaskDetailPage'

const apiFetch = vi.fn()
const trackTaskSubmitted = vi.fn()
const trackAiReviewCompleted = vi.fn()

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number
    code: string
    constructor(status: number, code: string, message: string) {
      super(message)
      this.status = status
      this.code = code
    }
  }
  return { apiFetch: (...args: unknown[]) => apiFetch(...args), ApiError }
})

vi.mock('@/lib/mixpanel', () => ({
  trackTaskSubmitted: (...args: unknown[]) => trackTaskSubmitted(...args),
  trackAiReviewCompleted: (...args: unknown[]) => trackAiReviewCompleted(...args),
}))

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    session: {
      user: { id: 'u1' },
      active_workspace: { kind: 'personal' },
      active_workspace_id: 'w1',
    },
  }),
}))

function pendingTask(): TaskDetail {
  return {
    id: 't1',
    project_id: 'p1',
    project_title: 'Portfolio site',
    assignee_id: 'u1',
    title: 'Build landing page',
    acceptance_criteria: 'Responsive layout',
    submission_expectations: 'Writeup + link',
    due_on: '2030-01-01',
    status: 'pending',
    position: 0,
    first_submitted_at: null,
    on_time: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    submissions: [],
    latest_review: null,
  }
}

describe('TaskDetailPage', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    trackTaskSubmitted.mockReset()
    trackAiReviewCompleted.mockReset()
  })

  it('submits evidence, shows corrections, then approves on resubmit', async () => {
    const user = userEvent.setup()
    let task = pendingTask()
    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/tasks/t1' && !init?.method) {
        return { task }
      }
      if (path === '/api/v1/tasks/t1/submissions' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body))
        if (body.body.includes('First')) {
          task = {
            ...task,
            status: 'corrections_requested',
            submissions: [
              {
                id: 's1',
                task_id: 't1',
                attempt_number: 1,
                body: body.body,
                content_fingerprint: 'a',
                submitted_at: '2026-01-02',
                links: [],
                files: [],
              },
            ],
            latest_review: {
              id: 'r1',
              task_id: 't1',
              task_submission_id: 's1',
              status: 'succeeded',
              decision: 'corrections_requested',
              feedback: {
                summary: 'Need more detail',
                unmet_requirements: ['Add specifics'],
                next_action: 'Revise writeup',
              },
              analysis_incomplete: false,
              unsupported_items: [],
              model: 'm',
              prompt_version: 'v1',
              error_code: null,
              error_message: null,
              retryable: false,
              completed_at: '2026-01-02',
              created_at: '2026-01-02',
            },
          }
          return { task, submission: task.submissions[0], review: task.latest_review }
        }
        task = {
          ...task,
          status: 'approved',
          submissions: [
            ...task.submissions,
            {
              id: 's2',
              task_id: 't1',
              attempt_number: 2,
              body: body.body,
              content_fingerprint: 'b',
              submitted_at: '2026-01-03',
              links: [],
              files: [],
            },
          ],
          latest_review: {
            id: 'r2',
            task_id: 't1',
            task_submission_id: 's2',
            status: 'succeeded',
            decision: 'approved',
            feedback: { summary: 'Looks good', unmet_requirements: [], next_action: 'Done' },
            analysis_incomplete: false,
            unsupported_items: [],
            model: 'm',
            prompt_version: 'v1',
            error_code: null,
            error_message: null,
            retryable: false,
            completed_at: '2026-01-03',
            created_at: '2026-01-03',
          },
        }
        return { task, submission: task.submissions[1], review: task.latest_review }
      }
      throw new Error(`unexpected ${path}`)
    })

    render(
      <MemoryRouter initialEntries={['/tasks/t1']}>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Build landing page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /choose files/i })).toBeInTheDocument()
    expect(screen.getByText(/no files selected yet/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/submission text/i), 'First attempt')
    await user.click(screen.getByRole('button', { name: /submit for ai review/i }))

    expect(await screen.findByText(/need more detail/i)).toBeInTheDocument()
    expect(screen.getByText(/revise writeup/i)).toBeInTheDocument()
    expect(screen.getAllByText(/^corrections requested$/i).length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText(/^succeeded$/i)).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText(/submission text/i))
    await user.type(screen.getByLabelText(/submission text/i), 'Revised attempt with detail')
    await user.click(screen.getByRole('button', { name: /submit for ai review/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/^approved$/i).length).toBeGreaterThan(0)
    })
    expect(screen.getByText(/looks good/i)).toBeInTheDocument()
    expect(trackTaskSubmitted).toHaveBeenCalled()
    expect(trackAiReviewCompleted).toHaveBeenCalled()
  })

  it('surfaces rate-limit messaging when review request is blocked', async () => {
    const user = userEvent.setup()
    const { ApiError } = await import('@/lib/api')
    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/tasks/t1' && !init?.method) {
        return {
          task: {
            ...pendingTask(),
            status: 'submitted',
            submissions: [
              {
                id: 's1',
                task_id: 't1',
                attempt_number: 1,
                body: 'Work',
                content_fingerprint: 'a',
                submitted_at: '2026-01-02',
                links: [],
                files: [],
              },
            ],
            latest_review: {
              id: 'r-fail',
              task_id: 't1',
              task_submission_id: 's1',
              status: 'failed',
              decision: null,
              feedback: {},
              analysis_incomplete: false,
              unsupported_items: [],
              model: null,
              prompt_version: null,
              error_code: 'ai_provider_error',
              error_message: 'failed',
              retryable: true,
              completed_at: '2026-01-02',
              created_at: '2026-01-02',
            },
          },
        }
      }
      if (path === '/api/v1/tasks/t1/ai_reviews') {
        throw new ApiError(429, 'ai_rate_limited', 'rate limited')
      }
      throw new Error(`unexpected ${path}`)
    })

    render(
      <MemoryRouter initialEntries={['/tasks/t1']}>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: /retry ai review/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^request ai review$/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry ai review/i }))
    expect(await screen.findByText(/rate limit/i)).toBeInTheDocument()
  })
})
