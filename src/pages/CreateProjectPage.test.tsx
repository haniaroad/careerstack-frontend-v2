import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateProjectPage } from './CreateProjectPage'
import { apiFetch } from '@/lib/api'

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    session: {
      user: { id: 'u1' },
      credits: { remaining: 1, trial_remaining: 1, purchased_remaining: 0, owner_type: 'user' },
      active_workspace: { id: 'w1', kind: 'personal', name: 'Personal' },
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

describe('CreateProjectPage', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
  })

  it('shows AI-first create with manual advanced setup', () => {
    render(
      <MemoryRouter initialEntries={['/projects/new']}>
        <Routes>
          <Route path="/projects/new" element={<CreateProjectPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Generating or editing a draft does not use a credit/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate with AI/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Advanced setup \(manual\)/i })).toBeInTheDocument()
  })

  it('shows blocked second-generation messaging from API error code', async () => {
    const user = userEvent.setup()
    const { ApiError } = await import('@/lib/api')
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(422, 'ai_allowance_exhausted', 'Already generated'),
    )

    render(
      <MemoryRouter initialEntries={['/projects/new']}>
        <Routes>
          <Route path="/projects/new" element={<CreateProjectPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(
      screen.getByLabelText(/Describe the project you want/i),
      'Build a portfolio landing page with three cards',
    )
    await user.click(screen.getByRole('button', { name: /Generate with AI/i }))

    expect(await screen.findByText(/Generation already used/i)).toBeInTheDocument()
  })

  it('blocks confirm when project end date is missing', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/projects/new?mode=manual']}>
        <Routes>
          <Route path="/projects/new" element={<CreateProjectPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/^Title$/i), 'Manual draft project')
    expect(screen.getByLabelText(/Project end date/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: /Confirm project/i })).toBeDisabled()

    await user.type(screen.getByLabelText(/Project end date/i), '2026-12-01')
    expect(screen.getByRole('button', { name: /Confirm project/i })).toBeEnabled()
  })
})
