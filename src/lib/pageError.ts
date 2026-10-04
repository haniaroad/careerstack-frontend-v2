export type PageErrorCopy = {
  title: string
  body: string
  code: string | null
}

const GENERIC_MESSAGES = new Set([
  '',
  'Forbidden',
  'forbidden',
  'Resource not found',
  'Not Found',
])

export function describePageError(
  input: { message?: string | null; code?: string | null },
  fallback = 'Something went wrong.',
): PageErrorCopy {
  const code = input.code ?? (input.message === 'Resource not found' ? 'not_found' : null)
  const message = (input.message ?? '').trim()

  if (code === 'not_found') {
    return {
      title: "This page isn't available to you.",
      body: 'It may be private, removed, or outside this account.',
      code: 'not_found',
    }
  }

  if (code === 'forbidden') {
    const specific = message.length > 0 && !GENERIC_MESSAGES.has(message)
    return {
      title: specific ? message : "You don't have access to this page.",
      body: '',
      code: 'forbidden',
    }
  }

  return {
    title: 'Something went wrong',
    body: message || fallback,
    code,
  }
}
