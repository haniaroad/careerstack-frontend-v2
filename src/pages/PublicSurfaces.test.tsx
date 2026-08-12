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
  })
})
