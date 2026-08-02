import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { apiBaseUrl } from '@/config'

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; status: string; url: string }
  | { kind: 'error'; message: string; url: string }

export function StatusPage() {
  const [state, setState] = useState<HealthState>({ kind: 'loading' })
  const url = `${apiBaseUrl()}/health`

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch(url)
        const body = (await response.json()) as { status?: string }
        if (cancelled) return
        if (!response.ok) {
          setState({ kind: 'error', message: `HTTP ${response.status}`, url })
          return
        }
        setState({ kind: 'ok', status: body.status ?? 'unknown', url })
      } catch (error) {
        if (cancelled) return
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Request failed',
          url,
        })
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">CareerStack</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">API status</h1>
      <p className="mt-3 text-muted-foreground">Smoke check against {url}</p>

      <div className="mt-8 rounded-md border border-border bg-surface p-4">
        {state.kind === 'loading' && <p>Checking health…</p>}
        {state.kind === 'ok' && (
          <p>
            Healthy: <span className="font-medium">{state.status}</span>
          </p>
        )}
        {state.kind === 'error' && (
          <p className="text-status-danger">Unreachable: {state.message}</p>
        )}
      </div>

      <Button asChild variant="link" className="mt-8 h-auto justify-start px-0">
        <Link to="/home">Back home</Link>
      </Button>
    </main>
  )
}
