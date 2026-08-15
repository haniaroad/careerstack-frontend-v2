import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext'
import type { SessionPayload } from '@/auth/types'
import { apiFetch } from '@/lib/api'
import { setProgramFilter as persistProgramFilter } from '@/lib/organizationAdmin'
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
  const { session, setSession, signOut, refreshSession } = useAuth()

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

  const onSetProgramFilter = useCallback(
    async (mode: 'all' | 'program', programId?: string | null) => {
      const next = await persistProgramFilter({
        mode,
        program_id: mode === 'program' ? programId : null,
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
      programFilter: session.program_filter
        ? {
            mode: session.program_filter.mode,
            programId: session.program_filter.program_id,
            availablePrograms: session.program_filter.available_programs,
          }
        : null,
      workspaceStatus: session.active_workspace?.workspace_status ?? null,
      onSwitchWorkspace: switchWorkspace,
      onSetProgramFilter,
      onSignOut: signOut,
    }
  }, [session, signOut, switchWorkspace, onSetProgramFilter])

  const timezoneSynced = useRef(false)
  useEffect(() => {
    if (!session?.user || timezoneSynced.current) return
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!detected || session.user.timezone === detected) {
      timezoneSynced.current = true
      return
    }
    timezoneSynced.current = true
    void apiFetch('/api/v1/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify({ timezone: detected }),
    })
      .then(() => refreshSession())
      .catch(() => {
        // fail soft — timezone can be retried next session
      })
  }, [session, refreshSession])

  return <ShellProvider initial={initial}>{children}</ShellProvider>
}
