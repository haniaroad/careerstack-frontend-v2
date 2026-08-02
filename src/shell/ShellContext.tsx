import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ShellContextValue, ShellProviderProps, ShellWorkspace } from './types'

const PLACEHOLDER_WORKSPACES: ShellWorkspace[] = [
  { id: 'personal', label: 'Personal (preview)', type: 'personal' },
  { id: 'org-demo', label: 'Demo Org (preview)', type: 'organization' },
]

const ShellContext = createContext<ShellContextValue | null>(null)

export function ShellProvider({ children, initial }: ShellProviderProps) {
  const workspaces = initial?.workspaces ?? PLACEHOLDER_WORKSPACES
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(
    initial?.activeWorkspaceId ?? workspaces[0]?.id ?? 'personal',
  )
  const [isImpersonating, setIsImpersonating] = useState(
    initial?.isImpersonating ?? false,
  )

  useEffect(() => {
    if (initial?.activeWorkspaceId) {
      setActiveWorkspaceIdState(initial.activeWorkspaceId)
    }
  }, [initial?.activeWorkspaceId])

  const exitImpersonation = useCallback(() => {
    setIsImpersonating(false)
  }, [])

  const setActiveWorkspaceId = useCallback(
    (id: string) => {
      setActiveWorkspaceIdState(id)
      void initial?.onSwitchWorkspace?.(id)
    },
    [initial],
  )

  const value = useMemo<ShellContextValue>(
    () => ({
      userDisplayName: initial?.userDisplayName ?? 'Preview User',
      workspaces,
      activeWorkspaceId,
      notificationCount: initial?.notificationCount ?? 2,
      canAccessOrgAdmin: initial?.canAccessOrgAdmin ?? false,
      isImpersonating,
      setActiveWorkspaceId,
      exitImpersonation,
      signOut: initial?.onSignOut,
    }),
    [
      activeWorkspaceId,
      exitImpersonation,
      initial?.canAccessOrgAdmin,
      initial?.notificationCount,
      initial?.onSignOut,
      initial?.userDisplayName,
      isImpersonating,
      setActiveWorkspaceId,
      workspaces,
    ],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext)
  if (!ctx) {
    throw new Error('useShell must be used within ShellProvider')
  }
  return ctx
}

export function ShellProviderForTest({
  children,
  ...initial
}: { children: ReactNode } & NonNullable<ShellProviderProps['initial']>) {
  return <ShellProvider initial={initial}>{children}</ShellProvider>
}
