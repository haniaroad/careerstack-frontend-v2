import type { ReactNode } from 'react'
import { Bell, ChevronDown, Menu, Search } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/Avatar'
import { Button } from '@/components/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { Input } from '@/components/Input'
import { cn } from '@/lib/utils'
import { ImpersonationBanner } from './ImpersonationBanner'
import { useShell } from './ShellContext'
import {
  MOBILE_BOTTOM_DESTINATIONS,
  ORG_ADMIN_DESTINATION,
  PRIMARY_DESTINATIONS,
  destinationFromPath,
} from './destinations'

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex size-7 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground"
        aria-hidden
      >
        CS
      </div>
      {!compact ? (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          CareerStack
        </span>
      ) : (
        <span className="sr-only">CareerStack</span>
      )}
    </div>
  )
}

function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useShell()
  const active =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-w-[12rem] justify-between gap-2 sm:max-w-xs"
          aria-label={`Workspace: ${active?.label ?? 'Workspace'}`}
        >
          <span
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              active?.type === 'personal' ? 'bg-primary' : 'bg-status-warning',
            )}
            aria-hidden
          />
          <span className="truncate">{active?.label ?? 'Workspace'}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem]">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onSelect={() => setActiveWorkspaceId(workspace.id)}
            aria-current={workspace.id === active?.id ? 'true' : undefined}
            className={cn(
              workspace.id === active?.id && 'bg-accent font-medium text-accent-foreground',
            )}
          >
            {workspace.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ProfileMenu() {
  const { userDisplayName, signOut } = useShell()
  const navigate = useNavigate()
  const initials = userDisplayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Profile menu"
          className="rounded-full"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-muted text-xs font-medium">
              {initials || 'PU'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{userDisplayName}</span>
          <span className="text-xs text-muted-foreground">Signed in</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/profile')}>Profile</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/organizations/new')}>
          Create organization
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Settings (soon)</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void (async () => {
              await signOut?.()
              navigate('/sign-in')
            })()
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DesktopSidebar() {
  const { canAccessOrgAdmin, activeWorkspaceId, workspaces } = useShell()
  const location = useLocation()
  const activeId = destinationFromPath(location.pathname)
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)
  const showOrgAdmin =
    canAccessOrgAdmin && activeWorkspace?.type === 'organization'

  return (
    <aside
      data-testid="desktop-sidebar"
      className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex"
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-2 text-sidebar-foreground">
          <div
            className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-[10px] font-bold text-sidebar-primary-foreground"
            aria-hidden
          >
            CS
          </div>
          <span className="text-[15px] font-semibold tracking-tight">CareerStack</span>
        </div>
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 p-3">
        {PRIMARY_DESTINATIONS.map((destination) => (
          <NavLink
            key={destination.id}
            to={destination.path}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-shell',
              'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              activeId === destination.id &&
                'bg-sidebar-accent text-sidebar-foreground',
            )}
            aria-current={activeId === destination.id ? 'page' : undefined}
          >
            {destination.label}
          </NavLink>
        ))}
        {showOrgAdmin ? (
          <NavLink
            to={ORG_ADMIN_DESTINATION.path}
            data-testid="org-admin-nav"
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-shell',
              'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              activeId === 'org-admin' && 'bg-sidebar-accent text-sidebar-foreground',
            )}
            aria-current={activeId === 'org-admin' ? 'page' : undefined}
          >
            {ORG_ADMIN_DESTINATION.label}
          </NavLink>
        ) : null}
      </nav>
    </aside>
  )
}

function MobileBottomNav() {
  const location = useLocation()
  const activeId = destinationFromPath(location.pathname)

  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface md:hidden"
    >
      <ul className="grid grid-cols-5">
        {MOBILE_BOTTOM_DESTINATIONS.map((destination) => {
          const isActive =
            activeId === destination.id ||
            (destination.id === 'more' &&
              (activeId === 'profile' || activeId === 'org-admin'))
          return (
            <li key={destination.id}>
              <NavLink
                to={destination.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-shell',
                  'text-muted-foreground hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive && 'text-primary',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {destination.id === 'more' ? (
                  <Menu className="size-5" aria-hidden />
                ) : null}
                <span>{destination.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { notificationCount } = useShell()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ImpersonationBanner />
        <header
          data-testid="app-header"
          className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-3 backdrop-blur md:px-5"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
            <div className="md:hidden">
              <Wordmark compact />
            </div>
            <div className="hidden md:block">
              <Wordmark />
            </div>
            <WorkspaceSwitcher />
            <label className="relative hidden min-w-0 flex-1 md:block lg:max-w-md">
              <span className="sr-only">Search</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search projects, people, tasks…"
                className="h-9 bg-muted pl-9"
                aria-label="Search"
              />
            </label>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={
                notificationCount > 0
                  ? `Notifications, ${notificationCount} unread`
                  : 'Notifications'
              }
              onClick={() => navigate('/inbox')}
            >
              <Bell className="size-[18px]" strokeWidth={1.75} aria-hidden />
              {notificationCount > 0 ? (
                <span
                  className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-surface"
                  aria-hidden
                />
              ) : null}
            </Button>
            <ProfileMenu />
          </div>
        </header>
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <div className="mx-auto min-h-full w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  )
}
