import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { apiFetch } from '@/lib/api'
import { trackIndependentActivation } from '@/lib/mixpanel'

const schema = z.object({
  age_attested: z.boolean().refine((value) => value, { message: 'You must attest you are 18+' }),
  terms_accepted: z.boolean().refine((value) => value, { message: 'Terms are required' }),
  display_name: z.string().min(1, 'Name is required'),
  country: z.string().min(1, 'Country is required'),
  state_region: z.string().min(1, 'State or region is required'),
  career_goal: z.string().min(1, 'Career goal is required'),
  current_role_term_id: z.string().uuid('Select a current role'),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
  target_role_term_id: z.string().uuid('Select a target role'),
  bio: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type TaxonomyTerm = { id: string; key: string; label: string; is_other: boolean }

export function IndependentOnboardingPage() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [roles, setRoles] = useState<TaxonomyTerm[]>([])
  const [error, setError] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      age_attested: false,
      terms_accepted: false,
      display_name: '',
      country: 'United States',
      state_region: '',
      career_goal: '',
      current_role_term_id: '',
      experience_level: 'beginner',
      target_role_term_id: '',
      bio: '',
    },
  })

  useEffect(() => {
    void apiFetch<{ taxonomies: { key: string; terms: TaxonomyTerm[] }[] }>('/api/v1/taxonomies')
      .then((data) => {
        const roleTaxonomy = data.taxonomies.find((item) => item.key === 'roles')
        setRoles(roleTaxonomy?.terms ?? [])
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      const session = await apiFetch<SessionPayload>('/api/v1/onboarding/independent', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      setSession(session)
      trackIndependentActivation()
      navigate('/welcome')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed')
    }
  }

  return (
    <AuthLayout
      eyebrow="Step 1 of 3"
      title="Complete your profile"
      description="Confirm you are 18+, accept the terms, then share a minimum profile. Optional details can wait."
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {error ? <Alert tone="danger" title="Could not continue">{error}</Alert> : null}

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
        <div className="space-y-2">
          <Label htmlFor="bio">Bio (optional)</Label>
          <Input id="bio" {...form.register('bio')} />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" {...form.register('age_attested')} />
          <span>I confirm I am at least 18 years old.</span>
        </label>
        {form.formState.errors.age_attested ? (
          <p className="text-sm text-destructive">{form.formState.errors.age_attested.message}</p>
        ) : null}

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" {...form.register('terms_accepted')} />
          <span>I accept the CareerStack terms.</span>
        </label>
        {form.formState.errors.terms_accepted ? (
          <p className="text-sm text-destructive">{form.formState.errors.terms_accepted.message}</p>
        ) : null}

        <Button
          type="submit"
          className="h-10 w-full bg-ink text-canvas hover:bg-black"
          disabled={form.formState.isSubmitting}
        >
          Continue
        </Button>
      </form>
    </AuthLayout>
  )
}
