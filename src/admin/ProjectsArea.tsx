import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { LabelMultiSelect, RoleMultiSelect } from '@/components/LabelMultiSelect'
import { apiFetch } from '@/lib/api'
import { runWithStaffReauth } from './staffReauth'
import { labelsFromTerms, useTaxonomyLists } from '@/lib/taxonomies'
import { ProductionConfirm, productionConfirmed } from './EnvironmentBar'

type OrgOption = { id: string; name: string }
type OrgMember = {
  user_id: string
  email: string
  display_name: string | null
  role: string
  onboarded_adult: boolean
}
type Program = { id: string; name: string; status: string }
type ProjectSummary = {
  id: string
  title: string
  status: string
  mode: string
  ends_on: string
  staff_provisioned: boolean
  creator_id: string
  creator_email: string
}
type ProjectMember = {
  user_id: string
  email: string
  display_name: string | null
  role: string
  participant_role: string | null
}
type ProjectTask = {
  id: string
  title: string
  acceptance_criteria: string | null
  due_on: string | null
  status: string
  assignee_id: string | null
}
type ProjectDetail = ProjectSummary & {
  summary_text: string | null
  visibility: string
  joining_mode: string | null
  capacity: number | null
  roles_needed: string[]
  skills: string[]
  program_id: string | null
  members: ProjectMember[]
  tasks: ProjectTask[]
}
type OrgDetail = {
  id: string
  name: string
  programs: Program[]
  members: OrgMember[]
  projects: ProjectSummary[]
}

type DraftMember = { user_id: string; participant_role: string }
type DraftTask = { title: string; acceptance_criteria: string; due_on: string; assignee_id: string }
type EditorTask = DraftTask & { id?: string; status: string }

const fieldClass = 'grid gap-1 text-sm'
const selectClass = 'h-9 rounded-md border border-input bg-canvas px-2'
const LOCKED = new Set(['submitted', 'approved', 'incomplete'])

function personLabel(member: { email: string; display_name: string | null }) {
  return member.display_name ? `${member.display_name} (${member.email})` : member.email
}

function dateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : ''
}

function messageFrom(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong'
}

function assignableRoles(roles: string[]) {
  return roles.filter((role) => role && role !== 'Other')
}

export function ProjectsArea() {
  const taxonomy = useTaxonomyLists()
  const [organizations, setOrganizations] = useState<OrgOption[]>([])
  const [organizationId, setOrganizationId] = useState('')
  const [organization, setOrganization] = useState<OrgDetail | null>(null)
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void apiFetch<{ organizations: OrgOption[] }>('/api/v1/platform_admin/organizations')
      .then((result) => setOrganizations(result.organizations ?? []))
      .catch(() => setOrganizations([]))
  }, [])

  async function loadOrganization(id: string) {
    if (!id) {
      setOrganization(null)
      setProject(null)
      return
    }
    const result = await apiFetch<{ organization: OrgDetail }>(`/api/v1/platform_admin/organizations/${id}`)
    setOrganization(result.organization)
  }

  async function openProject(id: string) {
    const result = await apiFetch<{ project: ProjectDetail }>(`/api/v1/platform_admin/projects/${id}`)
    setProject(result.project)
  }

  async function refresh(projectId?: string) {
    if (!organizationId) return
    await loadOrganization(organizationId)
    if (projectId) await openProject(projectId)
  }

  return (
    <section className="grid max-w-3xl gap-8">
      <header className="grid gap-2">
        <h1 className="text-xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage projects for one organization. These projects do not use organization
          credits. A person can be a participant on only one active project. An admin or manager
          can create many team projects.
        </p>
        <label className={fieldClass}>
          Organization
          <select
            aria-label="Organization"
            className={selectClass}
            value={organizationId}
            onChange={(event) => {
              const id = event.target.value
              setOrganizationId(id)
              setProject(null)
              setNotice(null)
              void loadOrganization(id).catch((err: unknown) => setNotice(messageFrom(err)))
            }}
          >
            <option value="">Choose an organization</option>
            {organizations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {organization ? (
        <>
          <ProjectList
            projects={organization.projects}
            selectedId={project?.id}
            onOpen={(id) => void openProject(id).catch((err: unknown) => setNotice(messageFrom(err)))}
          />
          <CreateProject
            organization={organization}
            roleLabels={labelsFromTerms(taxonomy.roles)}
            skillLabels={labelsFromTerms(taxonomy.skills)}
            onCreated={async (created) => {
              setNotice(`${created.title} is active.`)
              await refresh(created.id)
            }}
          />
          {project ? (
            <EditProject
              key={project.id}
              organization={organization}
              project={project}
              roleLabels={labelsFromTerms(taxonomy.roles)}
              skillLabels={labelsFromTerms(taxonomy.skills)}
              onChange={async (next) => {
                setProject(next)
                setNotice('Saved.')
                await loadOrganization(organizationId)
              }}
            />
          ) : null}
        </>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
    </section>
  )
}

function ProjectList({
  projects,
  selectedId,
  onOpen,
}: {
  projects: ProjectSummary[]
  selectedId?: string
  onOpen: (id: string) => void
}) {
  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground">This organization has no projects yet.</p>
  }

  return (
    <ul className="grid gap-2">
      {projects.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            aria-pressed={item.id === selectedId}
            className="w-full rounded-md border border-border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onOpen(item.id)}
          >
            <span className="font-medium">{item.title}</span>
            <span className="text-muted-foreground">
              {' '}
              · {item.status} · {item.mode} · {item.creator_email}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function CreateProject({
  organization,
  roleLabels,
  skillLabels,
  onCreated,
}: {
  organization: OrgDetail
  roleLabels: string[]
  skillLabels: string[]
  onCreated: (project: ProjectDetail) => Promise<void>
}) {
  const creators = organization.members.filter((member) => member.role !== 'participant' && member.onboarded_adult)
  const [creatorId, setCreatorId] = useState('')
  const [programId, setProgramId] = useState('')
  const [programName, setProgramName] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [mode, setMode] = useState('team')
  const [visibility, setVisibility] = useState('private')
  const [joiningMode, setJoiningMode] = useState('invite_only')
  const [capacity, setCapacity] = useState('1')
  const [roles, setRoles] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [members, setMembers] = useState<DraftMember[]>([])
  const [tasks, setTasks] = useState<DraftTask[]>([{ title: '', acceptance_criteria: '', due_on: '', assignee_id: '' }])
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const activePrograms = organization.programs.filter((program) => program.status === 'active')
  const roleChoices = assignableRoles(roles)
  const candidates = organization.members.filter((member) => member.user_id !== creatorId)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setNotice(null)
    if (!productionConfirmed(confirmed)) {
      setNotice('Confirm that this change is for production.')
      return
    }
    try {
      const result = await runWithStaffReauth(() =>
        apiFetch<{ project: ProjectDetail }>(`/api/v1/platform_admin/organizations/${organization.id}/projects`, {
          method: 'POST',
          body: JSON.stringify({
            creator_id: creatorId,
            program_id: programId || undefined,
            program_name: programId ? undefined : programName || undefined,
            title,
            summary,
            ends_on: endsOn,
            mode,
            visibility,
            joining_mode: mode === 'team' ? joiningMode : undefined,
            capacity: mode === 'team' ? Number(capacity) : undefined,
            roles_needed: mode === 'team' ? roles : [],
            skills,
            members:
              mode === 'team'
                ? members.filter((member) => member.user_id && member.participant_role)
                : [],
            tasks: tasks
              .filter((task) => task.title.trim())
              .map((task) => ({
                title: task.title,
                acceptance_criteria: task.acceptance_criteria,
                due_on: task.due_on || null,
                assignee_id: task.assignee_id || null,
              })),
            reason,
          }),
        }),
      )
      setNotice(`${result.project.title} is active.`)
      await onCreated(result.project)
    } catch (err) {
      setNotice(messageFrom(err))
    }
  }

  return (
    <form className="grid gap-3 border-t border-border pt-4" onSubmit={(event) => void submit(event)}>
      <h2 className="text-base font-semibold">Create project</h2>
      <p className="text-sm text-muted-foreground">
        A single student is a team project with capacity 1 and invite-only joining. The creator is
        an organization admin or manager, and the student is the participant. Solo mode is only for
        the creator: they are the only member, and the tasks are assigned to them.
      </p>
      <label className={fieldClass}>
        Creator
        <select
          aria-label="Project creator"
          required
          className={selectClass}
          value={creatorId}
          onChange={(event) => setCreatorId(event.target.value)}
        >
          <option value="">Choose an admin or manager</option>
          {creators.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {personLabel(member)}
            </option>
          ))}
        </select>
      </label>
      <label className={fieldClass}>
        Program
        <select
          aria-label="Program"
          className={selectClass}
          value={programId}
          onChange={(event) => setProgramId(event.target.value)}
        >
          <option value="">New program</option>
          {activePrograms.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
      </label>
      {programId ? null : (
        <label className={fieldClass}>
          New program name
          <Input required value={programName} onChange={(event) => setProgramName(event.target.value)} />
        </label>
      )}
      <label className={fieldClass}>
        Title
        <Input required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className={fieldClass}>
        Summary
        <textarea
          aria-label="Summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          className="min-h-16 rounded-md border border-input px-3 py-2 text-sm"
        />
      </label>
      <label className={fieldClass}>
        End date
        <Input required type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
      </label>
      <label className={fieldClass}>
        Mode
        <select aria-label="Mode" className={selectClass} value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="team">Team</option>
          <option value="solo">Solo</option>
        </select>
      </label>
      <label className={fieldClass}>
        Visibility
        <select
          aria-label="Visibility"
          className={selectClass}
          value={visibility}
          onChange={(event) => setVisibility(event.target.value)}
        >
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
      </label>
      {mode === 'team' ? (
        <>
          <label className={fieldClass}>
            Joining
            <select
              aria-label="Joining"
              className={selectClass}
              value={joiningMode}
              onChange={(event) => setJoiningMode(event.target.value)}
            >
              <option value="invite_only">Invite only</option>
              <option value="application">Application</option>
              <option value="instant">Instant</option>
            </select>
          </label>
          <label className={fieldClass}>
            Capacity
            <Input
              required
              type="number"
              min={1}
              max={5}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </label>
          <RoleMultiSelect id="staff_roles_needed" roleLabels={roleLabels} value={roles} onChange={setRoles} />
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Members</legend>
            <p className="text-sm text-muted-foreground">
              Members must already belong to the organization. Someone already on another active
              project cannot be added.
            </p>
            {members.map((member, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-2">
                <select
                  aria-label={`Member ${index + 1}`}
                  className={selectClass}
                  value={member.user_id}
                  onChange={(event) =>
                    setMembers((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, user_id: event.target.value } : item,
                      ),
                    )
                  }
                >
                  <option value="">Choose a member</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.user_id} value={candidate.user_id}>
                      {personLabel(candidate)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Role for member ${index + 1}`}
                  className={selectClass}
                  value={member.participant_role}
                  onChange={(event) =>
                    setMembers((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, participant_role: event.target.value } : item,
                      ),
                    )
                  }
                >
                  <option value="">Role</option>
                  {roleChoices.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setMembers((current) => [...current, { user_id: '', participant_role: '' }])}
            >
              Add member
            </Button>
          </fieldset>
        </>
      ) : null}
      <LabelMultiSelect
        id="staff_skills"
        label="Skills"
        options={skillLabels}
        value={skills}
        onChange={setSkills}
      />
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Tasks</legend>
        {tasks.map((task, index) => (
          <div key={index} className="grid gap-2 rounded-md border border-border p-3">
            <label className={fieldClass}>
              Task title
              <Input
                aria-label={`Task ${index + 1} title`}
                value={task.title}
                onChange={(event) =>
                  setTasks((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, title: event.target.value } : item,
                    ),
                  )
                }
              />
            </label>
            <label className={fieldClass}>
              Instructions
              <textarea
                aria-label={`Task ${index + 1} instructions`}
                value={task.acceptance_criteria}
                onChange={(event) =>
                  setTasks((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, acceptance_criteria: event.target.value } : item,
                    ),
                  )
                }
                className="min-h-16 rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className={fieldClass}>
              Due date
              <Input
                aria-label={`Task ${index + 1} due date`}
                type="date"
                value={task.due_on}
                onChange={(event) =>
                  setTasks((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, due_on: event.target.value } : item,
                    ),
                  )
                }
              />
            </label>
            {mode === 'team' ? (
              <label className={fieldClass}>
                Assignee
                <select
                  aria-label={`Task ${index + 1} assignee`}
                  className={selectClass}
                  value={task.assignee_id}
                  onChange={(event) =>
                    setTasks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, assignee_id: event.target.value } : item,
                      ),
                    )
                  }
                >
                  <option value="">Unassigned</option>
                  {members
                    .filter((member) => member.user_id)
                    .map((member) => {
                      const person = organization.members.find((item) => item.user_id === member.user_id)
                      return (
                        <option key={member.user_id} value={member.user_id}>
                          {person ? personLabel(person) : member.user_id}
                        </option>
                      )
                    })}
                </select>
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">Solo tasks are assigned to the creator.</p>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setTasks((current) => [...current, { title: '', acceptance_criteria: '', due_on: '', assignee_id: '' }])
          }
        >
          Add task
        </Button>
      </fieldset>
      <label className={fieldClass}>
        Reason
        <textarea
          required
          aria-label="Project reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-16 rounded-md border border-input px-3 py-2 text-sm"
        />
      </label>
      <ProductionConfirm checked={confirmed} onChange={setConfirmed} />
      <Button type="submit">Create and activate</Button>
      {notice ? <p role="status">{notice}</p> : null}
    </form>
  )
}

function EditProject({
  organization,
  project,
  roleLabels,
  skillLabels,
  onChange,
}: {
  organization: OrgDetail
  project: ProjectDetail
  roleLabels: string[]
  skillLabels: string[]
  onChange: (project: ProjectDetail) => Promise<void>
}) {
  const [title, setTitle] = useState(project.title)
  const [summary, setSummary] = useState(project.summary_text ?? '')
  const [endsOn, setEndsOn] = useState(dateInput(project.ends_on))
  const [visibility, setVisibility] = useState(project.visibility)
  const [joiningMode, setJoiningMode] = useState(project.joining_mode ?? 'invite_only')
  const [capacity, setCapacity] = useState(String(project.capacity ?? 1))
  const [roles, setRoles] = useState(project.roles_needed ?? [])
  const [skills, setSkills] = useState(project.skills ?? [])
  const [tasks, setTasks] = useState<EditorTask[]>(
    project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      acceptance_criteria: task.acceptance_criteria ?? '',
      due_on: dateInput(task.due_on),
      status: task.status,
      assignee_id: task.assignee_id ?? '',
    })),
  )
  const [memberId, setMemberId] = useState('')
  const [memberRole, setMemberRole] = useState('')
  const [duplicateCreatorId, setDuplicateCreatorId] = useState(project.creator_id ?? '')
  const [duplicateTitle, setDuplicateTitle] = useState('')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const creators = organization.members.filter((member) => member.role !== 'participant' && member.onboarded_adult)
  const participants = organization.members.filter(
    (member) => !project.members.some((existing) => existing.user_id === member.user_id),
  )
  const roleChoices = assignableRoles(roles.length ? roles : project.roles_needed)

  function guard(): boolean {
    if (!productionConfirmed(confirmed)) {
      setNotice('Confirm that this change is for production.')
      return false
    }
    if (!reason.trim()) {
      setNotice('A reason is required.')
      return false
    }
    return true
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setNotice(null)
    if (!guard()) return
    try {
      const result = await runWithStaffReauth(() =>
        apiFetch<{ project: ProjectDetail }>(`/api/v1/platform_admin/projects/${project.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title,
            summary,
            ends_on: endsOn,
            visibility,
            joining_mode: project.mode === 'team' ? joiningMode : undefined,
            capacity: project.mode === 'team' ? Number(capacity) : undefined,
            roles_needed: project.mode === 'team' ? roles : undefined,
            skills,
            tasks: tasks.map((task) => ({
              id: task.id,
              title: task.title,
              acceptance_criteria: task.acceptance_criteria,
              due_on: task.due_on || null,
              assignee_id: task.assignee_id || null,
            })),
            reason,
          }),
        }),
      )
      setNotice('Saved.')
      await onChange(result.project)
    } catch (err) {
      setNotice(messageFrom(err))
    }
  }

  async function addMember() {
    setNotice(null)
    if (!guard()) return
    try {
      const result = await runWithStaffReauth(() =>
        apiFetch<{ project: ProjectDetail }>(
          `/api/v1/platform_admin/projects/${project.id}/members`,
          {
            method: 'POST',
            body: JSON.stringify({ user_id: memberId, participant_role: memberRole, reason }),
          },
        ),
      )
      setMemberId('')
      setNotice('Member added.')
      await onChange(result.project)
    } catch (err) {
      setNotice(messageFrom(err))
    }
  }

  async function removeMember(userId: string) {
    setNotice(null)
    if (!guard()) return
    try {
      const result = await runWithStaffReauth(() =>
        apiFetch<{ project: ProjectDetail }>(
          `/api/v1/platform_admin/projects/${project.id}/members/${userId}`,
          { method: 'DELETE', body: JSON.stringify({ reason }) },
        ),
      )
      setNotice('Member removed. No credit was returned.')
      await onChange(result.project)
    } catch (err) {
      setNotice(messageFrom(err))
    }
  }

  async function duplicate() {
    setNotice(null)
    if (!guard()) return
    try {
      const result = await runWithStaffReauth(() =>
        apiFetch<{ project: ProjectDetail }>(
          `/api/v1/platform_admin/projects/${project.id}/duplicate`,
          {
            method: 'POST',
            body: JSON.stringify({
              creator_id: duplicateCreatorId,
              title: duplicateTitle || undefined,
              reason,
            }),
          },
        ),
      )
      setNotice(`${result.project.title} is a new copy. Members were not copied.`)
      await onChange(result.project)
    } catch (err) {
      setNotice(messageFrom(err))
    }
  }

  return (
    <form className="grid gap-3 border-t border-border pt-4" onSubmit={(event) => void save(event)}>
      <h2 className="text-base font-semibold">Edit {project.title}</h2>
      <label className={fieldClass}>
        Title
        <Input required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className={fieldClass}>
        Summary
        <textarea
          aria-label="Project summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          className="min-h-16 rounded-md border border-input px-3 py-2 text-sm"
        />
      </label>
      <label className={fieldClass}>
        End date
        <Input required type="date" aria-label="Project end date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
      </label>
      <label className={fieldClass}>
        Visibility
        <select
          aria-label="Project visibility"
          className={selectClass}
          value={visibility}
          onChange={(event) => setVisibility(event.target.value)}
        >
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
      </label>
      {project.mode === 'team' ? (
        <>
          <label className={fieldClass}>
            Joining
            <select
              aria-label="Project joining"
              className={selectClass}
              value={joiningMode}
              onChange={(event) => setJoiningMode(event.target.value)}
            >
              <option value="invite_only">Invite only</option>
              <option value="application">Application</option>
              <option value="instant">Instant</option>
            </select>
          </label>
          <label className={fieldClass}>
            Capacity
            <Input
              required
              type="number"
              min={1}
              max={5}
              aria-label="Project capacity"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </label>
          <RoleMultiSelect id="edit_roles_needed" roleLabels={roleLabels} value={roles} onChange={setRoles} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          This is a solo project. The creator is the only member, and the tasks are assigned to them.
        </p>
      )}
      <LabelMultiSelect
        id="edit_skills"
        label="Skills"
        options={skillLabels}
        value={skills}
        onChange={setSkills}
      />
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Tasks</legend>
        {tasks.map((task, index) => {
          const locked = LOCKED.has(task.status)
          return (
            <div key={task.id ?? `new-${index}`} className="grid gap-2 rounded-md border border-border p-3">
              <p className="text-sm text-muted-foreground">{task.status || 'pending'}</p>
              <label className={fieldClass}>
                Task title
                <Input
                  aria-label={`Edit task ${index + 1} title`}
                  disabled={locked}
                  value={task.title}
                  onChange={(event) =>
                    setTasks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title: event.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <label className={fieldClass}>
                Instructions
                <textarea
                  aria-label={`Edit task ${index + 1} instructions`}
                  disabled={locked}
                  value={task.acceptance_criteria}
                  onChange={(event) =>
                    setTasks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, acceptance_criteria: event.target.value } : item,
                      ),
                    )
                  }
                  className="min-h-16 rounded-md border border-input px-3 py-2 text-sm"
                />
              </label>
              <label className={fieldClass}>
                Due date
                <Input
                  aria-label={`Edit task ${index + 1} due date`}
                  type="date"
                  disabled={locked}
                  value={task.due_on}
                  onChange={(event) =>
                    setTasks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, due_on: event.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              {project.mode === 'team' ? (
                <label className={fieldClass}>
                  Assignee
                  <select
                    aria-label={`Edit task ${index + 1} assignee`}
                    disabled={locked}
                    className={selectClass}
                    value={task.assignee_id}
                    onChange={(event) =>
                      setTasks((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, assignee_id: event.target.value } : item,
                        ),
                      )
                    }
                  >
                    <option value="">Unassigned</option>
                    {project.members.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {personLabel(member)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          )
        })}
        {project.mode === 'team' ? (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setTasks((current) => [
                ...current,
                { title: '', acceptance_criteria: '', due_on: '', status: 'pending', assignee_id: '' },
              ])
            }
          >
            Add task
          </Button>
        ) : null}
      </fieldset>
      {project.mode === 'team' ? (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Members</legend>
          <ul className="grid gap-1 text-sm">
            {project.members.map((member) => (
              <li key={member.user_id} className="flex items-center justify-between gap-2">
                <span>
                  {personLabel(member)} · {member.role}
                  {member.participant_role ? ` · ${member.participant_role}` : ''}
                </span>
                {member.role === 'creator' ? null : (
                  <Button type="button" variant="outline" onClick={() => void removeMember(member.user_id)}>
                    Remove {member.email}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              aria-label="Person to add"
              className={selectClass}
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
            >
              <option value="">Choose a member</option>
              {participants.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {personLabel(member)}
                </option>
              ))}
            </select>
            <select
              aria-label="Role to assign"
              className={selectClass}
              value={memberRole}
              onChange={(event) => setMemberRole(event.target.value)}
            >
              <option value="">Role</option>
              {roleChoices.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="outline" disabled={!memberId || !memberRole} onClick={() => void addMember()}>
            Add member
          </Button>
        </fieldset>
      ) : null}
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Duplicate</legend>
        <p className="text-sm text-muted-foreground">
          The copy keeps the description, dates, skills, roles, joining, capacity, visibility, and
          tasks. Tasks are unassigned. Members are not copied.
        </p>
        <label className={fieldClass}>
          Creator for the copy
          <select
            aria-label="Creator for the copy"
            className={selectClass}
            value={duplicateCreatorId}
            onChange={(event) => setDuplicateCreatorId(event.target.value)}
          >
            <option value="">Choose an admin or manager</option>
            {creators.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {personLabel(member)}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClass}>
          Copy title
          <Input
            aria-label="Copy title"
            value={duplicateTitle}
            placeholder={project.title}
            onChange={(event) => setDuplicateTitle(event.target.value)}
          />
        </label>
        <Button type="button" variant="outline" onClick={() => void duplicate()}>
          Duplicate project
        </Button>
      </fieldset>
      <label className={fieldClass}>
        Reason
        <textarea
          aria-label="Edit reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-16 rounded-md border border-input px-3 py-2 text-sm"
        />
      </label>
      <ProductionConfirm checked={confirmed} onChange={setConfirmed} />
      <Button type="submit">Save project</Button>
      {notice ? <p role="status">{notice}</p> : null}
    </form>
  )
}
