import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '@/lib/projects'
import { ProjectDetailPage } from './ProjectDetailPage'

const apiFetch = vi.fn()
const setSession = vi.fn()
const refreshSession = vi.fn()
const trackProjectConvertedToTeam = vi.fn()
const trackProjectJoined = vi.fn()
const trackProjectLeft = vi.fn()
const trackMemberRemoved = vi.fn()

let authUserId = 'creator-1'

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

vi.mock('@/lib/mixpanel', () => ({
  trackProjectConvertedToTeam: (...args: unknown[]) => trackProjectConvertedToTeam(...args),
  trackProjectJoined: (...args: unknown[]) => trackProjectJoined(...args),
  trackProjectLeft: (...args: unknown[]) => trackProjectLeft(...args),
  trackMemberRemoved: (...args: unknown[]) => trackMemberRemoved(...args),
  trackProjectEndDateUpdated: vi.fn(),
  trackProjectLifecycleObserved: vi.fn(),
}))

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    session: {
      user: { id: authUserId },
      credits: { remaining: 2, trial_remaining: 1, purchased_remaining: 1, owner_type: 'user' },
      active_workspace: { id: 'w1', kind: 'personal', name: 'Personal' },
    },
    setSession,
    refreshSession,
  }),
}))

function baseProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    slug: 'team-portfolio',
    title: 'Team portfolio',
    summary: 'Build together',
    skills: ['React'],
    mode: 'team',
    status: 'active',
    phase: 'normal',
    visibility: 'public',
    source: 'manual',
    joining_mode: 'application',
    capacity: 3,
    participant_count: 1,
    seats_remaining: 2,
    recruitment_state: 'open',
    objective: null,
    project_type: null,
    expected_duration: null,
    ends_on: '2026-09-01',
    final_expires_at: '2026-09-08T23:59:59Z',
    definition_of_done: null,
    roles_needed: ['Designer', 'Engineer'],
    proposed_tasks: [],
    submission_expectations: null,
    ai_generation_succeeded_at: null,
    workspace_id: 'w1',
    creator_id: 'creator-1',
    confirmed_at: '2026-01-01',
    completed_at: null,
    expired_at: null,
    cancelled_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    memberships: [
      {
        id: 'm1',
        user_id: 'creator-1',
        role: 'creator',
        participant_role: null,
        status: 'active',
        join_source: null,
        display_name: 'Creator',
      },
    ],
    pending_applications: [],
    pending_invitations: [],
    tasks: [
      {
        id: 't1',
        title: 'Wireframes',
        status: 'pending',
        due_on: null,
        assignee_id: null,
      },
    ],
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/projects/p1']}>
      <Routes>
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/my-work" element={<p>My Work</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    setSession.mockReset()
    refreshSession.mockReset()
    trackProjectConvertedToTeam.mockReset()
    trackProjectJoined.mockReset()
    trackProjectLeft.mockReset()
    trackMemberRemoved.mockReset()
    authUserId = 'creator-1'
  })

  it('lets applicants submit an application', async () => {
    const user = userEvent.setup()
    let project = baseProject({
      viewer_can_join: true,
      memberships: [
        {
          id: 'm1',
          user_id: 'creator-1',
          role: 'creator',
          participant_role: null,
          status: 'active',
          join_source: null,
          display_name: 'Creator',
        },
      ],
    })

    authUserId = 'applicant-1'
    project = {
      ...project,
      viewer_can_join: true,
    }

    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/projects/p1' && !init?.method) {
        return { project }
      }
      if (path === '/api/v1/projects/p1/applications' && init?.method === 'POST') {
        project = {
          ...project,
          viewer_can_join: undefined,
          pending_applications: [
            {
              id: 'app1',
              applicant_id: 'applicant-1',
              requested_role: 'Designer',
              motivation: 'I love design systems',
              availability_confirmed: true,
              skills: [],
              portfolio_url: null,
              github_url: null,
              resume_url: null,
              status: 'pending',
              created_at: '2026-01-02',
            },
          ],
        }
        return { application: project.pending_applications![0] }
      }
      throw new Error(`Unexpected ${init?.method ?? 'GET'} ${path}`)
    })

    renderPage()
    expect(await screen.findByRole('heading', { name: /Apply to join/i })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Motivation/i), 'I love design systems')
    await user.click(screen.getByLabelText(/I confirm I am available/i))
    await user.click(screen.getByRole('button', { name: /Submit application/i }))

    expect(await screen.findByText(/Application submitted/i)).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/projects/p1/applications',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('lets creators approve pending applications', async () => {
    const user = userEvent.setup()
    authUserId = 'creator-1'
    let project = baseProject({
      pending_applications: [
        {
          id: 'app1',
          applicant_id: 'applicant-1',
          requested_role: 'Designer',
          motivation: 'I love design systems',
          availability_confirmed: true,
          skills: [],
          portfolio_url: null,
          github_url: null,
          resume_url: null,
          status: 'pending',
          created_at: '2026-01-02',
        },
      ],
    })

    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/projects/p1' && !init?.method) {
        return { project }
      }
      if (path === '/api/v1/projects/p1/applications/app1/approve' && init?.method === 'POST') {
        project = {
          ...project,
          participant_count: 2,
          seats_remaining: 1,
          pending_applications: [],
          memberships: [
            ...project.memberships!,
            {
              id: 'm2',
              user_id: 'applicant-1',
              role: 'participant',
              participant_role: 'Designer',
              status: 'active',
              join_source: 'application',
              display_name: 'Applicant',
            },
          ],
        }
        return {
          project,
          session: { user: { id: 'creator-1' } },
          application: { id: 'app1', status: 'approved' },
        }
      }
      throw new Error(`Unexpected ${init?.method ?? 'GET'} ${path}`)
    })

    renderPage()
    expect(await screen.findByRole('heading', { name: /^Pending applications$/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Approve$/i }))
    expect(await screen.findByText(/Application approved/i)).toBeInTheDocument()
    expect(trackProjectJoined).toHaveBeenCalledWith({
      workspace_type: 'personal',
      join_source: 'application',
    })
  })

  it('hides invite UI in application mode and shows invite UI for invite_only', async () => {
    authUserId = 'creator-1'
    apiFetch.mockResolvedValue({
      project: baseProject({
        joining_mode: 'application',
        pending_applications: [],
      }),
    })
    renderPage()
    expect(await screen.findByRole('heading', { name: /Team portfolio/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Invite teammate/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Application mode/i)).toBeInTheDocument()
    cleanup()

    apiFetch.mockResolvedValue({
      project: baseProject({
        joining_mode: 'invite_only',
        pending_applications: [],
      }),
    })
    renderPage()
    expect(await screen.findByRole('heading', { name: /Invite teammate/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Paste user ID/i)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/00000000-0000-0000-0000-000000000000/)).not.toBeInTheDocument()
  })

  it('shows instant join capacity conflict messaging', async () => {
    const user = userEvent.setup()
    authUserId = 'joiner-1'
    const project = baseProject({
      joining_mode: 'instant',
      viewer_can_join: true,
    })
    const { ApiError } = await import('@/lib/api')

    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/projects/p1' && !init?.method) {
        return { project }
      }
      if (path === '/api/v1/projects/p1/join' && init?.method === 'POST') {
        throw new ApiError(409, 'capacity_full', 'Project is at capacity')
      }
      throw new Error(`Unexpected ${init?.method ?? 'GET'} ${path}`)
    })

    renderPage()
    expect(await screen.findByRole('heading', { name: /Join this team/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Join now/i }))
    expect(await screen.findByText(/Project is full/i)).toBeInTheDocument()
    expect(screen.getByText(/Project is at capacity/i)).toBeInTheDocument()
  })

  it('shows leave unassign messaging path', async () => {
    const user = userEvent.setup()
    authUserId = 'participant-1'
    let project = baseProject({
      memberships: [
        {
          id: 'm1',
          user_id: 'creator-1',
          role: 'creator',
          participant_role: null,
          status: 'active',
          join_source: null,
          display_name: 'Creator',
        },
        {
          id: 'm2',
          user_id: 'participant-1',
          role: 'participant',
          participant_role: 'Engineer',
          status: 'active',
          join_source: 'instant',
          display_name: 'Participant',
        },
      ],
      tasks: [
        {
          id: 't1',
          title: 'Wireframes',
          status: 'pending',
          due_on: null,
          assignee_id: 'participant-1',
        },
      ],
    })

    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/projects/p1' && !init?.method) {
        return { project }
      }
      if (path === '/api/v1/projects/p1/leave' && init?.method === 'POST') {
        project = {
          ...project,
          participant_count: 1,
          seats_remaining: 2,
          memberships: project.memberships!.filter((m) => m.user_id !== 'participant-1'),
          tasks: project.tasks!.map((t) => ({ ...t, assignee_id: null })),
        }
        return { project, membership: { id: 'm2', status: 'departed' } }
      }
      throw new Error(`Unexpected ${init?.method ?? 'GET'} ${path}`)
    })

    renderPage()
    await user.click(await screen.findByRole('button', { name: /Leave project/i }))
    expect(await screen.findByRole('heading', { name: /Leave project/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Confirm leave/i }))
    expect(
      await screen.findByText(/Your pending task assignments were cleared/i),
    ).toBeInTheDocument()
    expect(trackProjectLeft).toHaveBeenCalled()
  })

  it('shows convert to team messaging and AI review blocked note', async () => {
    const user = userEvent.setup()
    authUserId = 'creator-1'
    let project = baseProject({
      mode: 'solo',
      joining_mode: null,
      capacity: null,
      participant_count: null,
      seats_remaining: null,
      recruitment_state: null,
      roles_needed: [],
    })

    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/projects/p1' && !init?.method) {
        return { project }
      }
      if (path === '/api/v1/projects/p1/convert_to_team' && init?.method === 'POST') {
        project = {
          ...project,
          mode: 'team',
          joining_mode: 'instant',
          capacity: 3,
          participant_count: 1,
          seats_remaining: 2,
          recruitment_state: 'open',
          roles_needed: ['Designer'],
        }
        return { project }
      }
      throw new Error(`Unexpected ${init?.method ?? 'GET'} ${path}`)
    })

    renderPage()
    expect(await screen.findByRole('heading', { name: /Convert to team/i })).toBeInTheDocument()
    expect(screen.getByText(/In-flight AI reviews will be cancelled/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Roles needed/i), 'Designer')
    await user.click(screen.getByRole('button', { name: /Convert to team/i }))

    expect(
      await screen.findByText(/Any in-flight AI reviews were cancelled/i),
    ).toBeInTheDocument()
    expect(trackProjectConvertedToTeam).toHaveBeenCalledWith({
      workspace_type: 'personal',
      joining_mode: 'application',
    })
  })

  it('shows phase and hides mutations when expired', async () => {
    authUserId = 'creator-1'
    apiFetch.mockResolvedValue({
      project: baseProject({
        status: 'expired',
        phase: 'read_only',
        expired_at: '2026-08-01T12:00:00Z',
        ends_on: '2026-07-20',
        final_expires_at: '2026-07-27T23:59:59Z',
        mode: 'solo',
        joining_mode: null,
        capacity: null,
        participant_count: null,
        seats_remaining: null,
        recruitment_state: null,
        roles_needed: [],
      }),
    })

    renderPage()
    expect(await screen.findByText(/Project expired — read only/i)).toBeInTheDocument()
    expect(screen.getByText(/Ends on 2026-07-20/i)).toBeInTheDocument()
    expect(screen.getByText(/^Read only$/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cancel project/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Convert to team/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Project end date/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Wireframes/i })).toBeInTheDocument()
  })

  it('shows grace period phase on active projects', async () => {
    apiFetch.mockResolvedValue({
      project: baseProject({
        phase: 'grace_period',
        ends_on: '2026-08-01',
      }),
    })
    renderPage()
    expect(await screen.findByText(/Grace period/i)).toBeInTheDocument()
    expect(screen.getByText(/Ends on 2026-08-01/i)).toBeInTheDocument()
  })
})
