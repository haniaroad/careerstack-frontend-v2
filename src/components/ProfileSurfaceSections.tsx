import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PeerReviewList } from '@/components/PeerReviewList'
import type { ProfilePayload } from '@/lib/profiles'

type SurfaceTab = 'overview' | 'peer_reviews'

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
  const tab = (searchParams.get('tab') as SurfaceTab) === 'peer_reviews' ? 'peer_reviews' : 'overview'

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Profile sections">
        {(
          [
            ['overview', 'Overview'],
            ['peer_reviews', 'Peer reviews'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSearchParams(id === 'overview' ? {} : { tab: id })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              tab === id ? 'bg-ink text-surface' : 'text-ink-muted hover:text-ink'
            }`}
            aria-current={tab === id ? 'page' : undefined}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' ? <div className="space-y-6">{overview}</div> : (
        <PeerReviewList
          reviews={profile.peer_reviews ?? []}
          canReport={canReport}
          workspaceType={workspaceType}
        />
      )}
    </div>
  )
}
