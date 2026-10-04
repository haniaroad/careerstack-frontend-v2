import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PeerReviewList } from '@/components/PeerReviewList'
import type { ProfilePayload } from '@/lib/profiles'

function ActivityBars({ activity }: { activity: ProfilePayload['stats']['activity'] }) {
  const total = activity.reduce((sum, point) => sum + point.count, 0)
  const max = Math.max(1, ...activity.map((point) => point.count))
  if (total === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Qualifying actions have not been recorded yet. Submitting a task, getting one approved,
        uploading an artifact, leaving a peer review, or completing a project will show up here.
      </p>
    )
  }
  return (
    <div className="space-y-2" aria-label="Contribution activity">
      <p className="text-sm text-ink-muted">
        {total} contribution{total === 1 ? '' : 's'} in the last 26 weeks
      </p>
      <div className="flex h-16 items-end gap-1" aria-hidden>
        {activity
          .filter((point) => point.count > 0)
          .map((point) => (
            <div
              key={point.week_start}
              title={`${point.week_start}: ${point.count}`}
              className="w-3 rounded-sm bg-accent"
              style={{ height: `${Math.max(12, (point.count / max) * 100)}%` }}
            />
          ))}
      </div>
    </div>
  )
}

type SurfaceTab = 'overview' | 'activity' | 'skills' | 'peer_reviews'

const TABS: { id: SurfaceTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'skills', label: 'Skills & artifacts' },
  { id: 'peer_reviews', label: 'Peer reviews' },
]

export function ProfileSurfaceSections({
  profile,
  canReport,
  workspaceType = 'personal',
  overview,
}: {
  profile: ProfilePayload
  canReport: boolean
  workspaceType?: 'personal' | 'organization'
  overview: ReactNode
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab: SurfaceTab = TABS.some((item) => item.id === requested) ? (requested as SurfaceTab) : 'overview'
  const activity = profile.stats.activity ?? []

  function selectTab(id: SurfaceTab) {
    const next = new URLSearchParams(searchParams)
    if (id === 'overview') next.delete('tab')
    else next.set('tab', id)
    setSearchParams(next)
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Profile sections">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              tab === id ? 'bg-ink text-surface' : 'text-ink-muted hover:text-ink'
            }`}
            aria-current={tab === id ? 'page' : undefined}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' ? <div className="space-y-6">{overview}</div> : null}
      {tab === 'activity' ? (
        <ActivityBars activity={activity} />
      ) : null}
      {tab === 'skills' ? (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-ink">Skills</h2>
            {(profile.evidence.skills ?? []).length === 0 ? (
              <p className="text-sm text-ink-muted">No skills listed yet.</p>
            ) : (
              <ul className="space-y-2">
                {(profile.evidence.skills ?? []).map((skill) => (
                  <li key={skill.name} className="rounded-md border border-border px-3 py-2 text-sm">
                    <span className="font-medium text-ink">{skill.name}</span>
                    <span className="ml-2 text-ink-muted">{skill.level.replaceAll('_', ' ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-ink">Artifacts</h2>
            {(profile.evidence.artifacts ?? []).length === 0 ? (
              <p className="text-sm text-ink-muted">No artifacts yet.</p>
            ) : (
              <ul className="space-y-2">
                {(profile.evidence.artifacts ?? []).map((artifact) => (
                  <li key={`${artifact.kind}-${artifact.label}`} className="text-sm text-ink">
                    {artifact.url ? (
                      <a href={artifact.url} className="text-brand underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer nofollow">
                        {artifact.label}
                      </a>
                    ) : (
                      artifact.label
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
      {tab === 'peer_reviews' ? (
        <PeerReviewList
          reviews={profile.peer_reviews ?? []}
          canReport={canReport}
          workspaceType={workspaceType}
        />
      ) : null}
    </div>
  )
}
