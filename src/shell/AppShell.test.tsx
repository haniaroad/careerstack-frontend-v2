import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'
import { ShellProvider } from './ShellContext'

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

describe('AppShell', () => {
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
})
