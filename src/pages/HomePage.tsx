import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { apiFetch, ApiError } from '@/lib/api'
import type { InboxItem } from '@/lib/inbox'
import { trackProjectGraceObserved } from '@/lib/mixpanel'
import {
  formatProjectPhase,
  type Project,
  type ProjectPhase,
} from '@/lib/projects'
import { useShell } from '@/shell/ShellContext'

type LifecycleWarning = {
  projectId: string
  title: string
  phase: Extract<ProjectPhase, 'ending_soon' | 'grace_period'> | 'expired'
  endsOn: string | null
  message: string
  priority: number
}

function buildWarnings(projects: Project[], alerts: InboxItem[]): LifecycleWarning[] {
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

  for (const alert of alerts) {
    if (alert.category !== 'alert' || !alert.project_id) continue
    const kind = String(alert.payload.kind ?? '')
    if (kind !== 'lifecycle') continue
    if (byId.has(alert.project_id)) continue
    const label = alert.status_label.toLowerCase()
    const titleLower = alert.title.toLowerCase()
    let phase: LifecycleWarning['phase'] = 'ending_soon'
    let priority = 2
    if (label.includes('expir') || titleLower.includes('expir')) {
      phase = 'expired'
      priority = 0
    } else if (label.includes('grace') || titleLower.includes('grace')) {
      phase = 'grace_period'
      priority = 1
    }
    byId.set(alert.project_id, {
      projectId: alert.project_id,
      title: alert.project_title,
      phase,
      endsOn: null,
      message: alert.description || alert.title,
      priority,
    })
  }

  return [...byId.values()].sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))
}

export function HomePage() {
  const { activeWorkspaceId } = useShell()
  const [projects, setProjects] = useState<Project[]>([])
  const [alerts, setAlerts] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [projectsData, alertsData] = await Promise.all([
        apiFetch<{ projects: Project[] }>('/api/v1/projects'),
        apiFetch<{ items: InboxItem[] }>('/api/v1/inbox/items?category=alert').catch(() => ({
          items: [] as InboxItem[],
        })),
      ])
      setProjects(projectsData.projects)
      setAlerts(alertsData.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load Home')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, activeWorkspaceId])

  const warnings = useMemo(() => buildWarnings(projects, alerts), [projects, alerts])

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
          Ending and expiration warnings for projects you create or participate in, plus quick
          links to create and My Work.
        </p>
      </header>

      {error ? (
        <Alert tone="danger" title="Something went wrong">
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
            <div className="mt-3">
              <Button asChild size="sm">
                <Link to={`/projects/${primary.projectId}`}>Open project</Link>
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
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/projects/${warning.projectId}`}>Open project</Link>
                </Button>
              </div>
            </Alert>
          ))}
        </section>
      ) : null}

      {!loading && !primary && !error ? (
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
