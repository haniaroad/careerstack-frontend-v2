import { Link, useLocation } from 'react-router-dom'
import { ProjectLifecycleBadge } from '@/components/ProjectLifecycleBadge'
import { StatusBadge, type StatusTone } from '@/components/StatusBadge'

type ProfileTask = {
  id?: string
  title?: string
  status?: string
}

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'Not started',
  submitted: 'Submitted for review',
  corrections_requested: 'Changes requested',
  approved: 'Approved',
  incomplete: 'Not finished',
}

export function profileTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status] ?? status.replaceAll('_', ' ')
}

function profileTaskStatusTone(status: string): StatusTone {
  if (status === 'approved') return 'success'
  if (status === 'corrections_requested' || status === 'incomplete') return 'warning'
  return 'info'
}

type ProfileProject = Record<string, unknown> & {
  project_id?: string
  title?: string
  status?: string
  visibility?: string
  kind?: string
  organization_name?: string
  tasks?: ProfileTask[]
}

export function ProfileProjects({ projects }: { projects: ProfileProject[] }) {
  const location = useLocation()
  const from = `${location.pathname}${location.search}`

  if (projects.length === 0) {
    return <p className="text-sm text-ink-muted">No projects to show yet.</p>
  }

  return (
    <ul className="space-y-2">
      {projects.map((project) => {
        const summaryOnly = project.kind === 'accomplishment_summary'
        const canOpen = !summaryOnly && project.visibility === 'public' && project.project_id
        const tasks = summaryOnly ? [] : (project.tasks ?? [])
        return (
          <li key={String(project.project_id)} className="rounded-md border border-border px-3 py-2 text-sm">
            {canOpen ? (
              <Link
                to={`/projects/${project.project_id}?from=${encodeURIComponent(from)}`}
                className="font-medium text-brand underline-offset-2 hover:underline"
              >
                {String(project.title)}
              </Link>
            ) : (
              <p className="font-medium text-ink">{String(project.title)}</p>
            )}
            <p className="mt-1 flex flex-wrap items-center gap-2 text-ink-muted">
              <ProjectLifecycleBadge status={String(project.status)} showPhase={false} />
              {project.organization_name ? <span>{String(project.organization_name)}</span> : null}
              {summaryOnly ? <span>summary</span> : null}
            </p>
            {tasks.length > 0 ? (
              <div className="mt-2 border-l border-border pl-3">
                <p className="text-xs font-medium text-ink-muted">Tasks</p>
                <ul className="mt-1 space-y-1">
                  {tasks.map((task) => (
                    <li key={String(task.id)} className="flex flex-wrap items-center gap-2 text-ink">
                      <span>{task.title}</span>
                      {task.status ? (
                        <StatusBadge tone={profileTaskStatusTone(task.status)}>
                          {profileTaskStatusLabel(task.status)}
                        </StatusBadge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
