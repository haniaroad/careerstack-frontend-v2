import { Button } from '@/components/Button'
import { useShell } from './ShellContext'

export function ImpersonationBanner() {
  const { isImpersonating, userDisplayName, exitImpersonation } = useShell()

  if (!isImpersonating) return null

  return (
    <div
      role="status"
      data-testid="impersonation-banner"
      className="flex items-center justify-between gap-3 bg-status-warning-bg px-4 py-2 text-sm text-status-warning"
    >
      <p>
        Viewing as <span className="font-medium">{userDisplayName}</span>
      </p>
      <Button type="button" size="sm" variant="outline" onClick={exitImpersonation}>
        Exit
      </Button>
    </div>
  )
}
