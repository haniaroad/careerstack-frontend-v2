import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '@/lib/projects'
import { MyWorkPage } from './MyWorkPage'
import { ShellProvider } from '@/shell/ShellContext'

const apiFetch = vi.fn()

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

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    session: {
      user: { id: 'u1' },
      active_workspace_id: 'ws-1',
      active_workspace: { id: 'ws-1', kind: 'personal', name: 'Personal' },
    },
  }),
}))

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    title: 'Grace work',
    summary: 'Summary',
    skills: [],
    mode: 'solo',
    status: 'active',
    phase: 'grace_period',
    source: 'manual',
    joining_mode: null,
    capacity: null,
    participant_count: null,
    seats_remaining: null,
    recruitment_state: null,
    objective: null,
    project_type: null,
    expected_duration: null,
    ends_on: '2026-08-01',
    final_expires_at: '2026-08-08T23:59:59Z',
    definition_of_done: null,
    roles_needed: [],
    proposed_tasks: [],
    submission_expectations: null,
    ai_generation_succeeded_at: null,
    workspace_id: 'ws-1',
    creator_id: 'u1',
    confirmed_at: '2026-07-01',
    completed_at: null,
    expired_at: null,
    cancelled_at: null,
    created_at: '2026-07-01',
    updated_at: '2026-07-01',
    ...overrides,
  }
}

describe('MyWorkPage', () => {
  beforeEach(() => {
    apiFetch.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows status, phase, and ends_on on project rows', async () => {
    apiFetch.mockResolvedValue({ projects: [project()] })

    render(
      <MemoryRouter initialEntries={['/my-work']}>
        <ShellProvider
          initial={{
            workspaces: [{ id: 'ws-1', label: 'Personal', type: 'personal' }],
            activeWorkspaceId: 'ws-1',
          }}
        >
          <Routes>
            <Route path="/my-work" element={<MyWorkPage />} />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Grace work/i)).toBeInTheDocument()
    expect(screen.getByText(/^Active$/i)).toBeInTheDocument()
    expect(screen.getByText(/Grace period/i)).toBeInTheDocument()
    expect(screen.getByText(/Ends 2026-08-01/i)).toBeInTheDocument()
  })
})
