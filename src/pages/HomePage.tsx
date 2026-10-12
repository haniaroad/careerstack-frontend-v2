import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { FirstRunTip } from '@/components/FirstRunTip'
import { apiFetch, ApiError } from '@/lib/api'
import type { InboxItem } from '@/lib/inbox'
import { trackProjectGraceObserved } from '@/lib/mixpanel'
import {
  formatProjectPhase,
  type Project,
  type ProjectPhase,
} from '@/lib/projects'
import { useShell } from '@/shell/ShellContext'

type NoticePhase = Extract<ProjectPhase, 'ending_soon' | 'grace_period'> | 'expired' | 'completed'

type LifecycleWarning = {
  projectId: string
  title: string
  phase: Exclude<NoticePhase, 'completed'>
  endsOn: string | null
  message: string
  priority: number
}

type CompletionNotice = {
  projectId: string
  title: string
  phase: 'completed'
  message: string
}

type WarningDismissal = {
  project_id: string
  phase: NoticePhase
}

function lifecyclePhase(alert: InboxItem): string | null {
  const phase = alert.payload.lifecycle_phase
  return typeof phase === 'string' && phase.length > 0 ? phase : null
}

function buildWarnings(projects: Project[]): LifecycleWarning[] {
  const byId = new Map<string, LifecycleWarning>()

  for (const project of projects) {
    if (project.status === 'expired') {
      byId.set(project.id, {
        projectId: project.id,
        title: project.title,
        phase: 'expired',
        endsOn: project.ends_on,
        message: 'This project has expired and is read-only.',
        priority: 0,
      })
      continue
    }
    if (project.status !== 'active') continue
    if (project.phase === 'grace_period') {
      byId.set(project.id, {
        projectId: project.id,
        title: project.title,
        phase: 'grace_period',
        endsOn: project.ends_on,
        message: project.ends_on
          ? `Grace period after ${project.ends_on}. Submissions still allowed until final expiration.`
          : 'Project is in grace period. Submissions still allowed until final expiration.',
        priority: 1,
      })
    } else if (project.phase === 'ending_soon') {
      byId.set(project.id, {
        projectId: project.id,
        title: project.title,
        phase: 'ending_soon',
        endsOn: project.ends_on,
        message: project.ends_on
          ? `Ending soon on ${project.ends_on}. Finish remaining work or extend the end date.`
          : 'This project is ending soon.',
        priority: 2,
      })
    }
  }

  return [...byId.values()].sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))
}

function buildCompletions(projects: Project[], alerts: InboxItem[]): CompletionNotice[] {
  const projectsById = new Map(projects.map((project) => [project.id, project]))
  const notices = new Map<string, CompletionNotice>()

  for (const alert of alerts) {
    if (alert.category !== 'alert' || !alert.project_id) continue
    if (String(alert.payload.kind ?? '') !== 'lifecycle') continue

    const project = projectsById.get(alert.project_id)
    if (project && project.status !== 'completed') continue

    const phase = lifecyclePhase(alert)
    const projectCompleted = project?.status === 'completed'
    if (!projectCompleted && phase !== 'completed') continue

    const title = project?.title || alert.project_title
    const fromCompletionAlert = phase === 'completed' && (alert.description ?? '').trim().length > 0
    const message = fromCompletionAlert
      ? alert.description
      : `${title} is complete — all tasks were approved.`
    const current = notices.get(alert.project_id)
    if (current && phase !== 'completed') continue
    notices.set(alert.project_id, { projectId: alert.project_id, title, phase: 'completed', message })
  }

  return [...notices.values()].sort((a, b) => a.title.localeCompare(b.title))
}

export function HomePage() {
  const { activeWorkspaceId } = useShell()
  const [projects, setProjects] = useState<Project[]>([])
  const [alerts, setAlerts] = useState<InboxItem[]>([])
  const [dismissals, setDismissals] = useState<WarningDismissal[]>([])
  const [suppressed, setSuppressed] = useState<WarningDismissal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [projectsData, alertsData, dismissalData] = await Promise.all([
        apiFetch<{ projects: Project[] }>('/api/v1/projects'),
        apiFetch<{ items: InboxItem[] }>('/api/v1/inbox/items?category=alert').catch(() => ({
          items: [] as InboxItem[],
        })),
        apiFetch<{ dismissals: WarningDismissal[] }>('/api/v1/home/warning_dismissals').catch(() => ({
          dismissals: [] as WarningDismissal[],
        })),
      ])
      setProjects(projectsData.projects)
      setAlerts(alertsData.items)
      setDismissals(dismissalData.dismissals)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load Home')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, activeWorkspaceId])

  const hidden = useCallback(
    (projectId: string, phase: NoticePhase) =>
      [...dismissals, ...suppressed].some(
        (dismissal) => dismissal.project_id === projectId && dismissal.phase === phase,
      ),
    [dismissals, suppressed],
  )

  const warnings = useMemo(
    () => buildWarnings(projects).filter((warning) => !hidden(warning.projectId, warning.phase)),
    [projects, hidden],
  )

  const completions = useMemo(
    () => buildCompletions(projects, alerts).filter((notice) => !hidden(notice.projectId, notice.phase)),
    [projects, alerts, hidden],
  )

  async function dismissNotice(notice: { projectId: string; phase: NoticePhase }) {
    setError(null)
    try {
      await apiFetch('/api/v1/home/warning_dismissals', {
        method: 'POST',
        body: JSON.stringify({ project_id: notice.projectId, phase: notice.phase }),
      })
      setDismissals((current) => [
        ...current,
        { project_id: notice.projectId, phase: notice.phase },
      ])
    } catch (err) {
      setSuppressed((current) => [
        ...current,
        { project_id: notice.projectId, phase: notice.phase },
      ])
      setError(err instanceof ApiError ? err.message : 'Unable to dismiss this warning')
    }
  }

  useEffect(() => {
    for (const warning of warnings) {
      if (warning.phase === 'grace_period') {
        trackProjectGraceObserved({ project_id: warning.projectId })
      }
    }
  }, [warnings])

  const primary = warnings[0] ?? null

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-ink-muted">Home</p>
        <h1 className="font-display text-3xl text-ink">Your next actions</h1>
        <p className="max-w-xl text-ink-muted">
          Projects that are ending, in a grace period, or expired show up here. Open one to finish
          the work, or start something new.
        </p>
      </header>

      <FirstRunTip destination="home" />

      {error ? (
        <Alert tone="danger" title="Something went wrong" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {loading ? <p className="text-ink-muted">Loading Home…</p> : null}

      {!loading && primary ? (
        <section className="space-y-3" aria-label="Lifecycle warnings">
          <Alert
            tone={primary.phase === 'expired' ? 'danger' : 'warning'}
            title={
              primary.phase === 'expired'
                ? `${primary.title} expired`
                : `${primary.title} — ${formatProjectPhase(primary.phase)}`
            }
          >
            <p>{primary.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to={`/projects/${primary.projectId}`}>Open project</Link>
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void dismissNotice(primary)}>
                Dismiss
              </Button>
            </div>
          </Alert>
          {warnings.slice(1).map((warning) => (
            <Alert
              key={warning.projectId}
              tone={warning.phase === 'expired' ? 'danger' : 'warning'}
              title={
                warning.phase === 'expired'
                  ? `${warning.title} expired`
                  : `${warning.title} — ${formatProjectPhase(warning.phase)}`
              }
            >
              <p>{warning.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/projects/${warning.projectId}`}>Open project</Link>
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void dismissNotice(warning)}>
                  Dismiss
                </Button>
              </div>
            </Alert>
          ))}
        </section>
      ) : null}

      {!loading && completions.length > 0 ? (
        <section className="space-y-3" aria-label="Completed projects">
          {completions.map((notice) => (
            <Alert key={notice.projectId} tone="success" title={`${notice.title} is complete`}>
              <p>{notice.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to={`/projects/${notice.projectId}`}>Open project</Link>
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void dismissNotice(notice)}>
                  Dismiss
                </Button>
              </div>
            </Alert>
          ))}
        </section>
      ) : null}

      {!loading && !primary && completions.length === 0 && !error ? (
        <Alert tone="info" title="No lifecycle warnings">
          You have no ending-soon, grace, or expired project warnings right now.
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button asChild size="sm">
          <Link to="/projects/new">Create project</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/my-work">Open My Work</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/inbox">Open Inbox</Link>
        </Button>
      </div>
    </div>
  )
}
