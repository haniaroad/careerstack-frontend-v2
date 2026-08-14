import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrgAdminPage } from './OrgAdminPage'
import type { SessionPayload } from '@/auth/types'

const apiFetch = vi.fn()
let session: SessionPayload

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number
    code: string
    constructor(status: number, code: string, message: string) {
      super(message)
      this.status = status
      this.code = code
    }
  }
  return { apiFetch: (...args: unknown[]) => apiFetch(...args), ApiError }
})

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ session, setSession: vi.fn(), refreshSession: vi.fn() }),
}))

vi.mock('@/lib/mixpanel', () => ({
  trackUpgradeRequestSubmitted: vi.fn(),
  trackReportGenerated: vi.fn(),
}))

const adminCapabilities = {
  can_archive_programs: true,
  can_delete_empty_drafts: true,
  can_remove_members: true,
  can_view_credit_history: true,
  can_submit_upgrade_request: true,
  can_export_reports: true,
}

const managerCapabilities = {
  can_archive_programs: false,
  can_delete_empty_drafts: false,
  can_remove_members: false,
  can_view_credit_history: false,
  can_submit_upgrade_request: false,
  can_export_reports: true,
}

const program = {
  id: 'prog-1',
  organization_id: 'org-1',
  name: 'Fall Cohort',
  description: 'Main cohort',
  status: 'active' as const,
  member_count: 2,
  active_project_count: 1,
  completed_project_count: 0,
  pending_invitation_count: 1,
  can_delete: false,
  can_archive: true,
  read_only: false,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
}

const draftProgram = {
  ...program,
  id: 'prog-draft',
  name: 'Empty draft',
  status: 'draft' as const,
  member_count: 0,
  active_project_count: 0,
  pending_invitation_count: 0,
  can_delete: true,
}

const lastAdmin = {
  id: 'mem-admin',
  organization_id: 'org-1',
  user_id: 'u-admin',
  display_name: 'Ada Admin',
  email: 'ada@example.com',
  role: 'admin' as const,
  status: 'active' as const,
  age_status: 'adult' as const,
  program_ids: ['prog-1'],
  program_names: ['Fall Cohort'],
  is_last_administrator: true,
  can_remove: false,
  joined_at: '2026-08-01T00:00:00Z',
  removed_at: null,
  removed_reason: null,
}

const participantMember = {
  ...lastAdmin,
  id: 'mem-part',
  user_id: 'u-part',
  display_name: 'Pat Participant',
  email: 'pat@example.com',
  role: 'participant' as const,
  is_last_administrator: false,
  can_remove: true,
}

function adminPayload(capabilities = adminCapabilities) {
  return {
    organization: {
      id: 'org-1',
      name: 'Bridge Academy',
      timezone: 'UTC',
      logo_url: null,
      workspace_id: 'ws-org',
      workspace_status: 'active',
      offboarding_started_at: null,
      offboarding_ends_on: null,
    },
    capabilities,
    operational_pulse: {
      active_programs: 1,
      active_projects: 1,
      attention_count: 1,
      pending_invitations: 1,
      overdue_applications: 0,
      credit_remaining: 3,
      credit_label: 'Trial credits — one creates a project, one adds a project participant; inviting members is free',
    },
    credits: {
      remaining: 3,
      trial_remaining: 3,
      purchased_remaining: 0,
      owner_type: 'organization',
    },
    upgrade_request: null,
  }
}

function staffSession(canAccess = true): SessionPayload {
  return {
    user: {
      id: 'u-admin',
      email: 'ada@example.com',
      status: 'active',
      age_status: 'adult',
      onboarding_path: 'independent',
      personal_trial_granted: true,
      organization_trial_granted: true,
    },
    profile: {
      display_name: 'Ada Admin',
      country: 'US',
      state_region: 'MA',
      career_goal: 'Lead',
      experience_level: 'advanced',
    },
    workspaces: [
      { id: 'ws-personal', kind: 'personal', name: 'Personal', organization_id: null },
      {
        id: 'ws-org',
        kind: 'organization',
        name: 'Bridge Academy',
        organization_id: 'org-1',
        workspace_status: 'active',
      },
    ],
    active_workspace_id: 'ws-org',
    active_workspace: {
      id: 'ws-org',
      kind: 'organization',
      name: 'Bridge Academy',
      organization_id: 'org-1',
      workspace_status: 'active',
    },
    can_access_org_admin: canAccess,
    org_admin_capabilities: canAccess ? adminCapabilities : null,
    age_visibility: { visibility_review_required: false, public_identity_confirmed: true },
    program_filter: {
      mode: 'all',
      program_id: null,
      available_programs: [{ id: 'prog-1', name: 'Fall Cohort', status: 'active' }],
    },
    credits: { remaining: 3, trial_remaining: 3, purchased_remaining: 0, owner_type: 'organization' },
  }
}

function mockStaffApis(capabilities = adminCapabilities) {
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (String(path).includes('/admin')) return adminPayload(capabilities)
    if (String(path).includes('/outcome_aggregates')) {
      return {
        outcomes: [
          { outcome_type: 'internship', label: 'Internship', count: 3, reporting_label: 'self_reported' },
        ],
      }
    }
    if (String(path).includes('/organization_reports') && String(path).includes('/generate')) {
      return {
        report: {
          id: 'rep-1',
          organization_id: 'org-1',
          title: 'Fall Cohort · Jan 1, 2026 – Mar 31, 2026',
          program_id: 'prog-1',
          program_name: 'Fall Cohort',
          period_starts_on: '2026-01-01',
          period_ends_on: '2026-03-31',
          period_label: 'Jan 1, 2026 – Mar 31, 2026',
          format: 'pdf',
          aggregate_only: false,
          includes_minor_names: true,
          status: 'ready',
          generated_at: '2026-08-14T00:00:00Z',
          methodology_note: 'Snapshot',
          error_code: null,
        },
      }
    }
    if (/\/organization_reports\/[^/]+$/.test(String(path)) && init?.method !== 'POST') {
      return {
        report: {
          id: 'rep-1',
          organization_id: 'org-1',
          title: 'Fall Cohort · Jan 1, 2026 – Mar 31, 2026',
          program_id: 'prog-1',
          program_name: 'Fall Cohort',
          period_starts_on: '2026-01-01',
          period_ends_on: '2026-03-31',
          period_label: 'Jan 1, 2026 – Mar 31, 2026',
          format: 'pdf',
          aggregate_only: false,
          includes_minor_names: true,
          status: 'ready',
          generated_at: '2026-08-14T00:00:00Z',
          methodology_note: 'Snapshot',
          error_code: null,
        },
      }
    }
    if (String(path).includes('/organization_reports') && String(path).includes('/download')) {
      const body = init?.body ? JSON.parse(String(init.body)) : {}
      if (!body.confirm_minor_names) {
        const { ApiError } = await import('@/lib/api')
        throw new ApiError(
          422,
          'minor_names_confirmation_required',
          'This report includes minor names. Confirm before download.',
        )
      }
      return { url: 'https://files.example/report.pdf', expires_at: '2026-08-14T12:15:00Z' }
    }
    if (String(path).includes('/reports') && init?.method === 'POST') {
      return {
        report: {
          id: 'rep-new',
          organization_id: 'org-1',
          title: 'All programs · Jan 1, 2026 – Dec 31, 2026',
          program_id: null,
          program_name: null,
          period_starts_on: '2026-01-01',
          period_ends_on: '2026-12-31',
          period_label: 'Jan 1, 2026 – Dec 31, 2026',
          format: 'csv',
          aggregate_only: true,
          includes_minor_names: false,
          status: 'draft',
          generated_at: null,
          methodology_note: 'Snapshot',
          error_code: null,
        },
      }
    }
    if (String(path).includes('/reports')) {
      return {
        reports: [
          {
            id: 'rep-1',
            organization_id: 'org-1',
            title: 'Fall Cohort · Jan 1, 2026 – Mar 31, 2026',
            program_id: 'prog-1',
            program_name: 'Fall Cohort',
            period_starts_on: '2026-01-01',
            period_ends_on: '2026-03-31',
            period_label: 'Jan 1, 2026 – Mar 31, 2026',
            format: 'pdf',
            aggregate_only: false,
            includes_minor_names: true,
            status: 'ready',
            generated_at: '2026-08-14T00:00:00Z',
            methodology_note: 'Snapshot',
            error_code: null,
          },
        ],
      }
    }
    if (String(path).includes('/programs') && !init?.method) return { programs: [program, draftProgram] }
    if (String(path).includes('/memberships')) return { memberships: [lastAdmin, participantMember] }
    if (String(path).includes('/invitations')) {
      return {
        invitations: [
          {
            id: 'inv-1',
            organization_id: 'org-1',
            email: 'new@example.com',
            role: 'participant',
            program_id: 'prog-1',
            program_name: 'Fall Cohort',
            status: 'pending',
            invited_by_name: 'Ada Admin',
            expires_at: '2026-09-01T00:00:00Z',
            accepted_at: null,
            created_at: '2026-08-01T00:00:00Z',
          },
        ],
      }
    }
    if (String(path).includes('/credits/history')) {
      if (!capabilities.can_view_credit_history) {
        const { ApiError } = await import('@/lib/api')
        throw new ApiError(403, 'forbidden', 'Only organization administrators can view credit history')
      }
      return {
        entries: [
          {
            id: 'le-1',
            event: 'grant',
            reason: 'organization_trial',
            amount: 3,
            created_at: '2026-08-01T00:00:00Z',
          },
        ],
      }
    }
    if (String(path).includes('/upgrade_request')) {
      return {
        upgrade_request: {
          id: 'up-1',
          organization_id: 'org-1',
          expected_participants: '40',
          expected_projects_or_cohorts: '2 cohorts',
          timeline: 'Fall 2026',
          notes: 'Need more seats',
          status: 'open',
          updated_at: '2026-08-13T00:00:00Z',
        },
      }
    }
    return {}
  })
}

function renderPage(path = '/organization') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/organization" element={<OrgAdminPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('OrgAdminPage', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    session = staffSession(true)
    vi.stubGlobal('open', vi.fn())
  })

  it('blocks participants from organization administration', () => {
    session = staffSession(false)
    renderPage()
    expect(screen.getByText(/Organization administration is for staff/i)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /Organization administration/i })).not.toBeInTheDocument()
  })

  it('shows programs pulse and admin archive/delete affordances', async () => {
    mockStaffApis()
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Organization administration' })).toBeInTheDocument()
    expect(screen.getByText('Operational pulse')).toBeInTheDocument()
    expect(screen.getByText('Fall Cohort')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Archive$/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Delete draft/i })).toBeInTheDocument()
  })

  it('hides archive, delete, and remove for managers', async () => {
    session = {
      ...staffSession(true),
      org_admin_capabilities: managerCapabilities,
    }
    mockStaffApis(managerCapabilities)
    renderPage()

    expect(await screen.findByText('Fall Cohort')).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /^Archive$/i })).toHaveLength(0)
    expect(screen.queryAllByRole('button', { name: /Delete draft/i })).toHaveLength(0)

    await userEvent.setup().click(
      within(screen.getByRole('navigation', { name: /Organization administration/i })).getByRole(
        'button',
        { name: /Members/i },
      ),
    )
    expect(await screen.findByText('Pat Participant')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remove$/i })).not.toBeInTheDocument()
    expect(screen.getByText('Only administrators can remove members.')).toBeInTheDocument()
  })

  it('blocks removing the last administrator', async () => {
    mockStaffApis()
    const user = userEvent.setup()
    renderPage('/organization?tab=members')

    expect(await screen.findByText('Ada Admin')).toBeInTheDocument()
    const lastAdminRow = screen.getByText('Ada Admin').closest('li')
    expect(lastAdminRow).toBeTruthy()
    expect(within(lastAdminRow as HTMLElement).getByRole('button', { name: /^Remove$/i })).toBeDisabled()
    expect(screen.getByText(/Last administrator/i)).toBeInTheDocument()

    await user.click(within(screen.getByText('Pat Participant').closest('li') as HTMLElement).getByRole('button', { name: /^Remove$/i }))
    expect(screen.getByRole('dialog', { name: /Remove Pat Participant/i })).toBeInTheDocument()
  })

  it('submits an upgrade request on Credits without sending notes to analytics', async () => {
    mockStaffApis()
    const user = userEvent.setup()
    renderPage('/organization?tab=credits')

    expect(await screen.findByRole('heading', { name: 'Request a credit grant' })).toBeInTheDocument()
    expect(screen.getByText(/Organization trial grant/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Expected participants/i), '40')
    await user.type(screen.getByLabelText(/Expected projects or cohorts/i), '2 cohorts')
    await user.type(screen.getByLabelText(/Timeline/i), 'Fall 2026')
    await user.type(screen.getByLabelText(/^Notes$/i), 'Need more seats')
    await user.click(screen.getByRole('button', { name: /Submit request/i }))

    await waitFor(() => {
      expect(screen.getByText(/Request received/i)).toBeInTheDocument()
    })
    const upgradeCall = apiFetch.mock.calls.find((call) => String(call[0]).includes('/upgrade_request'))
    expect(upgradeCall).toBeTruthy()
  })

  it('renders Reports with generate/download instead of a placeholder', async () => {
    mockStaffApis()
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Organization administration' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Reports/i }))
    expect(await screen.findByRole('button', { name: /New report/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Self-reported outcomes/i })).toBeInTheDocument()
    expect(screen.queryByText(/Reports are coming later/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Download/i }))
    expect(await screen.findByText(/Report includes minor names/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Continue download/i }))
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/download'),
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('polls a generating snapshot until it is ready', async () => {
    const user = userEvent.setup()
    const generating = {
      id: 'rep-new',
      organization_id: 'org-1',
      title: 'All programs · Jan 1, 2026 – Dec 31, 2026',
      program_id: null,
      program_name: null,
      period_starts_on: '2026-01-01',
      period_ends_on: '2026-12-31',
      period_label: 'Jan 1, 2026 – Dec 31, 2026',
      format: 'csv' as const,
      aggregate_only: true,
      includes_minor_names: false,
      status: 'generating' as const,
      generated_at: null,
      methodology_note: 'Snapshot',
      error_code: null,
    }
    mockStaffApis()
    const fallback = apiFetch.getMockImplementation()!
    let polls = 0
    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (String(path).includes('/generate')) {
        return { report: generating }
      }
      if (/\/organization_reports\/rep-new$/.test(String(path))) {
        polls += 1
        return {
          report: {
            ...generating,
            status: polls >= 2 ? 'ready' : 'generating',
            generated_at: polls >= 2 ? '2026-08-14T00:00:00Z' : null,
          },
        }
      }
      if (String(path).includes('/reports') && init?.method !== 'POST') {
        return { reports: [] }
      }
      return fallback(path, init)
    })

    renderPage()
    await screen.findByRole('heading', { name: 'Organization administration' })
    await user.click(screen.getByRole('button', { name: /Reports/i }))
    await user.click(await screen.findByRole('button', { name: /New report/i }))
    await user.click(screen.getByRole('button', { name: /Create and generate/i }))
    expect(await screen.findByText('Ready')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith(expect.stringMatching(/\/organization_reports\/rep-new$/))
  })

  it('lets staff create an aggregate-only CSV', async () => {
    mockStaffApis()
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Organization administration' })
    await user.click(screen.getByRole('button', { name: /Reports/i }))
    await user.click(await screen.findByRole('button', { name: /New report/i }))
    await user.selectOptions(screen.getByLabelText('Format'), 'csv')
    await user.click(screen.getByLabelText(/Aggregate only/i))
    await user.click(screen.getByRole('button', { name: /Create and generate/i }))
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reports'),
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
