import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { RequireOnboarded } from './RequireAuth'

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  setApiTokenProvider: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

describe('RequireOnboarded', () => {
  it('sends anonymous users to sign-in', async () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <AuthProvider>
          <Routes>
            <Route path="/sign-in" element={<h1>Sign in</h1>} />
            <Route element={<RequireOnboarded />}>
              <Route path="/home" element={<h1>Home</h1>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    })
  })
})
