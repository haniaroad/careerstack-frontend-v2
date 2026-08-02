import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
        Checking session…
      </main>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function RequireOnboarded() {
  const { status, session } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
        Checking session…
      </main>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }

  if (!session || session.user.status === 'pending_onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  if (!session.workspaces.length) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
