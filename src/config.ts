export function apiBaseUrl(): string {
  return (
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
    'http://127.0.0.1:3000'
  )
}

/**
 * Design-system gallery is for local and staging only — not a product destination.
 */
export function isDesignSystemPreviewEnabled(): boolean {
  if (import.meta.env.DEV) return true
  if (import.meta.env.VITE_ENABLE_DESIGN_SYSTEM_PREVIEW === 'true') return true

  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.netlify.app')
  )
}

export function firebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  }
}

export function isFirebaseConfigured(): boolean {
  const config = firebaseConfig()
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
}

/** Local/test stub: API accepts Bearer test:<uid>:<email> when backend FIREBASE_AUTH_STUB=true */
export function authStubEnabled(): boolean {
  return import.meta.env.VITE_AUTH_STUB === 'true' || import.meta.env.MODE === 'test'
}

export function mixpanelToken(): string | undefined {
  return import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined
}
