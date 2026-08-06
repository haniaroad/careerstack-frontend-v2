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

const HTML_AS_JSON_MESSAGE =
  'API returned HTML instead of JSON — check VITE_API_BASE_URL; Design OS may be on port 3000'

/** True when the response looks like an HTML document rather than JSON. */
export function looksLikeHtmlResponse(contentType: string | null, bodyText: string): boolean {
  const type = contentType?.toLowerCase() ?? ''
  if (type.includes('text/html')) return true
  const trimmed = bodyText.trimStart().slice(0, 15).toLowerCase()
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')
}

async function parseJsonBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type')
  const bodyText = await response.text()
  if (looksLikeHtmlResponse(contentType, bodyText)) {
    throw new ApiError(response.status, 'invalid_response', HTML_AS_JSON_MESSAGE)
  }
  try {
    return JSON.parse(bodyText) as T
  } catch {
    throw new ApiError(
      response.status,
      'invalid_response',
      'API returned a non-JSON response — check VITE_API_BASE_URL',
    )
  }
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
    // Only clear auth when a credential was rejected — unauthenticated probes
    // (e.g. public invite page) must not wipe a live Firebase session.
    if (token) {
      window.dispatchEvent(new CustomEvent('careerstack:unauthorized'))
    }
    throw new ApiError(401, 'unauthenticated', 'Authentication required')
  }

  if (!response.ok) {
    let code = 'request_failed'
    let message = response.statusText
    try {
      const body = await parseJsonBody<{
        error?: { code?: string; message?: string }
      }>(response)
      code = body.error?.code ?? code
      message = body.error?.message ?? message
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_response') throw err
      // ignore other parse errors; keep statusText
    }
    throw new ApiError(response.status, code, message)
  }

  if (response.status === 204) return undefined as T
  return parseJsonBody<T>(response)
}
