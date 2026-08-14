import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateProjectPage } from './CreateProjectPage'
import { apiFetch } from '@/lib/api'

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    session: {
      user: { id: 'u1' },
      credits: { remaining: 3, trial_remaining: 3, purchased_remaining: 0, owner_type: 'organization' },
      active_workspace: {
        id: 'ws-org',
        kind: 'organization',
        name: 'Bridge Academy',
        organization_id: 'org-1',
        workspace_status: 'active',
      },
      can_access_org_admin: true,
      program_filter: {
        mode: 'all',
        program_id: null,
        available_programs: [
          { id: 'prog-1', name: 'Fall Cohort', status: 'active' },
          { id: 'prog-2', name: 'Spring', status: 'active' },
        ],
      },
    },
    setSession: vi.fn(),
    refreshSession: vi.fn(),
  }),
}))

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    code: string
    constructor(status: number, code: string, message: string) {
      super(message)
      this.status = status
      this.code = code
    }
  },
}))

vi.mock('@/lib/mixpanel', () => ({
  trackAiDraftGenerated: vi.fn(),
  trackProjectActivated: vi.fn(),
}))

describe('CreateProjectPage organization program', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
    vi.mocked(apiFetch).mockResolvedValue({
      programs: [
        { id: 'prog-1', name: 'Fall Cohort', status: 'active' },
        { id: 'prog-2', name: 'Spring', status: 'active' },
      ],
    })
  })

  it('requires an active program before generating or confirming', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/projects/new']}>
        <Routes>
          <Route path="/projects/new" element={<CreateProjectPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('option', { name: 'Fall Cohort' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate with AI/i })).toBeDisabled()

    await user.type(
      screen.getByLabelText(/Describe the project you want/i),
      'Build a portfolio landing page with three cards',
    )
    expect(screen.getByRole('button', { name: /Generate with AI/i })).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Program'), 'prog-1')
    expect(screen.getByRole('button', { name: /Generate with AI/i })).toBeEnabled()
  })

  it('keeps confirm disabled on manual setup until a program is chosen', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/projects/new?mode=manual']}>
        <Routes>
          <Route path="/projects/new" element={<CreateProjectPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('option', { name: 'Fall Cohort' })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Title$/i), 'Org draft project')
    await user.type(screen.getByLabelText(/Project end date/i), '2026-12-01')
    expect(screen.getByRole('button', { name: /Confirm project/i })).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Program'), 'prog-1')
    expect(screen.getByRole('button', { name: /Confirm project/i })).toBeEnabled()
  })

  it('lists live active programs when the session catalog is stale', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      programs: [
        {
          id: 'prog-live',
          name: 'AI Foundations',
          status: 'active',
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/projects/new']}>
        <Routes>
          <Route path="/projects/new" element={<CreateProjectPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'AI Foundations' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('option', { name: 'Fall Cohort' })).not.toBeInTheDocument()
  })
})
