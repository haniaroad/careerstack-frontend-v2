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
export function trackProjectActivated(props: { workspace_type: 'personal' | 'organization' }) {
  try {
    if (!ensureInit()) return
    mixpanel.track('project_activated', {
      workspace_type: props.workspace_type,
      mode: 'solo',
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
