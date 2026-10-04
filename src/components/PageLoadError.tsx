import { Alert } from '@/components/Alert'
import { describePageError } from '@/lib/pageError'

export function PageLoadError({
  message,
  code,
  fallback,
}: {
  message?: string | null
  code?: string | null
  fallback?: string
}) {
  const copy = describePageError({ message, code }, fallback)
  const tone = copy.code === 'not_found' || copy.code === 'forbidden' ? 'warning' : 'danger'
  return (
    <Alert tone={tone} title={copy.title}>
      {copy.body ? <p>{copy.body}</p> : null}
      {copy.code ? <p className="mt-2 font-mono text-xs">Error code: {copy.code}</p> : null}
    </Alert>
  )
}
