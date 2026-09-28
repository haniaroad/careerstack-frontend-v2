import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

export const STAFF_AREAS = [
  { id: 'users', label: 'Users and orgs', path: '/admin/users' },
  { id: 'credits', label: 'Credits and Stripe', path: '/admin/credits' },
  { id: 'moderation', label: 'Moderation', path: '/admin/moderation' },
  { id: 'queues', label: 'Escalations and jobs', path: '/admin/queues' },
  { id: 'impersonation', label: 'Impersonation', path: '/admin/impersonation' },
  { id: 'audit', label: 'Audit', path: '/admin/audit' },
] as const

export function StaffShell({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-canvas text-foreground md:flex-row">
      <nav
        aria-label="Staff"
        data-testid="staff-nav"
        className="flex flex-row gap-1 overflow-x-auto border-b border-border bg-sidebar p-3 md:w-60 md:flex-col md:border-b-0 md:border-r"
      >
        <p className="hidden px-3 py-2 text-sm font-semibold md:block">Platform admin</p>
        {STAFF_AREAS.map((area) => (
          <NavLink
            key={area.id}
            to={area.path}
            className={({ isActive }) =>
              cn(
                'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                isActive ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-muted',
              )
            }
          >
            {area.label}
          </NavLink>
        ))}
      </nav>
      <main className="min-w-0 flex-1 p-4">{children ?? <Outlet />}</main>
    </div>
  )
}
