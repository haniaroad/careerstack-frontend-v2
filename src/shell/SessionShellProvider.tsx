import { useCallback, useMemo, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext'
import type { SessionPayload } from '@/auth/types'
import { apiFetch } from '@/lib/api'
import { ShellProvider } from './ShellContext'
import type { ShellWorkspace } from './types'

function toShellWorkspaces(session: SessionPayload): ShellWorkspace[] {
  return session.workspaces.map((workspace) => ({
    id: workspace.id,
    label: workspace.name,
    type: workspace.kind,
  }))
}

export function SessionShellProvider({ children }: { children: ReactNode }) {
  const { session, setSession, signOut } = useAuth()

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      const next = await apiFetch<SessionPayload>('/api/v1/workspaces/switch', {
        method: 'POST',
        body: JSON.stringify({ workspace_id: workspaceId }),
      })
      setSession(next)
    },
    [setSession],
  )

  const initial = useMemo(() => {
    if (!session) return undefined
    return {
      userDisplayName: session.profile?.display_name ?? session.user.email,
      workspaces: toShellWorkspaces(session),
      activeWorkspaceId:
        session.active_workspace_id ?? session.workspaces[0]?.id ?? 'personal',
      notificationCount: 0,
      canAccessOrgAdmin: session.can_access_org_admin,
      isImpersonating: false,
      creditRemaining: session.credits?.remaining ?? null,
      onSwitchWorkspace: switchWorkspace,
      onSignOut: signOut,
    }
  }, [session, signOut, switchWorkspace])

  return <ShellProvider initial={initial}>{children}</ShellProvider>
}
