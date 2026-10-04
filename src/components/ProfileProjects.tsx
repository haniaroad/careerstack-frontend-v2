import { Link, useLocation } from 'react-router-dom'
import { ProjectLifecycleBadge } from '@/components/ProjectLifecycleBadge'

type ProfileTask = {
  id?: string
  title?: string
  status?: string
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
              <ul className="mt-2 space-y-1 border-l border-border pl-3">
                {tasks.map((task) => (
                  <li key={String(task.id)} className="text-ink">
                    {task.title}
                    {task.status ? <span className="text-ink-muted"> · {task.status.replaceAll('_', ' ')}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
