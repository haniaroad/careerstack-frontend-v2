import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/auth/AuthContext'
import { apiFetch, ApiError } from '@/lib/api'
import { OrgInvitedOnboardingPage } from './OrgInvitedOnboardingPage'

vi.mock('@/lib/api', async () => {
  class MockApiError extends Error {
    status: number
    code: string
    constructor(status: number, code: string, message: string) {
      super(message)
      this.status = status
      this.code = code
    }
  }
  return {
    ApiError: MockApiError,
    setApiTokenProvider: vi.fn(),
    apiFetch: vi.fn(),
  }
})

const pendingSession = {
  user: {
    id: 'u1',
    email: 'alex@example.com',
    status: 'pending_onboarding',
    age_status: 'unknown',
    onboarding_path: null,
  },
  workspaces: [],
  active_workspace_id: null,
}

const onboardedSession = {
  user: {
    id: 'u1',
    email: 'alex@example.com',
    status: 'active',
    age_status: 'adult',
    onboarding_path: 'independent',
  },
  workspaces: [{ id: 'ws-personal', kind: 'personal', name: 'Personal', organization_id: null }],
  active_workspace_id: 'ws-personal',
}

const joinedSession = {
  ...onboardedSession,
  workspaces: [
    ...onboardedSession.workspaces,
    {
      id: 'ws-org',
      kind: 'organization',
      name: 'Accelerate4KIDS',
      organization_id: 'org-1',
    },
  ],
  active_workspace_id: 'ws-org',
}

describe('OrgInvitedOnboardingPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.mocked(apiFetch).mockReset()
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === '/api/v1/session') return pendingSession
      if (path === '/api/v1/taxonomies') return { taxonomies: [{ key: 'roles', terms: [] }] }
      if (path.startsWith('/api/v1/invitations/')) {
        throw new ApiError(422, 'invalid_invitation', 'Invitation is invalid or expired')
      }
      throw new Error(`Unexpected path ${path}`)
    })
  })

  it('asks anonymous visitors to sign in before opening an invite', async () => {
    render(
      <MemoryRouter initialEntries={['/invite/bad-token']}>
        <AuthProvider>
          <Routes>
            <Route path="/invite/:token" element={<OrgInvitedOnboardingPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in to continue' })).toBeInTheDocument()
    expect(screen.getByLabelText('Invite token')).toHaveValue('bad-token')
    expect(window.localStorage.getItem('careerstack.returnTo')).toBe('/invite/bad-token')
  })

  it('shows an invite error state for invalid tokens when signed in', async () => {
    window.localStorage.setItem('careerstack.stubToken', 'test:uid:alex@example.com')

    render(
      <MemoryRouter initialEntries={['/invite/bad-token']}>
        <AuthProvider>
          <Routes>
            <Route path="/invite/:token" element={<OrgInvitedOnboardingPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('invite-error')).toBeInTheDocument()
    })
    expect(screen.getByText(/invitation is invalid or expired/i)).toBeInTheDocument()
    expect(ApiError).toBeTruthy()
  })

  it('lets an already onboarded user accept the invite and land on welcome', async () => {
    window.localStorage.setItem('careerstack.stubToken', 'test:uid:alex@example.com')
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === '/api/v1/session') return onboardedSession
      if (path === '/api/v1/taxonomies') return { taxonomies: [{ key: 'roles', terms: [] }] }
      if (path === '/api/v1/invitations/good-token') {
        return {
          invitation: {
            organization_name: 'Accelerate4KIDS',
            program_name: 'AI Foundations',
          },
        }
      }
      if (path === '/api/v1/invitations/good-token/accept') return joinedSession
      throw new Error(`Unexpected path ${path}`)
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/invite/good-token']}>
        <AuthProvider>
          <Routes>
            <Route path="/invite/:token" element={<OrgInvitedOnboardingPage />} />
            <Route path="/welcome" element={<h1>You're in</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Join this organization' })).toBeInTheDocument()
    expect(await screen.findByText('Accelerate4KIDS')).toBeInTheDocument()
    expect(screen.getByText(/Program: AI Foundations/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Join organization' }))
    expect(await screen.findByRole('heading', { name: "You're in" })).toBeInTheDocument()
  })
})
