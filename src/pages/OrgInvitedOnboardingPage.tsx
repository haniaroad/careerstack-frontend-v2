import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { AuthLayout } from '@/auth/AuthLayout'
import { useAuth } from '@/auth/AuthContext'
import type { SessionPayload } from '@/auth/types'
import { apiFetch, ApiError } from '@/lib/api'

const schema = z.object({
  invitation_token: z.string().min(1, 'Invite token is required'),
  terms_accepted: z.boolean().refine((value) => value, { message: 'Terms are required' }),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  display_name: z.string().min(1, 'Name is required'),
  country: z.string().min(1, 'Country is required'),
  state_region: z.string().min(1, 'State or region is required'),
  career_goal: z.string().min(1, 'Career goal is required'),
  current_role_term_id: z.string().uuid('Select a current role'),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
  target_role_term_id: z.string().uuid('Select a target role'),
})

type FormValues = z.infer<typeof schema>
type TaxonomyTerm = { id: string; key: string; label: string }

export function OrgInvitedOnboardingPage() {
  const { token: routeToken } = useParams()
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [roles, setRoles] = useState<TaxonomyTerm[]>([])
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [invitePreview, setInvitePreview] = useState<{
    organization_name: string
    program_name?: string | null
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      invitation_token: routeToken ?? '',
      terms_accepted: false,
      date_of_birth: '',
      display_name: '',
      country: 'United States',
      state_region: '',
      career_goal: '',
      current_role_term_id: '',
      experience_level: 'beginner',
      target_role_term_id: '',
    },
  })

  const token = form.watch('invitation_token')

  useEffect(() => {
    void apiFetch<{ taxonomies: { key: string; terms: TaxonomyTerm[] }[] }>('/api/v1/taxonomies')
      .then((data) => {
        setRoles(data.taxonomies.find((item) => item.key === 'roles')?.terms ?? [])
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!token) return
    setInviteError(null)
    void apiFetch<{
      invitation: { organization_name: string; program_name?: string | null }
    }>(`/api/v1/invitations/${encodeURIComponent(token)}`)
      .then((data) => setInvitePreview(data.invitation))
      .catch((err: unknown) => {
        setInvitePreview(null)
        if (err instanceof ApiError) setInviteError(err.message)
        else setInviteError('Invitation is invalid or expired')
      })
  }, [token])

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      const session = await apiFetch<SessionPayload>('/api/v1/onboarding/organization_invited', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      setSession(session)
      navigate('/welcome')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed')
    }
  }

  return (
    <AuthLayout
      title="Organization invitation"
      description="Join with your invite token, share your date of birth for age status, and complete a minimum profile."
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {inviteError ? (
          <div data-testid="invite-error">
            <Alert tone="danger" title="Invite problem">
              {inviteError}
            </Alert>
          </div>
        ) : null}
        {error ? (
          <Alert tone="danger" title="Could not continue">
            {error}
          </Alert>
        ) : null}
        {invitePreview ? (
          <Alert tone="info" title={invitePreview.organization_name}>
            {invitePreview.program_name
              ? `Program: ${invitePreview.program_name}`
              : 'Organization invitation'}
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="invitation_token">Invite token</Label>
          <Input id="invitation_token" {...form.register('invitation_token')} />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" {...form.register('terms_accepted')} />
          <span>I accept the CareerStack terms.</span>
        </label>
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of birth</Label>
          <Input id="date_of_birth" type="date" {...form.register('date_of_birth')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Name</Label>
          <Input id="display_name" {...form.register('display_name')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...form.register('country')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state_region">State / region</Label>
            <Input id="state_region" {...form.register('state_region')} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="career_goal">Career goal</Label>
          <Input id="career_goal" {...form.register('career_goal')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="current_role_term_id">Current role</Label>
          <select
            id="current_role_term_id"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            {...form.register('current_role_term_id')}
          >
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="experience_level">Experience level</Label>
          <select
            id="experience_level"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            {...form.register('experience_level')}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="target_role_term_id">Target role</Label>
          <select
            id="target_role_term_id"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            {...form.register('target_role_term_id')}
          >
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          Join organization
        </Button>
      </form>
    </AuthLayout>
  )
}
