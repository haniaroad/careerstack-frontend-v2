import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { runWithStaffReauth } from './staffReauth'

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

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    try {
      await runWithStaffReauth(() => onConfirm(reason.trim()))
      setOpen(false)
      setReason('')
      setMessage('Recorded.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not complete that action')
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
              className="min-h-20 rounded-md border border-input bg-canvas px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button type="submit" size="sm">
            {confirmLabel}
          </Button>
        </form>
      ) : null}
      {message ? (
        <p role="status" className="text-sm">
          {message}
        </p>
      ) : null}
    </div>
  )
}
