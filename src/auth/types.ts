export type WorkspaceStatus = 'active' | 'offboarding_readonly' | 'disabled'

export type SessionWorkspace = {
  id: string
  kind: 'personal' | 'organization'
  name: string
  organization_id: string | null
  workspace_status?: WorkspaceStatus | null
}

export type OrgAdminCapabilities = {
  can_archive_programs: boolean
  can_delete_empty_drafts: boolean
  can_remove_members: boolean
  can_view_credit_history: boolean
  can_submit_upgrade_request: boolean
  can_export_reports: boolean
}

export type ProgramFilterProgram = {
  id: string
  name: string
  status: 'draft' | 'active' | 'archived'
}

export type ProgramFilter = {
  mode: 'all' | 'program'
  program_id: string | null
  available_programs: ProgramFilterProgram[]
}

export type SessionPayload = {
  user: {
    id: string
    email: string
    status: 'pending_onboarding' | 'active' | 'suspended'
    age_status: 'adult' | 'minor' | 'unknown' | null
    onboarding_path: 'independent' | 'organization_invited' | null
    personal_trial_granted: boolean
    organization_trial_granted: boolean
  }
  profile: {
    display_name: string
    country: string
    state_region: string
    career_goal: string
    experience_level: string
    [key: string]: unknown
  } | null
  workspaces: SessionWorkspace[]
  active_workspace_id: string | null
  active_workspace?: SessionWorkspace | null
  can_access_org_admin: boolean
  org_admin_capabilities: OrgAdminCapabilities | null
  age_visibility: {
    visibility_review_required: boolean
    public_identity_confirmed: boolean
  }
  program_filter: ProgramFilter | null
  credits?: {
    remaining: number
    trial_remaining: number
    purchased_remaining: number
    owner_type: string
  } | null
}

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'
