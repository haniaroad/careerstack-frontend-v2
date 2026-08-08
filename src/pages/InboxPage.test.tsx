import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { InboxItem } from '@/lib/inbox'
import { InboxPage } from './InboxPage'
import { ShellProvider } from '@/shell/ShellContext'

const apiFetch = vi.fn()
const trackInboxOpened = vi.fn()
const trackCreatorReviewDecided = vi.fn()
const trackApplicationDecidedFromInbox = vi.fn()

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
  trackInboxOpened: (...args: unknown[]) => trackInboxOpened(...args),
  trackCreatorReviewDecided: (...args: unknown[]) => trackCreatorReviewDecided(...args),
  trackApplicationDecidedFromInbox: (...args: unknown[]) => trackApplicationDecidedFromInbox(...args),
}))

function item(partial: Partial<InboxItem> & Pick<InboxItem, 'id' | 'category' | 'related_id'>): InboxItem {
  return {
    project_id: 'proj-1',
    project_title: 'Team project',
    title: 'Item',
    description: 'Description',
    status_label: 'Pending',
    urgency: 'medium',
    is_overdue: false,
    cta_label: 'Open',
    created_at: '2026-08-01T12:00:00Z',
    payload: {},
    ...partial,
  }
}

function renderInbox(path = '/inbox') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider
        initial={{
          workspaces: [{ id: 'ws-1', label: 'Personal', type: 'personal' }],
          activeWorkspaceId: 'ws-1',
        }}
      >
        <InboxPage />
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('InboxPage', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    trackInboxOpened.mockReset()
    trackCreatorReviewDecided.mockReset()
    trackApplicationDecidedFromInbox.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows solo AI empty copy on Task reviews', async () => {
    apiFetch.mockResolvedValue({ items: [] })
    renderInbox()

    expect(await screen.findByRole('heading', { name: /No task reviews waiting/i })).toBeInTheDocument()
    expect(
      screen.getByText(/Solo AI review does not create a creator review queue/i),
    ).toBeInTheDocument()
    expect(trackInboxOpened).toHaveBeenCalled()
  })

  it('sorts overdue applications first and approves from Inbox', async () => {
    const user = userEvent.setup()
    const overdue = item({
      id: 'application:app-old',
      category: 'application',
      related_id: 'app-old',
      title: 'Older application',
      is_overdue: true,
      urgency: 'high',
      payload: { application_id: 'app-old', project_id: 'proj-1' },
    })
    const fresh = item({
      id: 'application:app-new',
      category: 'application',
      related_id: 'app-new',
      title: 'Newer application',
      is_overdue: false,
      payload: { application_id: 'app-new', project_id: 'proj-1' },
    })

    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith('/api/v1/inbox/items') && !init?.method) {
        if (path.includes('category=application')) return { items: [fresh, overdue] }
        return { items: [fresh, overdue] }
      }
      if (path.includes('/applications/app-old/approve')) return {}
      return { items: [] }
    })

    renderInbox('/inbox?tab=applications')

    expect(await screen.findByText('Older application')).toBeInTheDocument()
    const titles = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)
    expect(titles[0]).toBe('Older application')

    const approveButtons = screen.getAllByRole('button', { name: /^Approve$/i })
    await user.click(approveButtons[0])

    await waitFor(() => {
      expect(trackApplicationDecidedFromInbox).toHaveBeenCalledWith({ decision: 'approved' })
    })
  })

  it('lets creators approve a task review from Inbox', async () => {
    const user = userEvent.setup()
    const review = item({
      id: 'task_review:task-1',
      category: 'task_review',
      related_id: 'task-1',
      title: 'Ship mock',
      cta_label: 'Review submission',
      payload: { task_id: 'task-1' },
    })

    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith('/api/v1/inbox/items')) return { items: [review] }
      if (path === '/api/v1/tasks/task-1/creator_review' && init?.method === 'POST') {
        return { task: { id: 'task-1', status: 'approved' } }
      }
      return { items: [] }
    })

    renderInbox()

    expect(await screen.findByText('Ship mock')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Review submission/i }))
    expect(await screen.findByRole('heading', { name: /Creator review/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Approve$/i }))

    await waitFor(() => {
      expect(trackCreatorReviewDecided).toHaveBeenCalledWith({ decision: 'approved' })
    })
  })

  it('does not list solo tasks in task review empty state messaging', async () => {
    apiFetch.mockResolvedValue({ items: [] })
    renderInbox()
    expect(await screen.findByText(/Solo AI review does not create a creator review queue/i)).toBeInTheDocument()
  })
})
