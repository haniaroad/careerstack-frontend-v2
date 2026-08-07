import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { InsufficientCreditsInterception } from '@/components/InsufficientCreditsInterception'
import { apiFetch, ApiError } from '@/lib/api'
import { trackProjectActivated } from '@/lib/mixpanel'
import { PROJECT_SKILLS, type Project } from '@/lib/projects'
import type { SessionPayload } from '@/auth/types'

export function CreateProjectPage() {
  const { id: routeDraftId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { session, setSession, refreshSession } = useAuth()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(routeDraftId ?? null)
  const [loadingDraft, setLoadingDraft] = useState(Boolean(routeDraftId))

  const workspace = session?.active_workspace
  const isPersonal = workspace?.kind === 'personal'
  const remaining = session?.credits?.remaining ?? 0

  useEffect(() => {
    if (!routeDraftId) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiFetch<{ project: Project }>(`/api/v1/projects/${routeDraftId}`)
        if (cancelled) return
        setTitle(data.project.title)
        setSummary(data.project.summary ?? '')
        setSkills(data.project.skills ?? [])
        setDraftId(data.project.id)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load draft')
        }
      } finally {
        if (!cancelled) setLoadingDraft(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [routeDraftId])

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  async function saveDraft() {
    setSaving(true)
    setError(null)
    setErrorCode(null)
    try {
      if (draftId) {
        const data = await apiFetch<{ project: Project }>(`/api/v1/projects/${draftId}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, summary: summary || null, skills }),
        })
        setDraftId(data.project.id)
        return data.project
      }
      const data = await apiFetch<{ project: Project }>('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify({ title, summary: summary || null, skills }),
      })
      setDraftId(data.project.id)
      return data.project
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save draft')
      if (err instanceof ApiError) setErrorCode(err.code)
      return null
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDraft() {
    const project = await saveDraft()
    if (project) {
      navigate(`/projects/${project.id}`)
    }
  }

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    setErrorCode(null)
    try {
      let id = draftId
      if (!id) {
        const created = await saveDraft()
        if (!created) return
        id = created.id
      } else {
        await apiFetch<{ project: Project }>(`/api/v1/projects/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, summary: summary || null, skills }),
        })
      }

      const data = await apiFetch<{ project: Project; session: SessionPayload }>(
        `/api/v1/projects/${id}/confirm`,
        { method: 'POST' },
      )
      setSession(data.session)
      trackProjectActivated({ workspace_type: isPersonal ? 'personal' : 'organization' })
      navigate(`/projects/${data.project.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setErrorCode(err.code)
        if (err.code === 'insufficient_credits') {
          await refreshSession()
        }
      } else {
        setError('Unable to confirm project')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDiscard() {
    if (!draftId) {
      navigate('/my-work')
      return
    }
    setSaving(true)
    try {
      await apiFetch(`/api/v1/projects/${draftId}`, { method: 'DELETE' })
      navigate('/my-work')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to discard draft')
    } finally {
      setSaving(false)
    }
  }

  if (loadingDraft) {
    return <p className="text-ink-muted">Loading draft…</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-sm font-medium text-ink-muted">Create project</p>
        <h1 className="font-display text-3xl text-ink">Manual solo draft</h1>
        <p className="mt-2 text-ink-muted">
          Saving a draft does not use a credit. Confirming to active uses one credit from this
          workspace ({remaining} remaining).
        </p>
      </header>

      {errorCode === 'insufficient_credits' ? (
        <InsufficientCreditsInterception
          blockedAction="create a project"
          remaining={session?.credits?.remaining ?? 0}
          variant={isPersonal ? 'personal' : 'organization'}
          role={isPersonal ? undefined : 'participant'}
        />
      ) : null}

      {errorCode === 'active_participation_conflict' ? (
        <Alert tone="warning" title="Already on an active project">
          Finish or cancel your current active project before confirming another.
        </Alert>
      ) : null}

      {error && errorCode !== 'insufficient_credits' && errorCode !== 'active_participation_conflict' ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}

      <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Title</span>
          <input
            className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Summary (optional)</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={2000}
          />
        </label>
        <fieldset>
          <legend className="text-sm font-medium text-ink">Skills (optional)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROJECT_SKILLS.map((skill) => {
              const selected = skills.includes(skill)
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    selected
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-border bg-canvas text-ink'
                  }`}
                >
                  {skill}
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void handleConfirm()} disabled={saving || title.trim().length < 2}>
          Confirm project
        </Button>
        <Button
          variant="secondary"
          onClick={() => void handleSaveDraft()}
          disabled={saving || title.trim().length < 2}
        >
          Save draft
        </Button>
        <Button variant="ghost" onClick={() => void handleDiscard()} disabled={saving}>
          Discard
        </Button>
        <Button asChild variant="ghost">
          <Link to="/my-work">Back to My Work</Link>
        </Button>
      </div>
    </div>
  )
}
