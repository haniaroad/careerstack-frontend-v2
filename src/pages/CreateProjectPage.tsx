import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { InsufficientCreditsInterception } from '@/components/InsufficientCreditsInterception'
import { apiFetch, ApiError } from '@/lib/api'
import { trackAiDraftGenerated, trackProjectActivated } from '@/lib/mixpanel'
import {
  JOINING_MODES,
  PROJECT_SKILLS,
  SKILL_LEVELS,
  TIME_AVAILABLE,
  type AiGeneration,
  type JoiningMode,
  type Project,
  type ProjectMode,
  type ProposedTask,
} from '@/lib/projects'
import type { SessionPayload } from '@/auth/types'

type Step = 'prompt' | 'generating' | 'review' | 'manual'

function newDraftKey() {
  return crypto.randomUUID()
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function CreateProjectPage() {
  const { id: routeDraftId } = useParams<{ id?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session, setSession, refreshSession } = useAuth()
  const formId = useId()

  const initialStep: Step = routeDraftId
    ? 'review'
    : searchParams.get('mode') === 'manual'
      ? 'manual'
      : 'prompt'

  const [step, setStep] = useState<Step>(initialStep)
  const [prompt, setPrompt] = useState('')
  const [skillLevel, setSkillLevel] = useState<(typeof SKILL_LEVELS)[number]>('beginner')
  const [timeAvailable, setTimeAvailable] = useState<(typeof TIME_AVAILABLE)[number]>('2 weeks')
  const [clientDraftKey] = useState(newDraftKey)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [objective, setObjective] = useState('')
  const [projectType, setProjectType] = useState('')
  const [expectedDuration, setExpectedDuration] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [definitionOfDone, setDefinitionOfDone] = useState('')
  const [rolesNeeded, setRolesNeeded] = useState('')
  const [submissionExpectations, setSubmissionExpectations] = useState('')
  const [proposedTasks, setProposedTasks] = useState<ProposedTask[]>([])
  const [projectMode, setProjectMode] = useState<ProjectMode>('solo')
  const [joiningMode, setJoiningMode] = useState<JoiningMode>('application')
  const [capacity, setCapacity] = useState(3)
  const [aiLabeled, setAiLabeled] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(routeDraftId ?? null)
  const [loadingDraft, setLoadingDraft] = useState(Boolean(routeDraftId))
  const [generationStatus, setGenerationStatus] = useState<string | null>(null)

  const workspace = session?.active_workspace
  const isPersonal = workspace?.kind === 'personal'
  const remaining = session?.credits?.remaining ?? 0

  const rolesNeededList = useMemo(
    () =>
      rolesNeeded
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [rolesNeeded],
  )

  const draftPayload = useMemo(
    () => ({
      title,
      summary: summary || null,
      skills,
      mode: projectMode,
      joining_mode: projectMode === 'team' ? joiningMode : null,
      capacity: projectMode === 'team' ? capacity : null,
      objective: objective || null,
      project_type: projectType || null,
      expected_duration: expectedDuration || null,
      ends_on: endsOn || null,
      definition_of_done: definitionOfDone || null,
      roles_needed: projectMode === 'team' ? rolesNeededList : [],
      proposed_tasks: proposedTasks,
      submission_expectations: submissionExpectations || null,
    }),
    [
      title,
      summary,
      skills,
      projectMode,
      joiningMode,
      capacity,
      objective,
      projectType,
      expectedDuration,
      endsOn,
      definitionOfDone,
      rolesNeededList,
      proposedTasks,
      submissionExpectations,
    ],
  )

  const teamFieldsValid =
    projectMode === 'solo' || (rolesNeededList.length > 0 && capacity >= 1 && capacity <= 5)

  useEffect(() => {
    if (!routeDraftId) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiFetch<{ project: Project }>(`/api/v1/projects/${routeDraftId}`)
        if (cancelled) return
        applyProjectToForm(data.project)
        setDraftId(data.project.id)
        setStep('review')
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

  function applyProjectToForm(project: Project) {
    setTitle(project.title)
    setSummary(project.summary ?? '')
    setSkills(project.skills ?? [])
    setProjectMode(project.mode ?? 'solo')
    setJoiningMode(project.joining_mode ?? 'application')
    setCapacity(project.capacity ?? 3)
    setObjective(project.objective ?? '')
    setProjectType(project.project_type ?? '')
    setExpectedDuration(project.expected_duration ?? '')
    setEndsOn(project.ends_on ?? '')
    setDefinitionOfDone(project.definition_of_done ?? '')
    setRolesNeeded((project.roles_needed ?? []).join(', '))
    setProposedTasks(project.proposed_tasks ?? [])
    setSubmissionExpectations(project.submission_expectations ?? '')
    setAiLabeled(project.source === 'ai')
  }

  function applyGenerationResult(result: Record<string, unknown>) {
    setTitle(String(result.title ?? ''))
    setSummary(String(result.summary ?? ''))
    setObjective(String(result.learning_objective ?? ''))
    setProjectType(String(result.project_type ?? ''))
    setExpectedDuration(String(result.expected_duration ?? ''))
    setEndsOn(String(result.project_end_date ?? ''))
    setDefinitionOfDone(String(result.definition_of_done ?? ''))
    setSkills(Array.isArray(result.skills_demonstrated) ? (result.skills_demonstrated as string[]) : [])
    setRolesNeeded(
      Array.isArray(result.roles_needed) ? (result.roles_needed as string[]).join(', ') : '',
    )
    setSubmissionExpectations(String(result.submission_expectations ?? ''))
    setProposedTasks(Array.isArray(result.proposed_tasks) ? (result.proposed_tasks as ProposedTask[]) : [])
    setAiLabeled(true)
  }

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  function goManual() {
    setStep('manual')
    setSearchParams({ mode: 'manual' })
    setError(null)
    setErrorCode(null)
  }

  function goPrompt() {
    setStep('prompt')
    setSearchParams({})
    setError(null)
    setErrorCode(null)
  }

  async function pollGeneration(id: string): Promise<AiGeneration> {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const data = await apiFetch<{ generation: AiGeneration }>(`/api/v1/ai/project_generations/${id}`)
      const generation = data.generation
      setGenerationStatus(generation.status)
      if (generation.status === 'succeeded' || generation.status === 'failed') {
        return generation
      }
      await sleep(1000)
    }
    throw new ApiError(408, 'ai_timeout', 'Generation is taking too long. Try again.')
  }

  async function handleGenerate() {
    setSaving(true)
    setError(null)
    setErrorCode(null)
    setStep('generating')
    setGenerationStatus('pending')
    try {
      const created = await apiFetch<{ generation: AiGeneration }>('/api/v1/ai/project_generations', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          constraints: { skill_level: skillLevel, time_available: timeAvailable },
          client_draft_key: clientDraftKey,
        }),
      })
      const generation =
        created.generation.status === 'pending' || created.generation.status === 'running'
          ? await pollGeneration(created.generation.id)
          : created.generation

      if (generation.status !== 'succeeded') {
        setErrorCode(generation.error_code)
        setError(generation.error_message || 'Generation failed')
        setStep('prompt')
        return
      }

      applyGenerationResult(generation.result)
      const accepted = await apiFetch<{ project: Project; generation: AiGeneration }>(
        `/api/v1/ai/project_generations/${generation.id}/accept`,
        { method: 'POST' },
      )
      applyProjectToForm(accepted.project)
      setDraftId(accepted.project.id)
      trackAiDraftGenerated({ workspace_type: isPersonal ? 'personal' : 'organization' })
      setStep('review')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setErrorCode(err.code)
      } else {
        setError('Unable to generate draft')
      }
      setStep('prompt')
    } finally {
      setSaving(false)
      setGenerationStatus(null)
    }
  }

  async function saveDraft() {
    setSaving(true)
    setError(null)
    setErrorCode(null)
    try {
      if (draftId) {
        const data = await apiFetch<{ project: Project }>(`/api/v1/projects/${draftId}`, {
          method: 'PATCH',
          body: JSON.stringify(draftPayload),
        })
        setDraftId(data.project.id)
        return data.project
      }
      const data = await apiFetch<{ project: Project }>('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: draftPayload.title,
          summary: draftPayload.summary,
          skills: draftPayload.skills,
          mode: draftPayload.mode,
          joining_mode: draftPayload.joining_mode,
          capacity: draftPayload.capacity,
          roles_needed: draftPayload.roles_needed,
        }),
      })
      if (
        draftPayload.objective ||
        draftPayload.proposed_tasks.length ||
        draftPayload.definition_of_done
      ) {
        const patched = await apiFetch<{ project: Project }>(`/api/v1/projects/${data.project.id}`, {
          method: 'PATCH',
          body: JSON.stringify(draftPayload),
        })
        setDraftId(patched.project.id)
        return patched.project
      }
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
    if (project) navigate(`/projects/${project.id}`)
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
          body: JSON.stringify(draftPayload),
        })
      }

      const data = await apiFetch<{ project: Project; session: SessionPayload }>(
        `/api/v1/projects/${id}/confirm`,
        { method: 'POST' },
      )
      setSession(data.session)
      trackProjectActivated({
        workspace_type: isPersonal ? 'personal' : 'organization',
        mode: data.project.mode,
      })
      navigate(`/projects/${data.project.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setErrorCode(err.code)
        if (err.code === 'insufficient_credits') await refreshSession()
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
        <h1 className="font-display text-3xl text-ink">
          {step === 'manual' ? 'Advanced setup (manual)' : 'AI project draft'}
        </h1>
        <p className="mt-2 text-ink-muted">
          Generating or editing a draft does not use a credit. Confirming to active uses one credit
          from this workspace ({remaining} remaining).
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

      {errorCode === 'ai_allowance_exhausted' ? (
        <Alert tone="warning" title="Generation already used">
          This draft already has a successful AI generation. Edit the draft instead of regenerating.
        </Alert>
      ) : null}

      {errorCode === 'ai_rate_limited' ? (
        <Alert tone="warning" title="Rate limit reached">
          You have generated too many drafts recently. Try again later.
        </Alert>
      ) : null}

      {errorCode === 'ai_unavailable' || errorCode === 'ai_not_configured' ? (
        <Alert tone="warning" title="AI generation unavailable">
          {error || 'AI generation is temporarily unavailable. Use Advanced setup instead.'}
        </Alert>
      ) : null}

      {errorCode === 'ai_schema_invalid' ? (
        <Alert tone="warning" title="Draft needed another try">
          The AI returned an incomplete draft ({error}). Try Generate with AI again, or use Advanced
          setup.
        </Alert>
      ) : null}

      {error &&
      ![
        'insufficient_credits',
        'active_participation_conflict',
        'ai_allowance_exhausted',
        'ai_rate_limited',
        'ai_unavailable',
        'ai_not_configured',
        'ai_schema_invalid',
      ].includes(errorCode ?? '') ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}

      {step === 'prompt' ? (
        <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
          <label className="block space-y-1" htmlFor={`${formId}-prompt`}>
            <span className="text-sm font-medium text-ink">Describe the project you want</span>
            <textarea
              id={`${formId}-prompt`}
              className="min-h-32 w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={4000}
              placeholder="Example: Build a responsive portfolio landing page with an about section and three project cards."
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">Skill level</span>
              <select
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as (typeof SKILL_LEVELS)[number])}
              >
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">Time available</span>
              <select
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                value={timeAvailable}
                onChange={(e) => setTimeAvailable(e.target.value as (typeof TIME_AVAILABLE)[number])}
              >
                {TIME_AVAILABLE.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-sm text-ink-muted">Audience: Just me (solo)</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleGenerate()} disabled={saving || prompt.trim().length < 8}>
              Generate with AI
            </Button>
            <Button variant="secondary" onClick={goManual} disabled={saving}>
              Advanced setup (manual)
            </Button>
            <Button asChild variant="ghost">
              <Link to="/my-work">Back to My Work</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'generating' ? (
        <Alert tone="info" title="Generating draft">
          <span aria-live="polite">
            Working on your AI draft{generationStatus ? ` (${generationStatus})` : ''}…
          </span>
        </Alert>
      ) : null}

      {step === 'review' || step === 'manual' ? (
        <>
          {aiLabeled && step === 'review' ? (
            <Alert tone="info" title="AI-generated draft">
              Review and edit every field before confirming. Generation did not use a credit.
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
              <span className="text-sm font-medium text-ink">Summary</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                maxLength={2000}
              />
            </label>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-ink">Audience</legend>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name={`${formId}-mode`}
                    checked={projectMode === 'solo'}
                    onChange={() => setProjectMode('solo')}
                  />
                  Solo (just me)
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name={`${formId}-mode`}
                    checked={projectMode === 'team'}
                    onChange={() => setProjectMode('team')}
                  />
                  Team
                </label>
              </div>
              {projectMode === 'team' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-ink">Joining mode</span>
                    <select
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                      value={joiningMode}
                      onChange={(e) => setJoiningMode(e.target.value as JoiningMode)}
                    >
                      {JOINING_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-ink">Capacity (1–5)</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                    />
                  </label>
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="text-sm font-medium text-ink">Roles needed (comma-separated)</span>
                    <input
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                      value={rolesNeeded}
                      onChange={(e) => setRolesNeeded(e.target.value)}
                      placeholder="Designer, Engineer"
                    />
                  </label>
                </div>
              ) : null}
            </fieldset>

            {(step === 'review' || aiLabeled) && (
              <>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-ink">Learning objective</span>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-ink">Project type</span>
                    <input
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-ink">Expected duration</span>
                    <input
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                      value={expectedDuration}
                      onChange={(e) => setExpectedDuration(e.target.value)}
                    />
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-ink">Project end date</span>
                  <input
                    type="date"
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                    value={endsOn}
                    onChange={(e) => setEndsOn(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-ink">Definition of done</span>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                    value={definitionOfDone}
                    onChange={(e) => setDefinitionOfDone(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-ink">Submission expectations</span>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                    value={submissionExpectations}
                    onChange={(e) => setSubmissionExpectations(e.target.value)}
                  />
                </label>
                {proposedTasks.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-ink">Proposed tasks</p>
                    <ul className="space-y-2">
                      {proposedTasks.map((task, index) => (
                        <li
                          key={`${task.title}-${index}`}
                          className="rounded-md border border-border bg-canvas p-3 text-sm text-ink"
                        >
                          <p className="font-medium">{task.title}</p>
                          <p className="text-ink-muted">{task.summary}</p>
                          <p className="mt-1 text-ink-muted">Due {task.recommended_due_date}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
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

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              onClick={() => void handleConfirm()}
              disabled={saving || title.trim().length < 2 || !teamFieldsValid}
            >
              Confirm project
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleSaveDraft()}
              disabled={saving || title.trim().length < 2 || !teamFieldsValid}
            >
              Save draft
            </Button>
            <Button variant="ghost" onClick={() => void handleDiscard()} disabled={saving}>
              Discard
            </Button>
            {step === 'manual' ? (
              <Button variant="ghost" onClick={goPrompt} disabled={saving}>
                Use AI instead
              </Button>
            ) : (
              <Button variant="ghost" onClick={goManual} disabled={saving}>
                Advanced setup
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link to="/my-work">Back to My Work</Link>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
