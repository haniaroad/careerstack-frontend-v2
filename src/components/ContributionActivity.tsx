import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/Tooltip'

export type ActivityKind =
  | 'task_submitted'
  | 'task_approved'
  | 'artifact_uploaded'
  | 'peer_review_submitted'
  | 'project_completed'

export type ActivityPoint = {
  week_start: string
  count: number
  by_kind?: Partial<Record<ActivityKind, number>>
}

const KIND_PHRASES: Record<ActivityKind, [string, string]> = {
  task_submitted: ['task submitted', 'tasks submitted'],
  task_approved: ['task approved', 'tasks approved'],
  artifact_uploaded: ['artifact uploaded', 'artifacts uploaded'],
  peer_review_submitted: ['peer review', 'peer reviews'],
  project_completed: ['project completed', 'projects completed'],
}

const EMPTY_COPY =
  'Qualifying actions have not been recorded yet. Submitting a task, getting one approved, uploading an artifact, leaving a peer review, or completing a project will show up here.'

function formatWeek(iso: string) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))
  return `Week of ${formatted}`
}

function kindLine(kind: string, count: number) {
  const phrases = KIND_PHRASES[kind as ActivityKind]
  if (!phrases) return `${count} ${kind.replaceAll('_', ' ')}`
  return `${count} ${count === 1 ? phrases[0] : phrases[1]}`
}

export function activitySummary(point: ActivityPoint) {
  const week = formatWeek(point.week_start)
  const total = `${point.count} contribution${point.count === 1 ? '' : 's'}`
  const kinds = Object.entries(point.by_kind ?? {})
    .filter((entry): entry is [string, number] => (entry[1] ?? 0) > 0)
    .map(([kind, count]) => kindLine(kind, count))
  return {
    week,
    total,
    kinds,
    accessibleName: [week, total, ...kinds].join(', '),
  }
}

export function ContributionActivity({ activity }: { activity: ActivityPoint[] }) {
  const total = activity.reduce((sum, point) => sum + point.count, 0)
  const filled = activity.filter((point) => point.count > 0)
  const max = Math.max(1, ...filled.map((point) => point.count))

  if (total === 0) {
    return <p className="text-sm text-ink-muted">{EMPTY_COPY}</p>
  }

  return (
    <div className="space-y-2" aria-label="Contribution activity">
      <p className="text-sm text-ink-muted">
        {total} contribution{total === 1 ? '' : 's'} in the last 26 weeks
      </p>
      <div className="w-full overflow-x-auto rounded-md bg-muted px-3 py-3">
        <div className="flex h-20 min-w-full items-end justify-start gap-2">
          {filled.map((point) => {
            const summary = activitySummary(point)
            return (
              <Tooltip key={point.week_start}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="w-8 shrink-0 rounded-sm bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    style={{ height: `${Math.max(40, (point.count / max) * 100)}%` }}
                    aria-label={summary.accessibleName}
                  />
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-left">
                  <p className="font-medium">{summary.week}</p>
                  <p>{summary.total}</p>
                  {summary.kinds.length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {summary.kinds.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </div>
  )
}
