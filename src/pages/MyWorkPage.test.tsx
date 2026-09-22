import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '@/lib/projects'
import type { PeerReviewSlot } from '@/lib/peerReviews'
import { MyWorkPage } from './MyWorkPage'
import { ShellProvider } from '@/shell/ShellContext'

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

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    session: {
      user: { id: 'u1' },
      active_workspace_id: 'ws-1',
      active_workspace: { id: 'ws-1', kind: 'personal', name: 'Personal' },
    },
  }),
}))

vi.mock('@/lib/mixpanel', () => ({
  trackPeerReviewSubmitted: vi.fn(),
  trackPeerReviewReported: vi.fn(),
}))

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    slug: 'grace-work',
    title: 'Grace work',
    summary: 'Summary',
    skills: [],
    mode: 'solo',
    status: 'active',
    phase: 'grace_period',
    visibility: 'public',
    source: 'manual',
    joining_mode: null,
    capacity: null,
    participant_count: null,
    seats_remaining: null,
    recruitment_state: null,
    objective: null,
    project_type: null,
    expected_duration: null,
    ends_on: '2026-08-01',
    final_expires_at: '2026-08-08T23:59:59Z',
    definition_of_done: null,
    roles_needed: [],
    proposed_tasks: [],
    submission_expectations: null,
    ai_generation_succeeded_at: null,
    workspace_id: 'ws-1',
    creator_id: 'u1',
    confirmed_at: '2026-07-01',
    completed_at: null,
    expired_at: null,
    cancelled_at: null,
    created_at: '2026-07-01',
    updated_at: '2026-07-01',
    ...overrides,
  }
}

function slot(overrides: Partial<PeerReviewSlot> = {}): PeerReviewSlot {
  return {
    id: 'pr1',
    project_id: 'p-team',
    project_title: 'Org team ship',
    from_user_id: 'u1',
    from_user_name: 'Alex',
    to_user_id: 'u2',
    to_user_name: 'Jordan',
    status: 'available',
    is_anonymized: false,
    summary: '',
    rating: null,
    completed_at: null,
    ...overrides,
  }
}

function renderMyWork(path = '/my-work', workspaceId = 'ws-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider
        initial={{
          workspaces: [
            { id: 'ws-1', label: 'Personal', type: 'personal' },
            { id: 'ws-org', label: 'Org', type: 'organization' },
          ],
          activeWorkspaceId: workspaceId,
        }}
      >
        <Routes>
          <Route path="/my-work" element={<MyWorkPage />} />
        </Routes>
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('MyWorkPage', () => {
  beforeEach(() => {
    apiFetch.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows status, phase, and ends_on on project rows', async () => {
    apiFetch.mockResolvedValue({ projects: [project()] })
    renderMyWork()

    expect(await screen.findByText(/Grace work/i)).toBeInTheDocument()
    expect(screen.getByText(/^Active$/i)).toBeInTheDocument()
    expect(screen.getByText(/Grace period/i)).toBeInTheDocument()
    expect(screen.getByText(/Ends 2026-08-01/i)).toBeInTheDocument()
  })

  it('replaces the peer reviews stub with empty or authored slots', async () => {
    const user = userEvent.setup()
    apiFetch.mockImplementation(async (path: unknown) => {
      if (String(path).includes('peer_reviews')) return { peer_reviews: [] }
      return { projects: [] }
    })
    renderMyWork()
    await user.click(screen.getByRole('button', { name: 'Peer reviews' }))
    expect(await screen.findByText(/No peer reviews yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/Coming soon/i)).not.toBeInTheDocument()
  })

  it('validates comment then submits a review', async () => {
    const user = userEvent.setup()
    apiFetch.mockImplementation(async (path: unknown, init?: { method?: string; body?: string }) => {
      const url = String(path)
      if (url === '/api/v1/peer_reviews' && init?.method === 'POST') {
        throw new Error('unexpected')
      }
      if (url.includes('/submit')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { rating: number; comment: string }
        return {
          peer_review: slot({
            status: 'completed',
            rating: body.rating,
            summary: body.comment,
            completed_at: '2026-09-05T00:00:00Z',
          }),
        }
      }
      return { peer_reviews: [slot()] }
    })

    renderMyWork('/my-work?tab=peer_reviews')
    expect(await screen.findByRole('button', { name: 'Write peer review' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Write peer review' }))
    await user.click(screen.getByRole('button', { name: 'Submit review' }))
    expect(await screen.findByText(/Comment is required/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Comment'), 'Clear notes')
    await user.click(screen.getByRole('button', { name: 'Submit review' }))
    expect(await screen.findByText('Clear notes')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('shows an empty IDOR list instead of another user\'s slots', async () => {
    apiFetch.mockResolvedValue({ peer_reviews: [] })
    renderMyWork('/my-work?tab=peer_reviews')
    expect(await screen.findByText(/You will not see another person's slots/i)).toBeInTheDocument()
    expect(screen.queryByText(/Write peer review/i)).not.toBeInTheDocument()
  })

  it('reloads slots when switching from Personal to an organization workspace', async () => {
    const user = userEvent.setup()
    apiFetch.mockImplementation(async () => ({ peer_reviews: [] }))

    function Harness() {
      const [workspaceId, setWorkspaceId] = useState('ws-1')
      return (
        <MemoryRouter initialEntries={['/my-work?tab=peer_reviews']}>
          <button type="button" onClick={() => setWorkspaceId('ws-org')}>
            Switch org
          </button>
          <ShellProvider
            initial={{
              workspaces: [
                { id: 'ws-1', label: 'Personal', type: 'personal' },
                { id: 'ws-org', label: 'Org', type: 'organization' },
              ],
              activeWorkspaceId: workspaceId,
            }}
          >
            <Routes>
              <Route path="/my-work" element={<MyWorkPage />} />
            </Routes>
          </ShellProvider>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    expect(await screen.findByText(/No peer reviews yet/i)).toBeInTheDocument()

    apiFetch.mockImplementation(async () => ({ peer_reviews: [slot()] }))
    await user.click(screen.getByRole('button', { name: 'Switch org' }))
    expect(await screen.findByText('Org team ship')).toBeInTheDocument()
    await waitFor(() => expect(apiFetch.mock.calls.length).toBeGreaterThan(1))
  })
})
