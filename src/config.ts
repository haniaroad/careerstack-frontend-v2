export function apiBaseUrl(): string {
  return (
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
    'http://localhost:3000'
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
