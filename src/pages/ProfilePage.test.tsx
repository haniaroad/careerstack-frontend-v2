import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfilePage } from './ProfilePage'
import { PublicProfilePage } from './PublicProfilePage'

const apiFetch = vi.fn()
const refreshSession = vi.fn().mockResolvedValue(null)

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
    session: {
      user: { email: 'alex@example.com', id: 'u1' },
      profile: { display_name: 'Alex Morgan' },
      credits: { remaining: 2 },
      workspaces: [{ id: 'ws-1', kind: 'personal' }],
      active_workspace_id: 'ws-1',
    },
    refreshSession,
  }),
}))

vi.mock('@/lib/mixpanel', () => ({
  trackProfileViewed: vi.fn(),
  trackProfileSaved: vi.fn(),
  trackProfileVisibilityConfirmed: vi.fn(),
  trackProfileVisibilityReversed: vi.fn(),
  trackProfileLinkCopied: vi.fn(),
  trackNotificationPreferenceUpdated: vi.fn(),
}))

const ownProfile = {
  user_id: 'u1',
  visibility: 'public_adult',
  public_identity_visible: true,
  age_visibility: {
    visibility_review_required: false,
    public_identity_confirmed: true,
    confirmed_at: '2026-08-01T00:00:00Z',
  },
  details: {
    display_name: 'Alex Morgan',
    country: 'United States',
    state_region: 'MA',
    career_goal: 'Get hired',
    experience_level: 'intermediate',
    bio: null,
    image_url: null,
    github_url: null,
    linkedin_url: null,
    portfolio_url: null,
    interests: [],
    slug: 'alex-morgan',
  },
  stats: {
    projects_completed: 1,
    active_projects: 0,
    tasks_approved: 2,
    on_time_submission_rate: null,
    late_submissions: null,
    unsubmitted_tasks: null,
    ai_approved_tasks: null,
    creator_reviewed_approved_tasks: null,
    average_creator_review_hours: null,
    activity: Array.from({ length: 26 }, (_, i) => ({
      week_start: `2026-01-${String(i + 1).padStart(2, '0')}`,
      count: 0,
    })),
  },
  evidence: { skills: [], artifacts: [] },
  projects: [],
  links: [],
}

const samplePreferences = [
  {
    id: 'account',
    label: 'Security and account',
    description: 'Invitations, removals, cancellations, receipts, and required account notices.',
    tier: 'mandatory' as const,
    can_disable: false,
    email_enabled: true,
    digest_cadence: null,
  },
  {
    id: 'project_activity',
    label: 'Project activity',
    description: 'Assignments and submissions.',
    tier: 'realtime_config' as const,
    can_disable: true,
    email_enabled: true,
    digest_cadence: 'realtime',
  },
]

describe('ProfilePage', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    refreshSession.mockClear()
    apiFetch.mockImplementation(async (path: unknown) => {
      const url = String(path)
      if (url.includes('/api/v1/notification_preferences')) {
        return { preferences: samplePreferences }
      }
      return { profile: ownProfile }
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders own profile tabs and slug', async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('/profile/alex-morgan')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument()
    expect(screen.getByText('Projects completed')).toBeInTheDocument()
  })

  it('omits organization outcome capture for personal-only Settings', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )

    await screen.findByText('/profile/alex-morgan')
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    expect(screen.queryByRole('heading', { name: /Self-reported outcomes/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add outcome/i })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /Email notifications/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Security and account email notifications/i })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /Project activity email notifications/i })).toBeEnabled()
  })

  it('saves details via PATCH', async () => {
    const user = userEvent.setup()
    apiFetch.mockImplementation(async (path: unknown, init?: { method?: string }) => {
      const url = String(path)
      if (url.includes('/api/v1/notification_preferences')) {
        return { preferences: samplePreferences }
      }
      if (init?.method === 'PATCH') {
        return {
          profile: {
            ...ownProfile,
            details: { ...ownProfile.details, display_name: 'Alex Updated', bio: 'Hello' },
          },
        }
      }
      return { profile: ownProfile }
    })

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )

    await screen.findByLabelText('Display name')
    await user.clear(screen.getByLabelText('Display name'))
    await user.type(screen.getByLabelText('Display name'), 'Alex Updated')
    await user.type(screen.getByLabelText('Bio'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Save details' }))

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/profiles/me',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })
  })

  it('shows age-up confirm when review is required', async () => {
    apiFetch.mockImplementation(async (path: unknown) => {
      const url = String(path)
      if (url.includes('/api/v1/notification_preferences')) {
        return { preferences: samplePreferences }
      }
      return {
        profile: {
          ...ownProfile,
          visibility: 'restricted',
          public_identity_visible: false,
          age_visibility: {
            visibility_review_required: true,
            public_identity_confirmed: false,
            confirmed_at: null,
          },
        },
      }
    })

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: /Confirm public visibility/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument()
  })
})

describe('PublicProfilePage', () => {
  beforeEach(() => {
    apiFetch.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows not found for 404 without leaking details', async () => {
    const { ApiError } = await import('@/lib/api')
    apiFetch.mockRejectedValue(new ApiError(404, 'not_found', 'Profile not found'))

    render(
      <MemoryRouter initialEntries={['/profile/hidden-user']}>
        <Routes>
          <Route path="/profile/:slug" element={<PublicProfilePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: /Profile not found/i })).toBeInTheDocument()
    expect(screen.getByText(/This profile is unavailable/i)).toBeInTheDocument()
  })
})
