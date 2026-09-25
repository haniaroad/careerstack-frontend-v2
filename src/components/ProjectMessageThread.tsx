import { useCallback, useEffect, useState } from 'react'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/Dialog'
import { Label } from '@/components/Label'
import { ApiError } from '@/lib/api'
import { trackProjectMessageSent } from '@/lib/mixpanel'
import {
  MESSAGE_REASON_CATEGORIES,
  MESSAGE_REPORT_TYPES,
  fetchProjectMessages,
  markProjectMessagesRead,
  postProjectMessage,
  reportProjectMessage,
  type MessageReasonCategory,
  type MessageReportType,
  type ProjectMessage,
} from '@/lib/projectMessages'

type Props = {
  projectId: string
  currentUserId: string
  workspaceType?: 'personal' | 'organization'
  onUnreadChange?: (unread: boolean) => void
}

export function ProjectMessageThread({
  projectId,
  currentUserId,
  workspaceType = 'personal',
  onUnreadChange,
}: Props) {
  const [messages, setMessages] = useState<ProjectMessage[]>([])
  const [unread, setUnread] = useState(false)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reportMessageId, setReportMessageId] = useState<string | null>(null)
  const [reportType, setReportType] = useState<MessageReportType>('inappropriate')
  const [reasonCategory, setReasonCategory] = useState<MessageReasonCategory>('harassment')
  const [reportDetails, setReportDetails] = useState('')
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportBusy, setReportBusy] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProjectMessages(projectId)
      setMessages(data.messages ?? [])
      setUnread(Boolean(data.unread))
      onUnreadChange?.(Boolean(data.unread))
      setDenied(false)
      if (data.unread) {
        const read = await markProjectMessagesRead(projectId)
        setUnread(Boolean(read.unread))
        onUnreadChange?.(Boolean(read.unread))
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setDenied(true)
        setMessages([])
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to load messages')
      }
    } finally {
      setLoading(false)
    }
  }, [onUnreadChange, projectId])

  useEffect(() => {
    void load()
  }, [load])

  async function send() {
    if (!body.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const data = await postProjectMessage(projectId, body.trim())
      setMessages((prev) => [...prev, data.message])
      setBody('')
      setUnread(false)
      onUnreadChange?.(false)
      trackProjectMessageSent({ workspace_type: workspaceType })
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setDenied(true)
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not send the message')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function submitReport() {
    if (!reportMessageId) return
    setReportBusy(true)
    setReportError(null)
    try {
      await reportProjectMessage(reportMessageId, {
        report_type: reportType,
        reason_category: reasonCategory,
        details: reportDetails.trim() || undefined,
      })
      setReportSent(true)
      setReportMessageId(null)
      setReportDetails('')
    } catch (err) {
      setReportError(err instanceof ApiError ? err.message : 'Could not submit the report')
    } finally {
      setReportBusy(false)
    }
  }

  if (denied) return null

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl text-ink">Project messages</h2>
          {unread ? (
            <span className="text-sm font-medium text-ink" aria-label="Unread messages">
              Unread
            </span>
          ) : null}
        </div>
        <p className="text-sm text-ink-muted">
          Project messages are visible to program staff. Do not share private information you would not
          want staff to see.
        </p>
      </div>

      {reportSent ? <Alert tone="success" title="Report received">Thanks. A moderator will review it.</Alert> : null}
      {error ? <Alert tone="danger" title="Something went wrong">{error}</Alert> : null}
      {loading ? <p className="text-sm text-ink-muted">Loading messages…</p> : null}

      {!loading && messages.length === 0 ? (
        <p className="text-sm text-ink-muted">No messages yet. Say hello to your teammates.</p>
      ) : null}

      <ul className="space-y-3">
        {messages.map((message) => (
          <li key={message.id} className="space-y-2 rounded-md border border-border p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-ink">{message.author_display_name}</p>
              <time className="text-xs text-ink-muted" dateTime={message.created_at}>
                {new Date(message.created_at).toLocaleString()}
              </time>
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink">{message.body}</p>
            {message.author_id !== currentUserId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setReportMessageId(message.id)
                  setReportSent(false)
                  setReportError(null)
                }}
              >
                Report
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <Label htmlFor={`project-message-${projectId}`}>Write a message</Label>
        <textarea
          id={`project-message-${projectId}`}
          className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          value={body}
          maxLength={2000}
          onChange={(event) => setBody(event.target.value)}
        />
        <Button type="button" onClick={() => void send()} disabled={submitting || !body.trim()}>
          {submitting ? 'Sending…' : 'Send message'}
        </Button>
      </div>

      <Dialog open={Boolean(reportMessageId)} onOpenChange={(open) => !open && setReportMessageId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report message</DialogTitle>
            <DialogDescription>Reports help keep project threads safe. There is no public SLA.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="message-report-type">Report type</Label>
              <select
                id="message-report-type"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={reportType}
                onChange={(event) => setReportType(event.target.value as MessageReportType)}
              >
                {MESSAGE_REPORT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="message-report-reason">Reason</Label>
              <select
                id="message-report-reason"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={reasonCategory}
                onChange={(event) => setReasonCategory(event.target.value as MessageReasonCategory)}
              >
                {MESSAGE_REASON_CATEGORIES.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="message-report-details">Details (optional)</Label>
              <textarea
                id="message-report-details"
                className="min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
              />
            </div>
            {reportError ? <Alert tone="danger" title="Could not report">{reportError}</Alert> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReportMessageId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitReport()} disabled={reportBusy}>
              {reportBusy ? 'Submitting…' : 'Submit report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
