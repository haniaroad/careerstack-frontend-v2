import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
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
import { EmptyState } from '@/components/EmptyState'
import { Label } from '@/components/Label'
import { PeerReviewCard } from '@/components/PeerReviewCard'
import { ProjectLifecycleBadge } from '@/components/ProjectLifecycleBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { apiFetch, ApiError } from '@/lib/api'
import { trackPeerReviewSubmitted } from '@/lib/mixpanel'
import {
  fetchPeerReviews,
  submitPeerReview,
  type PeerReviewSlot,
} from '@/lib/peerReviews'
import type { Project } from '@/lib/projects'
import type { TaskSummary } from '@/lib/tasks'
import { useShell } from '@/shell/ShellContext'

function taskTone(status: TaskSummary['status']): 'info' | 'success' | 'warning' {
  if (status === 'approved') return 'success'
  if (status === 'corrections_requested' || status === 'incomplete') return 'warning'
  return 'info'
}

type Tab = 'projects' | 'tasks' | 'applications' | 'peer_reviews'

function workspaceTypeFromSession(
  session: { active_workspace?: { kind?: string } | null } | null | undefined,
): 'personal' | 'organization' {
  return session?.active_workspace?.kind === 'organization' ? 'organization' : 'personal'
}

export function MyWorkPage() {
  const { session } = useAuth()
  const { activeWorkspaceId } = useShell()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) || 'projects'

  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<TaskSummary[]>([])
  const [peerReviews, setPeerReviews] = useState<PeerReviewSlot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [writing, setWriting] = useState<PeerReviewSlot | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const setTab = (next: Tab) => {
    setSearchParams(next === 'projects' ? {} : { tab: next })
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (tab === 'tasks') {
        const data = await apiFetch<{ tasks: TaskSummary[] }>('/api/v1/tasks')
        setTasks(data.tasks)
      } else if (tab === 'projects') {
        const data = await apiFetch<{ projects: Project[] }>('/api/v1/projects')
        setProjects(data.projects)
      } else if (tab === 'peer_reviews') {
        setPeerReviews(await fetchPeerReviews())
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load My Work')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    void load()
  }, [load, activeWorkspaceId, session?.active_workspace_id])

  async function onSubmitReview() {
    if (!writing) return
    const trimmed = comment.trim()
    if (!trimmed) {
      setFormError('Comment is required')
      return
    }
    if (rating < 1 || rating > 5) {
      setFormError('Rating must be between 1 and 5')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const submitted = await submitPeerReview(writing.id, { rating, comment: trimmed })
      trackPeerReviewSubmitted({ workspace_type: workspaceTypeFromSession(session) })
      setPeerReviews((current) => current.map((row) => (row.id === submitted.id ? submitted : row)))
      setWriting(null)
      setComment('')
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const heading =
    tab === 'tasks' ? 'Tasks' : tab === 'projects' ? 'Projects' : tab === 'peer_reviews' ? 'Peer reviews' : 'My Work'

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-muted">My Work</p>
          <h1 className="font-display text-3xl text-ink">{heading}</h1>
          <p className="mt-2 text-ink-muted">
            {tab === 'tasks'
              ? 'Submit evidence and track AI review for your solo tasks.'
              : tab === 'peer_reviews'
                ? 'Optional teammate confirmation after a team project completes.'
                : 'Drafts and active solo projects in your current workspace.'}
          </p>
        </div>
        {tab === 'projects' ? (
          <Button asChild>
            <Link to="/projects/new">Create project</Link>
          </Button>
        ) : null}
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3" aria-label="My Work sections">
        {(
          [
            ['projects', 'Projects'],
            ['tasks', 'Tasks'],
            ['applications', 'Applications'],
            ['peer_reviews', 'Peer reviews'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              tab === id ? 'bg-ink text-surface' : 'text-ink-muted hover:text-ink'
            }`}
            aria-current={tab === id ? 'page' : undefined}
          >
            {label}
          </button>
        ))}
      </nav>

      {error ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}

      {tab === 'applications' ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="text-ink">Application decisions live in Inbox.</p>
          <p className="mt-1 text-sm text-ink-muted">
            Review pending join applications from the shared Approvals Inbox.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/inbox?tab=applications">Open Inbox applications</Link>
          </Button>
        </div>
      ) : null}

      {tab === 'peer_reviews' ? (
        loading ? (
          <p className="text-ink-muted">Loading peer reviews…</p>
        ) : peerReviews.length === 0 ? (
          <EmptyState
            title="No peer reviews yet"
            description="Optional reviews appear here after a team project in this workspace completes. You will not see another person's slots."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-1">
            {peerReviews.map((review) => (
              <li key={review.id}>
                <PeerReviewCard
                  peerReview={review}
                  onWrite={(next) => {
                    setFormError(null)
                    setRating(next.rating ?? 5)
                    setComment(next.summary)
                    setWriting(next)
                  }}
                />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === 'projects' ? (
        loading ? (
          <p className="text-ink-muted">Loading projects…</p>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6">
            <p className="text-ink">No projects yet.</p>
            <p className="mt-1 text-sm text-ink-muted">
              Start with AI generate or Advanced Setup—confirming uses one credit.
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
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{project.title}</p>
                    {project.summary ? (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{project.summary}</p>
                    ) : null}
                    {project.ends_on ? (
                      <p className="mt-1 text-xs text-ink-muted">Ends {project.ends_on}</p>
                    ) : null}
                  </div>
                  <ProjectLifecycleBadge status={project.status} phase={project.phase} />
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === 'tasks' ? (
        loading ? (
          <p className="text-ink-muted">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6">
            <p className="text-ink">No tasks yet.</p>
            <p className="mt-1 text-sm text-ink-muted">
              Confirm a project with proposed tasks to start submitting evidence.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link to="/my-work">View projects</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  to={`/tasks/${task.id}`}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4 transition hover:border-ink/20"
                >
                  <div>
                    <p className="font-medium text-ink">{task.title}</p>
                    <p className="mt-1 text-sm text-ink-muted">{task.project_title}</p>
                    {task.due_on ? (
                      <p className="mt-1 text-xs text-ink-muted">Due {task.due_on}</p>
                    ) : null}
                  </div>
                  <StatusBadge tone={taskTone(task.status)}>{task.status.replaceAll('_', ' ')}</StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      <Dialog
        open={writing != null}
        onOpenChange={(open) => {
          if (!open) {
            setWriting(null)
            setFormError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write peer review</DialogTitle>
            <DialogDescription>
              {writing
                ? `Optional confirmation for ${writing.to_user_name || 'your teammate'} on ${writing.project_title}.`
                : 'Optional teammate confirmation after project completion.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {formError ? (
              <Alert tone="danger" title="Check this review">
                {formError}
              </Alert>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="peer-review-rating">Rating</Label>
              <select
                id="peer-review-rating"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="peer-review-comment">Comment</Label>
              <textarea
                id="peer-review-comment"
                required
                className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setWriting(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onSubmitReview()} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
