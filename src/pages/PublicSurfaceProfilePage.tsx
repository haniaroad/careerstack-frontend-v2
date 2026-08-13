import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { PublicPageFrame } from '@/components/public/PublicPageFrame'
import {
  CopyPublicLink,
  PublicNotFound,
  usePublicAuthActions,
} from '@/components/public/PublicSurfaceShared'
import { ApiError } from '@/lib/api'
import { setDocumentMeta } from '@/lib/documentMeta'
import { profileAbsoluteUrl, profilePublicPath, type ProfilePayload } from '@/lib/profiles'
import { fetchPublicProfile } from '@/lib/publicSurfaces'

/** Anonymous shell-less public profile page. */
export function PublicSurfaceProfilePage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const returnPath = profilePublicPath(slug)
  const { onSignIn, onCreateAccount } = usePublicAuthActions(returnPath)
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
        const data = await fetchPublicProfile(slug)
        if (cancelled) return
        setProfile(data.profile)
        setDocumentMeta({
          title: `${data.profile.details.display_name} · CareerStack`,
          description: data.profile.details.bio ?? 'CareerStack public profile',
          canonicalPath: data.canonical_path,
          indexable: data.indexable,
        })
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
          setDocumentMeta({
            title: 'Not found · CareerStack',
            description: 'This profile is unavailable.',
            canonicalPath: returnPath,
            indexable: false,
          })
        } else {
          setError(err instanceof ApiError ? err.message : 'Could not load profile')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, returnPath])

  if (notFound) {
    return <PublicNotFound onSignIn={onSignIn} onCreateAccount={onCreateAccount} />
  }

  if (error) {
    return (
      <PublicPageFrame onSignIn={onSignIn} onCreateAccount={onCreateAccount}>
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      </PublicPageFrame>
    )
  }

  if (!profile) {
    return (
      <PublicPageFrame onSignIn={onSignIn} onCreateAccount={onCreateAccount}>
        <p className="text-sm text-ink-muted">Loading profile…</p>
      </PublicPageFrame>
    )
  }

  const details = profile.details

  return (
    <PublicPageFrame onSignIn={onSignIn} onCreateAccount={onCreateAccount}>
      <article className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Public profile
          </p>
          <h1 className="font-display text-4xl tracking-tight text-ink">{details.display_name}</h1>
          <p className="text-sm text-ink-muted">
            {details.country}
            {details.state_region ? ` · ${details.state_region}` : ''}
          </p>
          {details.bio ? <p className="text-base text-ink-muted">{details.bio}</p> : null}
          <CopyPublicLink absoluteUrl={profileAbsoluteUrl(details.slug)} />
        </header>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink">Contribution</h2>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              ['Projects completed', profile.stats.projects_completed],
              ['Active projects', profile.stats.active_projects],
              ['Tasks approved', profile.stats.tasks_approved],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-lg border border-border bg-surface px-3.5 py-3"
              >
                <dt className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  {label}
                </dt>
                <dd className="mt-1 font-display text-2xl text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {profile.evidence.skills.length ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-ink">Skills</h2>
            <ul className="flex flex-wrap gap-2">
              {profile.evidence.skills.map((skill) => (
                <li
                  key={skill.name}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-ink"
                >
                  {skill.name}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {profile.links.length ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-ink">Links</h2>
            <ul className="space-y-1 text-sm">
              {profile.links.map((link) => (
                <li key={link.provider}>
                  <a
                    className="underline-offset-2 hover:underline"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {link.provider}: {link.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-display text-2xl text-ink">Join CareerStack</h2>
          <p className="text-sm text-ink-muted">
            Create an account to build projects and grow your own contribution record.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-md bg-ink px-3 text-sm font-medium text-canvas"
              onClick={onCreateAccount}
            >
              Create account
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium"
              onClick={onSignIn}
            >
              Sign in
            </button>
          </div>
        </section>
      </article>
    </PublicPageFrame>
  )
}
