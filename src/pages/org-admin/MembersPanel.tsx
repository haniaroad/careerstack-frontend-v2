import { useMemo, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
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
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { ApiError } from '@/lib/api'
import {
  REMOVE_REASONS,
  ROLE_LABEL,
  type OrgAdminCapabilities,
  type OrgInvitation,
  type OrgMembership,
  type OrgRole,
  type Program,
} from '@/lib/organizationAdmin'

export function MembersPanel({
  memberships,
  invitations,
  programs,
  capabilities,
  readOnlyOrg,
  canInviteAdminRoles,
  onSearch,
  onSaveMembership,
  onRemoveMember,
  onInvite,
}: {
  memberships: OrgMembership[]
  invitations: OrgInvitation[]
  programs: Program[]
  capabilities: OrgAdminCapabilities
  readOnlyOrg: boolean
  canInviteAdminRoles: boolean
  onSearch: (query: string) => void
  onSaveMembership: (membershipId: string, params: { role: OrgRole; program_ids: string[] }) => Promise<void>
  onRemoveMember: (membershipId: string, reason: string) => Promise<void>
  onInvite: (params: { email: string; role: OrgRole; program_id: string | null }) => Promise<string | null>
}) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<OrgRole | ''>('')
  const [programFilter, setProgramFilter] = useState('')
  const [editing, setEditing] = useState<OrgMembership | null>(null)
  const [removing, setRemoving] = useState<OrgMembership | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const pending = invitations.filter((invite) => invite.status === 'pending')

  const filtered = useMemo(() => {
    return memberships.filter((member) => {
      if (roleFilter && member.role !== roleFilter) return false
      if (programFilter && !member.program_ids.includes(programFilter)) return false
      return true
    })
  }, [memberships, roleFilter, programFilter])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              const next = event.target.value
              setQuery(next)
              onSearch(next)
            }}
            placeholder="Search members"
            className="pl-9"
            aria-label="Search members"
          />
        </div>
        <Button type="button" disabled={readOnlyOrg} onClick={() => setInviteOpen(true)}>
          <UserPlus className="size-4" aria-hidden />
          Invite member
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filter by role"
          className="h-9 rounded-md border border-border bg-canvas px-2.5 text-sm"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as OrgRole | '')}
        >
          <option value="">All roles</option>
          <option value="admin">Administrator</option>
          <option value="manager">Manager</option>
          <option value="participant">Participant</option>
        </select>
        <select
          aria-label="Filter by program"
          className="h-9 rounded-md border border-border bg-canvas px-2.5 text-sm"
          value={programFilter}
          onChange={(event) => setProgramFilter(event.target.value)}
        >
          <option value="">All programs</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
      </div>

      {!capabilities.can_remove_members ? (
        <p className="text-sm text-ink-muted">Only administrators can remove members.</p>
      ) : null}

      {pending.length > 0 ? (
        <section aria-labelledby="pending-invites">
          <h3
            id="pending-invites"
            className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase"
          >
            Pending invitations · {pending.length}
          </h3>
          <ul className="mt-2 space-y-2">
            {pending.map((invite) => (
              <li
                key={invite.id}
                className="rounded-lg border border-dashed border-border bg-surface px-4 py-3"
              >
                <p className="text-sm font-medium text-ink">{invite.email || 'Link invite'}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {ROLE_LABEL[invite.role]} · {invite.program_name || 'No program'} · invited by{' '}
                  {invite.invited_by_name || 'staff'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="space-y-2.5">
        {filtered.map((member) => (
          <li key={member.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {member.display_name || member.email}
                  </p>
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold">
                    {ROLE_LABEL[member.role]}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold capitalize">
                    {member.age_status ?? 'unknown'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">{member.email}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  Programs:{' '}
                  <span className="font-medium text-ink">
                    {member.program_names.join(', ') || 'None'}
                  </span>
                </p>
                {member.is_last_administrator ? (
                  <p className="mt-2 text-[12px] text-status-warning">
                    Last administrator — removal is blocked until another admin exists.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={readOnlyOrg}
                  onClick={() => setEditing(member)}
                >
                  Edit
                </Button>
                {capabilities.can_remove_members ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!member.can_remove || readOnlyOrg}
                    title={
                      member.is_last_administrator
                        ? 'Last administrator cannot be removed'
                        : undefined
                    }
                    onClick={() => setRemoving(member)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-ink-muted">
          No members match these filters.
        </p>
      ) : null}

      {editing ? (
        <EditMemberDialog
          member={editing}
          programs={programs}
          canChangeRole={canInviteAdminRoles}
          onClose={() => setEditing(null)}
          onSave={onSaveMembership}
        />
      ) : null}
      {removing ? (
        <RemoveMemberDialog
          member={removing}
          onClose={() => setRemoving(null)}
          onRemove={onRemoveMember}
        />
      ) : null}
      {inviteOpen ? (
        <InviteDialog
          programs={programs}
          canInviteAdminRoles={canInviteAdminRoles}
          onClose={() => setInviteOpen(false)}
          onInvite={onInvite}
        />
      ) : null}
    </div>
  )
}

function EditMemberDialog({
  member,
  programs,
  canChangeRole,
  onClose,
  onSave,
}: {
  member: OrgMembership
  programs: Program[]
  canChangeRole: boolean
  onClose: () => void
  onSave: (membershipId: string, params: { role: OrgRole; program_ids: string[] }) => Promise<void>
}) {
  const [role, setRole] = useState<OrgRole>(member.role)
  const [programIds, setProgramIds] = useState(member.program_ids)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await onSave(member.id, { role, program_ids: programIds })
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update membership')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit membership</DialogTitle>
          <DialogDescription>
            Role and program associations for {member.display_name || member.email}. Age status is{' '}
            {member.age_status ?? 'unknown'}; date of birth is never shown.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert tone="danger" title="Could not save">
            {error}
          </Alert>
        ) : null}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <select
              id="edit-role"
              value={role}
              disabled={!canChangeRole}
              onChange={(event) => setRole(event.target.value as OrgRole)}
              className="h-10 w-full rounded-md border border-border bg-canvas px-3 text-sm"
            >
              <option value="participant">Participant</option>
              {canChangeRole ? (
                <>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </>
              ) : null}
            </select>
            {!canChangeRole ? (
              <p className="text-xs text-ink-muted">Managers can only keep or assign participant.</p>
            ) : null}
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Programs</legend>
            <div className="mt-2 space-y-2">
              {programs
                .filter((program) => program.status !== 'archived')
                .map((program) => {
                  const checked = programIds.includes(program.id)
                  return (
                    <label key={program.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setProgramIds((prev) =>
                            checked ? prev.filter((id) => id !== program.id) : [...prev, program.id],
                          )
                        }
                      />
                      {program.name}
                    </label>
                  )
                })}
            </div>
          </fieldset>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            Save membership
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RemoveMemberDialog({
  member,
  onClose,
  onRemove,
}: {
  member: OrgMembership
  onClose: () => void
  onRemove: (membershipId: string, reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState<string>(REMOVE_REASONS[0].value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await onRemove(member.id, reason)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to remove member')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {member.display_name || member.email}?</DialogTitle>
          <DialogDescription>
            They keep their CareerStack account and personal projects. Private organization access
            ends.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert tone="danger" title="Could not remove">
            {error}
          </Alert>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="remove-reason">Reason</Label>
          <select
            id="remove-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-canvas px-3 text-sm"
          >
            {REMOVE_REASONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            Confirm remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InviteDialog({
  programs,
  canInviteAdminRoles,
  onClose,
  onInvite,
}: {
  programs: Program[]
  canInviteAdminRoles: boolean
  onClose: () => void
  onInvite: (params: { email: string; role: OrgRole; program_id: string | null }) => Promise<string | null>
}) {
  const inviteable = programs.filter((program) => program.status === 'active' || program.status === 'draft')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('participant')
  const [programId, setProgramId] = useState(inviteable[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const token = await onInvite({
        email: email.trim(),
        role,
        program_id: programId || null,
      })
      if (token) {
        setInviteUrl(`${window.location.origin}/invite/${token}`)
      } else {
        onClose()
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send invite')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Inviting is always free. Age status appears after signup — staff never see date of birth.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert tone="danger" title="Could not invite">
            {error}
          </Alert>
        ) : null}
        {inviteUrl ? (
          <Alert tone="success" title="Invite created">
            Share this one-time link: {inviteUrl}
          </Alert>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as OrgRole)}
                className="h-10 w-full rounded-md border border-border bg-canvas px-3 text-sm"
              >
                <option value="participant">Participant</option>
                {canInviteAdminRoles ? (
                  <>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </>
                ) : null}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-program">Program</Label>
              <select
                id="invite-program"
                value={programId}
                onChange={(event) => setProgramId(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-canvas px-3 text-sm"
              >
                <option value="">No program yet</option>
                {inviteable.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {inviteUrl ? 'Done' : 'Cancel'}
          </Button>
          {inviteUrl ? null : (
            <Button
              type="button"
              disabled={busy || email.trim().length < 3}
              onClick={() => void submit()}
            >
              Send invite
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
