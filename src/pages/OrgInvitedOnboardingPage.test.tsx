import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
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
  it('shows an invite error state for invalid tokens', async () => {
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
