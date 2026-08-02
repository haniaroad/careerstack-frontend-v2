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
