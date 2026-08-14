import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthCompletePage } from './AuthCompletePage'

const completeMagicLink = vi.fn()
const refreshSession = vi.fn()

vi.mock('@/lib/firebase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/firebase')>()
  return {
    ...actual,
    completeMagicLink: (...args: unknown[]) => completeMagicLink(...args),
  }
})

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ refreshSession }),
}))

function renderComplete() {
  return render(
    <MemoryRouter initialEntries={['/auth/complete']}>
      <Routes>
        <Route path="/auth/complete" element={<AuthCompletePage />} />
        <Route path="/invite/:token" element={<h1>Invite</h1>} />
        <Route path="/onboarding" element={<h1>Onboarding</h1>} />
        <Route path="/home" element={<h1>Home</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthCompletePage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    completeMagicLink.mockReset().mockResolvedValue({})
    refreshSession.mockReset()
  })

  it('resumes organization invites after magic-link sign-in even when onboarding is pending', async () => {
    refreshSession.mockResolvedValue({
      user: { status: 'pending_onboarding' },
      workspaces: [],
    })
    window.localStorage.setItem('careerstack.returnTo', '/invite/tok-1')

    renderComplete()

    expect(await screen.findByRole('heading', { name: 'Invite' })).toBeInTheDocument()
  })

  it('sends pending users without an invite to independent onboarding', async () => {
    refreshSession.mockResolvedValue({
      user: { status: 'pending_onboarding' },
      workspaces: [],
    })

    renderComplete()

    expect(await screen.findByRole('heading', { name: 'Onboarding' })).toBeInTheDocument()
  })
})
