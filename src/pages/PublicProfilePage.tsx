import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { ApiError } from '@/lib/api'
import { trackProfileViewed } from '@/lib/mixpanel'
import { fetchProfileBySlug, type ProfilePayload } from '@/lib/profiles'

function Stats({ stats }: { stats: ProfilePayload['stats'] }) {
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {[
        ['Projects completed', stats.projects_completed],
        ['Active projects', stats.active_projects],
        ['Tasks approved', stats.tasks_approved],
      ].map(([label, value]) => (
        <div key={String(label)} className="rounded-lg border border-border bg-surface px-3.5 py-3">
          <dt className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">{label}</dt>
          <dd className="mt-1 font-display text-2xl text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      setNotFound(false)
      setError(null)
      try {
        const data = await fetchProfileBySlug(slug)
        if (cancelled) return
        setProfile(data)
        trackProfileViewed({ visibility: data.visibility, own: false })
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
          setProfile(null)
        } else {
          setError(err instanceof ApiError ? err.message : 'Could not load profile')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-display text-3xl text-ink">Profile not found</h1>
        <p className="text-ink-muted">This profile is unavailable.</p>
        <Button asChild variant="outline">
          <Link to="/home">Back to Home</Link>
        </Button>
      </div>
    )
  }

  if (error) {
    return <Alert tone="danger" title="Something went wrong">{error}</Alert>
  }

  if (!profile) {
    return <p className="text-sm text-ink-muted">Loading profile…</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-ink-muted">Profile</p>
        <h1 className="font-display text-3xl text-ink">{profile.details.display_name}</h1>
        <p className="text-ink-muted">
          {profile.details.country}
          {profile.details.state_region ? ` · ${profile.details.state_region}` : ''}
        </p>
        {profile.details.bio ? <p className="text-ink">{profile.details.bio}</p> : null}
      </header>

      <Stats stats={profile.stats} />

      {profile.links.length > 0 ? (
        <ul className="space-y-2">
          {profile.links.map((link) => (
            <li key={link.provider}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-sm text-accent underline-offset-2 hover:underline"
              >
                <span className="font-medium capitalize">{link.provider}</span>
                <span className="ml-2 break-all text-ink">{link.url}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Projects</h2>
        {profile.projects.length === 0 ? (
          <p className="text-sm text-ink-muted">No projects to show yet.</p>
        ) : (
          <ul className="space-y-2">
            {profile.projects.map((project) => (
              <li
                key={String(project.project_id)}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                <p className="font-medium text-ink">{String(project.title)}</p>
                <p className="text-ink-muted">
                  {String(project.status)}
                  {project.organization_name ? ` · ${String(project.organization_name)}` : ''}
                  {project.kind === 'accomplishment_summary' ? ' · summary' : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Skills</h2>
        {profile.evidence.skills.length === 0 ? (
          <p className="text-sm text-ink-muted">No skills listed yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {profile.evidence.skills.map((skill) => (
              <li
                key={skill.name}
                className="rounded-md border border-border px-2.5 py-1 text-sm text-ink"
              >
                {skill.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
