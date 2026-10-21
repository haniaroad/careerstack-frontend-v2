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
  name: z.string().min(1, 'Name is required'),
  structure_term_id: z.string().uuid('Select a structure'),
  country: z.string().min(1, 'Country is required'),
  state_region: z.string().min(1, 'State or region is required'),
  primary_goal_term_id: z.string().uuid('Select a primary goal'),
  website: z.string().optional(),
})

type FormValues = z.infer<typeof schema>
type TaxonomyTerm = { id: string; key: string; label: string }

export function CreateOrganizationPage() {
  const navigate = useNavigate()
  const { session, setSession } = useAuth()
  const [structures, setStructures] = useState<TaxonomyTerm[]>([])
  const [goals, setGoals] = useState<TaxonomyTerm[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [usStateAbbreviations, setUsStateAbbreviations] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      structure_term_id: '',
      country: 'United States',
      state_region: '',
      primary_goal_term_id: '',
      website: '',
    },
  })

  const canCreate =
    session?.user.can_create_organization ?? !session?.user.has_created_organization

  useEffect(() => {
    if (!session || canCreate) return
    navigate(session.user.status === 'pending_onboarding' ? '/onboarding' : '/home', { replace: true })
  }, [canCreate, navigate, session])

  useEffect(() => {
    if (session && !canCreate) return
    void apiFetch<{
      countries?: string[]
      us_state_abbreviations?: string[]
      taxonomies?: { key: string; terms: TaxonomyTerm[] }[]
    }>('/api/v1/taxonomies')
      .then((data) => {
        setStructures(
          data.taxonomies?.find((item) => item.key === 'organization_structures')?.terms ?? [],
        )
        setGoals(data.taxonomies?.find((item) => item.key === 'organization_goals')?.terms ?? [])
        setCountries(data.countries ?? [])
        setUsStateAbbreviations(data.us_state_abbreviations ?? [])
      })
      .catch((err: Error) => setError(err.message))
  }, [canCreate, session])

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      const result = await apiFetch<{ session: SessionPayload }>('/api/v1/organizations', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      setSession(result.session)
      navigate('/welcome')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create organization')
    }
  }

  return (
    <AuthLayout
      eyebrow="Create organization"
      title="Set up your organization"
      description="Self-serve signup for workforce and STEM programs. Required metadata first—optional details can wait."
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {error ? <Alert tone="danger" title="Could not create">{error}</Alert> : null}
        <div className="space-y-2">
          <Label htmlFor="name">Organization name</Label>
          <Input id="name" {...form.register('name')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="structure_term_id">Structure</Label>
          <select
            id="structure_term_id"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            {...form.register('structure_term_id')}
          >
            <option value="">Select structure</option>
            {structures.map((term) => (
              <option key={term.id} value={term.id}>
                {term.label}
              </option>
            ))}
          </select>
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
          <Label htmlFor="primary_goal_term_id">Primary goal</Label>
          <select
            id="primary_goal_term_id"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            {...form.register('primary_goal_term_id')}
          >
            <option value="">Select goal</option>
            {goals.map((term) => (
              <option key={term.id} value={term.id}>
                {term.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website (optional)</Label>
          <Input id="website" {...form.register('website')} />
        </div>
        <Button
          type="submit"
          className="h-10 w-full bg-brand text-brand-foreground hover:bg-brand-hover"
          disabled={form.formState.isSubmitting}
        >
          Create organization
        </Button>
      </form>
    </AuthLayout>
  )
}
