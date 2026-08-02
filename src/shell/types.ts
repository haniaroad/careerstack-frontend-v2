import type { ReactNode } from 'react'

export type WorkspaceType = 'personal' | 'organization'

export type ShellWorkspace = {
  id: string
  label: string
  type: WorkspaceType
}

export type ShellContextValue = {
  userDisplayName: string
  workspaces: ShellWorkspace[]
  activeWorkspaceId: string
  notificationCount: number
  canAccessOrgAdmin: boolean
  isImpersonating: boolean
  setActiveWorkspaceId: (id: string) => void
  exitImpersonation: () => void
}

export type ShellProviderProps = {
  children: ReactNode
  /** Override defaults for tests / preview. */
  initial?: Partial<{
    userDisplayName: string
    workspaces: ShellWorkspace[]
    activeWorkspaceId: string
    notificationCount: number
    canAccessOrgAdmin: boolean
    isImpersonating: boolean
  }>
}
