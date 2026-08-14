import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { AuthLayout } from '@/auth/AuthLayout'
import { useAuth } from '@/auth/AuthContext'
import { completeMagicLink } from '@/lib/firebase'
import { consumeReturnTo, isInviteReturnTo, isSafeReturnTo } from '@/lib/publicSurfaces'

function resumeAfterMagicLink() {
  let fromQuery: string | null = null
  try {
    const value = new URLSearchParams(window.location.search).get('returnTo')
    if (value && isSafeReturnTo(value)) fromQuery = value
  } catch {
    // ignore malformed query strings
  }
  const stored = consumeReturnTo('/onboarding')
  return fromQuery ?? stored
}

export function AuthCompletePage() {
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        await completeMagicLink()
        const session = await refreshSession()
        const returnTo = resumeAfterMagicLink()
        if (isInviteReturnTo(returnTo)) {
          navigate(returnTo, { replace: true })
          return
        }
        if (
          session &&
          session.user.status !== 'pending_onboarding' &&
          session.workspaces.length > 0 &&
          returnTo !== '/onboarding'
        ) {
          navigate(returnTo, { replace: true })
          return
        }
        navigate('/onboarding', { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not complete sign-in')
      }
    })()
  }, [navigate, refreshSession])

  return (
    <AuthLayout
      eyebrow="Almost there"
      title="Completing sign-in"
      description="Confirming your magic link…"
    >
      {error ? (
        <Alert tone="danger" title="Link invalid or expired">{error}</Alert>
      ) : (
        <p className="text-sm text-muted-foreground">One moment…</p>
      )}
    </AuthLayout>
  )
}
