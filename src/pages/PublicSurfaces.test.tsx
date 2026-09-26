import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicSurfaceProjectPage } from '@/pages/PublicSurfaceProjectPage'
import { PublicSurfaceProfilePage } from '@/pages/PublicSurfaceProfilePage'

const fetchPublicProject = vi.fn()
const fetchPublicProfile = vi.fn()

vi.mock('@/lib/publicSurfaces', async () => {
  const actual = await vi.importActual<typeof import('@/lib/publicSurfaces')>(
    '@/lib/publicSurfaces',
  )
  return {
    ...actual,
    fetchPublicProject: (...args: unknown[]) => fetchPublicProject(...args),
    fetchPublicProfile: (...args: unknown[]) => fetchPublicProfile(...args),
  }
})

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    status: 'anonymous',
    session: null,
    refreshSession: vi.fn(),
    setSession: vi.fn(),
    signOut: vi.fn(),
    stubSignIn: vi.fn(),
    firebaseUser: null,
  }),
}))

describe('public surfaces', () => {
  beforeEach(() => {
    fetchPublicProject.mockReset()
    fetchPublicProfile.mockReset()
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('renders a public project without shell chrome', async () => {
    fetchPublicProject.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      slug: 'public-portfolio',
      title: 'Public Portfolio',
      summary: 'Build in public',
      definition_of_done: 'Ship it',
      skills: ['React'],
      roles_needed: [],
      project_type: null,
      mode: 'solo',
      status: 'active',
      phase: 'normal',
      joining_mode: null,
      capacity: null,
      seats_remaining: null,
      recruitment_state: null,
      ends_on: null,
      tasks: [{ title: 'Wireframe', acceptance_criteria: 'Three screens' }],
      creator: { display_name: 'Alex Morgan', profile_slug: 'alex-morgan' },
      canonical_path: '/projects/public-portfolio',
      indexable: true,
    })

    render(
      <MemoryRouter initialEntries={['/projects/public-portfolio']}>
        <Routes>
          <Route path="/projects/:id" element={<PublicSurfaceProjectPage />} />
          <Route path="/sign-in" element={<h1>Sign in</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Public Portfolio' })).toBeInTheDocument()
    expect(screen.getByText('Wireframe')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Create account' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Dismiss tip' })).not.toBeInTheDocument()
  })

  it('shows not found for missing public profiles', async () => {
    const { ApiError } = await import('@/lib/api')
    fetchPublicProfile.mockRejectedValue(new ApiError(404, 'not_found', 'Profile not found'))

    render(
      <MemoryRouter initialEntries={['/profile/missing-user']}>
        <Routes>
          <Route path="/profile/:slug" element={<PublicSurfaceProfilePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('shows the public peer reviews tab without a report control', async () => {
    const user = userEvent.setup()
    fetchPublicProfile.mockResolvedValue({
      profile: {
        user_id: 'u1',
        visibility: 'public_adult',
        public_identity_visible: true,
        age_visibility: null,
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
          peer_review_total: 1,
          activity: [],
        },
        evidence: { skills: [], artifacts: [] },
        projects: [],
        peer_reviews: [
          {
            id: 'rev-1',
            reviewer_display_name: 'Verified project teammate',
            reviewer_is_anonymized: true,
            project_title: 'Team ship',
            body: 'Public teammate note',
            created_at: '2026-09-01T00:00:00Z',
          },
        ],
        links: [],
      },
      canonical_path: '/profile/alex-morgan',
      indexable: true,
    })

    render(
      <MemoryRouter initialEntries={['/profile/alex-morgan']}>
        <Routes>
          <Route path="/profile/:slug" element={<PublicSurfaceProfilePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Alex Morgan' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Peer reviews' }))
    expect(await screen.findByText('Public teammate note')).toBeInTheDocument()
    expect(screen.getAllByText('Verified project teammate').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Report review' })).not.toBeInTheDocument()
  })

  it('stores returnTo when create account is clicked', async () => {
    const user = userEvent.setup()
    fetchPublicProject.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      slug: 'public-portfolio',
      title: 'Public Portfolio',
      summary: null,
      definition_of_done: null,
      skills: [],
      roles_needed: [],
      project_type: null,
      mode: 'solo',
      status: 'active',
      phase: 'normal',
      joining_mode: null,
      capacity: null,
      seats_remaining: null,
      recruitment_state: null,
      ends_on: null,
      tasks: [],
      creator: { display_name: 'Alex', profile_slug: null },
      canonical_path: '/projects/public-portfolio',
      indexable: true,
    })

    render(
      <MemoryRouter initialEntries={['/projects/public-portfolio']}>
        <Routes>
          <Route path="/projects/:id" element={<PublicSurfaceProjectPage />} />
          <Route path="/sign-in" element={<h1>Sign in</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Public Portfolio' })
    await user.click(screen.getAllByRole('button', { name: 'Create account' })[0])
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(window.sessionStorage.getItem('careerstack.returnTo')).toBe('/projects/public-portfolio')
    expect(window.localStorage.getItem('careerstack.returnTo')).toBe('/projects/public-portfolio')
  })
})
