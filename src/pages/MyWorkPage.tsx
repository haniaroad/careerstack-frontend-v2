import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { StatusBadge } from '@/components/StatusBadge'
import { apiFetch, ApiError } from '@/lib/api'
import type { Project } from '@/lib/projects'
import { useShell } from '@/shell/ShellContext'

function statusTone(status: Project['status']): 'info' | 'success' | 'warning' {
  if (status === 'active') return 'success'
  if (status === 'cancelled') return 'warning'
  return 'info'
}

export function MyWorkPage() {
  const { session } = useAuth()
  const { activeWorkspaceId } = useShell()
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ projects: Project[] }>('/api/v1/projects')
      setProjects(data.projects)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, activeWorkspaceId, session?.active_workspace_id])

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-muted">My Work</p>
          <h1 className="font-display text-3xl text-ink">Projects</h1>
          <p className="mt-2 text-ink-muted">
            Drafts and active solo projects in your current workspace.
          </p>
        </div>
        <Button asChild>
          <Link to="/projects/new">Create project</Link>
        </Button>
      </header>

      {error ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-ink-muted">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="text-ink">No projects yet.</p>
          <p className="mt-1 text-sm text-ink-muted">
            Start a manual solo draft—confirming it uses one credit.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/projects/new">Create project</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4 transition hover:border-ink/20"
              >
                <div>
                  <p className="font-medium text-ink">{project.title}</p>
                  {project.summary ? (
                    <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{project.summary}</p>
                  ) : null}
                </div>
                <StatusBadge tone={statusTone(project.status)}>{project.status}</StatusBadge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
