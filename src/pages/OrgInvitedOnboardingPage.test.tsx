import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/auth/AuthContext'
import { ApiError } from '@/lib/api'
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
    apiFetch: vi.fn(async (path: string) => {
      if (path === '/api/v1/session') {
        return {
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
      }
      if (path === '/api/v1/taxonomies') {
        return { taxonomies: [{ key: 'roles', terms: [] }] }
      }
      if (path.startsWith('/api/v1/invitations/')) {
        throw new MockApiError(422, 'invalid_invitation', 'Invitation is invalid or expired')
      }
      throw new Error(`Unexpected path ${path}`)
    }),
  }
})

describe('OrgInvitedOnboardingPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
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
})
