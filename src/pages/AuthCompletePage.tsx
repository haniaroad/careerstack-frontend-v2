import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { AuthLayout } from '@/auth/AuthLayout'
import { useAuth } from '@/auth/AuthContext'
import { completeMagicLink } from '@/lib/firebase'

export function AuthCompletePage() {
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        await completeMagicLink()
        await refreshSession()
        navigate('/onboarding', { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not complete sign-in')
      }
    })()
  }, [navigate, refreshSession])

  return (
    <AuthLayout title="Completing sign-in" description="Confirming your magic link…">
      {error ? (
        <Alert tone="danger" title="Link invalid or expired">{error}</Alert>
      ) : (
        <p className="text-sm text-muted-foreground">One moment…</p>
      )}
    </AuthLayout>
  )
}
