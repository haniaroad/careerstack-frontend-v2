import { useCallback, useEffect, useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
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
import { InsufficientCreditsInterception } from '@/components/InsufficientCreditsInterception'
import { StatusBadge } from '@/components/StatusBadge'
import { apiFetch, ApiError } from '@/lib/api'
import {
  trackMemberRemoved,
  trackProjectConvertedToTeam,
  trackProjectJoined,
  trackProjectLeft,
} from '@/lib/mixpanel'
import {
  JOINING_MODES,
  REASON_CATEGORIES,
  formatReasonCategory,
  type JoiningMode,
  type Project,
  type ReasonCategory,
} from '@/lib/projects'
import type { SessionPayload } from '@/auth/types'

function statusTone(status: string): 'info' | 'success' | 'warning' {
  if (status === 'active' || status === 'approved' || status === 'open') return 'success'
  if (
    status === 'cancelled' ||
    status === 'corrections_requested' ||
    status === 'incomplete' ||
    status === 'full' ||
    status === 'closed'
  ) {
    return 'warning'
  }
  return 'info'
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const formId = useId()
  const navigate = useNavigate()
  const { session, setSession, refreshSession } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [convertJoiningMode, setConvertJoiningMode] = useState<JoiningMode>('application')
  const [convertCapacity, setConvertCapacity] = useState(3)
  const [convertRoles, setConvertRoles] = useState('')

  const [joinRole, setJoinRole] = useState('')
  const [applyRole, setApplyRole] = useState('')
  const [applyMotivation, setApplyMotivation] = useState('')
  const [applyAvailable, setApplyAvailable] = useState(false)

  const [inviteeId, setInviteeId] = useState('')
  const [inviteRole, setInviteRole] = useState('')

  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveReason, setLeaveReason] = useState<ReasonCategory>('personal_reason')
  const [leaveDetail, setLeaveDetail] = useState('')

  const [removeUserId, setRemoveUserId] = useState<string | null>(null)
  const [removeReason, setRemoveReason] = useState<ReasonCategory>('removed_by_creator')
  const [removeDetail, setRemoveDetail] = useState('')
  const [rejectAppId, setRejectAppId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const workspace = session?.active_workspace
  const isPersonal = workspace?.kind === 'personal'
  const workspaceType = isPersonal ? 'personal' : 'organization'

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    setErrorCode(null)
    try {
      const data = await apiFetch<{ project: Project }>(`/api/v1/projects/${id}`)
      setProject(data.project)
      if (data.project.roles_needed?.length) {
        setJoinRole((prev) => prev || data.project.roles_needed[0])
        setApplyRole((prev) => prev || data.project.roles_needed[0])
        setInviteRole((prev) => prev || data.project.roles_needed[0])
        setConvertRoles((prev) => prev || data.project.roles_needed.join(', '))
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load project')
      if (err instanceof ApiError) setErrorCode(err.code)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  function handleApiError(err: unknown, fallback: string) {
    if (err instanceof ApiError) {
      setError(err.message)
      setErrorCode(err.code)
      if (err.code === 'insufficient_credits') void refreshSession()
    } else {
      setError(fallback)
      setErrorCode(null)
    }
  }

  async function handleCancel() {
    if (!project || project.status !== 'active') return
    setBusy(true)
    setError(null)
    setErrorCode(null)
    setNotice(null)
    try {
      const data = await apiFetch<{ project: Project; session: SessionPayload }>(
        `/api/v1/projects/${project.id}/cancel`,
        { method: 'POST' },
      )
      setProject(data.project)
      setSession(data.session)
    } catch (err) {
      handleApiError(err, 'Unable to cancel project')
    } finally {
      setBusy(false)
    }
  }

  async function handleDiscard() {
    if (!project || project.status !== 'draft') return
    setBusy(true)
    try {
      await apiFetch(`/api/v1/projects/${project.id}`, { method: 'DELETE' })
      navigate('/my-work')
    } catch (err) {
      handleApiError(err, 'Unable to discard draft')
      setBusy(false)
    }
  }

  async function handleConvertToTeam() {
    if (!project) return
    const roles = convertRoles
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!roles.length) {
      setError('Add at least one role to convert to team')
      return
    }
    setBusy(true)
    setError(null)
    setErrorCode(null)
    setNotice(null)
    try {
      const data = await apiFetch<{ project: Project }>(
        `/api/v1/projects/${project.id}/convert_to_team`,
        {
          method: 'POST',
          body: JSON.stringify({
            joining_mode: convertJoiningMode,
            capacity: convertCapacity,
            roles_needed: roles,
          }),
        },
      )
      setProject(data.project)
      trackProjectConvertedToTeam({
        workspace_type: workspaceType,
        joining_mode: convertJoiningMode,
      })
      setNotice(
        'Converted to team. Any in-flight AI reviews were cancelled and must be restarted if needed.',
      )
    } catch (err) {
      handleApiError(err, 'Unable to convert to team')
    } finally {
      setBusy(false)
    }
  }

  async function handleInstantJoin() {
    if (!project || !joinRole.trim()) return
    setBusy(true)
    setError(null)
    setErrorCode(null)
    setNotice(null)
    try {
      const data = await apiFetch<{ project: Project; session: SessionPayload }>(
        `/api/v1/projects/${project.id}/join`,
        {
          method: 'POST',
          body: JSON.stringify({ participant_role: joinRole.trim() }),
        },
      )
      setProject(data.project)
      setSession(data.session)
      trackProjectJoined({ workspace_type: workspaceType, join_source: 'instant' })
      setNotice('You joined this project.')
    } catch (err) {
      handleApiError(err, 'Unable to join project')
    } finally {
      setBusy(false)
    }
  }

  async function handleApply() {
    if (!project || !applyRole.trim() || !applyMotivation.trim() || !applyAvailable) return
    setBusy(true)
    setError(null)
    setErrorCode(null)
    setNotice(null)
    try {
      await apiFetch(`/api/v1/projects/${project.id}/applications`, {
        method: 'POST',
        body: JSON.stringify({
          requested_role: applyRole.trim(),
          motivation: applyMotivation.trim(),
          availability_confirmed: true,
        }),
      })
      setNotice('Application submitted. The creator will review it.')
      setApplyMotivation('')
      setApplyAvailable(false)
      await load()
    } catch (err) {
      handleApiError(err, 'Unable to submit application')
    } finally {
      setBusy(false)
    }
  }

  async function handleApproveApplication(applicationId: string) {
    if (!project) return
    setBusy(true)
    setError(null)
    setErrorCode(null)
    setNotice(null)
    try {
      const data = await apiFetch<{ project: Project; session: SessionPayload }>(
        `/api/v1/projects/${project.id}/applications/${applicationId}/approve`,
        { method: 'POST' },
      )
      setProject(data.project)
      setSession(data.session)
      trackProjectJoined({ workspace_type: workspaceType, join_source: 'application' })
      setNotice('Application approved.')
    } catch (err) {
      handleApiError(err, 'Unable to approve application')
    } finally {
      setBusy(false)
    }
  }

  async function handleRejectApplication() {
    if (!project || !rejectAppId || !rejectReason.trim()) return
    setBusy(true)
    setError(null)
    setErrorCode(null)
    setNotice(null)
    try {
      await apiFetch(`/api/v1/projects/${project.id}/applications/${rejectAppId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      })
      setRejectAppId(null)
      setRejectReason('')
      setNotice('Application rejected.')
      await load()
    } catch (err) {
      handleApiError(err, 'Unable to reject application')
    } finally {
      setBusy(false)
    }
  }

  async function handleInvite() {
    if (!project || !inviteeId.trim() || !inviteRole.trim()) return
    setBusy(true)
    setError(null)
    setErrorCode(null)
    setNotice(null)
    try {
      await apiFetch(`/api/v1/projects/${project.id}/invitations`, {
        method: 'POST',
        body: JSON.stringify({
          invitee_id: inviteeId.trim(),
          requested_role: inviteRole.trim(),
        }),
      })
      setInviteeId('')
      setNotice('Invitation sent.')
      await load()
    } catch (err) {
      handleApiError(err, 'Unable to send invitation')
    } finally {
      setBusy(false)
    }
  }

  async function handleLeave() {
    if (!project) return
    setBusy(true)
    setError(null)
    setErrorCode(null)
    setNotice(null)
    try {
      const data = await apiFetch<{ project: Project }>(`/api/v1/projects/${project.id}/leave`, {
        method: 'POST',
        body: JSON.stringify({
          reason_category: leaveReason,
          reason_detail: leaveDetail.trim() || undefined,
        }),
      })
      setProject(data.project)
      setLeaveOpen(false)
      trackProjectLeft({ workspace_type: workspaceType, reason_category: leaveReason })
      setNotice('You left the project. Your pending task assignments were cleared.')
    } catch (err) {
      handleApiError(err, 'Unable to leave project')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveMember() {
    if (!project || !removeUserId) return
    setBusy(true)
    setError(null)
    setErrorCode(null)
    setNotice(null)
    try {
      const data = await apiFetch<{ project: Project }>(
        `/api/v1/projects/${project.id}/remove_member`,
        {
          method: 'POST',
          body: JSON.stringify({
            user_id: removeUserId,
            reason_category: removeReason,
            reason_detail: removeDetail.trim() || undefined,
          }),
        },
      )
      setProject(data.project)
      setRemoveUserId(null)
      setRemoveDetail('')
      trackMemberRemoved({ workspace_type: workspaceType, reason_category: removeReason })
      setNotice('Member removed. Their pending task assignments were cleared.')
    } catch (err) {
      handleApiError(err, 'Unable to remove member')
    } finally {
      setBusy(false)
    }
  }

  async function handleAssignTask(taskId: string, assigneeId: string | null) {
    if (!project) return
    setBusy(true)
    setError(null)
    setErrorCode(null)
    try {
      await apiFetch(`/api/v1/tasks/${taskId}/assignment`, {
        method: 'PATCH',
        body: JSON.stringify({ assignee_id: assigneeId }),
      })
      await load()
    } catch (err) {
      handleApiError(err, 'Unable to update assignment')
    } finally {
      setBusy(false)
    }
  }

  if (error && !project) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
        <Button asChild variant="secondary">
          <Link to="/my-work">Back to My Work</Link>
        </Button>
      </div>
    )
  }

  if (!project) {
    return <p className="text-ink-muted">Loading project…</p>
  }

  const userId = session?.user.id
  const isCreator = userId === project.creator_id
  const memberships = project.memberships ?? []
  const myMembership = memberships.find((m) => m.user_id === userId)
  const isParticipant = Boolean(myMembership && myMembership.role !== 'creator')
  const canJoin =
    Boolean(project.viewer_can_join) &&
    !isCreator &&
    !myMembership &&
    project.mode === 'team' &&
    project.status === 'active'
  const roles = project.roles_needed ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-medium text-ink-muted">Project</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-ink">{project.title}</h1>
          <StatusBadge tone={statusTone(project.status)}>{project.status}</StatusBadge>
          <StatusBadge tone="info">{project.mode}</StatusBadge>
          {project.recruitment_state ? (
            <StatusBadge tone={statusTone(project.recruitment_state)}>
              {project.recruitment_state}
            </StatusBadge>
          ) : null}
        </div>
        {project.summary ? <p className="text-ink-muted">{project.summary}</p> : null}
        {project.skills.length > 0 ? (
          <p className="text-sm text-ink-muted">Skills: {project.skills.join(', ')}</p>
        ) : null}
        {project.mode === 'team' ? (
          <p className="text-sm text-ink-muted">
            Capacity {project.participant_count ?? 0}/{project.capacity ?? '—'}
            {project.seats_remaining != null ? ` · ${project.seats_remaining} seats left` : ''}
            {project.joining_mode ? ` · ${project.joining_mode.replaceAll('_', ' ')}` : ''}
          </p>
        ) : null}
        {roles.length > 0 ? (
          <p className="text-sm text-ink-muted">Roles needed: {roles.join(', ')}</p>
        ) : null}
      </header>

      {errorCode === 'insufficient_credits' ? (
        <InsufficientCreditsInterception
          blockedAction={isCreator ? 'approve a teammate' : 'join this project'}
          remaining={session?.credits?.remaining ?? 0}
          variant={isPersonal ? 'personal' : 'organization'}
          role={isPersonal ? undefined : 'participant'}
        />
      ) : null}

      {errorCode === 'capacity_full' ? (
        <Alert tone="warning" title="Project is full">
          {error || 'No seats remaining on this project.'}
        </Alert>
      ) : null}

      {error && errorCode !== 'insufficient_credits' && errorCode !== 'capacity_full' ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}

      {notice ? (
        <Alert tone="info" title="Updated">
          {notice}
        </Alert>
      ) : null}

      {project.mode === 'team' && memberships.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-display text-xl text-ink">Roster</h2>
          <ul className="space-y-2">
            {memberships.map((member) => (
              <li
                key={member.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">{member.display_name}</p>
                  <p className="text-sm text-ink-muted">
                    {member.role}
                    {member.participant_role ? ` · ${member.participant_role}` : ''}
                  </p>
                </div>
                {isCreator && member.role !== 'creator' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setRemoveUserId(member.user_id)
                      setRemoveReason('removed_by_creator')
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isCreator && project.status === 'active' && project.mode === 'solo' ? (
        <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-xl text-ink">Convert to team</h2>
          <p className="text-sm text-ink-muted">
            Open this project for collaborators. In-flight AI reviews will be cancelled.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">Joining mode</span>
              <select
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                value={convertJoiningMode}
                onChange={(e) => setConvertJoiningMode(e.target.value as JoiningMode)}
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
                value={convertCapacity}
                onChange={(e) => setConvertCapacity(Number(e.target.value))}
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-ink">Roles needed (comma-separated)</span>
              <input
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                value={convertRoles}
                onChange={(e) => setConvertRoles(e.target.value)}
              />
            </label>
          </div>
          <Button onClick={() => void handleConvertToTeam()} disabled={busy}>
            Convert to team
          </Button>
        </div>
      ) : null}

      {isCreator && project.mode === 'team' && project.status === 'active' ? (
        <div className="space-y-4">
          {(project.pending_applications?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              <h2 className="font-display text-xl text-ink">Pending applications</h2>
              <ul className="space-y-3">
                {project.pending_applications!.map((app) => (
                  <li
                    key={app.id}
                    className="space-y-3 rounded-lg border border-border bg-surface p-4"
                  >
                    <p className="font-medium text-ink">{app.requested_role}</p>
                    <p className="text-sm text-ink-muted">{app.motivation}</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleApproveApplication(app.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => {
                          setRejectAppId(app.id)
                          setRejectReason('')
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {project.joining_mode === 'invite_only' ? (
            <div className="space-y-3 rounded-lg border border-border bg-surface p-5">
              <h2 className="font-display text-xl text-ink">Invite teammate</h2>
              <p className="text-sm text-ink-muted">
                Paste the teammate&apos;s CareerStack user ID. Directory-based invites come later.
              </p>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink">Invitee user ID</span>
                <input
                  className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                  value={inviteeId}
                  onChange={(e) => setInviteeId(e.target.value)}
                  placeholder="Paste user ID"
                  autoComplete="off"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink">Requested role</span>
                {roles.length > 0 ? (
                  <select
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  />
                )}
              </label>
              <Button
                onClick={() => void handleInvite()}
                disabled={busy || !inviteeId.trim() || !inviteRole.trim()}
              >
                Send invitation
              </Button>
              {(project.pending_invitations?.length ?? 0) > 0 ? (
                <ul className="space-y-1 text-sm text-ink-muted">
                  {project.pending_invitations!.map((invite) => (
                    <li key={invite.id}>
                      Pending invite · {invite.requested_role} · {invite.invitee_id}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {project.joining_mode === 'application' ? (
            <Alert tone="info" title="Application mode">
              People apply from the project page. Review applicants above when they apply. Direct invites
              are available when joining mode is Invite only.
            </Alert>
          ) : null}
        </div>
      ) : null}

      {canJoin && project.joining_mode === 'instant' ? (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-xl text-ink">Join this team</h2>
          <p className="text-sm text-ink-muted">Joining uses one credit from this workspace.</p>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Your role</span>
            {roles.length > 0 ? (
              <select
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                value={joinRole}
                onChange={(e) => setJoinRole(e.target.value)}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                value={joinRole}
                onChange={(e) => setJoinRole(e.target.value)}
              />
            )}
          </label>
          <Button onClick={() => void handleInstantJoin()} disabled={busy || !joinRole.trim()}>
            Join now
          </Button>
        </div>
      ) : null}

      {canJoin && project.joining_mode === 'application' ? (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-xl text-ink">Apply to join</h2>
          <p className="text-sm text-ink-muted">
            Applying does not use a credit. Approval will use one credit.
          </p>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Requested role</span>
            {roles.length > 0 ? (
              <select
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                value={applyRole}
                onChange={(e) => setApplyRole(e.target.value)}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                value={applyRole}
                onChange={(e) => setApplyRole(e.target.value)}
              />
            )}
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Motivation</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
              value={applyMotivation}
              onChange={(e) => setApplyMotivation(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={applyAvailable}
              onChange={(e) => setApplyAvailable(e.target.checked)}
            />
            I confirm I am available for this project
          </label>
          <Button
            onClick={() => void handleApply()}
            disabled={busy || !applyRole.trim() || !applyMotivation.trim() || !applyAvailable}
          >
            Submit application
          </Button>
        </div>
      ) : null}

      {canJoin && project.joining_mode === 'invite_only' ? (
        <Alert tone="info" title="Invite only">
          This project is invite-only. Ask the creator for an invitation.
        </Alert>
      ) : null}

      <div className="space-y-3">
        <h2 className="font-display text-xl text-ink">Tasks</h2>
        {!project.tasks || project.tasks.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {project.status === 'draft'
              ? 'Tasks are created when you confirm this project.'
              : 'No tasks on this project yet.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {project.tasks.map((task) => {
              const assignee = memberships.find((m) => m.user_id === task.assignee_id)
              return (
                <li
                  key={task.id}
                  className="space-y-3 rounded-lg border border-border bg-surface px-4 py-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Link to={`/tasks/${task.id}`} className="font-medium text-ink hover:underline">
                      {task.title}
                    </Link>
                    <StatusBadge tone={statusTone(task.status)}>
                      {task.status.replaceAll('_', ' ')}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-ink-muted">
                    Assignee: {assignee?.display_name ?? (task.assignee_id ? 'Member' : 'Unassigned')}
                  </p>
                  {isCreator && project.mode === 'team' && task.status === 'pending' ? (
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-ink">Assign to</span>
                      <select
                        className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
                        value={task.assignee_id ?? ''}
                        disabled={busy}
                        onChange={(e) =>
                          void handleAssignTask(task.id, e.target.value || null)
                        }
                      >
                        <option value="">Unassigned</option>
                        {memberships.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.display_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {isCreator && project.status === 'draft' ? (
          <>
            <Button asChild>
              <Link to={`/projects/${project.id}/edit`}>Edit draft</Link>
            </Button>
            <Button variant="secondary" onClick={() => void handleDiscard()} disabled={busy}>
              Discard draft
            </Button>
          </>
        ) : null}
        {isCreator && project.status === 'active' ? (
          <Button variant="secondary" onClick={() => void handleCancel()} disabled={busy}>
            Cancel project
          </Button>
        ) : null}
        {isParticipant && project.status === 'active' ? (
          <Button variant="secondary" onClick={() => setLeaveOpen(true)} disabled={busy}>
            Leave project
          </Button>
        ) : null}
        <Button asChild variant="ghost">
          <Link to="/my-work">Back to My Work</Link>
        </Button>
      </div>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave project</DialogTitle>
            <DialogDescription>
              Your pending task assignments will be cleared. Credits are not restored.
            </DialogDescription>
          </DialogHeader>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Reason</span>
            <select
              id={`${formId}-leave-reason`}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value as ReasonCategory)}
            >
              {REASON_CATEGORIES.filter((c) => !c.startsWith('removed_by')).map((category) => (
                <option key={category} value={category}>
                  {formatReasonCategory(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Detail (optional)</span>
            <textarea
              className="min-h-20 w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
              value={leaveDetail}
              onChange={(e) => setLeaveDetail(e.target.value)}
            />
          </label>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => setLeaveOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void handleLeave()} disabled={busy}>
              Confirm leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(removeUserId)} onOpenChange={(open) => !open && setRemoveUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Their pending task assignments will be cleared. Credits are not restored.
            </DialogDescription>
          </DialogHeader>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Reason</span>
            <select
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value as ReasonCategory)}
            >
              {REASON_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {formatReasonCategory(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Detail (optional)</span>
            <textarea
              className="min-h-20 w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
              value={removeDetail}
              onChange={(e) => setRemoveDetail(e.target.value)}
            />
          </label>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => setRemoveUserId(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void handleRemoveMember()} disabled={busy}>
              Remove member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectAppId)} onOpenChange={(open) => !open && setRejectAppId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>Provide a short reason for the applicant.</DialogDescription>
          </DialogHeader>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Reason</span>
            <textarea
              className="min-h-20 w-full rounded-md border border-border bg-canvas px-3 py-2 text-ink"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </label>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => setRejectAppId(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleRejectApplication()}
              disabled={busy || !rejectReason.trim()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
