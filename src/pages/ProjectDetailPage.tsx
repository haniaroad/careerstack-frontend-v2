import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { StatusBadge } from '@/components/StatusBadge'
import { apiFetch, ApiError } from '@/lib/api'
import type { Project } from '@/lib/projects'
import type { SessionPayload } from '@/auth/types'

function statusTone(status: Project['status']): 'info' | 'success' | 'warning' {
  if (status === 'active') return 'success'
  if (status === 'cancelled') return 'warning'
  return 'info'
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session, setSession } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      const data = await apiFetch<{ project: Project }>(`/api/v1/projects/${id}`)
      setProject(data.project)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load project')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCancel() {
    if (!project || project.status !== 'active') return
    setBusy(true)
    setError(null)
    try {
      const data = await apiFetch<{ project: Project; session: SessionPayload }>(
        `/api/v1/projects/${project.id}/cancel`,
        { method: 'POST' },
      )
      setProject(data.project)
      setSession(data.session)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to cancel project')
    } finally {
      setBusy(false)
    }
  }

  async function handleDiscard() {
    if (!project || project.status !== 'draft') return
    setBusy(true)
    try {
      await apiFetch(`/api/v1/projects/${project.id}`, { method: 'DELETE' })
      navigate('/my-work')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to discard draft')
      setBusy(false)
    }
  }

  if (error && !project) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
        <Button asChild variant="secondary">
          <Link to="/my-work">Back to My Work</Link>
        </Button>
      </div>
    )
  }

  if (!project) {
    return <p className="text-ink-muted">Loading project…</p>
  }

  const isCreator = session?.user.id === project.creator_id

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-medium text-ink-muted">Project</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-ink">{project.title}</h1>
          <StatusBadge tone={statusTone(project.status)}>{project.status}</StatusBadge>
        </div>
        {project.summary ? <p className="text-ink-muted">{project.summary}</p> : null}
        {project.skills.length > 0 ? (
          <p className="text-sm text-ink-muted">Skills: {project.skills.join(', ')}</p>
        ) : null}
      </header>

      {error ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}

      <div className="rounded-lg border border-border bg-surface p-5 text-sm text-ink-muted">
        Task workflows are not available in this release. Use cancel to restore the create credit
        when ending an active solo project.
      </div>

      <div className="flex flex-wrap gap-3">
        {isCreator && project.status === 'draft' ? (
          <>
            <Button asChild>
              <Link to={`/projects/${project.id}/edit`}>Edit draft</Link>
            </Button>
            <Button variant="secondary" onClick={() => void handleDiscard()} disabled={busy}>
              Discard draft
            </Button>
          </>
        ) : null}
        {isCreator && project.status === 'active' ? (
          <Button variant="secondary" onClick={() => void handleCancel()} disabled={busy}>
            Cancel project
          </Button>
        ) : null}
        <Button asChild variant="ghost">
          <Link to="/my-work">Back to My Work</Link>
        </Button>
      </div>
    </div>
  )
}
