export type SessionWorkspace = {
  id: string
  kind: 'personal' | 'organization'
  name: string
  organization_id: string | null
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
  can_access_org_admin: boolean
  age_visibility: {
    visibility_review_required: boolean
    public_identity_confirmed: boolean
  }
  program_filter: {
    mode: 'all' | 'program'
    program_id: string | null
  }
}

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'
