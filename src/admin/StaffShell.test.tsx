import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { PRIMARY_DESTINATIONS } from '@/shell/destinations'
import { AdminRoutes } from './AdminApp'

const apiFetch = vi.fn()
const refreshSession = vi.fn().mockResolvedValue(null)

const authState = vi.hoisted(() => ({
  status: 'authenticated' as 'authenticated' | 'anonymous' | 'loading',
  session: {
    user: {
      id: 'staff-1',
      email: 'staff@example.com',
      status: 'active' as const,
      age_status: 'adult' as const,
      onboarding_path: 'independent' as const,
      personal_trial_granted: true,
      organization_trial_granted: false,
    },
    profile: {
      display_name: 'Sam Preview',
      country: 'United States',
      state_region: 'MA',
      career_goal: 'Operate',
      experience_level: 'intermediate',
    },
    workspaces: [
      { id: 'ws-1', kind: 'personal' as const, name: 'Personal', organization_id: null },
    ],
    active_workspace_id: 'ws-1',
    can_access_org_admin: false,
    org_admin_capabilities: null,
    age_visibility: { visibility_review_required: false, public_identity_confirmed: true },
    program_filter: null,
    impersonation: null as {
      active: boolean
      session_id: string
      expires_at: string
      display_name: string
    } | null,
  },
}))

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

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    status: authState.status,
    session: authState.session,
    refreshSession,
    setSession: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/lib/mixpanel', () => ({
  trackNotificationOpened: vi.fn(),
  trackProjectGraceObserved: vi.fn(),
}))

const userHit = {
  id: 'user-1',
  email: 'member@example.com',
  status: 'active',
  display_name: 'Member Example',
  deletion_recovery: false,
  workspaces: [{ id: 'ws-2', name: 'Personal', kind: 'personal', status: 'active' }],
}

describe('staff shell', () => {
  beforeEach(() => {
    authState.status = 'authenticated'
    authState.session.impersonation = null
    apiFetch.mockReset()
    refreshSession.mockReset()
    refreshSession.mockResolvedValue(null)
    apiFetch.mockImplementation(async (path: unknown) => {
      const url = String(path)
      if (url.includes('/api/v1/platform_admin/session')) return { platform_admin: true }
      if (url.includes('/api/v1/platform_admin/search')) {
        return { users: [userHit], organizations: [] }
      }
      if (url.includes('unread_count')) return { unread_count: 0 }
      if (url.includes('/api/v1/notifications')) return { notifications: [] }
      if (url.includes('/api/v1/platform_admin/impersonation/')) return { ended: true }
      return {}
    })
  })

  it('keeps staff routes off the participant surface', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Users and orgs' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
    expect(PRIMARY_DESTINATIONS.map((destination) => destination.id)).not.toContain('platform-admin')
  })

  it('shows staff areas without participant primary navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AdminRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Users and orgs' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Credits and Stripe' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Moderation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Escalations and jobs' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Impersonation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Audit' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Explore' })).not.toBeInTheDocument()
  })

  it('searches on a narrow viewport and confirms suspension with a reason', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AdminRoutes />
      </MemoryRouter>,
    )

    const search = await screen.findByRole('searchbox', { name: 'Search users and organizations' })
    expect(search).toBeVisible()
    expect(screen.getByTestId('staff-nav').className).not.toMatch(/\bhidden\b/)

    await user.type(search, 'member')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.click(await screen.findByRole('button', { name: 'Suspend member@example.com' }))

    expect(apiFetch).not.toHaveBeenCalledWith(
      '/api/v1/platform_admin/users/user-1/suspend',
      expect.anything(),
    )

    await user.type(screen.getByRole('textbox', { name: 'Reason' }), 'abuse')
    await user.click(screen.getByRole('button', { name: 'Confirm suspension' }))

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/platform_admin/users/user-1/suspend',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'abuse' }),
      }),
    )
  })

  it('swaps in the participant shell while impersonating and exits back', async () => {
    const user = userEvent.setup()
    authState.session.impersonation = {
      active: true,
      session_id: 'imp-1',
      expires_at: '2026-09-27T12:30:00Z',
      display_name: 'Sam Preview',
    }

    render(
      <MemoryRouter initialEntries={['/more']}>
        <AdminRoutes />
      </MemoryRouter>,
    )

    const banner = await screen.findByTestId('impersonation-banner')
    expect(banner).toHaveTextContent('Viewing as')
    expect(banner).toHaveTextContent('Sam Preview')
    expect(screen.getAllByRole('link', { name: 'Home' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Users and orgs' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Exit' }))
    expect(screen.queryByTestId('impersonation-banner')).not.toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/platform_admin/impersonation/imp-1/exit',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(refreshSession).toHaveBeenCalled()
  })
})
