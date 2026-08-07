import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CreateProjectPage } from './CreateProjectPage'

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

describe('CreateProjectPage', () => {
  it('explains that drafts do not consume credits', () => {
    render(
      <MemoryRouter initialEntries={['/projects/new']}>
        <Routes>
          <Route path="/projects/new" element={<CreateProjectPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Saving a draft does not use a credit/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirm project/i })).toBeInTheDocument()
  })
})
