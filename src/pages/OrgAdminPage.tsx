import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/Alert'
import { cn } from '@/lib/utils'
import {
  archiveProgram,
  createInvitation,
  createProgram,
  deleteEmptyDraft,
  fetchCreditHistory,
  fetchInvitations,
  fetchMemberships,
  fetchOrganizationAdmin,
  fetchPrograms,
  fetchReports,
  removeMembership,
  updateMembership,
  updateProgram,
  upsertUpgradeRequest,
  type CreditHistoryEntry,
  type OrgAdminTab,
  type OrganizationAdminPayload,
  type OrgInvitation,
  type OrgMembership,
  type Program,
} from '@/lib/organizationAdmin'
import { CreditsPanel } from './org-admin/CreditsPanel'
import { MembersPanel } from './org-admin/MembersPanel'
import { OperationalPulseBar } from './org-admin/OperationalPulseBar'
import { OrgEdgeBanner } from './org-admin/OrgEdgeBanner'
import { ProgramsPanel } from './org-admin/ProgramsPanel'
import { ReportsPanel } from './org-admin/ReportsPanel'

const TABS: { id: OrgAdminTab; label: string }[] = [
  { id: 'programs', label: 'Programs' },
  { id: 'members', label: 'Members' },
  { id: 'reports', label: 'Reports' },
  { id: 'credits', label: 'Credits' },
]

export function OrgAdminPage() {
  const { session, refreshSession } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as OrgAdminTab | null) ?? 'programs'
  const programId = searchParams.get('program')
  const organizationId = session?.active_workspace?.organization_id ?? null

  const [admin, setAdmin] = useState<OrganizationAdminPayload | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [memberships, setMemberships] = useState<OrgMembership[]>([])
  const [invitations, setInvitations] = useState<OrgInvitation[]>([])
  const [history, setHistory] = useState<CreditHistoryEntry[]>([])
  const [historyForbidden, setHistoryForbidden] = useState(false)
  const [reportCount, setReportCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!organizationId || !session?.can_access_org_admin) return
    setLoading(true)
    setError(null)
    try {
      const [adminPayload, programPayload, memberPayload, invitePayload, reportPayload] =
        await Promise.all([
          fetchOrganizationAdmin(organizationId),
          fetchPrograms(organizationId),
          fetchMemberships(organizationId),
          fetchInvitations(organizationId),
          fetchReports(organizationId),
        ])
      setAdmin(adminPayload)
      setPrograms(programPayload.programs)
      setMemberships(memberPayload.memberships)
      setInvitations(invitePayload.invitations)
      setReportCount(reportPayload.reports.length)

      if (adminPayload.capabilities.can_view_credit_history) {
        try {
          const historyPayload = await fetchCreditHistory()
          setHistory(historyPayload.entries)
          setHistoryForbidden(false)
        } catch {
          setHistory([])
          setHistoryForbidden(true)
        }
      } else {
        setHistory([])
        setHistoryForbidden(true)
      }
      await refreshSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load organization administration')
    } finally {
      setLoading(false)
    }
  }, [organizationId, refreshSession, session?.can_access_org_admin])

  useEffect(() => {
    void load()
  }, [load])

  const capabilities = admin?.capabilities
  const readOnlyOrg =
    admin?.organization.workspace_status === 'offboarding_readonly' ||
    admin?.organization.workspace_status === 'disabled'

  const tabCounts = useMemo(
    () => ({
      programs: programs.filter((program) => program.status !== 'archived' || program.name.trim())
        .length,
      members: memberships.length,
      reports: reportCount,
      credits: admin?.credits.remaining ?? 0,
    }),
    [admin?.credits.remaining, memberships.length, programs, reportCount],
  )

  function setTab(next: OrgAdminTab) {
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    params.delete('program')
    setSearchParams(params)
  }

  if (!session?.can_access_org_admin || session.active_workspace?.kind !== 'organization') {
    return (
      <Alert tone="warning" title="Organization administration is for staff">
        Participants use Home and My Work with the program filter. Switch to an organization
        workspace as a manager or administrator to open this destination.
      </Alert>
    )
  }

  if (!organizationId) {
    return (
      <Alert tone="warning" title="No organization workspace">
        Switch to an organization workspace to manage programs and members.
      </Alert>
    )
  }

  if (loading && !admin) {
    return <p className="text-sm text-ink-muted">Loading organization administration…</p>
  }

  if (error && !admin) {
    return (
      <Alert tone="danger" title="Unable to load">
        {error}
      </Alert>
    )
  }

  if (!admin || !capabilities) {
    return (
      <Alert tone="danger" title="Unable to load">
        Organization administration did not return a payload.
      </Alert>
    )
  }

  const roleLabel = capabilities.can_remove_members ? 'Administrator' : 'Manager'

  return (
    <div className="space-y-6">
      <OrgEdgeBanner organization={admin.organization} />
      {error ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}

      <header className="flex flex-col gap-4 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex size-2 rounded-full bg-primary" aria-hidden />
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            {admin.organization.name}
          </p>
          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold">{roleLabel}</span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-[1.75rem]">
            Organization administration
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
            Run programs, membership, reports, and pooled credits for {admin.organization.name}.
            Programs are filters inside this workspace—not nested workspaces.
          </p>
        </div>
      </header>

      <nav aria-label="Organization administration" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex min-w-max gap-1 rounded-lg border border-border bg-muted/60 p-1">
          {TABS.map((item) => {
            const active = tab === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium',
                    active ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {item.label}
                  <span className={cn('font-mono text-[11px] tabular-nums', active ? 'text-primary' : '')}>
                    {tabCounts[item.id]}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {tab === 'programs' ? (
        <div className="space-y-5">
          {!programId ? (
            <OperationalPulseBar
              pulse={admin.operational_pulse}
              onCreditsClick={() => setTab('credits')}
            />
          ) : null}
          <ProgramsPanel
            programs={programs}
            capabilities={capabilities}
            readOnlyOrg={Boolean(readOnlyOrg)}
            selectedProgramId={programId}
            onOpenProgram={(id) => {
              const params = new URLSearchParams(searchParams)
              params.set('tab', 'programs')
              params.set('program', id)
              setSearchParams(params)
            }}
            onBack={() => setTab('programs')}
            onCreate={async (params) => {
              await createProgram(organizationId, params)
              await load()
            }}
            onSave={async (id, params) => {
              await updateProgram(id, params)
              await load()
            }}
            onArchive={async (id) => {
              await archiveProgram(id)
              await load()
            }}
            onDelete={async (id) => {
              await deleteEmptyDraft(id)
              const params = new URLSearchParams(searchParams)
              params.delete('program')
              setSearchParams(params)
              await load()
            }}
          />
        </div>
      ) : null}

      {tab === 'members' ? (
        <MembersPanel
          memberships={memberships}
          invitations={invitations}
          programs={programs}
          capabilities={capabilities}
          readOnlyOrg={Boolean(readOnlyOrg)}
          canInviteAdminRoles={capabilities.can_remove_members}
          onSearch={(query) => {
            void fetchMemberships(organizationId, { q: query }).then((payload) =>
              setMemberships(payload.memberships),
            )
          }}
          onSaveMembership={async (membershipId, params) => {
            await updateMembership(membershipId, params)
            await load()
          }}
          onRemoveMember={async (membershipId, reason) => {
            await removeMembership(membershipId, reason)
            await load()
          }}
          onInvite={async (params) => {
            const result = await createInvitation({
              organization_id: organizationId,
              email: params.email,
              role: params.role,
              program_id: params.program_id,
            })
            await load()
            return result.invitation.token
          }}
        />
      ) : null}

      {tab === 'reports' ? (
        <ReportsPanel
          organizationId={organizationId}
          programs={programs}
          workspaceStatus={admin.organization.workspace_status}
          onCountChange={setReportCount}
        />
      ) : null}

      {tab === 'credits' ? (
        <CreditsPanel
          credits={admin.credits}
          history={history}
          historyForbidden={historyForbidden}
          capabilities={capabilities}
          upgradeRequest={admin.upgrade_request}
          readOnlyOrg={Boolean(readOnlyOrg)}
          onSubmitUpgrade={async (params) => {
            const result = await upsertUpgradeRequest(organizationId, params)
            setAdmin((prev) => (prev ? { ...prev, upgrade_request: result.upgrade_request } : prev))
          }}
        />
      ) : null}
    </div>
  )
}
