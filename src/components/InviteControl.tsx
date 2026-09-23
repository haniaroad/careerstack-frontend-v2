import { useEffect, useState } from 'react'
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
import {
  createProjectInvitation,
  fetchInviteOptions,
  type InviteProject,
} from '@/lib/explore'

type Props = {
  userId: string
  displayName: string
}

export function InviteControl({ userId, displayName }: Props) {
  const [projects, setProjects] = useState<InviteProject[]>([])
  const [unavailable, setUnavailable] = useState(false)
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchInviteOptions(userId)
        if (cancelled || !Array.isArray(data.eligible_projects)) return
        setProjects(data.eligible_projects)
        setUnavailable(Boolean(data.unavailable))
        const first = data.eligible_projects[0]
        if (first) {
          setProjectId(first.id)
          setRole(first.roles_needed[0] ?? '')
        }
      } catch {
        if (!cancelled) setProjects([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  if (unavailable) {
    return <p className="text-sm font-medium text-ink">Unavailable</p>
  }

  if (projects.length === 0) return null

  const selected = projects.find((project) => project.id === projectId) ?? projects[0]
  const roles = selected?.roles_needed ?? []

  async function confirm() {
    if (!selected || !role) return
    setSubmitting(true)
    setError(null)
    try {
      await createProjectInvitation(selected.id, userId, role)
      setSent(true)
      setOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invitee_unavailable') {
        setUnavailable(true)
        setOpen(false)
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not send the invitation')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      {sent ? <p className="text-sm text-ink">Invitation sent.</p> : null}
      <Button type="button" onClick={() => setOpen(true)}>
        Invite
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite {displayName}</DialogTitle>
            <DialogDescription>Send a structured project invitation. There is no message.</DialogDescription>
          </DialogHeader>
          {projects.length > 1 ? (
            <div className="space-y-1">
              <Label htmlFor={`invite-project-${userId}`}>Project</Label>
              <select
                id={`invite-project-${userId}`}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                value={projectId}
                onChange={(event) => {
                  const next = projects.find((project) => project.id === event.target.value)
                  setProjectId(event.target.value)
                  setRole(next?.roles_needed[0] ?? '')
                }}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-ink">{selected?.title}</p>
          )}
          <div className="space-y-1">
            <Label htmlFor={`invite-role-${userId}`}>Role</Label>
            <select
              id={`invite-role-${userId}`}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              {roles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          {error ? <Alert tone="danger" title="Could not send the invitation">{error}</Alert> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirm} disabled={submitting || !role}>
              {submitting ? 'Sending…' : 'Confirm invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
