import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { PublicPageFrame } from '@/components/public/PublicPageFrame'
import {
  CopyPublicLink,
  PublicNotFound,
  usePublicAuthActions,
} from '@/components/public/PublicSurfaceShared'
import { ApiError } from '@/lib/api'
import {
  fetchPublicProject,
  projectAbsoluteUrl,
  projectPublicPath,
  type PublicProjectPayload,
} from '@/lib/publicSurfaces'
import { setDocumentMeta } from '@/lib/documentMeta'

/** Anonymous (or unresolved) shell-less public project page. Param is `:idOrSlug` or `:slug`. */
export function PublicSurfaceProjectPage() {
  const params = useParams<{ id?: string; slug?: string }>()
  const slug = params.id ?? params.slug ?? ''
  const returnPath = projectPublicPath(slug)
  const { onSignIn, onCreateAccount } = usePublicAuthActions(returnPath)
  const [project, setProject] = useState<PublicProjectPayload | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      setNotFound(false)
      setError(null)
      try {
        const data = await fetchPublicProject(slug)
        if (cancelled) return
        setProject(data)
        setDocumentMeta({
          title: `${data.title} · CareerStack`,
          description: data.summary ?? 'CareerStack public project',
          canonicalPath: data.canonical_path,
          indexable: data.indexable,
        })
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
          setDocumentMeta({
            title: 'Not found · CareerStack',
            description: 'This project is unavailable.',
            canonicalPath: returnPath,
            indexable: false,
          })
        } else {
          setError(err instanceof ApiError ? err.message : 'Could not load project')
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

  if (!project) {
    return (
      <PublicPageFrame onSignIn={onSignIn} onCreateAccount={onCreateAccount}>
        <p className="text-sm text-ink-muted">Loading project…</p>
      </PublicPageFrame>
    )
  }

  const joinAvailable = project.mode === 'team' && project.recruitment_state === 'open'

  return (
    <PublicPageFrame onSignIn={onSignIn} onCreateAccount={onCreateAccount}>
      <article className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Public project · {project.status}
            {project.phase !== 'normal' ? ` · ${project.phase.replaceAll('_', ' ')}` : ''}
          </p>
          <h1 className="font-display text-4xl tracking-tight text-ink">{project.title}</h1>
          {project.summary ? <p className="text-base text-ink-muted">{project.summary}</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <CopyPublicLink absoluteUrl={projectAbsoluteUrl(project.slug)} />
            {joinAvailable ? (
              <Button type="button" className="h-9" onClick={onCreateAccount}>
                {project.joining_mode === 'application' ? 'Apply to join' : 'Join project'}
              </Button>
            ) : null}
          </div>
        </header>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink">Creator</h2>
          {project.creator.profile_slug ? (
            <Link
              className="text-sm font-medium text-ink underline-offset-2 hover:underline"
              to={`/profile/${project.creator.profile_slug}`}
            >
              {project.creator.display_name}
            </Link>
          ) : (
            <p className="text-sm text-ink">{project.creator.display_name}</p>
          )}
        </section>

        {project.definition_of_done ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-ink">Definition of done</h2>
            <p className="text-sm text-ink-muted whitespace-pre-wrap">{project.definition_of_done}</p>
          </section>
        ) : null}

        {project.skills.length ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-ink">Skills</h2>
            <ul className="flex flex-wrap gap-2">
              {project.skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-ink"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {project.roles_needed.length ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-ink">Roles needed</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {project.roles_needed.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Tasks</h2>
          {project.tasks.length === 0 ? (
            <p className="text-sm text-ink-muted">No tasks published yet.</p>
          ) : (
            <ol className="space-y-3">
              {project.tasks.map((task, index) => (
                <li
                  key={`${task.title}-${index}`}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <p className="text-sm font-medium text-ink">{task.title}</p>
                  {task.acceptance_criteria ? (
                    <p className="mt-1 text-sm text-ink-muted whitespace-pre-wrap">
                      {task.acceptance_criteria}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-display text-2xl text-ink">Build with CareerStack</h2>
          <p className="text-sm text-ink-muted">
            Create an account to join projects, submit evidence, and grow your contribution record.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onCreateAccount}>
              Create account
            </Button>
            <Button type="button" variant="outline" onClick={onSignIn}>
              Sign in
            </Button>
          </div>
        </section>
      </article>
    </PublicPageFrame>
  )
}
