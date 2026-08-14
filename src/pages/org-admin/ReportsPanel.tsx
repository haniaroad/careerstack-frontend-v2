import { useEffect, useState } from 'react'
import { Download, FileText, ShieldAlert } from 'lucide-react'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/Dialog'
import { Label } from '@/components/Label'
import { ApiError } from '@/lib/api'
import { trackReportGenerated } from '@/lib/mixpanel'
import {
  createReport,
  downloadReport,
  fetchOutcomeAggregates,
  fetchReport,
  fetchReports,
  generateReport,
  type OrganizationReport,
  type OutcomeAggregate,
  type Program,
  type ReportFormat,
} from '@/lib/organizationAdmin'


const STATUS_LABEL: Record<OrganizationReport['status'], string> = {
  draft: 'Draft',
  generating: 'Generating',
  ready: 'Ready',
  failed: 'Failed',
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pollReport(id: string, onUpdate: (report: OrganizationReport) => void) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const data = await fetchReport(id)
    onUpdate(data.report)
    if (data.report.status === 'ready' || data.report.status === 'failed') return data.report
    await sleep(import.meta.env.MODE === 'test' ? 0 : 1000)
  }
  throw new ApiError(408, 'report_timeout', 'Report generation is taking too long. Try again.')
}

export function ReportsPanel({
  organizationId,
  programs,
  workspaceStatus,
  onCountChange,
}: {
  organizationId: string
  programs: Program[]
  workspaceStatus: 'active' | 'offboarding_readonly' | 'disabled'
  onCountChange?: (count: number) => void
}) {
  const exportAllowed = workspaceStatus !== 'disabled'
  const [reports, setReports] = useState<OrganizationReport[]>([])
  const [outcomes, setOutcomes] = useState<OutcomeAggregate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [periodStart, setPeriodStart] = useState('2026-01-01')
  const [periodEnd, setPeriodEnd] = useState('2026-12-31')
  const [programId, setProgramId] = useState('')
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [aggregateOnly, setAggregateOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [warningReport, setWarningReport] = useState<OrganizationReport | null>(null)

  async function load() {
    const [reportPayload, outcomePayload] = await Promise.all([
      fetchReports(organizationId),
      fetchOutcomeAggregates(organizationId),
    ])
    setReports(reportPayload.reports)
    setOutcomes(outcomePayload.outcomes)
    onCountChange?.(reportPayload.reports.length)
  }

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof Error ? err.message : 'Unable to load reports')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  function upsert(report: OrganizationReport) {
    setReports((prev) => {
      const rest = prev.filter((item) => item.id !== report.id)
      return [report, ...rest]
    })
  }

  async function onCreate() {
    if (!exportAllowed) return
    setBusy(true)
    setError(null)
    try {
      const created = await createReport(organizationId, {
        period_starts_on: periodStart,
        period_ends_on: periodEnd,
        program_id: programId || null,
        format,
        aggregate_only: aggregateOnly,
      })
      upsert(created.report)
      setFormOpen(false)
      await onGenerate(created.report)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create report')
    } finally {
      setBusy(false)
    }
  }

  async function onGenerate(report: OrganizationReport) {
    if (!exportAllowed) return
    setError(null)
    try {
      const started = await generateReport(report.id)
      upsert(started.report)
      const finished =
        started.report.status === 'ready' || started.report.status === 'failed'
          ? started.report
          : await pollReport(started.report.id, upsert)
      upsert(finished)
      if (finished.status === 'ready') {
        trackReportGenerated({
          workspace_type: 'organization',
          format: finished.format,
          aggregate_only: finished.aggregate_only,
        })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate report')
      try {
        const data = await fetchReport(report.id)
        upsert(data.report)
      } catch {
        await load()
      }
    }
  }

  async function onDownload(report: OrganizationReport, confirmed = false) {
    if (!exportAllowed) return
    setError(null)
    try {
      const result = await downloadReport(report.id, confirmed)
      window.open(result.url, '_blank', 'noopener,noreferrer')
      setWarningReport(null)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'minor_names_confirmation_required') {
        setWarningReport(report)
        return
      }
      setError(err instanceof ApiError ? err.message : 'Could not download report')
    }
  }

  return (
    <div className="space-y-6">
      {workspaceStatus === 'offboarding_readonly' ? (
        <Alert tone="info" title="Offboarding — exports still available">
          New programs, projects, and invitations are blocked. You can still generate and download
          reports during the read-only window.
        </Alert>
      ) : null}
      {workspaceStatus === 'disabled' ? (
        <Alert tone="warning" title="Workspace disabled">
          This Organization workspace is disabled. Report generate and download are unavailable.
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-ink-muted">
          Stakeholder-ready exports with optional aggregate-only mode. Branded PDFs may include the
          organization logo; CareerStack actions and focus states stay unchanged.
        </p>
        {exportAllowed ? (
          <Button type="button" onClick={() => setFormOpen((open) => !open)}>
            <FileText className="size-4" aria-hidden />
            New report
          </Button>
        ) : null}
      </div>

      {formOpen && exportAllowed ? (
        <form
          className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void onCreate()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="period-start">Period start</Label>
            <input
              id="period-start"
              type="date"
              required
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="period-end">Period end</Label>
            <input
              id="period-end"
              type="date"
              required
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-program">Program</Label>
            <select
              id="report-program"
              value={programId}
              onChange={(event) => setProgramId(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">All programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-format">Format</Label>
            <select
              id="report-format"
              value={format}
              onChange={(event) => setFormat(event.target.value as ReportFormat)}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
            <input
              type="checkbox"
              checked={aggregateOnly}
              onChange={(event) => setAggregateOnly(event.target.checked)}
              className="size-4 accent-ink"
            />
            Aggregate only (strip names, emails, and narratives)
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create and generate'}
            </Button>
          </div>
        </form>
      ) : null}

      {outcomes.length > 0 ? (
        <section
          aria-labelledby="outcomes-heading"
          className="rounded-lg border border-border bg-surface px-4 py-4"
        >
          <h3
            id="outcomes-heading"
            className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase"
          >
            Self-reported outcomes
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {outcomes.map((outcome) => (
              <li
                key={outcome.outcome_type}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5"
              >
                <span className="font-mono text-sm font-semibold text-ink tabular-nums">
                  {outcome.count}
                </span>
                <span className="text-sm text-ink">{outcome.label}</span>
                <span className="text-[10px] font-semibold tracking-wide text-amber-800 uppercase">
                  Self-reported
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="space-y-3">
        {reports.map((report) => (
          <li key={report.id} className="rounded-lg border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-ink">{report.title}</h3>
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase">
                    {STATUS_LABEL[report.status]}
                  </span>
                  <span className="rounded bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent uppercase">
                    {report.format}
                  </span>
                  {report.aggregate_only ? (
                    <span className="rounded border border-border px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                      Aggregate only
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm text-ink-muted">
                  {report.program_name ?? 'All programs'} · {report.period_label}
                </p>
                {report.includes_minor_names && report.status === 'ready' ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-800">
                    <ShieldAlert className="size-3.5" aria-hidden />
                    Includes minor names — confirm before download
                  </p>
                ) : null}
              </div>
              {exportAllowed ? (
                <div className="flex flex-wrap gap-2">
                  {report.status === 'draft' || report.status === 'failed' ? (
                    <Button type="button" variant="secondary" onClick={() => void onGenerate(report)}>
                      Generate
                    </Button>
                  ) : null}
                  {report.status === 'ready' ? (
                    <Button type="button" onClick={() => void onDownload(report)}>
                      <Download className="size-3.5" aria-hidden />
                      Download
                    </Button>
                  ) : null}
                  {report.status === 'generating' ? (
                    <span className="inline-flex h-9 items-center px-2 text-sm text-ink-muted">
                      Preparing export…
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {reports.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-ink-muted">
          No reports yet. Create a branded PDF or member CSV for stakeholders.
        </p>
      ) : null}

      <Dialog open={Boolean(warningReport)} onOpenChange={(open) => !open && setWarningReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report includes minor names</DialogTitle>
            <DialogDescription>
              {warningReport
                ? `“${warningReport.title}” contains names of minor participants. Continue only if your export audience is authorized. Prefer aggregate-only when sharing broadly.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setWarningReport(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => warningReport && void onDownload(warningReport, true)}
            >
              Continue download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
