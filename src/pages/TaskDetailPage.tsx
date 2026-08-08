import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { StatusBadge } from '@/components/StatusBadge'
import { apiFetch, ApiError } from '@/lib/api'
import { trackAiReviewCompleted, trackTaskSubmitted } from '@/lib/mixpanel'
import {
  MAX_COMBINED_BYTES,
  MAX_FILE_BYTES,
  MAX_FILES,
  type AiReview,
  type TaskDetail,
} from '@/lib/tasks'

function taskTone(status: TaskDetail['status']): 'info' | 'success' | 'warning' {
  if (status === 'approved') return 'success'
  if (status === 'corrections_requested' || status === 'incomplete') return 'warning'
  return 'info'
}

/** Badge for AI review outcome — not pipeline status (succeeded/failed). */
function reviewOutcomeBadge(review: AiReview): { tone: 'info' | 'success' | 'warning'; label: string } {
  if (review.status === 'pending' || review.status === 'running') {
    return { tone: 'info', label: review.status === 'running' ? 'reviewing' : 'pending' }
  }
  if (review.status === 'failed') {
    return { tone: 'warning', label: 'review failed' }
  }
  if (review.decision === 'approved') {
    return { tone: 'success', label: 'approved' }
  }
  if (review.decision === 'corrections_requested') {
    return { tone: 'warning', label: 'corrections requested' }
  }
  return { tone: 'info', label: 'completed' }
}

function reviewErrorMessage(code: string | undefined, fallback: string) {
  switch (code) {
    case 'ai_unavailable':
    case 'ai_not_configured':
      return 'AI review is temporarily unavailable. Your submission was saved.'
    case 'ai_rate_limited':
      return 'AI review rate limit reached. Try again later.'
    case 'ai_review_cooldown':
      return 'Please wait a moment before requesting another review of the same submission.'
    case 'ai_review_in_progress':
      return 'A review is already in progress for this task.'
    default:
      return fallback
  }
}

function friendlyReviewFailure(code: string | null, message: string | null) {
  if (code === 'ai_unavailable' || code === 'ai_not_configured') {
    return 'AI review is temporarily unavailable.'
  }
  if (code === 'ai_provider_error') {
    return 'The AI provider could not complete this review (service error). This is not AI feedback—the review request failed.'
  }
  if (message?.toLowerCase().includes('provider returned error')) {
    return 'The AI provider could not complete this review (service error). This is not AI feedback—the review request failed.'
  }
  return message || 'Review failed.'
}

async function checksumBase64(file: File): Promise<string> {
  const { md5 } = await import('@/lib/md5')
  const buffer = new Uint8Array(await file.arrayBuffer())
  return md5(buffer)
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const workspaceType = session?.active_workspace?.kind === 'organization' ? 'organization' : 'personal'

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ task: TaskDetail }>(`/api/v1/tasks/${id}`)
      setTask(data.task)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load task')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!task?.latest_review) return
    if (task.latest_review.status === 'pending' || task.latest_review.status === 'running') {
      const timer = window.setInterval(() => {
        void (async () => {
          try {
            const data = await apiFetch<{ review: AiReview }>(`/api/v1/ai/reviews/${task.latest_review!.id}`)
            if (data.review.status === 'succeeded' || data.review.status === 'failed') {
              await load()
            }
          } catch {
            // ignore poll errors
          }
        })()
      }, 1500)
      return () => window.clearInterval(timer)
    }
  }, [task?.latest_review, load])

  const onFilesChange = (list: FileList | null) => {
    if (!list) return
    const incoming = Array.from(list)
    const next = [...files, ...incoming].slice(0, MAX_FILES)
    if (files.length + incoming.length > MAX_FILES) {
      setError(`At most ${MAX_FILES} files per submission`)
    }
    const combined = next.reduce((sum, f) => sum + f.size, 0)
    if (next.some((f) => f.size > MAX_FILE_BYTES) || combined > MAX_COMBINED_BYTES) {
      setError('Files must be ≤10 MB each and ≤25 MB combined')
      return
    }
    if (files.length + incoming.length <= MAX_FILES) setError(null)
    setFiles(next)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setError(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const uploadFiles = async (): Promise<string[]> => {
    const signedIds: string[] = []
    for (const file of files) {
      const checksum = await checksumBase64(file)
      const created = await apiFetch<{
        direct_upload: { signed_id: string; upload_url: string; headers: Record<string, string> }
      }>('/api/v1/direct_uploads', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || 'application/octet-stream',
          byte_size: file.size,
          checksum,
        }),
      })
      const put = await fetch(created.direct_upload.upload_url, {
        method: 'PUT',
        headers: created.direct_upload.headers,
        body: file,
      })
      if (!put.ok) throw new Error('File upload failed')
      signedIds.push(created.direct_upload.signed_id)
    }
    return signedIds
  }

  const submit = async () => {
    if (!task) return
    setSubmitting(true)
    setError(null)
    setInfo(null)
    try {
      const links = link.trim() ? [link.trim()] : []
      const signed_blob_ids = await uploadFiles()
      const data = await apiFetch<{ task: TaskDetail; review: AiReview | null }>(
        `/api/v1/tasks/${task.id}/submissions`,
        {
          method: 'POST',
          body: JSON.stringify({ body: body.trim() || null, links, signed_blob_ids }),
        },
      )
      trackTaskSubmitted({ workspace_type: workspaceType })
      setTask(data.task)
      setBody('')
      setLink('')
      setFiles([])
      if (data.review?.status === 'succeeded' && data.review.decision) {
        trackAiReviewCompleted({ workspace_type: workspaceType, decision: data.review.decision })
      } else if (!data.review) {
        setInfo('Submission saved. AI review was not started (unavailable or blocked).')
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? reviewErrorMessage(err.code, err.message)
          : err instanceof Error
            ? err.message
            : 'Unable to submit'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const requestReview = async () => {
    if (!task) return
    setSubmitting(true)
    setError(null)
    try {
      const data = await apiFetch<{ review: AiReview }>(`/api/v1/tasks/${task.id}/ai_reviews`, {
        method: 'POST',
      })
      if (data.review.status === 'succeeded' && data.review.decision) {
        trackAiReviewCompleted({ workspace_type: workspaceType, decision: data.review.decision })
      }
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? reviewErrorMessage(err.code, err.message) : 'Unable to request review')
    } finally {
      setSubmitting(false)
    }
  }

  const reportFeedback = async () => {
    if (!task?.latest_review?.id) return
    setReporting(true)
    setError(null)
    try {
      await apiFetch(`/api/v1/ai/reviews/${task.latest_review.id}/reports`, {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'inaccurate',
          reason_category: 'wrong_decision',
          details: 'Participant reported AI feedback',
        }),
      })
      setInfo('Report submitted. The AI decision was not changed.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit report')
    } finally {
      setReporting(false)
    }
  }

  if (loading) return <p className="text-ink-muted">Loading task…</p>
  if (!task) {
    return (
      <Alert tone="danger" title="Task not found">
        {error || 'This task is unavailable in the current workspace.'}
      </Alert>
    )
  }

  const canSubmit = task.status === 'pending' || task.status === 'corrections_requested'
  const review = task.latest_review
  const reviewBadge = review ? reviewOutcomeBadge(review) : null

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link to="/my-work?tab=tasks" className="text-sm text-ink-muted hover:text-ink">
          ← Back to Tasks
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink-muted">{task.project_title}</p>
            <h1 className="font-display text-3xl text-ink">{task.title}</h1>
            {task.due_on ? <p className="mt-2 text-sm text-ink-muted">Due {task.due_on}</p> : null}
          </div>
          <StatusBadge tone={taskTone(task.status)}>{task.status.replaceAll('_', ' ')}</StatusBadge>
        </div>
      </div>

      {error ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}
      {info ? (
        <Alert tone="info" title="Notice">
          {info}
        </Alert>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-display text-xl text-ink">Acceptance criteria</h2>
        <p className="text-ink-muted whitespace-pre-wrap">{task.acceptance_criteria || 'None provided.'}</p>
        <h2 className="font-display text-xl text-ink">Evidence expected</h2>
        <p className="text-ink-muted whitespace-pre-wrap">
          {task.submission_expectations || 'Text and/or https links / allowed files.'}
        </p>
      </section>

      {review && reviewBadge ? (
        <section
          className={`space-y-3 rounded-lg border p-4 ${
            review.status === 'succeeded' && review.decision === 'approved'
              ? 'border-status-success/20 bg-status-success-bg'
              : review.status === 'succeeded' && review.decision === 'corrections_requested'
                ? 'border-status-warning/20 bg-status-warning-bg'
                : 'border-border bg-surface'
          }`}
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl text-ink">AI review</h2>
            <StatusBadge tone={reviewBadge.tone}>{reviewBadge.label}</StatusBadge>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">AI-generated feedback</p>
          {review.status === 'pending' || review.status === 'running' ? (
            <p className="text-ink-muted">Review in progress…</p>
          ) : null}
          {review.status === 'succeeded' ? (
            <div className="space-y-2 text-ink">
              <p className="whitespace-pre-wrap">{review.feedback?.summary}</p>
              {review.feedback?.unmet_requirements?.length ? (
                <ul className="list-disc pl-5 text-sm">
                  {review.feedback.unmet_requirements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {review.feedback?.next_action ? (
                <p className="text-sm">
                  <span className="font-medium">Next action:</span> {review.feedback.next_action}
                </p>
              ) : null}
              {review.analysis_incomplete ? (
                <Alert tone="warning" title="Partial analysis">
                  Some evidence could not be automatically analyzed. Unsupported items were listed and not claimed as
                  reviewed.
                </Alert>
              ) : null}
              <Button type="button" variant="secondary" size="sm" disabled={reporting} onClick={() => void reportFeedback()}>
                Report AI feedback
              </Button>
            </div>
          ) : null}
          {review.status === 'failed' ? (
            <div className="space-y-3">
              <Alert tone="warning" title="AI review did not complete">
                {friendlyReviewFailure(review.error_code, review.error_message)} Your submission is saved and unchanged.
              </Alert>
              {review.retryable ? (
                <Button type="button" onClick={() => void requestReview()} disabled={submitting}>
                  {submitting ? 'Retrying…' : 'Retry AI review'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {canSubmit ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl text-ink">
            {task.status === 'corrections_requested' ? 'Revise and resubmit' : 'Submit evidence'}
          </h2>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Submission text</span>
            <textarea
              className="min-h-28 w-full rounded-md border border-border bg-surface px-3 py-2 text-ink"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">https artifact link</span>
            <input
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://"
            />
          </label>
          <div className="space-y-2">
            <span className="block text-sm font-medium text-ink">Attach files</span>
            <input
              ref={fileInputRef}
              id="task-evidence-files"
              type="file"
              multiple
              className="sr-only"
              accept=".txt,.pdf,.docx,.png,.jpg,.jpeg,.csv,.xlsx,.mp4,.mov,.mp3,.wav,text/plain,application/pdf,image/png,image/jpeg"
              onChange={(e) => onFilesChange(e.target.files)}
            />
            <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-5">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">Upload evidence files</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Up to {MAX_FILES} files · 10 MB each · 25 MB combined
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting || files.length >= MAX_FILES}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {files.length >= MAX_FILES ? 'File limit reached' : 'Choose files'}
                </Button>
              </div>
              {files.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-border pt-4" aria-label="Selected files">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-ink">
                        {file.name}{' '}
                        <span className="text-ink-muted">({formatFileSize(file.size)})</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={submitting}
                        onClick={() => removeFile(index)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">No files selected yet.</p>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              Analyzed now: text, TXT, PDF, DOCX, PNG, JPG. Video and arbitrary URLs can be attached as evidence but are
              not auto-analyzed yet.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" disabled={submitting} onClick={() => void submit()}>
              {submitting ? 'Submitting…' : 'Submit for AI review'}
            </Button>
          </div>
        </section>
      ) : null}

      {/* Only when submitted with no review card action available (e.g. review never started). */}
      {task.status === 'submitted' && !review ? (
        <Button type="button" onClick={() => void requestReview()} disabled={submitting}>
          {submitting ? 'Requesting…' : 'Request AI review'}
        </Button>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink">Submission history</h2>
        {task.submissions.length === 0 ? (
          <p className="text-ink-muted">No submissions yet.</p>
        ) : (
          <ol className="space-y-3">
            {task.submissions.map((submission) => (
              <li key={submission.id} className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm font-medium text-ink">Attempt {submission.attempt_number}</p>
                <p className="mt-1 text-xs text-ink-muted">{new Date(submission.submitted_at).toLocaleString()}</p>
                {submission.body ? <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{submission.body}</p> : null}
                {submission.links.length ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    {submission.links.map((item) => (
                      <li key={item.id}>
                        <a className="text-ink underline" href={item.url} target="_blank" rel="noreferrer">
                          {item.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {submission.files.length ? (
                  <ul className="mt-2 text-sm text-ink-muted">
                    {submission.files.map((file) => (
                      <li key={file.id}>
                        {file.filename} ({Math.round(file.byte_size / 1024)} KB)
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
