import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { IndependentOnboardingPage } from './IndependentOnboardingPage'
import { isInviteReturnTo, peekReturnTo } from '@/lib/publicSurfaces'

export function OnboardingRouterPage() {
  const { status, session } = useAuth()

  if (status === 'loading') {
    return (
      <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
        Checking session…
      </main>
    )
  }

  if (status === 'anonymous') return <Navigate to="/sign-in" replace />

  const inviteResume = peekReturnTo()
  if (inviteResume && isInviteReturnTo(inviteResume)) {
    return <Navigate to={inviteResume} replace />
  }

  if (session && session.user.status === 'active' && session.workspaces.length > 0) {
    return <Navigate to="/home" replace />
  }

  return <IndependentOnboardingPage />
}
