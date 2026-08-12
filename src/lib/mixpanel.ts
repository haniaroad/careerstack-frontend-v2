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

/** Non-PII Inbox destination open. Fail soft. */
export function trackInboxOpened(props: { tab: string }) {
  try {
    if (!ensureInit()) return
    mixpanel.track('inbox_opened', { tab: props.tab })
  } catch {
    // fail soft
  }
}

/** Non-PII creator review decision from Inbox. Fail soft. */
export function trackCreatorReviewDecided(props: {
  decision: 'approved' | 'corrections_requested'
}) {
  try {
    if (!ensureInit()) return
    mixpanel.track('creator_review_decided', { decision: props.decision })
  } catch {
    // fail soft
  }
}

/** Non-PII application decision from Inbox. Fail soft. */
export function trackApplicationDecidedFromInbox(props: {
  decision: 'approved' | 'rejected'
}) {
  try {
    if (!ensureInit()) return
    mixpanel.track('application_decided_from_inbox', { decision: props.decision })
  } catch {
    // fail soft
  }
}

/** Non-PII project completed. Fail soft — opaque id / phase only. */
export function trackProjectCompleted(props: { project_id: string; phase?: string }) {
  try {
    if (!ensureInit()) return
    mixpanel.track('project_completed', {
      project_id: props.project_id,
      ...(props.phase ? { phase: props.phase } : {}),
    })
  } catch {
    // fail soft
  }
}

/** Non-PII project expired. Fail soft. */
export function trackProjectExpired(props: { project_id: string }) {
  try {
    if (!ensureInit()) return
    mixpanel.track('project_expired', { project_id: props.project_id })
  } catch {
    // fail soft
  }
}

/** Non-PII end-date update. Fail soft. */
export function trackProjectEndDateUpdated(props: { project_id: string }) {
  try {
    if (!ensureInit()) return
    mixpanel.track('project_end_date_updated', { project_id: props.project_id })
  } catch {
    // fail soft
  }
}

/** Non-PII grace period entered. Fail soft. */
export function trackProjectGraceEntered(props: { project_id: string }) {
  try {
    if (!ensureInit()) return
    mixpanel.track('project_grace_entered', { project_id: props.project_id })
  } catch {
    // fail soft
  }
}

const LIFECYCLE_TRACK_PREFIX = 'cs_lifecycle_track:'

/** Fire completed/expired once per browser session when observed on detail load. */
export function trackProjectLifecycleObserved(props: {
  project_id: string
  status: string
  phase?: string
}) {
  try {
    const key = `${LIFECYCLE_TRACK_PREFIX}${props.status}:${props.project_id}`
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return
    if (props.status === 'completed') {
      trackProjectCompleted({ project_id: props.project_id, phase: props.phase })
    } else if (props.status === 'expired') {
      trackProjectExpired({ project_id: props.project_id })
    } else {
      return
    }
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, '1')
  } catch {
    // fail soft
  }
}

/** Fire grace entered once per browser session when warning is shown. */
export function trackProjectGraceObserved(props: { project_id: string }) {
  try {
    const key = `${LIFECYCLE_TRACK_PREFIX}grace:${props.project_id}`
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return
    trackProjectGraceEntered({ project_id: props.project_id })
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, '1')
  } catch {
    // fail soft
  }
}

/** Non-PII profile events. Fail soft. */
export function trackProfileViewed(props: { visibility: string; own: boolean }) {
  try {
    if (!ensureInit()) return
    mixpanel.track('profile_viewed', {
      visibility: props.visibility,
      own: props.own,
    })
  } catch {
    // fail soft
  }
}

export function trackProfileSaved() {
  try {
    if (!ensureInit()) return
    mixpanel.track('profile_saved', {})
  } catch {
    // fail soft
  }
}

export function trackProfileVisibilityConfirmed() {
  try {
    if (!ensureInit()) return
    mixpanel.track('profile_visibility_confirmed', {})
  } catch {
    // fail soft
  }
}

export function trackProfileVisibilityReversed() {
  try {
    if (!ensureInit()) return
    mixpanel.track('profile_visibility_reversed', {})
  } catch {
    // fail soft
  }
}

export function trackProfileLinkCopied() {
  try {
    if (!ensureInit()) return
    mixpanel.track('profile_link_copied', {})
  } catch {
    // fail soft
  }
}
