import {
  createContext,
  useCallback,
  useContext,
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
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    initial?.activeWorkspaceId ?? workspaces[0]?.id ?? 'personal',
  )
  const [isImpersonating, setIsImpersonating] = useState(
    initial?.isImpersonating ?? false,
  )

  const exitImpersonation = useCallback(() => {
    setIsImpersonating(false)
  }, [])

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
    }),
    [
      activeWorkspaceId,
      exitImpersonation,
      initial?.canAccessOrgAdmin,
      initial?.notificationCount,
      initial?.userDisplayName,
      isImpersonating,
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
