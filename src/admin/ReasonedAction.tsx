import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { ApiError } from '@/lib/api'
import { getIdToken } from '@/lib/firebase'

export function ReasonedAction({
  label,
  confirmLabel,
  onConfirm,
}: {
  label: string
  confirmLabel: string
  onConfirm: (reason: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    try {
      await onConfirm(reason.trim())
      setOpen(false)
      setReason('')
      setNeedsReauth(false)
      setMessage('Recorded.')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'reauthentication_required') {
        setNeedsReauth(true)
        setMessage('Sign in again before this action.')
        return
      }
      setMessage(err instanceof ApiError ? err.message : 'Could not complete that action')
    }
  }

  return (
    <div className="grid gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open ? (
        <form onSubmit={(event) => void submit(event)} className="grid gap-2">
          <label className="grid gap-1 text-sm">
            Reason
            <textarea
              required
              aria-label="Reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-20 rounded-md border border-border bg-canvas px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button type="submit" size="sm">
            {confirmLabel}
          </Button>
        </form>
      ) : null}
      {needsReauth ? (
        <Button
          type="button"
          size="sm"
          onClick={() => {
            void getIdToken(true).then(() => {
              setNeedsReauth(false)
              setMessage('Signed in again. Confirm the action once more.')
            })
          }}
        >
          Sign in again
        </Button>
      ) : null}
      {message ? (
        <p role="status" className="text-sm">
          {message}
        </p>
      ) : null}
    </div>
  )
}
