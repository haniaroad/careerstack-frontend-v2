import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'

export function ProfilePage() {
  const { session } = useAuth()
  const remaining = session?.credits?.remaining
  const isPersonal =
    session?.workspaces.find((w) => w.id === session.active_workspace_id)?.kind ===
    'personal'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-medium text-ink-muted">Profile</p>
        <h1 className="font-display text-3xl text-ink">
          {session?.profile?.display_name ?? 'Your profile'}
        </h1>
        <p className="text-ink-muted">{session?.user.email}</p>
      </header>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">Billing & Credits</h2>
        <p className="text-sm text-ink-muted">
          {typeof remaining === 'number'
            ? `${remaining} credit${remaining === 1 ? '' : 's'} remaining in this workspace.`
            : 'View your credit balance, purchase history, and refund options.'}
        </p>
        <Button asChild>
          <Link to="/billing">Open Billing & Credits</Link>
        </Button>
        {!isPersonal ? (
          <Alert tone="info" title="Organization workspace">
            Organization credits are pooled. Personal pack purchase is only available in
            Personal workspace.
          </Alert>
        ) : null}
      </section>
    </div>
  )
}
