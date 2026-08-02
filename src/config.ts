export function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
    ?? 'http://localhost:3000'
}
