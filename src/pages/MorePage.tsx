import { NavLink } from 'react-router-dom'
import { useShell } from '@/shell/ShellContext'
import { ORG_ADMIN_DESTINATION } from '@/shell/destinations'
import { cn } from '@/lib/utils'

export function MorePage() {
  const { canAccessOrgAdmin, activeWorkspaceId, workspaces } = useShell()
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)
  const showOrgAdmin =
    canAccessOrgAdmin && activeWorkspace?.type === 'organization'

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">More</h1>
      <p className="text-sm text-muted-foreground">
        Secondary destinations not shown in the mobile bottom navigation.
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        <li>
          <NavLink
            to="/profile"
            className={cn(
              'block px-4 py-3 text-sm font-medium text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            Profile
          </NavLink>
        </li>
        {showOrgAdmin ? (
          <li>
            <NavLink
              to={ORG_ADMIN_DESTINATION.path}
              data-testid="org-admin-nav-more"
              className={cn(
                'block px-4 py-3 text-sm font-medium text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              {ORG_ADMIN_DESTINATION.label}
            </NavLink>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
