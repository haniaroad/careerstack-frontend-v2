import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '@/lib/projects'
import { HomePage } from './HomePage'
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

vi.mock('@/lib/mixpanel', () => ({
  trackProjectGraceObserved: vi.fn(),
}))

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p-ending',
    slug: 'shipping-checklist',
    title: 'Shipping checklist',
    summary: null,
    skills: [],
    mode: 'solo',
    status: 'active',
    phase: 'ending_soon',
    visibility: 'public',
    source: 'manual',
    joining_mode: null,
    capacity: null,
    participant_count: null,
    seats_remaining: null,
    recruitment_state: null,
    objective: null,
    project_type: null,
    expected_duration: null,
    ends_on: '2026-08-15',
    final_expires_at: '2026-08-22T23:59:59Z',
    definition_of_done: null,
    roles_needed: [],
    proposed_tasks: [],
    submission_expectations: null,
    ai_generation_succeeded_at: null,
    workspace_id: 'ws-1',
    creator_id: 'u1',
    confirmed_at: '2026-08-01',
    completed_at: null,
    expired_at: null,
    cancelled_at: null,
    created_at: '2026-08-01',
    updated_at: '2026-08-01',
    ...overrides,
  }
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <ShellProvider
        initial={{
          workspaces: [{ id: 'ws-1', label: 'Personal', type: 'personal' }],
          activeWorkspaceId: 'ws-1',
        }}
      >
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route path="/projects/:id" element={<p>Project detail</p>} />
        </Routes>
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    apiFetch.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('surfaces ending-soon warning with primary CTA to the project', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/api/v1/projects') {
        return { projects: [project()] }
      }
      if (path.startsWith('/api/v1/inbox/items')) {
        return { items: [] }
      }
      throw new Error(`Unexpected ${path}`)
    })

    renderHome()
    expect(await screen.findByText(/Shipping checklist — Ending soon/i)).toBeInTheDocument()
    expect(screen.getByText(/Ending soon on 2026-08-15/i)).toBeInTheDocument()
    const cta = screen.getByRole('link', { name: /Open project/i })
    expect(cta).toHaveAttribute('href', '/projects/p-ending')
    expect(screen.getByRole('link', { name: /Create project/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open My Work/i })).toBeInTheDocument()
  })

  it('prioritizes grace warnings ahead of ending soon', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/api/v1/projects') {
        return {
          projects: [
            project({ id: 'p-ending', title: 'Ending project', phase: 'ending_soon' }),
            project({
              id: 'p-grace',
              title: 'Grace project',
              phase: 'grace_period',
              ends_on: '2026-08-01',
            }),
          ],
        }
      }
      if (path.startsWith('/api/v1/inbox/items')) {
        return { items: [] }
      }
      throw new Error(`Unexpected ${path}`)
    })

    renderHome()
    expect(await screen.findByText(/Grace project — Grace period/i)).toBeInTheDocument()
    const warnings = screen.getAllByText(/Open project/i)
    expect(warnings[0].closest('a')).toHaveAttribute('href', '/projects/p-grace')
  })
})
