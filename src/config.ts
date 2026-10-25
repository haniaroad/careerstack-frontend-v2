/**
 * Staff tools ship only on the admin surface.
 * The admin Netlify site sets VITE_SURFACE=admin. The participant site must not.
 * Hostname is a second signal for admin.careerstack.co and local admin.localhost.
 */
export function isAdminSurface(
  hostname = typeof window === 'undefined' ? '' : window.location.hostname,
): boolean {
  if (import.meta.env.VITE_SURFACE === 'admin') return true
  return hostname === 'admin.careerstack.co' || hostname === 'admin.localhost'
}

export type FirebasePublicConfig = {
  apiKey?: string
  authDomain?: string
  projectId?: string
  appId?: string
}

export type StaffEnvironmentId = 'production' | 'staging'

export type StaffEnvironmentOption = {
  id: StaffEnvironmentId
  label: string
  apiBaseUrl: string
  firebase: FirebasePublicConfig
}

const STAFF_ENVIRONMENT_KEY = 'careerstack.staffEnvironment'

export function rememberStaffEnvironment(id: StaffEnvironmentId) {
  window.localStorage.setItem(STAFF_ENVIRONMENT_KEY, id)
}

type EnvSource = {
  VITE_API_BASE_URL?: string
  VITE_FIREBASE_API_KEY?: string
  VITE_FIREBASE_AUTH_DOMAIN?: string
  VITE_FIREBASE_PROJECT_ID?: string
  VITE_FIREBASE_APP_ID?: string
  VITE_STAGING_API_BASE_URL?: string
  VITE_STAGING_FIREBASE_API_KEY?: string
  VITE_STAGING_FIREBASE_AUTH_DOMAIN?: string
  VITE_STAGING_FIREBASE_PROJECT_ID?: string
  VITE_STAGING_FIREBASE_APP_ID?: string
}

function trimUrl(value: string | undefined, fallback: string): string {
  return (value ?? fallback).replace(/\/$/, '')
}

function firebaseFrom(
  apiKey?: string,
  authDomain?: string,
  projectId?: string,
  appId?: string,
): FirebasePublicConfig {
  return { apiKey, authDomain, projectId, appId }
}

function firebaseReady(config: FirebasePublicConfig): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
}

export function staffEnvironmentOptions(
  env: EnvSource = import.meta.env as EnvSource,
  stored: string | null = typeof window === 'undefined' ? null : window.localStorage.getItem(STAFF_ENVIRONMENT_KEY),
): { options: StaffEnvironmentOption[]; selected: StaffEnvironmentId } {
  const productionFirebase = firebaseFrom(
    env.VITE_FIREBASE_API_KEY,
    env.VITE_FIREBASE_AUTH_DOMAIN,
    env.VITE_FIREBASE_PROJECT_ID,
    env.VITE_FIREBASE_APP_ID,
  )
  const production: StaffEnvironmentOption = {
    id: 'production',
    label: 'Production',
    apiBaseUrl: trimUrl(env.VITE_API_BASE_URL, 'http://127.0.0.1:3000'),
    firebase: productionFirebase,
  }
  const stagingFirebase = firebaseFrom(
    env.VITE_STAGING_FIREBASE_API_KEY,
    env.VITE_STAGING_FIREBASE_AUTH_DOMAIN,
    env.VITE_STAGING_FIREBASE_PROJECT_ID,
    env.VITE_STAGING_FIREBASE_APP_ID,
  )
  const stagingUrl = env.VITE_STAGING_API_BASE_URL?.replace(/\/$/, '')
  const options = [production]
  if (stagingUrl && firebaseReady(stagingFirebase)) {
    options.push({
      id: 'staging',
      label: 'Staging',
      apiBaseUrl: stagingUrl,
      firebase: stagingFirebase,
    })
  }
  const selected: StaffEnvironmentId =
    stored === 'staging' && options.some((option) => option.id === 'staging') ? 'staging' : 'production'
  return { options, selected }
}

export function staffEnvironmentSwitchAvailable(): boolean {
  return isAdminSurface() && staffEnvironmentOptions().options.length > 1
}

function selectedOption(): StaffEnvironmentOption {
  const { options, selected } = staffEnvironmentOptions()
  return options.find((option) => option.id === selected) ?? options[0]
}

export function apiBaseUrl(): string {
  if (isAdminSurface()) return selectedOption().apiBaseUrl
  return trimUrl(import.meta.env.VITE_API_BASE_URL, 'http://127.0.0.1:3000')
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
  if (isAdminSurface()) return selectedOption().firebase
  return firebaseFrom(
    import.meta.env.VITE_FIREBASE_API_KEY,
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
    import.meta.env.VITE_FIREBASE_APP_ID,
  )
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
