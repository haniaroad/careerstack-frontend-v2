import mixpanel from 'mixpanel-browser'
import { mixpanelToken } from '@/config'

let initialized = false

function ensureInit() {
  const token = mixpanelToken()
  if (!token || initialized) return Boolean(token && initialized)
  try {
    mixpanel.init(token, { autocapture: false, record_sessions_percent: 0 })
    initialized = true
  } catch {
    return false
  }
  return true
}

/** Non-PII activation event after independent onboarding. Fail soft. */
export function trackIndependentActivation() {
  try {
    if (!ensureInit()) return
    mixpanel.track('activation_independent_onboarding', {
      workspace_type: 'personal',
    })
  } catch {
    // fail soft
  }
}

/** Non-PII purchase funnel events. Fail soft. */
export function trackPurchaseStarted() {
  try {
    if (!ensureInit()) return
    mixpanel.track('purchase_started', { pack: 'personal_3_for_20' })
  } catch {
    // fail soft
  }
}

export function trackPurchaseCompleted() {
  try {
    if (!ensureInit()) return
    mixpanel.track('purchase_completed', { pack: 'personal_3_for_20' })
  } catch {
    // fail soft
  }
}

/** Non-PII project activation after confirm. Fail soft. */
export function trackProjectActivated(props: {
  workspace_type: 'personal' | 'organization'
  mode: 'solo' | 'team'
}) {
  try {
    if (!ensureInit()) return
    mixpanel.track('project_activated', {
      workspace_type: props.workspace_type,
      mode: props.mode,
    })
  } catch {
    // fail soft
  }
}

/** Non-PII solo→team conversion. Fail soft. */
export function trackProjectConvertedToTeam(props: {
  workspace_type: 'personal' | 'organization'
  joining_mode: 'application' | 'instant' | 'invite_only'
}) {
  try {
    if (!ensureInit()) return
    mixpanel.track('project_converted_to_team', {
      workspace_type: props.workspace_type,
      joining_mode: props.joining_mode,
    })
  } catch {
    // fail soft
  }
}

/** Non-PII project join. Fail soft. */
export function trackProjectJoined(props: {
  workspace_type: 'personal' | 'organization'
  join_source: 'instant' | 'application' | 'invite'
}) {
  try {
    if (!ensureInit()) return
    mixpanel.track('project_joined', {
      workspace_type: props.workspace_type,
      join_source: props.join_source,
    })
  } catch {
    // fail soft
  }
}

/** Non-PII project leave. Fail soft. */
export function trackProjectLeft(props: {
  workspace_type: 'personal' | 'organization'
  reason_category: string
}) {
  try {
    if (!ensureInit()) return
    mixpanel.track('project_left', {
      workspace_type: props.workspace_type,
      reason_category: props.reason_category,
    })
  } catch {
    // fail soft
  }
}

/** Non-PII member removal by creator. Fail soft. */
export function trackMemberRemoved(props: {
  workspace_type: 'personal' | 'organization'
  reason_category: string
}) {
  try {
    if (!ensureInit()) return
    mixpanel.track('member_removed', {
      workspace_type: props.workspace_type,
      reason_category: props.reason_category,
    })
  } catch {
    // fail soft
  }
}

/** Non-PII AI draft generation success. Fail soft — no prompt or titles. */
export function trackAiDraftGenerated(props: { workspace_type: 'personal' | 'organization' }) {
  try {
    if (!ensureInit()) return
    mixpanel.track('ai_project_draft_generated', {
      workspace_type: props.workspace_type,
      use_case: 'project_draft_generation',
    })
  } catch {
    // fail soft
  }
}

/** Non-PII task submission. Fail soft — no evidence text. */
export function trackTaskSubmitted(props: { workspace_type: 'personal' | 'organization' }) {
  try {
    if (!ensureInit()) return
    mixpanel.track('task_submitted', {
      workspace_type: props.workspace_type,
      mode: 'solo',
    })
  } catch {
    // fail soft
  }
}

/** Non-PII AI review outcome. Fail soft. */
export function trackAiReviewCompleted(props: {
  workspace_type: 'personal' | 'organization'
  decision: 'approved' | 'corrections_requested' | 'failed'
}) {
  try {
    if (!ensureInit()) return
    mixpanel.track('ai_review_completed', {
      workspace_type: props.workspace_type,
      decision: props.decision,
      use_case: 'task_review',
    })
  } catch {
    // fail soft
  }
}
