import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { AuthLayout } from '@/auth/AuthLayout'
import { useAuth } from '@/auth/AuthContext'
import { authStubEnabled, isFirebaseConfigured } from '@/config'
import {
  completeGoogleRedirect,
  requestMagicLink,
  signInWithGoogle,
} from '@/lib/firebase'
import { cn } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})

type FormValues = z.infer<typeof schema>

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3 5.8 14.9l-2.5 1.9C4.9 20.1 8.2 22.2 12 22.2c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 .9-3.6.9-2.8 0-5.1-1.9-6-4.4z"
      />
      <path
        fill="#4A90E2"
        d="M3.3 7.2C2.5 8.8 2 10.5 2 12.2c0 1.7.5 3.4 1.3 4.9l3.3-2.6c-.3-.8-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L3.3 7.2z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.6c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.5 14.7 1.6 12 1.6 8.2 1.6 4.9 3.7 3.3 7.2l3.3 2.6C7 7.4 9.2 5.6 12 5.6z"
      />
    </svg>
  )
}

const inkButtonClass =
  'h-10 w-full bg-ink text-canvas hover:bg-black focus-visible:ring-brand'

const secondaryButtonClass =
  'h-10 w-full border-border bg-surface text-ink hover:bg-muted'

export function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const resumePath =
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    typeof (location.state as { from?: unknown }).from === 'string'
      ? (location.state as { from: string }).from
      : '/onboarding'
  const { stubSignIn, refreshSession } = useAuth()
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_up')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingGoogle, setPendingGoogle] = useState(false)
  const [pendingMagic, setPendingMagic] = useState(false)
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const busy = pendingGoogle || pendingMagic

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (authStubEnabled() || !isFirebaseConfigured()) return
      try {
        const user = await completeGoogleRedirect()
        if (cancelled || !user) return
        await refreshSession()
        navigate(resumePath, { replace: true })
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Google sign-in failed')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [navigate, refreshSession, resumePath])

  async function onGoogle() {
    setError(null)
    setPendingGoogle(true)
    try {
      if (authStubEnabled() && !isFirebaseConfigured()) {
        await stubSignIn('alex.morgan@example.com')
        navigate(resumePath)
        return
      }
      const result = await signInWithGoogle()
      if (result.method === 'redirect') {
        // Full-page redirect in progress — leave pending until the browser navigates away.
        return
      }
      await refreshSession()
      navigate(resumePath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setPendingGoogle(false)
    }
  }

  async function onMagicLink(values: FormValues) {
    setError(null)
    setMessage(null)
    setPendingMagic(true)
    try {
      if (authStubEnabled() && !isFirebaseConfigured()) {
        await stubSignIn(values.email)
        navigate(resumePath)
        return
      }
      await requestMagicLink(values.email)
      setSentEmail(values.email)
      setMessage(`We sent a sign-in link to ${values.email}. It expires in 15 minutes.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send magic link')
    } finally {
      setPendingMagic(false)
    }
  }

  async function onResend() {
    const email = sentEmail ?? form.getValues('email')
    if (!email) return
    await onMagicLink({ email })
  }

  return (
    <AuthLayout
      title={mode === 'sign_up' ? 'Create your account' : 'Welcome back'}
      description="Sign in with Google or an email magic link. One CareerStack account per email—no passwords."
    >
      {message && sentEmail ? (
        <div className="space-y-5">
          <div className="rounded-md border border-border bg-surface p-5">
            <div className="flex size-10 items-center justify-center rounded-md bg-brand-muted text-brand">
              <Mail className="size-5" strokeWidth={1.75} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-ink">Check your email</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className={secondaryButtonClass}
            disabled={busy}
            onClick={() => void onResend()}
          >
            Resend magic link
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full text-muted-foreground"
            onClick={() => {
              setMessage(null)
              setSentEmail(null)
            }}
          >
            Use a different email
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {error ? <Alert tone="danger" title="Sign-in issue">{error}</Alert> : null}

          <Button
            type="button"
            variant="outline"
            className={secondaryButtonClass}
            disabled={busy}
            onClick={() => void onGoogle()}
          >
            <GoogleIcon />
            {pendingGoogle ? 'Continuing with Google…' : 'Continue with Google'}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              or email
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={form.handleSubmit(onMagicLink)} noValidate>
            <div>
              <Label htmlFor="email" className="mb-1.5">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="alex.morgan@example.com"
                className="mt-1.5 h-10"
                disabled={busy}
                {...form.register('email')}
              />
              {form.formState.errors.email ? (
                <p className="mt-1.5 text-xs text-status-danger">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" className={cn(inkButtonClass)} disabled={busy}>
              {pendingMagic ? 'Sending link…' : 'Email me a magic link'}
            </Button>
          </form>

          <p className="pt-2 text-center text-sm text-muted-foreground">
            {mode === 'sign_up' ? 'Already have an account?' : 'New to CareerStack?'}{' '}
            <button
              type="button"
              className="font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              onClick={() => setMode(mode === 'sign_up' ? 'sign_in' : 'sign_up')}
            >
              {mode === 'sign_up' ? 'Sign in' : 'Create an account'}
            </button>
          </p>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Independent signup requires you to confirm you are at least 18 and accept the terms
            on the next step. Organization participants join by invitation.{' '}
            <Link className="text-brand underline-offset-2 hover:underline" to="/invite">
              Enter invite token
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  )
}
