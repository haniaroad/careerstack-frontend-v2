import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/auth/AuthContext'
import { IndependentOnboardingPage } from './IndependentOnboardingPage'

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(async (path: string) => {
    if (path === '/api/v1/taxonomies') {
      return {
        taxonomies: [
          {
            key: 'roles',
            terms: [
              {
                id: '11111111-1111-4111-8111-111111111008',
                key: 'software_engineer',
                label: 'Software engineer',
                is_other: false,
              },
            ],
          },
        ],
      }
    }
    throw new Error(`Unexpected path ${path}`)
  }),
  setApiTokenProvider: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

describe('IndependentOnboardingPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('requires attestation and terms before submit', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AuthProvider>
          <IndependentOnboardingPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    await screen.findByLabelText('Name')
    await user.type(screen.getByLabelText('Name'), 'Alex')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText(/attest you are 18/i)).toBeInTheDocument()
    expect(screen.getByText(/terms are required/i)).toBeInTheDocument()
  })
})
