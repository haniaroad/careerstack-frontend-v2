import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StaffShell } from '@/admin/StaffShell'
import { MorePage } from '@/pages/MorePage'
import { AppShell, HELP_AND_FEEDBACK_HREF } from './AppShell'
import { ShellProvider } from './ShellContext'

const analyticsEvents = vi.hoisted(() => [] as string[])

const apiFetch = vi.fn()

vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

vi.mock('@/lib/mixpanel', () => ({
  trackNotificationOpened: vi.fn((props: { notification_id?: string }) => {
    analyticsEvents.push(`notification_opened:${props?.notification_id ?? ''}`)
  }),
  trackHelpAndFeedbackOpened: vi.fn(() => {
    analyticsEvents.push('help_feedback_opened')
  }),
}))

function renderShell(
  initialPath = '/home',
  shellInitial?: Parameters<typeof ShellProvider>[0]['initial'],
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ShellProvider initial={shellInitial}>
        <Routes>
          <Route
            path="*"
            element={
              <AppShell>
                <h1>Home</h1>
              </AppShell>
            }
          />
          <Route
            path="/my-work"
            element={
              <AppShell>
                <h1>My Work</h1>
              </AppShell>
            }
          />
        </Routes>
      </ShellProvider>
    </MemoryRouter>,
  )
}

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), 'src', relativePath), 'utf8')
}

describe('AppShell', () => {
  beforeEach(() => {
    analyticsEvents.length = 0
    apiFetch.mockReset()
    apiFetch.mockImplementation(async (path: unknown) => {
      const url = String(path)
      if (url.includes('unread_count')) return { unread_count: 1 }
      if (url.includes('/api/v1/notifications')) {
        return {
          notifications: [
            {
              id: 'n1',
              event_key: 'task_assigned',
              title: 'Task assigned',
              body: 'Logo task is ready',
              path: '/my-work',
              read: false,
              created_at: '2026-08-14T12:00:00Z',
              project_id: null,
            },
          ],
        }
      }
      return {}
    })
  })
  it('renders desktop sidebar and mobile bottom nav landmarks', () => {
    renderShell()
    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument()
    expect(screen.getByTestId('app-header')).toBeInTheDocument()
    expect(screen.getByLabelText(/Workspace:/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Notifications/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Profile menu')).toBeInTheDocument()
  })

  it('hides organization administration for participants', () => {
    renderShell('/home', {
      canAccessOrgAdmin: false,
      activeWorkspaceId: 'org-demo',
    })
    expect(screen.queryByTestId('org-admin-nav')).not.toBeInTheDocument()
  })

  it('shows organization administration when allowed in an org workspace', () => {
    renderShell('/home', {
      canAccessOrgAdmin: true,
      activeWorkspaceId: 'org-demo',
    })
    expect(screen.getByTestId('org-admin-nav')).toBeInTheDocument()
  })

  it('omits the program filter in organization workspaces', () => {
    renderShell('/home', {
      canAccessOrgAdmin: true,
      activeWorkspaceId: 'org-demo',
      programFilter: {
        mode: 'all',
        programId: null,
        availablePrograms: [{ id: 'prog-1', name: 'Fall Cohort', status: 'active' }],
      },
    })

    expect(screen.queryByTestId('program-filter')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search projects')).toBeInTheDocument()
  })

  it('hides organization credits from participants and shows them to staff', () => {
    const { unmount } = renderShell('/home', {
      canAccessOrgAdmin: false,
      activeWorkspaceId: 'org-demo',
      creditRemaining: 3,
    })
    expect(screen.queryByTestId('credit-cue')).not.toBeInTheDocument()
    unmount()

    renderShell('/home', {
      canAccessOrgAdmin: true,
      activeWorkspaceId: 'org-demo',
      creditRemaining: 3,
    })
    expect(screen.getByTestId('credit-cue')).toHaveTextContent('3 credits')
  })

  it('hides the program filter in a personal workspace', () => {
    renderShell('/home', {
      activeWorkspaceId: 'personal',
      programFilter: null,
    })
    expect(screen.queryByTestId('program-filter')).not.toBeInTheDocument()
  })

  it('switches the active workspace from the switcher', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByLabelText(/Workspace:/i))
    await user.click(screen.getByRole('menuitem', { name: 'Demo Org (preview)' }))

    expect(screen.getByLabelText(/Workspace: Demo Org/i)).toBeInTheDocument()
  })

  it('hides impersonation banner when not impersonating', () => {
    render(
      <MemoryRouter>
        <ShellProvider initial={{ isImpersonating: false }}>
          <AppShell>
            <p>Content</p>
          </AppShell>
        </ShellProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('impersonation-banner')).not.toBeInTheDocument()
  })

  it('shows impersonation banner with Exit when impersonating', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ShellProvider initial={{ isImpersonating: true, userDisplayName: 'Sam Preview' }}>
          <AppShell>
            <p>Content</p>
          </AppShell>
        </ShellProvider>
      </MemoryRouter>,
    )

    const banner = screen.getByTestId('impersonation-banner')
    expect(within(banner).getByText(/Viewing as/i)).toBeInTheDocument()
    expect(within(banner).getByText('Sam Preview')).toBeInTheDocument()

    await user.click(within(banner).getByRole('button', { name: 'Exit' }))
    expect(screen.queryByTestId('impersonation-banner')).not.toBeInTheDocument()
  })

  it('navigates destinations and marks My Work active', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/home']}>
        <ShellProvider>
          <Routes>
            <Route
              path="/home"
              element={
                <AppShell>
                  <h1>Home</h1>
                </AppShell>
              }
            />
            <Route
              path="/my-work"
              element={
                <AppShell>
                  <h1>My Work</h1>
                </AppShell>
              }
            />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )

    const sidebar = screen.getByTestId('desktop-sidebar')
    await user.click(within(sidebar).getByRole('link', { name: 'My Work' }))
    expect(screen.getByRole('heading', { name: 'My Work' })).toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: 'My Work' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('includes Create organization in the profile menu', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ShellProvider>
          <Routes>
            <Route
              path="/"
              element={
                <AppShell>
                  <h1>Home</h1>
                </AppShell>
              }
            />
            <Route path="/organizations/new" element={<h1>Create organization</h1>} />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByLabelText('Profile menu'))
    await user.click(screen.getByRole('menuitem', { name: 'Create organization' }))
    expect(screen.getByRole('heading', { name: 'Create organization' })).toBeInTheDocument()
  })

  it('offers Help and Feedback from the profile menu without leaving the shell', async () => {
    const user = userEvent.setup()
    renderShell()

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    const sidebar = screen.getByTestId('desktop-sidebar')
    expect(within(sidebar).getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(within(sidebar).queryByRole('link', { name: /Help and Feedback/i })).not.toBeInTheDocument()
    expect(
      within(screen.getByTestId('mobile-bottom-nav')).queryByRole('link', {
        name: /Help and Feedback/i,
      }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Profile menu'))
    const link = screen.getByRole('menuitem', { name: 'Help and Feedback, opens in a new tab' })
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', HELP_AND_FEEDBACK_HREF)
    expect(new URL(link.getAttribute('href') ?? '')).toMatchObject({
      search: '',
      hash: '',
    })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveClass('min-h-11', 'focus-visible:ring-2', 'focus-visible:ring-ring')
    expect(screen.queryByLabelText(/^subject$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^feedback$/i)).not.toBeInTheDocument()

    await user.click(link)
    expect(source('shell/AppShell.tsx')).not.toMatch(/mixpanel|help_feedback/)
    expect(analyticsEvents).not.toContain('help_feedback_opened')
    expect(analyticsEvents.join(' ')).not.toMatch(/help/i)
    expect(screen.getByRole('heading', { name: 'Home', hidden: true })).toBeInTheDocument()
  })

  it('keeps the same Help and Feedback address in each workspace and while impersonating', async () => {
    const user = userEvent.setup()
    renderShell('/home', { isImpersonating: true, activeWorkspaceId: 'personal' })

    await user.click(screen.getByLabelText('Profile menu'))
    expect(
      screen.getByRole('menuitem', { name: 'Help and Feedback, opens in a new tab' }),
    ).toHaveAttribute('href', HELP_AND_FEEDBACK_HREF)

    await user.keyboard('{Escape}')
    await user.click(screen.getByLabelText(/Workspace:/i))
    await user.click(screen.getByRole('menuitem', { name: 'Demo Org (preview)' }))
    await user.click(screen.getByLabelText('Profile menu'))
    expect(
      screen.getByRole('menuitem', { name: 'Help and Feedback, opens in a new tab' }),
    ).toHaveAttribute('href', HELP_AND_FEEDBACK_HREF)
  })

  it('shows the profile photo in the menu and falls back to initials', async () => {
    const user = userEvent.setup()
    const { unmount } = renderShell('/home', {
      profilePhotoUrl: 'https://cdn.example/thumb.webp',
    })
    const photo = screen.getByTestId('profile-photo').querySelector('img')
    expect(photo).toHaveAttribute('src', 'https://cdn.example/thumb.webp')
    fireEvent.error(photo!)
    expect(await screen.findByText('PU')).toBeInTheDocument()
    unmount()

    renderShell()
    expect(screen.getByText('PU')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Profile menu'))
    expect(screen.getByRole('menuitem', { name: 'Help and Feedback, opens in a new tab' })).toBeInTheDocument()
  })

  it('keeps Help and Feedback out of More, sign-in, and the platform-admin shell', () => {
    render(
      <MemoryRouter>
        <ShellProvider>
          <MorePage />
        </ShellProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('menuitem', { name: /Help and Feedback/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Help and Feedback/i })).not.toBeInTheDocument()

    render(
      <MemoryRouter>
        <StaffShell>
          <p>Staff</p>
        </StaffShell>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('menuitem', { name: /Help and Feedback/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Help and Feedback/i })).not.toBeInTheDocument()

    for (const file of [
      'shell/destinations.ts',
      'pages/MorePage.tsx',
      'pages/SignInPage.tsx',
      'admin/StaffShell.tsx',
    ]) {
      expect(source(file)).not.toContain('Help and Feedback')
      expect(source(file)).not.toContain('submit-feedback-1')
    }
  })

  it('omits Create organization after the user has already created one', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ShellProvider initial={{ canCreateOrganization: false }}>
          <AppShell>
            <h1>Home</h1>
          </AppShell>
        </ShellProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByLabelText('Profile menu'))
    expect(screen.queryByRole('menuitem', { name: 'Create organization' })).not.toBeInTheDocument()
  })

  it('opens the notification center from the bell instead of Inbox', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/home']}>
        <ShellProvider>
          <Routes>
            <Route
              path="/home"
              element={
                <AppShell>
                  <h1>Home</h1>
                </AppShell>
              }
            />
            <Route
              path="/inbox"
              element={
                <AppShell>
                  <h1>Inbox</h1>
                </AppShell>
              }
            />
            <Route
              path="/my-work"
              element={
                <AppShell>
                  <h1>My Work</h1>
                </AppShell>
              }
            />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )

    const bell = await screen.findByLabelText(/Notifications, 1 unread/i)
    await user.click(bell)
    expect(screen.queryByRole('heading', { name: 'Inbox' })).not.toBeInTheDocument()
    expect(await screen.findByTestId('notification-center')).toBeInTheDocument()
    expect(screen.getByText('Task assigned')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Task assigned/i }))
    expect(await screen.findByRole('heading', { name: 'My Work' })).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/notifications/n1/read',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('closes the notification center with Escape', async () => {
    const user = userEvent.setup()
    renderShell()
    await user.click(await screen.findByTestId('notification-bell'))
    expect(await screen.findByTestId('notification-center')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('notification-center')).not.toBeInTheDocument()
  })
})
