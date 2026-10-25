import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { LocationFields } from '@/components/LocationFields'
import { AuthLayout } from '@/auth/AuthLayout'
import { useAuth } from '@/auth/AuthContext'
import type { SessionPayload } from '@/auth/types'
import { apiFetch } from '@/lib/api'

const schema = z.object({
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

export function ProvisionedOnboardingPage() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [roles, setRoles] = useState<TaxonomyTerm[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [usStateAbbreviations, setUsStateAbbreviations] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
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

  useEffect(() => {
    void apiFetch<{
      countries?: string[]
      us_state_abbreviations?: string[]
      taxonomies?: { key: string; terms: TaxonomyTerm[] }[]
    }>('/api/v1/taxonomies')
      .then((data) => {
        setRoles(data.taxonomies?.find((item) => item.key === 'roles')?.terms ?? [])
        setCountries(data.countries ?? [])
        setUsStateAbbreviations(data.us_state_abbreviations ?? [])
      })
      .catch(() => undefined)
  }, [])

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      const session = await apiFetch<SessionPayload>('/api/v1/onboarding/provisioned_member', {
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
      eyebrow="Finish your profile"
      title="Your organization is waiting"
      description="Share your date of birth and a short profile. You do not need an invitation."
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {error ? (
          <Alert tone="danger" title="Could not continue">
            {error}
          </Alert>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of birth</Label>
          <Input id="date_of_birth" type="date" {...form.register('date_of_birth')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Name</Label>
          <Input id="display_name" {...form.register('display_name')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <LocationFields
            country={form.watch('country')}
            stateRegion={form.watch('state_region')}
            countries={countries}
            usStateAbbreviations={usStateAbbreviations}
            onCountryChange={(value) => form.setValue('country', value, { shouldValidate: true })}
            onStateChange={(value) => form.setValue('state_region', value, { shouldValidate: true })}
          />
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
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" {...form.register('terms_accepted')} />
          <span>
            I accept the{' '}
            <a
              href="https://careerstack.co/tos"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand underline underline-offset-2"
            >
              CareerStack terms
            </a>
            .
          </span>
        </label>
        {form.formState.errors.terms_accepted ? (
          <p className="text-sm text-destructive">{form.formState.errors.terms_accepted.message}</p>
        ) : null}
        <Button
          type="submit"
          className="h-10 w-full bg-brand text-brand-foreground hover:bg-brand-hover"
          disabled={form.formState.isSubmitting}
        >
          Finish profile
        </Button>
      </form>
    </AuthLayout>
  )
}
