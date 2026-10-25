import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { LocationFields } from '@/components/LocationFields'
import { apiFetch } from '@/lib/api'
import { runWithStaffReauth } from './staffReauth'
import { ProductionConfirm, productionConfirmed } from './EnvironmentBar'

type OrgOption = { id: string; name: string }
type Term = { id: string; label: string }

const fieldClass = 'grid gap-1 text-sm'

function messageFrom(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong'
}

export function ProvisionForms() {
  const [organizations, setOrganizations] = useState<OrgOption[]>([])
  const [structures, setStructures] = useState<Term[]>([])
  const [goals, setGoals] = useState<Term[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])

  useEffect(() => {
    void apiFetch<{ organizations: OrgOption[] }>('/api/v1/platform_admin/organizations')
      .then((result) => setOrganizations(result.organizations ?? []))
      .catch(() => setOrganizations([]))
    void apiFetch<{
      countries?: string[]
      us_state_abbreviations?: string[]
      taxonomies?: { key: string; terms: Term[] }[]
    }>('/api/v1/taxonomies')
      .then((data) => {
        setCountries(data.countries ?? [])
        setStates(data.us_state_abbreviations ?? [])
        setStructures(data.taxonomies?.find((item) => item.key === 'organization_structures')?.terms ?? [])
        setGoals(data.taxonomies?.find((item) => item.key === 'organization_goals')?.terms ?? [])
      })
      .catch(() => undefined)
  }, [])

  return (
    <div className="grid gap-8 border-t border-border pt-4">
      <CreateAccount organizations={organizations} />
      <ImportAccounts organizations={organizations} />
      <CreateOrganization
        structures={structures}
        goals={goals}
        countries={countries}
        states={states}
        onCreated={(organization) => setOrganizations((current) => [...current, organization])}
      />
    </div>
  )
}

function CreateAccount({ organizations }: { organizations: OrgOption[] }) {
  const [email, setEmail] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [role, setRole] = useState('participant')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setNotice(null)
    if (!productionConfirmed(confirmed)) {
      setNotice('Confirm that this change is for production.')
      return
    }
    try {
      const result = await runWithStaffReauth(() =>
        apiFetch<{ message: string }>('/api/v1/platform_admin/users', {
          method: 'POST',
          body: JSON.stringify({
            email,
            organization_id: organizationId || null,
            role: organizationId ? role : 'participant',
            reason,
          }),
        }),
      )
      setNotice(result.message)
      setEmail('')
    } catch (err) {
      setNotice(messageFrom(err))
    }
  }

  return (
    <form className="grid max-w-xl gap-2" onSubmit={(event) => void submit(event)}>
      <h2 className="text-base font-semibold">Create account</h2>
      <p className="text-sm text-muted-foreground">
        They receive a sign-in email and can use Google or a magic link. The welcome email still
        sends after they finish their profile.
      </p>
      <label className={fieldClass}>
        Email
        <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className={fieldClass}>
        Organization
        <select
          aria-label="Organization for the new account"
          className="h-9 rounded-md border border-input bg-canvas px-2"
          value={organizationId}
          onChange={(event) => setOrganizationId(event.target.value)}
        >
          <option value="">No organization</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>
      {organizationId ? (
        <label className={fieldClass}>
          Role
          <select
            aria-label="Organization role"
            className="h-9 rounded-md border border-input bg-canvas px-2"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="participant">Participant</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      ) : null}
      <ReasonField label="Account reason" value={reason} onChange={setReason} />
      <ProductionConfirm checked={confirmed} onChange={setConfirmed} />
      <Button type="submit">Create account</Button>
      {notice ? <p role="status">{notice}</p> : null}
    </form>
  )
}

function ImportAccounts({ organizations }: { organizations: OrgOption[] }) {
  const [csv, setCsv] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setNotice(null)
    if (!productionConfirmed(confirmed)) {
      setNotice('Confirm that this change is for production.')
      return
    }
    try {
      const result = await runWithStaffReauth(() =>
        apiFetch<{ rows: { line: number; email?: string; status: string; message: string }[] }>(
          '/api/v1/platform_admin/users/import',
          {
            method: 'POST',
            body: JSON.stringify({ csv, organization_id: organizationId || null, reason }),
          },
        ),
      )
      setNotice(result.rows.map((row) => `Line ${row.line}: ${row.status}. ${row.message}`).join(' '))
    } catch (err) {
      setNotice(messageFrom(err))
    }
  }

  return (
    <form className="grid max-w-xl gap-2" onSubmit={(event) => void submit(event)}>
      <h2 className="text-base font-semibold">Create accounts from a CSV</h2>
      <p className="text-sm text-muted-foreground">
        Columns: email, and optionally name and role. Choose the organization here. Leave it blank
        to create accounts with no organization. At most 200 rows.
      </p>
      <label className={fieldClass}>
        CSV file
        <input
          aria-label="CSV file"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            void file.text().then(setCsv)
          }}
        />
      </label>
      <label className={fieldClass}>
        Organization
        <select
          aria-label="Organization for the CSV"
          className="h-9 rounded-md border border-input bg-canvas px-2"
          value={organizationId}
          onChange={(event) => setOrganizationId(event.target.value)}
        >
          <option value="">No organization</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>
      <ReasonField label="CSV reason" value={reason} onChange={setReason} />
      <ProductionConfirm checked={confirmed} onChange={setConfirmed} />
      <Button type="submit" disabled={!csv.trim()}>
        Upload CSV
      </Button>
      {notice ? <p role="status">{notice}</p> : null}
    </form>
  )
}

function CreateOrganization({
  structures,
  goals,
  countries,
  states,
  onCreated,
}: {
  structures: Term[]
  goals: Term[]
  countries: string[]
  states: string[]
  onCreated: (organization: OrgOption) => void
}) {
  const [name, setName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [country, setCountry] = useState('United States')
  const [stateRegion, setStateRegion] = useState('')
  const [structureId, setStructureId] = useState('')
  const [goalId, setGoalId] = useState('')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setNotice(null)
    if (!productionConfirmed(confirmed)) {
      setNotice('Confirm that this change is for production.')
      return
    }
    try {
      const found = await apiFetch<{ users: { id: string; email: string }[] }>(
        `/api/v1/platform_admin/search?q=${encodeURIComponent(adminEmail)}`,
      )
      const admin = found.users.find((user) => user.email.toLowerCase() === adminEmail.trim().toLowerCase())
      if (!admin) {
        setNotice('No account with that email. They need to finish onboarding before they can be the first admin.')
        return
      }
      const result = await runWithStaffReauth(() =>
        apiFetch<{ id: string; name: string }>('/api/v1/platform_admin/organizations', {
          method: 'POST',
          body: JSON.stringify({
            admin_user_id: admin.id,
            name,
            country,
            state_region: stateRegion,
            structure_term_id: structureId,
            primary_goal_term_id: goalId,
            reason,
          }),
        }),
      )
      onCreated({ id: result.id, name: result.name })
      setNotice(`${result.name} is ready. The first admin received the organization email.`)
      setName('')
    } catch (err) {
      setNotice(messageFrom(err))
    }
  }

  return (
    <form className="grid max-w-xl gap-2" onSubmit={(event) => void submit(event)}>
      <h2 className="text-base font-semibold">Create organization</h2>
      <p className="text-sm text-muted-foreground">
        The first administrator must already be an onboarded adult. You are not added to the
        organization.
      </p>
      <label className={fieldClass}>
        Organization name
        <Input required value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className={fieldClass}>
        First admin email
        <Input
          type="email"
          required
          value={adminEmail}
          onChange={(event) => setAdminEmail(event.target.value)}
        />
      </label>
      <LocationFields
        country={country}
        stateRegion={stateRegion}
        countries={countries}
        usStateAbbreviations={states}
        onCountryChange={setCountry}
        onStateChange={setStateRegion}
      />
      <label className={fieldClass}>
        Structure
        <select
          aria-label="Organization structure"
          required
          className="h-9 rounded-md border border-input bg-canvas px-2"
          value={structureId}
          onChange={(event) => setStructureId(event.target.value)}
        >
          <option value="">Choose</option>
          {structures.map((term) => (
            <option key={term.id} value={term.id}>
              {term.label}
            </option>
          ))}
        </select>
      </label>
      <label className={fieldClass}>
        Primary goal
        <select
          aria-label="Primary goal"
          required
          className="h-9 rounded-md border border-input bg-canvas px-2"
          value={goalId}
          onChange={(event) => setGoalId(event.target.value)}
        >
          <option value="">Choose</option>
          {goals.map((term) => (
            <option key={term.id} value={term.id}>
              {term.label}
            </option>
          ))}
        </select>
      </label>
      <ReasonField label="Organization reason" value={reason} onChange={setReason} />
      <ProductionConfirm checked={confirmed} onChange={setConfirmed} />
      <Button type="submit">Create organization</Button>
      {notice ? <p role="status">{notice}</p> : null}
    </form>
  )
}

function ReasonField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className={fieldClass}>
      {label}
      <textarea
        required
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-16 rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  )
}
