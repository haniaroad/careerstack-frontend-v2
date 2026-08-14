import { useEffect, useState } from 'react'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { ApiError } from '@/lib/api'
import {
  createOutcome,
  fetchOwnOutcomes,
  type SelfReportedOutcome,
} from '@/lib/organizationAdmin'

const OUTCOME_TYPES = [
  { value: 'interview', label: 'Interview' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance_opportunity', label: 'Freelance opportunity' },
  { value: 'job', label: 'Job' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'college_acceptance', label: 'College acceptance' },
  { value: 'training_or_certification_acceptance', label: 'Training or certification' },
  { value: 'other_post_secondary_acceptance', label: 'Other post-secondary' },
]

export function OutcomesSettings({
  hasOrganizationWorkspace,
  activeWorkspaceIsOrganization,
}: {
  hasOrganizationWorkspace: boolean
  activeWorkspaceIsOrganization: boolean
}) {
  const [outcomes, setOutcomes] = useState<SelfReportedOutcome[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [outcomeType, setOutcomeType] = useState('job')
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [contribution, setContribution] = useState<'yes' | 'partially' | 'not_sure'>('yes')
  const [institution, setInstitution] = useState('')
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!hasOrganizationWorkspace) return
    void fetchOwnOutcomes()
      .then((payload) => setOutcomes(payload.outcomes))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load outcomes'))
  }, [hasOrganizationWorkspace])

  if (!hasOrganizationWorkspace) return null

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!activeWorkspaceIsOrganization) return
    setBusy(true)
    setError(null)
    try {
      const result = await createOutcome({
        outcome_type: outcomeType,
        month: Number(month),
        year: Number(year),
        careerstack_contribution: contribution,
        institution: institution || undefined,
        title: title || undefined,
      })
      setOutcomes((prev) => [result.outcome, ...prev])
      setInstitution('')
      setTitle('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save outcome')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold text-ink">Self-reported outcomes</h2>
      <p className="text-sm text-ink-muted">
        Record interviews, jobs, and other opportunities. These stay private to you and appear as
        labeled aggregates on organization reports. They are never shown on your public profile.
      </p>
      {!activeWorkspaceIsOrganization ? (
        <Alert tone="info" title="Switch workspace">
          Switch to an Organization workspace to add an outcome.
        </Alert>
      ) : (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
          {error ? (
            <div className="sm:col-span-2">
              <Alert tone="danger" title="Could not save">
                {error}
              </Alert>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="outcome-type">Outcome type</Label>
            <select
              id="outcome-type"
              value={outcomeType}
              onChange={(event) => setOutcomeType(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {OUTCOME_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outcome-contribution">CareerStack contribution</Label>
            <select
              id="outcome-contribution"
              value={contribution}
              onChange={(event) =>
                setContribution(event.target.value as 'yes' | 'partially' | 'not_sure')
              }
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="yes">Yes</option>
              <option value="partially">Partially</option>
              <option value="not_sure">Not sure</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outcome-month">Month</Label>
            <Input
              id="outcome-month"
              type="number"
              min={1}
              max={12}
              required
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outcome-year">Year</Label>
            <Input
              id="outcome-year"
              type="number"
              min={2000}
              required
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outcome-institution">Institution (optional)</Label>
            <Input
              id="outcome-institution"
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outcome-title">Title (optional)</Label>
            <Input id="outcome-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Add outcome'}
            </Button>
          </div>
        </form>
      )}
      {outcomes.length > 0 ? (
        <ul className="space-y-2">
          {outcomes.map((outcome) => (
            <li key={outcome.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <span className="font-medium text-ink">{outcome.label}</span>
              <span className="ml-2 text-ink-muted">
                {outcome.month}/{outcome.year}
              </span>
              <span className="ml-2 text-[10px] font-semibold tracking-wide text-amber-800 uppercase">
                Self-reported
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
