import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { IndependentOnboardingPage } from './IndependentOnboardingPage'
import { ProvisionedOnboardingPage } from './ProvisionedOnboardingPage'
import { isInviteReturnTo, peekReturnTo } from '@/lib/publicSurfaces'

export function OnboardingRouterPage() {
  const { status, session, sessionSettled } = useAuth()

  if (status === 'loading' || !sessionSettled) {
    return (
      <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
        Checking session…
      </main>
    )
  }

  if (status === 'anonymous') return <Navigate to="/sign-in" replace />

  if (!session) {
    return (
      <main className="grid min-h-svh place-items-center px-6 text-center text-sm text-muted-foreground">
        <p>CareerStack could not load your session. Reload the page to try again.</p>
      </main>
    )
  }

  const inviteResume = peekReturnTo()
  if (inviteResume && isInviteReturnTo(inviteResume)) {
    return <Navigate to={inviteResume} replace />
  }

  if (session && session.user.status === 'active' && session.workspaces.length > 0) {
    return <Navigate to="/home" replace />
  }

  if (
    session?.user.status === 'pending_onboarding' &&
    session.workspaces.some((workspace) => workspace.kind === 'organization')
  ) {
    return <ProvisionedOnboardingPage />
  }

  return <IndependentOnboardingPage />
}
