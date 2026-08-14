import { useState } from 'react'
import { Archive, ArrowLeft, Plus, Trash2 } from 'lucide-react'
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
import type { OrgAdminCapabilities, Program } from '@/lib/organizationAdmin'
import { ProgramStatusBadge } from './ProgramStatusBadge'

export function ProgramsPanel({
  programs,
  capabilities,
  readOnlyOrg,
  selectedProgramId,
  onOpenProgram,
  onBack,
  onCreate,
  onSave,
  onArchive,
  onDelete,
}: {
  programs: Program[]
  capabilities: OrgAdminCapabilities
  readOnlyOrg: boolean
  selectedProgramId: string | null
  onOpenProgram: (id: string) => void
  onBack: () => void
  onCreate: (params: { name: string; description: string; status: 'draft' | 'active' }) => Promise<void>
  onSave: (programId: string, params: { name: string; description: string; status: 'draft' | 'active' }) => Promise<void>
  onArchive: (programId: string) => Promise<void>
  onDelete: (programId: string) => Promise<void>
}) {
  const selected = programs.find((program) => program.id === selectedProgramId) ?? null
  const listed = [...programs].sort((a, b) => {
    const order = { active: 0, draft: 1, archived: 2 }
    return order[a.status] - order[b.status]
  })

  if (selected) {
    return (
      <ProgramDetail
        program={selected}
        capabilities={capabilities}
        readOnlyOrg={readOnlyOrg}
        onBack={onBack}
        onSave={onSave}
        onArchive={onArchive}
        onDelete={onDelete}
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
          Programs
        </h2>
        <CreateProgramDialog disabled={readOnlyOrg} onCreate={onCreate} />
      </div>
      <ul className="space-y-3">
        {listed.map((program) => (
          <li key={program.id}>
            <ProgramCard
              program={program}
              capabilities={capabilities}
              readOnlyOrg={readOnlyOrg}
              onOpen={() => onOpenProgram(program.id)}
              onArchive={onArchive}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
      {listed.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-ink-muted">
          No programs yet. Create a draft program to start organizing projects and members.
        </p>
      ) : null}
    </div>
  )
}

function ProgramCard({
  program,
  capabilities,
  readOnlyOrg,
  onOpen,
  onArchive,
  onDelete,
}: {
  program: Program
  capabilities: OrgAdminCapabilities
  readOnlyOrg: boolean
  onOpen: () => void
  onArchive: (programId: string) => Promise<void>
  onDelete: (programId: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const title = program.name.trim() || 'Untitled draft'
  const showArchive = capabilities.can_archive_programs && program.can_archive && !readOnlyOrg
  const showDelete = capabilities.can_delete_empty_drafts && program.can_delete && !readOnlyOrg

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update program')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight text-ink">{title}</h3>
            <ProgramStatusBadge status={program.status} />
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">
            {program.description || 'No description yet.'}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
            <div className="flex gap-1.5">
              <dt>Members</dt>
              <dd className="font-mono font-medium text-ink tabular-nums">{program.member_count}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Active projects</dt>
              <dd className="font-mono font-medium text-ink tabular-nums">
                {program.active_project_count}
              </dd>
            </div>
            {program.pending_invitation_count > 0 ? (
              <div className="flex gap-1.5">
                <dt>Pending invites</dt>
                <dd className="font-mono font-medium tabular-nums">
                  {program.pending_invitation_count}
                </dd>
              </div>
            ) : null}
          </dl>
          {program.read_only ? (
            <p className="mt-2 text-[12px] text-ink-muted">
              Archived programs are read-only. New projects and invitations are blocked.
            </p>
          ) : null}
          {!capabilities.can_archive_programs && program.status !== 'archived' ? (
            <p className="mt-2 text-[12px] text-ink-muted">
              Only administrators can archive programs or delete empty drafts.
            </p>
          ) : null}
        </button>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <Button type="button" variant="outline" size="sm" onClick={onOpen}>
            Open
          </Button>
          {showArchive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void run(() => onArchive(program.id))}
            >
              <Archive className="size-3.5" aria-hidden />
              Archive
            </Button>
          ) : null}
          {showDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void run(() => onDelete(program.id))}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete draft
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-status-danger" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  )
}

function ProgramDetail({
  program,
  capabilities,
  readOnlyOrg,
  onBack,
  onSave,
  onArchive,
  onDelete,
}: {
  program: Program
  capabilities: OrgAdminCapabilities
  readOnlyOrg: boolean
  onBack: () => void
  onSave: (programId: string, params: { name: string; description: string; status: 'draft' | 'active' }) => Promise<void>
  onArchive: (programId: string) => Promise<void>
  onDelete: (programId: string) => Promise<void>
}) {
  const [name, setName] = useState(program.name)
  const [description, setDescription] = useState(program.description ?? '')
  const [status, setStatus] = useState<'draft' | 'active'>(
    program.status === 'archived' ? 'active' : program.status,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const locked = program.read_only || readOnlyOrg

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update program')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to programs
      </Button>
      <header className="border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            {program.name.trim() || 'Untitled draft'}
          </h2>
          <ProgramStatusBadge status={program.status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Members', value: program.member_count },
            { label: 'Active projects', value: program.active_project_count },
            { label: 'Completed', value: program.completed_project_count },
            { label: 'Pending invites', value: program.pending_invitation_count },
          ].map((stat) => (
            <div key={stat.label} className="rounded-md border border-border bg-surface px-3 py-2.5">
              <dt className="text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
                {stat.label}
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-ink tabular-nums">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>
      {error ? (
        <Alert tone="danger" title="Could not save">
          {error}
        </Alert>
      ) : null}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="program-name">Name</Label>
          <Input
            id="program-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={locked}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="program-description">Description</Label>
          <textarea
            id="program-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={locked}
            className="min-h-24 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink"
          />
        </div>
        {program.status !== 'archived' ? (
          <div className="space-y-2">
            <Label htmlFor="program-status">Status</Label>
            <select
              id="program-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as 'draft' | 'active')}
              disabled={locked}
              className="h-10 w-full rounded-md border border-border bg-canvas px-3 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Archived programs cannot be edited. They remain available as filters for history.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border pt-5">
        <Button
          type="button"
          disabled={locked || busy || name.trim().length < 1}
          onClick={() =>
            void run(() =>
              onSave(program.id, { name: name.trim(), description: description.trim(), status }),
            )
          }
        >
          Save program
        </Button>
        {capabilities.can_archive_programs && program.can_archive && !readOnlyOrg ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => onArchive(program.id))}
          >
            Archive program
          </Button>
        ) : null}
        {capabilities.can_delete_empty_drafts && program.can_delete && !readOnlyOrg ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => onDelete(program.id))}
          >
            Delete empty draft
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function CreateProgramDialog({
  disabled,
  onCreate,
}: {
  disabled: boolean
  onCreate: (params: { name: string; description: string; status: 'draft' | 'active' }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'draft' | 'active'>('draft')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await onCreate({ name: name.trim(), description: description.trim(), status })
      setOpen(false)
      setName('')
      setDescription('')
      setStatus('draft')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create program')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" disabled={disabled} onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Create program
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create program</DialogTitle>
          <DialogDescription>
            Programs are filters inside this workspace. Creating a program does not use a credit.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert tone="danger" title="Could not create">
            {error}
          </Alert>
        ) : null}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="new-program-name">Name</Label>
            <Input
              id="new-program-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-program-description">Description</Label>
            <textarea
              id="new-program-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-20 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-program-status">Status</Label>
            <select
              id="new-program-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as 'draft' | 'active')}
              className="h-10 w-full rounded-md border border-border bg-canvas px-3 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || name.trim().length < 1} onClick={() => void submit()}>
            Create program
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
