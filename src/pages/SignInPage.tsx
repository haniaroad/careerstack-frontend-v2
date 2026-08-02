import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { AuthLayout } from '@/auth/AuthLayout'
import { useAuth } from '@/auth/AuthContext'
import { authStubEnabled, isFirebaseConfigured } from '@/config'
import { requestMagicLink, signInWithGoogle } from '@/lib/firebase'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})

type FormValues = z.infer<typeof schema>

export function SignInPage() {
  const navigate = useNavigate()
  const { stubSignIn, refreshSession } = useAuth()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  async function onGoogle() {
    setError(null)
    setPending(true)
    try {
      if (authStubEnabled() && !isFirebaseConfigured()) {
        await stubSignIn('alex.morgan@example.com')
      } else {
        await signInWithGoogle()
        await refreshSession()
      }
      navigate('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setPending(false)
    }
  }

  async function onMagicLink(values: FormValues) {
    setError(null)
    setMessage(null)
    setPending(true)
    try {
      if (authStubEnabled() && !isFirebaseConfigured()) {
        await stubSignIn(values.email)
        navigate('/onboarding')
        return
      }
      await requestMagicLink(values.email)
      setMessage('Check your email for a sign-in link. It expires in 15 minutes.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send magic link')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Continue with Google or an email magic link. No passwords."
    >
      <div className="space-y-5">
        {error ? <Alert tone="danger" title="Sign-in issue">{error}</Alert> : null}
        {message ? <Alert tone="info" title="Magic link sent">{message}</Alert> : null}

        <Button type="button" className="w-full" disabled={pending} onClick={() => void onGoogle()}>
          Continue with Google
        </Button>

        <div className="relative py-1 text-center text-xs text-muted-foreground">
          <span className="bg-background px-2">or email magic link</span>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit(onMagicLink)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={pending}>
            Email me a sign-in link
          </Button>
        </form>

        <p className="text-sm text-muted-foreground">
          Invited by an organization?{' '}
          <Link className="text-primary underline-offset-4 hover:underline" to="/invite">
            Enter invite token
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
