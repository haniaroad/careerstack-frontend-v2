import { apiBaseUrl } from '@/config'
import { getIdToken } from '@/lib/firebase'

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type TokenProvider = () => Promise<string | null>

let tokenProvider: TokenProvider = getIdToken

export function setApiTokenProvider(provider: TokenProvider) {
  tokenProvider = provider
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await tokenProvider()
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
  })

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('careerstack:unauthorized'))
    throw new ApiError(401, 'unauthenticated', 'Authentication required')
  }

  if (!response.ok) {
    let code = 'request_failed'
    let message = response.statusText
    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string }
      }
      code = body.error?.code ?? code
      message = body.error?.message ?? message
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, code, message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
