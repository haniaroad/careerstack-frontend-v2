import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { useAuth } from '@/auth/AuthContext'
import { apiFetch } from '@/lib/api'
import { ReasonedAction } from './ReasonedAction'

type UserHit = {
  id: string
  email: string
  status: string
  display_name: string | null
  deletion_recovery: boolean
  workspaces: { id: string; name: string; kind: string; status: string | null }[]
}

type OrgHit = {
  id: string
  name: string
  workspace_status: string
  workspace_disabled: boolean
}

export function UsersArea() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserHit[]>([])
  const [organizations, setOrganizations] = useState<OrgHit[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  async function search(event: FormEvent) {
    event.preventDefault()
    const result = await apiFetch<{ users: UserHit[]; organizations: OrgHit[] }>(
      `/api/v1/platform_admin/search?q=${encodeURIComponent(query)}`,
    )
    setUsers(result.users)
    setOrganizations(result.organizations)
  }

  return (
    <section className="grid gap-4">
      <h1 className="text-lg font-semibold">Users and orgs</h1>
      <form role="search" onSubmit={(event) => void search(event)} className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-0 flex-1 gap-1 text-sm">
          Search users and organizations
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Button type="submit">Search</Button>
      </form>
      {notice ? <p role="status">{notice}</p> : null}
      <ul className="grid gap-3">
        {users.map((user) => (
          <li key={user.id} className="rounded-md border border-border p-3 text-sm">
            <p>
              <span className="font-medium">{user.display_name ?? user.email}</span>
              <span className="text-muted-foreground"> · {user.email}</span>
            </p>
            <p>
              Account {user.status}
              {user.deletion_recovery ? ' · deletion recovery' : ''}
            </p>
            <p>
              {user.workspaces.map((workspace) => `${workspace.name} (${workspace.status ?? workspace.kind})`).join(', ') ||
                'No workspace'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <ReasonedAction
                label={`Suspend ${user.email}`}
                confirmLabel="Confirm suspension"
                onConfirm={async (reason) => {
                  await apiFetch(`/api/v1/platform_admin/users/${user.id}/suspend`, {
                    method: 'POST',
                    body: JSON.stringify({ reason }),
                  })
                  setNotice(`${user.email} suspended. Login is blocked and the public profile is hidden.`)
                }}
              />
              <ReasonedAction
                label={`Start deletion ${user.email}`}
                confirmLabel="Confirm deletion window"
                onConfirm={async (reason) => {
                  await apiFetch(`/api/v1/platform_admin/users/${user.id}/deletion`, {
                    method: 'POST',
                    body: JSON.stringify({ reason }),
                  })
                  setNotice('30-day deletion recovery started.')
                }}
              />
              <ReasonedAction
                label={`Cancel deletion ${user.email}`}
                confirmLabel="Confirm cancel deletion"
                onConfirm={async (reason) => {
                  await apiFetch(`/api/v1/platform_admin/users/${user.id}/deletion/cancel`, {
                    method: 'POST',
                    body: JSON.stringify({ reason }),
                  })
                  setNotice('Deletion recovery cancelled.')
                }}
              />
              <ReasonedAction
                label={`View date of birth ${user.email}`}
                confirmLabel="Show date of birth"
                onConfirm={async (reason) => {
                  const result = await apiFetch<{ date_of_birth: string | null }>(
                    `/api/v1/platform_admin/users/${user.id}/date_of_birth`,
                    { method: 'POST', body: JSON.stringify({ reason }) },
                  )
                  setNotice(result.date_of_birth ? `Date of birth ${result.date_of_birth}` : 'No date of birth')
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <ul className="grid gap-2">
        {organizations.map((organization) => (
          <li key={organization.id} className="text-sm">
            {organization.name} · workspace {organization.workspace_status}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CreditsArea() {
  const [ownerType, setOwnerType] = useState('user')
  const [ownerId, setOwnerId] = useState('')
  const [amount, setAmount] = useState('1')
  const [direction, setDirection] = useState('grant')
  const [reason, setReason] = useState('')
  const [refundId, setRefundId] = useState('')
  const [upgradeId, setUpgradeId] = useState('')
  const [upgradeStatus, setUpgradeStatus] = useState('contacted')
  const [message, setMessage] = useState<string | null>(null)

  return (
    <section className="grid max-w-xl gap-4">
      <h1 className="text-lg font-semibold">Credits and Stripe</h1>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void apiFetch('/api/v1/platform_admin/credits', {
            method: 'POST',
            body: JSON.stringify({
              owner_type: ownerType,
              owner_id: ownerId,
              amount: Number(amount),
              direction,
              reason,
            }),
          }).then((result) => setMessage(`Balance ${(result as { balance: number }).balance}`))
        }}
      >
        <label className="grid gap-1 text-sm">
          Owner type
          <select
            aria-label="Owner type"
            value={ownerType}
            onChange={(event) => setOwnerType(event.target.value)}
            className="h-9 rounded-md border border-border bg-canvas px-2"
          >
            <option value="user">user</option>
            <option value="organization">organization</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Owner id
          <Input aria-label="Owner id" value={ownerId} onChange={(event) => setOwnerId(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          Amount
          <Input aria-label="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          Direction
          <select
            aria-label="Direction"
            value={direction}
            onChange={(event) => setDirection(event.target.value)}
            className="h-9 rounded-md border border-border bg-canvas px-2"
          >
            <option value="grant">grant</option>
            <option value="remove">remove</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Credit reason
          <textarea
            required
            aria-label="Credit reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-16 rounded-md border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <Button type="submit">Apply credit change</Button>
      </form>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void apiFetch(`/api/v1/platform_admin/refund_requests/${refundId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ reason: 'unused credits' }),
          }).then(() => setMessage('Refund approved'))
        }}
      >
        <label className="grid gap-1 text-sm">
          Refund request id
          <Input value={refundId} onChange={(event) => setRefundId(event.target.value)} />
        </label>
        <Button type="submit" variant="outline">
          Approve refund
        </Button>
      </form>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void apiFetch(`/api/v1/platform_admin/upgrade_requests/${upgradeId}`, {
            method: 'POST',
            body: JSON.stringify({ status: upgradeStatus }),
          }).then(() => setMessage(`Upgrade request ${upgradeStatus}`))
        }}
      >
        <label className="grid gap-1 text-sm">
          Upgrade request id
          <Input value={upgradeId} onChange={(event) => setUpgradeId(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          Upgrade status
          <select
            aria-label="Upgrade status"
            value={upgradeStatus}
            onChange={(event) => setUpgradeStatus(event.target.value)}
            className="h-9 rounded-md border border-border bg-canvas px-2"
          >
            <option value="contacted">contacted</option>
            <option value="closed">closed</option>
          </select>
        </label>
        <Button type="submit" variant="outline">
          Update upgrade request
        </Button>
      </form>
      {message ? <p role="status">{message}</p> : null}
    </section>
  )
}

function IdReasonForm({
  title,
  idLabel,
  path,
  extra,
}: {
  title: string
  idLabel: string
  path: (id: string) => string
  extra?: Record<string, string>
}) {
  return (
    <ReasonedAction
      label={title}
      confirmLabel={`Confirm ${title.toLowerCase()}`}
      onConfirm={async (reason) => {
        const id = (document.getElementById(idLabel) as HTMLInputElement | null)?.value ?? ''
        await apiFetch(path(id), {
          method: 'POST',
          body: JSON.stringify({ reason, ...extra }),
        })
      }}
    />
  )
}

export function ModerationArea() {
  return (
    <section className="grid max-w-xl gap-4">
      <h1 className="text-lg font-semibold">Moderation</h1>
      <label className="grid gap-1 text-sm">
        Review id
        <Input id="Review id" aria-label="Review id" />
      </label>
      <IdReasonForm title="Hide review" idLabel="Review id" path={(id) => `/api/v1/platform_admin/peer_reviews/${id}/hide`} />
      <label className="grid gap-1 text-sm">
        Message id
        <Input id="Message id" aria-label="Message id" />
      </label>
      <IdReasonForm
        title="Remove message"
        idLabel="Message id"
        path={(id) => `/api/v1/platform_admin/project_messages/${id}/remove`}
      />
      <label className="grid gap-1 text-sm">
        Project id
        <Input id="Project id" aria-label="Project id" />
      </label>
      <IdReasonForm
        title="Archive project"
        idLabel="Project id"
        path={(id) => `/api/v1/platform_admin/projects/${id}/archive`}
      />
      <label className="grid gap-1 text-sm">
        File id
        <Input id="File id" aria-label="File id" />
      </label>
      <IdReasonForm title="Inspect file" idLabel="File id" path={(id) => `/api/v1/platform_admin/files/${id}/inspect`} />
      <label className="grid gap-1 text-sm">
        AI review id
        <Input id="AI review id" aria-label="AI review id" />
      </label>
      <IdReasonForm
        title="Correct AI review"
        idLabel="AI review id"
        path={(id) => `/api/v1/platform_admin/ai_reviews/${id}/correct`}
        extra={{ decision: 'approved' }}
      />
    </section>
  )
}

export function QueuesArea() {
  const [loaded, setLoaded] = useState(false)
  const [jobs, setJobs] = useState<{ id: string; error: string }[]>([])
  const [emails, setEmails] = useState<{ id: string; event_key: string }[]>([])
  const [escalations, setEscalations] = useState<{ id: string; project_id: string }[]>([])

  return (
    <section className="grid gap-3">
      <h1 className="text-lg font-semibold">Escalations and jobs</h1>
      <Button
        type="button"
        onClick={() => {
          void apiFetch<{
            failed_jobs: { id: string; error: string }[]
            failed_emails: { id: string; event_key: string }[]
            escalations: { id: string; project_id: string }[]
          }>('/api/v1/platform_admin/queues').then((result) => {
            setJobs(result.failed_jobs)
            setEmails(result.failed_emails)
            setEscalations(result.escalations)
            setLoaded(true)
          })
        }}
      >
        Refresh queues
      </Button>
      {loaded ? (
        <>
          <h2 className="text-sm font-medium">Failed jobs ({jobs.length})</h2>
          <ul>
            {jobs.map((job) => (
              <li key={job.id}>{job.error}</li>
            ))}
          </ul>
          <h2 className="text-sm font-medium">Failed emails ({emails.length})</h2>
          <ul>
            {emails.map((email) => (
              <li key={email.id}>{email.event_key}</li>
            ))}
          </ul>
          <h2 className="text-sm font-medium">Escalations ({escalations.length})</h2>
          <ul>
            {escalations.map((row) => (
              <li key={row.id}>Project {row.project_id}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}

export function ImpersonationArea() {
  const { refreshSession } = useAuth()
  const [userId, setUserId] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  return (
    <section className="grid max-w-xl gap-3">
      <h1 className="text-lg font-semibold">Impersonation</h1>
      <p className="text-sm text-muted-foreground">
        Starts a 30-minute read-only view of the participant shell on this admin host. Profile edits,
        purchases, invitations, and private files stay unavailable.
      </p>
      <label className="grid gap-1 text-sm">
        User id
        <Input id="Impersonation user id" value={userId} onChange={(event) => setUserId(event.target.value)} />
      </label>
      <ReasonedAction
        label="Start impersonation"
        confirmLabel="Confirm impersonation"
        onConfirm={async (reason) => {
          const id = userId || (document.getElementById('Impersonation user id') as HTMLInputElement | null)?.value
          const result = await apiFetch<{ session_id: string }>('/api/v1/platform_admin/impersonation', {
            method: 'POST',
            body: JSON.stringify({ user_id: id, reason }),
          })
          window.sessionStorage.setItem('careerstack.impersonation', result.session_id)
          await refreshSession()
          setMessage('Impersonation started.')
        }}
      />
      {message ? <p role="status">{message}</p> : null}
    </section>
  )
}

export function AuditArea() {
  const [events, setEvents] = useState<
    { id: string; action: string; reason: string | null; created_at: string }[]
  >([])

  return (
    <section className="grid gap-3">
      <h1 className="text-lg font-semibold">Audit</h1>
      <Button
        type="button"
        onClick={() => {
          void apiFetch<{ events: { id: string; action: string; reason: string | null; created_at: string }[] }>(
            '/api/v1/platform_admin/audit',
          ).then((result) => setEvents(result.events))
        }}
      >
        Load audit
      </Button>
      <ul className="grid gap-1 text-sm">
        {events.map((event) => (
          <li key={event.id}>
            {event.action} · {event.reason ?? 'no reason'} · {event.created_at}
          </li>
        ))}
      </ul>
    </section>
  )
}
