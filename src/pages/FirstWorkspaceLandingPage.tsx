import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { AuthLayout } from '@/auth/AuthLayout'
import { useAuth } from '@/auth/AuthContext'

export function FirstWorkspaceLandingPage() {
  const { session } = useAuth()
  const workspaces = session?.workspaces ?? []
  const active =
    workspaces.find((workspace) => workspace.id === session?.active_workspace_id) ?? workspaces[0]

  return (
    <AuthLayout
      eyebrow="Welcome"
      title="You're in"
      description="Use the workspace switcher anytime to move between Personal and Organization contexts."
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Active workspace
          </p>
          <p className="mt-1 text-lg font-semibold">{active?.name ?? 'Workspace'}</p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                {workspace.name} · {workspace.kind}
              </li>
            ))}
          </ul>
        </div>
        <Button asChild className="h-10 w-full bg-ink text-canvas hover:bg-black">
          <Link to="/home">Enter CareerStack</Link>
        </Button>
        <Button asChild variant="outline" className="h-10 w-full border-border bg-surface text-ink hover:bg-muted">
          <Link to="/organizations/new">Create an organization</Link>
        </Button>
      </div>
    </AuthLayout>
  )
}
