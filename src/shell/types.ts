import type { ReactNode } from 'react'
import type { WorkspaceStatus } from '@/auth/types'

export type WorkspaceType = 'personal' | 'organization'

export type ShellWorkspace = {
  id: string
  label: string
  type: WorkspaceType
}

export type ShellProgramFilter = {
  mode: 'all' | 'program'
  programId: string | null
  availablePrograms: { id: string; name: string; status: string }[]
} | null

export type ShellContextValue = {
  userDisplayName: string
  workspaces: ShellWorkspace[]
  activeWorkspaceId: string
  notificationCount: number
  canAccessOrgAdmin: boolean
  isImpersonating: boolean
  /** Remaining credits for the active workspace owner, when known. */
  creditRemaining: number | null
  programFilter: ShellProgramFilter
  workspaceStatus: WorkspaceStatus | null
  setActiveWorkspaceId: (id: string) => void
  setProgramFilter: (mode: 'all' | 'program', programId?: string | null) => void | Promise<void>
  exitImpersonation: () => void
  signOut?: () => void | Promise<void>
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
    creditRemaining: number | null
    programFilter: ShellProgramFilter
    workspaceStatus: WorkspaceStatus | null
    onSwitchWorkspace?: (id: string) => void | Promise<void>
    onSetProgramFilter?: (mode: 'all' | 'program', programId?: string | null) => void | Promise<void>
    onSignOut?: () => void | Promise<void>
  }>
}
