import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExplorePage } from './ExplorePage'

const apiFetch = vi.fn()

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

const session = {
  active_workspace: { id: 'ws-1', kind: 'personal' as const, name: 'Personal' },
}

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ session }),
}))

vi.mock('@/lib/mixpanel', () => ({
  trackExploreViewed: vi.fn(),
}))

const personalProject = {
  id: 'proj-public',
  slug: 'public-studio',
  title: 'Public studio',
  skills: ['Facilitation'],
  roles_needed: ['Designer'],
  joining_mode: 'instant',
  recruitment_state: 'open',
  status: 'active',
  phase: 'normal',
  visibility: 'public',
  mode: 'team',
}

const orgProject = {
  ...personalProject,
  id: 'proj-org',
  title: 'Spring private',
  visibility: 'private',
}

const adult = {
  user_id: 'adult-1',
  slug: 'searchable-adult',
  display_name: 'Searchable Adult',
  image_url: null,
  location: 'CA, United States',
  timezone: 'America/Los_Angeles',
  role: 'Data analyst',
  experience_level: 'intermediate',
  skills: ['Facilitation'],
  organizations: [],
}

function mockDirectory(options?: { unavailable?: boolean; projects?: typeof personalProject[] }) {
  apiFetch.mockImplementation((path: string, init?: RequestInit) => {
    const url = String(path)
    if (url.includes('/explore/projects')) {
      return Promise.resolve({
        projects: options?.projects ?? [personalProject],
        page: 1,
        per_page: 20,
        total_count: 1,
      })
    }
    if (url.includes('/explore/people')) {
      return Promise.resolve({ people: [adult], page: 1, per_page: 20, total_count: 1 })
    }
    if (url.includes('/explore/invite_options')) {
      return Promise.resolve({
        eligible_projects: [{ id: 'proj-public', title: 'Public studio', roles_needed: ['Designer'] }],
        unavailable: Boolean(options?.unavailable),
      })
    }
    if (url.includes('/invitations') && init?.method === 'POST') {
      return Promise.resolve({ invitation: { id: 'inv-1', status: 'pending' } })
    }
    return Promise.resolve({})
  })
}

describe('ExplorePage', () => {
  beforeEach(() => {
    session.active_workspace = { id: 'ws-1', kind: 'personal', name: 'Personal' }
    mockDirectory()
  })

  afterEach(() => {
    cleanup()
    apiFetch.mockReset()
  })

  it('opens Projects by default and does not show a coming-soon stub', async () => {
    render(
      <MemoryRouter initialEntries={['/explore']}>
        <ExplorePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('tab', { name: 'Projects', selected: true })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Public studio/i })).toHaveAttribute('href', '/projects/proj-public')
    expect(screen.queryByText(/Coming soon/i)).not.toBeInTheDocument()
  })

  it('lists organization projects when that workspace payload is returned', async () => {
    session.active_workspace = { id: 'ws-org', kind: 'organization', name: 'STEM' }
    mockDirectory({ projects: [orgProject] })

    render(
      <MemoryRouter>
        <ExplorePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: /Spring private/i })).toBeInTheDocument()
    expect(screen.queryByText('Public studio')).not.toBeInTheDocument()
  })

  it('does not render people who are absent from the directory', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ExplorePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('tab', { name: 'People' }))
    expect(await screen.findByRole('link', { name: /Searchable Adult/i })).toHaveAttribute(
      'href',
      '/profile/searchable-adult',
    )
    expect(screen.queryByText('Hidden Minor')).not.toBeInTheDocument()
  })

  it('confirms an invitation when one eligible project exists', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/explore?tab=people']}>
        <Routes>
          <Route path="/explore" element={<ExplorePage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Invite' }))
    await user.click(await screen.findByRole('button', { name: 'Confirm invitation' }))

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/projects/proj-public/invitations',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    expect(await screen.findByText('Invitation sent.')).toBeInTheDocument()
  })

  it('shows Unavailable instead of Invite when the person already participates', async () => {
    mockDirectory({ unavailable: true })
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/explore?tab=people']}>
        <ExplorePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('tab', { name: 'People' }))
    expect(await screen.findByText('Unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invite' })).not.toBeInTheDocument()
  })
})
